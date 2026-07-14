import { describe, it, expect } from 'vitest';
import { HD44780Controller } from './HD44780Controller';

/** Send a full byte as two 4-bit strobes (the LCD in 4-bit mode). */
function send(ctl: HD44780Controller, rs: boolean, byte: number): void {
  ctl.strobe(rs, (byte >> 4) & 0x0f);
  ctl.strobe(rs, byte & 0x0f);
}

/** The standard LiquidCrystal-style 4-bit init sequence. */
function init4bit(ctl: HD44780Controller): void {
  ctl.strobe(false, 0x3); // 8-bit function set, three times
  ctl.strobe(false, 0x3);
  ctl.strobe(false, 0x3);
  ctl.strobe(false, 0x2); // switch to 4-bit
  send(ctl, false, 0x28); // function set: 4-bit, 2 lines
  send(ctl, false, 0x0c); // display on, cursor off
  send(ctl, false, 0x01); // clear
  send(ctl, false, 0x06); // entry mode: increment
}

function print(ctl: HD44780Controller, text: string): void {
  for (const ch of text) send(ctl, true, ch.charCodeAt(0));
}

describe('HD44780Controller', () => {
  it('runs the 4-bit init handshake and prints text', () => {
    const ctl = new HD44780Controller(16, 2);
    init4bit(ctl);
    print(ctl, 'HELLO');
    expect(ctl.text().split('\n')[0]).toBe('HELLO           ');
  });

  it('addresses the second row at DDRAM 0x40', () => {
    const ctl = new HD44780Controller(16, 2);
    init4bit(ctl);
    send(ctl, false, 0x80 | 0x40); // set DDRAM to row 1
    print(ctl, 'ROW2');
    expect(ctl.text().split('\n')[1]).toBe('ROW2            ');
  });

  it('maps the 20x4 rows at 0x00/0x40/0x14/0x54', () => {
    const ctl = new HD44780Controller(20, 4);
    init4bit(ctl);
    send(ctl, false, 0x80 | 0x14);
    print(ctl, 'THIRD');
    expect(ctl.text().split('\n')[2]).toBe('THIRD               ');
  });

  it('clear wipes the screen and homes the cursor', () => {
    const ctl = new HD44780Controller(16, 2);
    init4bit(ctl);
    print(ctl, 'JUNK');
    send(ctl, false, 0x01); // clear
    print(ctl, 'OK');
    expect(ctl.text().split('\n')[0]).toBe('OK              ');
  });

  it('shows nothing while the display is off', () => {
    const ctl = new HD44780Controller(16, 2);
    init4bit(ctl);
    print(ctl, 'HI');
    send(ctl, false, 0x08); // display off
    expect(ctl.text().trim()).toBe('');
  });

  it('reports the cursor position when visible', () => {
    const ctl = new HD44780Controller(16, 2);
    init4bit(ctl);
    send(ctl, false, 0x0e); // display on + cursor
    print(ctl, 'AB');
    expect(ctl.cursorPosition()).toEqual({ x: 2, y: 0 });
  });

  it('CGRAM writes never corrupt the visible text', () => {
    const ctl = new HD44780Controller(16, 2);
    init4bit(ctl);
    print(ctl, 'SAFE');
    send(ctl, false, 0x40); // CGRAM address 0
    send(ctl, true, 0x1f); // custom glyph row
    send(ctl, false, 0x80 | 0x04); // back to DDRAM
    print(ctl, '!');
    expect(ctl.text().split('\n')[0]).toBe('SAFE!           ');
  });
});
