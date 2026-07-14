/**
 * ILI9341Controller — virtual 240x320 SPI TFT controller, from the ILI9341
 * datasheet. SPI has no in-band command/data marker: the D/C pin selects it,
 * so the host samples D/C per byte and calls commandByte()/dataByte().
 *
 * Modelled commands (the framebuffer-relevant subset):
 *   0x2A CASET  column window (4 data bytes: start16, end16)
 *   0x2B PASET  page (row) window
 *   0x2C RAMWR  pixel write — RGB565 big-endian, advancing column-first
 *               within the window, wrapping to the next row
 *   0x28/0x29   display off / on
 *   0x01        software reset (full window, display off)
 * Everything else is accepted and its data bytes ignored.
 */

export const ILI9341_WIDTH = 240;
export const ILI9341_HEIGHT = 320;

export class ILI9341Controller {
  /** RGB565 framebuffer, row-major 240x320. */
  readonly framebuffer = new Uint16Array(ILI9341_WIDTH * ILI9341_HEIGHT);
  displayOn = false;

  private command = 0;
  private args: number[] = [];
  private colStart = 0;
  private colEnd = ILI9341_WIDTH - 1;
  private rowStart = 0;
  private rowEnd = ILI9341_HEIGHT - 1;
  private col = 0;
  private row = 0;
  private pixelHigh: number | null = null;

  commandByte(byte: number): void {
    this.command = byte & 0xff;
    this.args = [];
    this.pixelHigh = null;
    switch (this.command) {
      case 0x01: // software reset
        this.displayOn = false;
        this.colStart = 0;
        this.colEnd = ILI9341_WIDTH - 1;
        this.rowStart = 0;
        this.rowEnd = ILI9341_HEIGHT - 1;
        this.framebuffer.fill(0);
        break;
      case 0x28:
        this.displayOn = false;
        break;
      case 0x29:
        this.displayOn = true;
        break;
      case 0x2c: // RAMWR resets the write pointer to the window origin
        this.col = this.colStart;
        this.row = this.rowStart;
        break;
      default:
        break;
    }
  }

  dataByte(byte: number): void {
    switch (this.command) {
      case 0x2a:
        this.args.push(byte);
        if (this.args.length === 4) {
          this.colStart = Math.min(((this.args[0] << 8) | this.args[1]), ILI9341_WIDTH - 1);
          this.colEnd = Math.min(((this.args[2] << 8) | this.args[3]), ILI9341_WIDTH - 1);
          this.args = [];
        }
        break;
      case 0x2b:
        this.args.push(byte);
        if (this.args.length === 4) {
          this.rowStart = Math.min(((this.args[0] << 8) | this.args[1]), ILI9341_HEIGHT - 1);
          this.rowEnd = Math.min(((this.args[2] << 8) | this.args[3]), ILI9341_HEIGHT - 1);
          this.args = [];
        }
        break;
      case 0x2c:
        if (this.pixelHigh === null) {
          this.pixelHigh = byte;
          return;
        }
        this.writePixel((this.pixelHigh << 8) | byte);
        this.pixelHigh = null;
        break;
      default:
        break; // setup command parameters: nothing to model
    }
  }

  private writePixel(rgb565: number): void {
    if (this.row > this.rowEnd) return; // window overrun: drop
    this.framebuffer[this.row * ILI9341_WIDTH + this.col] = rgb565;
    if (this.col < this.colEnd) {
      this.col++;
    } else {
      this.col = this.colStart;
      this.row++;
    }
  }

  /** RGB of a pixel as [r, g, b] 0-255, black when the display is off. */
  pixelAt(x: number, y: number): [number, number, number] {
    if (!this.displayOn) return [0, 0, 0];
    const value = this.framebuffer[y * ILI9341_WIDTH + x];
    const r = ((value >> 11) & 0x1f) * 255 / 31;
    const g = ((value >> 5) & 0x3f) * 255 / 63;
    const b = (value & 0x1f) * 255 / 31;
    return [Math.round(r), Math.round(g), Math.round(b)];
  }

  /** Write the screen into an RGBA buffer (240x320). */
  renderTo(rgba: Uint8ClampedArray): void {
    for (let y = 0; y < ILI9341_HEIGHT; y++) {
      for (let x = 0; x < ILI9341_WIDTH; x++) {
        const [r, g, b] = this.pixelAt(x, y);
        const offset = (y * ILI9341_WIDTH + x) * 4;
        rgba[offset] = r;
        rgba[offset + 1] = g;
        rgba[offset + 2] = b;
        rgba[offset + 3] = 255;
      }
    }
  }
}
