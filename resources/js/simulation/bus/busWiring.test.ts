import { describe, it, expect } from 'vitest';
import { resolveDisplayBindings } from './busWiring';
import { getBoardProfile } from '@/simulation/avr/boardProfiles';
import type { CircuitComponentLike, WireLike } from '@/simulation/netlist/buildMapping';

const uno = getBoardProfile('arduino-uno')!;
const mega = getBoardProfile('arduino-mega')!;

// A cut-down Uno part: only the pins these tests touch.
const board: CircuitComponentLike = {
  id: 'uno-1',
  type: 'arduino-uno',
  attributes: {},
  pins: [
    { name: '13' }, // pin-0
    { name: '12' }, // pin-1
    { name: '11' }, // pin-2
    { name: '5' }, // pin-3
    { name: '4' }, // pin-4
    { name: '3' }, // pin-5
    { name: '2' }, // pin-6
    { name: 'A4' }, // pin-7 (SDA)
    { name: 'A5' }, // pin-8 (SCL)
    { name: 'GND.1' }, // pin-9
  ],
};

const oled: CircuitComponentLike = {
  id: 'oled-1',
  type: 'ssd1306',
  attributes: {},
  pins: [{ name: 'DATA' }, { name: 'CLK' }, { name: 'VIN' }, { name: 'GND' }],
};

const lcd: CircuitComponentLike = {
  id: 'lcd-1',
  type: 'lcd1602',
  attributes: {},
  pins: [
    { name: 'RS' }, // pin-0
    { name: 'E' }, // pin-1
    { name: 'D4' }, // pin-2
    { name: 'D5' }, // pin-3
    { name: 'D6' }, // pin-4
    { name: 'D7' }, // pin-5
  ],
};

const w = (id: string, s: string, sh: string, t: string, th: string): WireLike => ({
  id,
  source: s,
  sourceHandle: sh,
  target: t,
  targetHandle: th,
});

