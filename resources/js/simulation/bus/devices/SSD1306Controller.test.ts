import { describe, it, expect } from 'vitest';
import { SSD1306Controller, SSD1306_WIDTH } from './SSD1306Controller';

/** Run one I2C write transaction against the controller. */
function transact(ctl: SSD1306Controller, bytes: number[]): void {
  ctl.i2cConnect();
  for (const byte of bytes) ctl.i2cWriteByte(byte);
  ctl.i2cDisconnect();
}

const cmd = (ctl: SSD1306Controller, ...bytes: number[]) => transact(ctl, [0x00, ...bytes]);
const data = (ctl: SSD1306Controller, ...bytes: number[]) => transact(ctl, [0x40, ...bytes]);

describe('SSD1306Controller', () => {
  it('stays dark until display-on', () => {
    const ctl = new SSD1306Controller();
    data(ctl, 0xff);
    expect(ctl.pixelAt(0, 0)).toBe(false);
    cmd(ctl, 0xaf);
    expect(ctl.pixelAt(0, 0)).toBe(true);
  });

  it('writes pages in horizontal addressing mode with wrap', () => {
    const ctl = new SSD1306Controller();
    cmd(ctl, 0xaf, 0x20, 0x00, 0x21, 0, 127, 0x22, 0, 7); // on, horizontal, full window
    // Fill the whole first page: 8 rows of lit pixels across the top.
    data(ctl, ...new Array<number>(SSD1306_WIDTH).fill(0xff));
    expect(ctl.pixelAt(0, 0)).toBe(true);
    expect(ctl.pixelAt(127, 7)).toBe(true);
    expect(ctl.pixelAt(0, 8)).toBe(false); // page 1 untouched
    // The next byte lands at the start of page 1 (horizontal wrap).
    data(ctl, 0x01);
    expect(ctl.pixelAt(0, 8)).toBe(true);
    expect(ctl.pixelAt(0, 9)).toBe(false); // only bit 0 of the byte
  });

  it('page addressing mode: B0/column nibbles position the write', () => {
    const ctl = new SSD1306Controller();
    // Reset state is page mode; go to page 3, column 0x25.
    cmd(ctl, 0xaf, 0xb3, 0x05, 0x12);
    data(ctl, 0x80); // bit 7 → y = 3*8 + 7 = 31
    expect(ctl.pixelAt(0x25, 31)).toBe(true);
  });

  it('handles Co-flagged single-byte control prefixes', () => {
    const ctl = new SSD1306Controller();
    // 0x80 = one command follows, then another control byte.
    transact(ctl, [0x80, 0xaf, 0x40, 0xff]);
    expect(ctl.displayOn).toBe(true);
    expect(ctl.pixelAt(0, 0)).toBe(true);
  });

  it('inverts the panel on 0xA7', () => {
    const ctl = new SSD1306Controller();
    cmd(ctl, 0xaf, 0xa7);
    expect(ctl.pixelAt(64, 32)).toBe(true); // unwritten pixel lit when inverted
  });

  it('fires onUpdate once per dirty transaction', () => {
    let updates = 0;
    const ctl = new SSD1306Controller(() => updates++);
    cmd(ctl, 0x21, 0, 127); // window setup only — nothing visible changed
    expect(updates).toBe(0);
    cmd(ctl, 0xaf);
    data(ctl, 0xff, 0xff);
    expect(updates).toBe(2); // display-on + one data transaction
  });

  it('renderTo produces an RGBA image of the panel', () => {
    const ctl = new SSD1306Controller();
    cmd(ctl, 0xaf, 0x20, 0x00);
    data(ctl, 0x01); // pixel (0,0)
    const rgba = new Uint8ClampedArray(128 * 64 * 4);
    ctl.renderTo(rgba);
    expect(rgba[0]).toBe(255); // (0,0) lit
    expect(rgba[3]).toBe(255); // opaque
    expect(rgba[4]).toBe(0); // (1,0) dark
  });
});
