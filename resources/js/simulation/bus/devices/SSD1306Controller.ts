/**
 * SSD1306Controller — virtual 128x64 OLED controller on the I2C bus,
 * implemented from the SSD1306 datasheet (command table + GDDRAM layout):
 *
 *  - GDDRAM: 8 pages x 128 columns, one byte = 8 vertical pixels (LSB on top).
 *  - Every I2C transaction starts with a control byte: bit6 (D/C#) selects
 *    command (0) or data (1) for the following byte(s); bit7 (Co) set means
 *    only one byte follows before the next control byte.
 *  - Addressing modes (0x20): 0 horizontal, 1 vertical, 2 page (reset value).
 *    0x21/0x22 set column/page windows (horizontal & vertical modes);
 *    0xB0-B7 / 0x00-0x0F / 0x10-0x1F set page and column in page mode.
 *  - 0xAE/0xAF display off/on, 0xA6/0xA7 normal/inverse.
 *
 * The controller only models what a framebuffer render needs; setup-only
 * commands (contrast, clock, charge pump, ...) are parsed for their argument
 * counts and ignored.
 */
import type { I2CDevice } from '../I2CBus';

export const SSD1306_WIDTH = 128;
export const SSD1306_HEIGHT = 64;
export const SSD1306_I2C_ADDRESS = 0x3c;
const PAGES = SSD1306_HEIGHT / 8;

/** Commands that consume N argument bytes (setup commands included). */
const COMMAND_ARGS: Record<number, number> = {
  0x20: 1, // memory addressing mode
  0x21: 2, // column address window
  0x22: 2, // page address window
  0x81: 1, // contrast
  0x8d: 1, // charge pump
  0xa8: 1, // multiplex ratio
  0xd3: 1, // display offset
  0xd5: 1, // display clock divide
  0xd9: 1, // pre-charge period
  0xda: 1, // COM pins configuration
  0xdb: 1, // VCOMH deselect level
};

type AddressingMode = 'horizontal' | 'vertical' | 'page';

export class SSD1306Controller implements I2CDevice {
  /** GDDRAM: pages x columns. */
  readonly framebuffer = new Uint8Array(PAGES * SSD1306_WIDTH);
  displayOn = false;
  inverted = false;

  private mode: AddressingMode = 'page'; // datasheet reset value
  private column = 0;
  private page = 0;
  private colStart = 0;
  private colEnd = SSD1306_WIDTH - 1;
  private pageStart = 0;
  private pageEnd = PAGES - 1;

  // Per-transaction control-byte state.
  private expectControl = true;
  private dataMode = false;
  private singleByte = false;
  private pendingArgs = 0;
  private dirty = false;

  /** Called after a transaction that changed the framebuffer or state. */
  constructor(private readonly onUpdate?: (self: SSD1306Controller) => void) {}

  // --- I2CDevice ---

  i2cConnect(): boolean {
    this.expectControl = true;
    return true;
  }

  i2cWriteByte(byte: number): boolean {
    if (this.expectControl) {
      this.dataMode = (byte & 0x40) !== 0;
      this.singleByte = (byte & 0x80) !== 0;
      this.expectControl = false;
      return true;
    }
    if (this.dataMode) {
      this.writeData(byte);
    } else {
      this.writeCommand(byte);
    }
    if (this.singleByte) this.expectControl = true;
    return true;
  }

  i2cReadByte(): number {
    // Status read: bit6 = display on (datasheet status register).
    return this.displayOn ? 0x40 : 0x00;
  }

  i2cDisconnect(): void {
    this.expectControl = true;
    if (this.dirty) {
      this.dirty = false;
      this.onUpdate?.(this);
    }
  }

  // --- GDDRAM writes ---

  private writeData(byte: number): void {
    this.framebuffer[this.page * SSD1306_WIDTH + this.column] = byte;
    this.dirty = true;
    this.advance();
  }

