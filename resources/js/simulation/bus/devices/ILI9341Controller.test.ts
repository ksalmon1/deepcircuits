import { describe, it, expect } from 'vitest';
import { ILI9341Controller, ILI9341_WIDTH } from './ILI9341Controller';

function window16(ctl: ILI9341Controller, cmd: number, start: number, end: number): void {
  ctl.commandByte(cmd);
  ctl.dataByte(start >> 8);
  ctl.dataByte(start & 0xff);
  ctl.dataByte(end >> 8);
  ctl.dataByte(end & 0xff);
}

function pixels(ctl: ILI9341Controller, rgb565: number, count: number): void {
  for (let i = 0; i < count; i++) {
    ctl.dataByte(rgb565 >> 8);
    ctl.dataByte(rgb565 & 0xff);
  }
}

describe('ILI9341Controller', () => {
  it('fills a window with RGB565 pixels, wrapping rows', () => {
    const ctl = new ILI9341Controller();
    ctl.commandByte(0x29); // display on
    window16(ctl, 0x2a, 2, 4); // columns 2..4
    window16(ctl, 0x2b, 1, 2); // rows 1..2
    ctl.commandByte(0x2c);
    pixels(ctl, 0xf800, 6); // pure red, exactly the 3x2 window

    expect(ctl.pixelAt(2, 1)).toEqual([255, 0, 0]);
    expect(ctl.pixelAt(4, 2)).toEqual([255, 0, 0]);
    expect(ctl.pixelAt(1, 1)).toEqual([0, 0, 0]); // outside the window
    expect(ctl.pixelAt(2, 3)).toEqual([0, 0, 0]);
  });

  it('stays dark until display-on and drops overrun pixels', () => {
    const ctl = new ILI9341Controller();
    window16(ctl, 0x2a, 0, 0);
    window16(ctl, 0x2b, 0, 0);
    ctl.commandByte(0x2c);
    pixels(ctl, 0x07e0, 3); // 1x1 window, 2 extra pixels dropped
    expect(ctl.pixelAt(0, 0)).toEqual([0, 0, 0]); // display still off
    ctl.commandByte(0x29);
    expect(ctl.pixelAt(0, 0)).toEqual([0, 255, 0]);
    expect(ctl.pixelAt(1, 0)).toEqual([0, 0, 0]); // overrun did not leak
    expect(ctl.pixelAt(0, 1)).toEqual([0, 0, 0]);
  });

  it('software reset clears the panel', () => {
    const ctl = new ILI9341Controller();
    ctl.commandByte(0x29);
    ctl.commandByte(0x2c);
    pixels(ctl, 0xffff, 5);
    ctl.commandByte(0x01);
    ctl.commandByte(0x29);
    expect(ctl.pixelAt(0, 0)).toEqual([0, 0, 0]);
    expect(ctl.framebuffer.every((v) => v === 0)).toBe(true);
  });

  it('ignores parameters of unmodelled setup commands', () => {
    const ctl = new ILI9341Controller();
    ctl.commandByte(0x29);
    ctl.commandByte(0x36); // MADCTL
    ctl.dataByte(0x48); // must not be treated as pixel data
    ctl.commandByte(0x2c);
    pixels(ctl, 0xf800, 1);
    expect(ctl.pixelAt(0, 0)).toEqual([255, 0, 0]);
    expect(ctl.framebuffer.filter((v) => v !== 0)).toHaveLength(1);
  });

  it('a full-width RAMWR run advances through rows correctly', () => {
    const ctl = new ILI9341Controller();
    ctl.commandByte(0x29);
    ctl.commandByte(0x2c); // full-screen window (reset default)
    pixels(ctl, 0x001f, ILI9341_WIDTH + 1); // one full row + 1 pixel
    expect(ctl.pixelAt(ILI9341_WIDTH - 1, 0)).toEqual([0, 0, 255]);
    expect(ctl.pixelAt(0, 1)).toEqual([0, 0, 255]);
    expect(ctl.pixelAt(1, 1)).toEqual([0, 0, 0]);
  });
});
