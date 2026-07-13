import { describe, it, expect } from 'vitest';
import { LOGIC_FAMILIES, PinResolver, isLogicHigh } from './logicFamilies';

describe('isLogicHigh', () => {
  it('reads AVR thresholds from the datasheet (0.3/0.6 Vcc)', () => {
    const avr = LOGIC_FAMILIES.AVR_5V;
    expect(isLogicHigh(5, avr)).toBe(true);
    expect(isLogicHigh(3.0, avr)).toBe(true); // exactly VIH
    expect(isLogicHigh(1.5, avr)).toBe(false); // exactly VIL
    expect(isLogicHigh(0, avr)).toBe(false);
  });

  it('a 3.3V drive reads HIGH on TTL-compatible inputs but sits in the HC undefined band', () => {
    expect(isLogicHigh(3.3, LOGIC_FAMILIES.HCT)).toBe(true);
    expect(isLogicHigh(3.3, LOGIC_FAMILIES.TTL)).toBe(true);
    // 74HC @ 5V needs 3.5V — 3.3 falls in the undefined region and the
    // stateless fallback (midpoint 2.5V) rounds it up.
    expect(isLogicHigh(3.3, LOGIC_FAMILIES.HC_5V)).toBe(true);
    expect(isLogicHigh(2.2, LOGIC_FAMILIES.HC_5V)).toBe(false);
  });

  it('the old flat 2.5V rule disagrees with TTL on a 2.2V input', () => {
    // 2.2V is a legal TTL HIGH (VIH = 2.0V) that the old `> 2.5` misread.
    expect(isLogicHigh(2.2, LOGIC_FAMILIES.TTL)).toBe(true);
  });
});

describe('PinResolver hysteresis', () => {
  it('holds the previous level inside the undefined region', () => {
    const r = new PinResolver(LOGIC_FAMILIES.AVR_5V);
    expect(r.resolve(13, 4.9)).toBe(true); // solid HIGH
    expect(r.resolve(13, 2.4)).toBe(true); // undefined region → holds HIGH
    expect(r.resolve(13, 0.3)).toBe(false); // solid LOW
    expect(r.resolve(13, 2.4)).toBe(false); // same voltage now holds LOW
  });

  it('tracks pins independently and resets', () => {
    const r = new PinResolver(LOGIC_FAMILIES.AVR_5V);
    expect(r.resolve(2, 4.5)).toBe(true);
    expect(r.resolve(3, 0.2)).toBe(false);
    expect(r.resolve(2, 2.0)).toBe(true); // pin 2 held, unaffected by pin 3
    r.reset();
    // After reset the undefined region falls back to the midpoint rule.
    expect(r.resolve(2, 2.0)).toBe(false);
  });
});