  private advance(): void {
    if (this.mode === 'vertical') {
      if (this.page < this.pageEnd) {
        this.page++;
      } else {
        this.page = this.pageStart;
        this.column = this.column < this.colEnd ? this.column + 1 : this.colStart;
      }
      return;
    }
    // horizontal & page modes both advance the column first
    if (this.column < this.colEnd) {
      this.column++;
      return;
    }
    this.column = this.colStart;
    if (this.mode === 'horizontal') {
      this.page = this.page < this.pageEnd ? this.page + 1 : this.pageStart;
    }
    // page mode: column wraps within the current page
  }

  // --- Command decoding ---

  private argCommand = 0;
  private argsSeen: number[] = [];

  private writeCommand(byte: number): void {
    if (this.pendingArgs > 0) {
      this.argsSeen.push(byte);
      this.pendingArgs--;
      if (this.pendingArgs === 0) this.applyCommand(this.argCommand, this.argsSeen);
      return;
    }

    if (byte >= 0xb0 && byte <= 0xb7) {
      // Page-mode page select
      this.page = byte & 0x07;
      return;
    }
    if (byte <= 0x0f) {
      // Page-mode column low nibble
      this.column = (this.column & 0xf0) | byte;
      return;
    }
    if (byte >= 0x10 && byte <= 0x1f) {
      // Page-mode column high nibble
      this.column = ((byte & 0x0f) << 4) | (this.column & 0x0f);
      return;
    }

    const argCount = COMMAND_ARGS[byte];
    if (argCount) {
      this.argCommand = byte;
      this.argsSeen = [];
      this.pendingArgs = argCount;
      return;
    }

    switch (byte) {
      case 0xae:
        this.displayOn = false;
        this.dirty = true;
        break;
      case 0xaf:
        this.displayOn = true;
        this.dirty = true;
        break;
      case 0xa6:
        this.inverted = false;
        this.dirty = true;
        break;
      case 0xa7:
        this.inverted = true;
        this.dirty = true;
        break;
      default:
        // Scroll / hardware-config commands with no framebuffer effect.
        break;
    }
  }

  private applyCommand(command: number, args: number[]): void {
    switch (command) {
      case 0x20: {
        const modes: AddressingMode[] = ['horizontal', 'vertical', 'page'];
        this.mode = modes[args[0] & 0x03] ?? 'page';
        break;
      }
      case 0x21:
        this.colStart = Math.min(args[0] & 0x7f, SSD1306_WIDTH - 1);
        this.colEnd = Math.min(args[1] & 0x7f, SSD1306_WIDTH - 1);
        this.column = this.colStart;
        break;
      case 0x22:
        this.pageStart = Math.min(args[0] & 0x07, PAGES - 1);
        this.pageEnd = Math.min(args[1] & 0x07, PAGES - 1);
        this.page = this.pageStart;
        break;
      default:
        break; // setup command: argument parsed, nothing to model
    }
  }

  /** Is the pixel at (x, y) lit, accounting for display on/off and invert? */
  pixelAt(x: number, y: number): boolean {
    if (!this.displayOn) return false;
    const bit = (this.framebuffer[(y >> 3) * SSD1306_WIDTH + x] >> (y & 7)) & 1;
    return this.inverted ? bit === 0 : bit === 1;
  }

  /** Write the screen into an RGBA buffer (4 bytes/pixel, 128x64). */
  renderTo(rgba: Uint8ClampedArray): void {
    for (let y = 0; y < SSD1306_HEIGHT; y++) {
      for (let x = 0; x < SSD1306_WIDTH; x++) {
        const offset = (y * SSD1306_WIDTH + x) * 4;
        const lit = this.pixelAt(x, y) ? 255 : 0;
        rgba[offset] = lit;
        rgba[offset + 1] = lit;
        rgba[offset + 2] = lit;
        rgba[offset + 3] = 255;
      }
    }
  }
}
