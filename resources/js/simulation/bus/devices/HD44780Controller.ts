/**
 * HD44780Controller — virtual character-LCD controller (LCD1602 / LCD2004),
 * implemented from the HD44780 datasheet. The board integration watches the
 * E (enable) pin and calls `strobe(rs, nibble)` on each falling edge with the
 * sampled RS and D4-D7 levels; this class runs the 4-bit handshake and the
 * instruction set:
 *
 *  - The controller resets in 8-bit mode: a lone strobe carries the command's
 *    high nibble (how the standard 0x33/0x32 init sequence works). A function
 *    set with DL=0 switches to 4-bit mode, where strobes pair high-then-low.
 *  - DDRAM rows sit at fixed addresses: row bases 0x00/0x40 (and +cols for
 *    the 4-row parts). Clear/home/entry-mode/display-control/DDRAM-address
 *    and data writes are modelled; CGRAM writes are tracked only so they
 *    don't corrupt DDRAM.
 */

const DDRAM_SIZE = 0x80;
const ROW_BASES = [0x00, 0x40, 0x14, 0x54]; // rows 2-3 offset by cols on 20x4

export class HD44780Controller {
  private readonly ddram = new Uint8Array(DDRAM_SIZE).fill(0x20);
  private addr = 0;
  private increment = true;
  private cgramMode = false;
  private busWidth: 8 | 4 = 8;
  private highNibble: number | null = null;

  displayOn = false;
  cursorVisible = false;
  blink = false;

  constructor(
    readonly cols: number,
    readonly rows: number,
    private readonly onUpdate?: (self: HD44780Controller) => void,
  ) {}

  /** One E-pin falling edge: `nibble` is the sampled D7..D4 (bit3..bit0). */
  strobe(rs: boolean, nibble: number): void {
    if (this.busWidth === 8) {
      // 8-bit mode over a 4-bit wire: only the high nibble arrives.
      this.execute(rs, (nibble & 0x0f) << 4);
      return;
    }
    if (this.highNibble === null) {
      this.highNibble = nibble & 0x0f;
      return;
    }
    const byte = (this.highNibble << 4) | (nibble & 0x0f);
    this.highNibble = null;
    this.execute(rs, byte);
  }

  private execute(rs: boolean, byte: number): void {
    if (rs) {
      this.writeData(byte);
    } else {
      this.command(byte);
    }
    this.onUpdate?.(this);
  }

  private command(byte: number): void {
    if (byte & 0x80) {
      this.addr = byte & 0x7f;
      this.cgramMode = false;
      return;
    }
    if (byte & 0x40) {
      this.cgramMode = true; // CGRAM address set — custom chars not rendered
      return;
    }
    if (byte & 0x20) {
      // Function set: DL bit4 picks the bus width.
      this.busWidth = byte & 0x10 ? 8 : 4;
      this.highNibble = null;
      return;
    }
    if (byte & 0x10) return; // cursor/display shift: not rendered
    if (byte & 0x08) {
      this.displayOn = (byte & 0x04) !== 0;
      this.cursorVisible = (byte & 0x02) !== 0;
      this.blink = (byte & 0x01) !== 0;
      return;
    }
    if (byte & 0x04) {
      this.increment = (byte & 0x02) !== 0;
      return;
    }
    if (byte & 0x02) {
      this.addr = 0; // home
      this.cgramMode = false;
      return;
    }
    if (byte & 0x01) {
      this.ddram.fill(0x20); // clear
      this.addr = 0;
      this.increment = true;
      this.cgramMode = false;
    }
  }

  private writeData(byte: number): void {
    if (!this.cgramMode) {
      this.ddram[this.addr & 0x7f] = byte;
    }
    const step = this.increment ? 1 : -1;
    this.addr = (this.addr + step) & 0x7f;
  }

  /** Visible characters, row-major (rows x cols), HD44780 charset codes. */
  characters(): Uint8Array {
    const out = new Uint8Array(this.rows * this.cols).fill(0x20);
    if (!this.displayOn) return out;
    for (let row = 0; row < this.rows; row++) {
      const base = row < 2 ? ROW_BASES[row] : ROW_BASES[row - 2] + this.cols;
      for (let col = 0; col < this.cols; col++) {
        out[row * this.cols + col] = this.ddram[(base + col) & 0x7f];
      }
    }
    return out;
  }

  /** Cursor position, or null when it sits outside the visible window. */
  cursorPosition(): { x: number; y: number } | null {
    if (!this.displayOn || !this.cursorVisible) return null;
    for (let row = 0; row < this.rows; row++) {
      const base = row < 2 ? ROW_BASES[row] : ROW_BASES[row - 2] + this.cols;
      const col = this.addr - base;
      if (col >= 0 && col < this.cols) return { x: col, y: row };
    }
    return null;
  }

  /** Visible text with rows joined by newlines (testing convenience). */
  text(): string {
    const chars = this.characters();
    const lines: string[] = [];
    for (let row = 0; row < this.rows; row++) {
      lines.push(
        String.fromCharCode(...chars.subarray(row * this.cols, (row + 1) * this.cols)),
      );
    }
    return lines.join('\n');
  }
}