describe('resolveDisplayBindings', () => {
  it('finds an OLED wired to the board SDA/SCL', () => {
    const wires = [
      w('w1', 'uno-1', 'pin-7', 'oled-1', 'pin-0'), // A4 -> DATA
      w('w2', 'uno-1', 'pin-8', 'oled-1', 'pin-1'), // A5 -> CLK
    ];
    const bindings = resolveDisplayBindings([board, oled], wires, 'uno-1', uno);
    expect(bindings.i2c).toEqual([{ componentId: 'oled-1', kind: 'ssd1306', address: 0x3c }]);
  });

  it('ignores an OLED with SDA/SCL swapped or unwired', () => {
    const swapped = [
      w('w1', 'uno-1', 'pin-8', 'oled-1', 'pin-0'), // SCL -> DATA (wrong)
      w('w2', 'uno-1', 'pin-7', 'oled-1', 'pin-1'),
    ];
    expect(resolveDisplayBindings([board, oled], swapped, 'uno-1', uno).i2c).toEqual([]);
    expect(resolveDisplayBindings([board, oled], [], 'uno-1', uno).i2c).toEqual([]);
  });

  it('maps a fully-wired LCD1602 to its board GPIOs', () => {
    const wires = [
      w('w1', 'uno-1', 'pin-1', 'lcd-1', 'pin-0'), // 12 -> RS
      w('w2', 'uno-1', 'pin-2', 'lcd-1', 'pin-1'), // 11 -> E
      w('w3', 'uno-1', 'pin-3', 'lcd-1', 'pin-2'), // 5 -> D4
      w('w4', 'uno-1', 'pin-4', 'lcd-1', 'pin-3'), // 4 -> D5
      w('w5', 'uno-1', 'pin-5', 'lcd-1', 'pin-4'), // 3 -> D6
      w('w6', 'uno-1', 'pin-6', 'lcd-1', 'pin-5'), // 2 -> D7
    ];
    const bindings = resolveDisplayBindings([board, lcd], wires, 'uno-1', uno);
    expect(bindings.hd44780).toEqual([
      {
        componentId: 'lcd-1',
        kind: 'hd44780',
        cols: 16,
        rows: 2,
        pins: { rs: 12, e: 11, d4: 5, d5: 4, d6: 3, d7: 2 },
      },
    ]);
  });

  it('skips an LCD missing a data line', () => {
    const wires = [
      w('w1', 'uno-1', 'pin-1', 'lcd-1', 'pin-0'),
      w('w2', 'uno-1', 'pin-2', 'lcd-1', 'pin-1'),
      w('w3', 'uno-1', 'pin-3', 'lcd-1', 'pin-2'),
    ];
    expect(resolveDisplayBindings([board, lcd], wires, 'uno-1', uno).hd44780).toEqual([]);
  });

  it('binds an ILI9341 whose MOSI/SCK reach the hardware SPI pins', () => {
    const boardSpi: CircuitComponentLike = {
      id: 'uno-1',
      type: 'arduino-uno',
      attributes: {},
      pins: [{ name: '13' }, { name: '11' }, { name: '10' }, { name: '9' }],
    };
    const tft: CircuitComponentLike = {
      id: 'tft-1',
      type: 'ili9341',
      attributes: {},
      pins: [{ name: 'CS' }, { name: 'D/C' }, { name: 'MOSI' }, { name: 'SCK' }],
    };
    const wires = [
      w('w1', 'uno-1', 'pin-2', 'tft-1', 'pin-0'), // 10 -> CS
      w('w2', 'uno-1', 'pin-3', 'tft-1', 'pin-1'), // 9 -> D/C
      w('w3', 'uno-1', 'pin-1', 'tft-1', 'pin-2'), // 11 (MOSI) -> MOSI
      w('w4', 'uno-1', 'pin-0', 'tft-1', 'pin-3'), // 13 (SCK) -> SCK
    ];
    const bindings = resolveDisplayBindings([boardSpi, tft], wires, 'uno-1', uno);
    expect(bindings.spi).toEqual([{ componentId: 'tft-1', kind: 'ili9341', csPin: 10, dcPin: 9 }]);

    // MOSI on the wrong pin: no binding.
    const bad = [...wires.slice(0, 2), w('w3', 'uno-1', 'pin-3', 'tft-1', 'pin-2'), wires[3]];
    expect(resolveDisplayBindings([boardSpi, tft], bad, 'uno-1', uno).spi).toEqual([]);
  });

  it('binds digital detect sensors with datasheet polarity', () => {
    const pir: CircuitComponentLike = {
      id: 'pir-1',
      type: 'pir-motion-sensor',
      attributes: {},
      pins: [{ name: 'VCC' }, { name: 'OUT' }, { name: 'GND' }],
    };
    const flame: CircuitComponentLike = {
      id: 'flame-1',
      type: 'flame-sensor',
      attributes: {},
      pins: [{ name: 'VCC' }, { name: 'GND' }, { name: 'DOUT' }, { name: 'AOUT' }],
    };
    const wires = [
      w('w1', 'uno-1', 'pin-6', 'pir-1', 'pin-1'), // 2 -> OUT
      w('w2', 'uno-1', 'pin-5', 'flame-1', 'pin-2'), // 3 -> DOUT
    ];
    const bindings = resolveDisplayBindings([board, pir, flame], wires, 'uno-1', uno);
    expect(bindings.gpio).toEqual([
      { componentId: 'pir-1', kind: 'digital-sensor', sensorType: 'pir-motion-sensor', outPin: 2, activeLow: false },
      { componentId: 'flame-1', kind: 'digital-sensor', sensorType: 'flame-sensor', outPin: 3, activeLow: true },
    ]);
  });

  it("resolves the Mega's dedicated SDA/SCL header pins to 20/21", () => {
    const megaBoard: CircuitComponentLike = {
      id: 'mega-1',
      type: 'arduino-mega',
      attributes: {},
      pins: [{ name: 'SDA' }, { name: 'SCL' }],
    };
    const wires = [
      w('w1', 'mega-1', 'pin-0', 'oled-1', 'pin-0'),
      w('w2', 'mega-1', 'pin-1', 'oled-1', 'pin-1'),
    ];
    const bindings = resolveDisplayBindings([megaBoard, oled], wires, 'mega-1', mega);
    expect(bindings.i2c).toHaveLength(1);
  });
});
