import { describe, it, expect } from 'vitest';
import { parseNgspiceResults } from './parseResults';

const sample = [
  '--- BEGIN SIMULATION RESULTS ---',
  'NODE VOLTAGES:',
  'v(4) = 5.000000e+00',
  'v(82) = 1.800000e+00',
  'DEVICE CURRENTS:',
  '@rr1[i] = 9.000000e-03', // resistor
  '@dled1[id] = 7.100000e-03', // diode / LED
  '@ics1[dc] = 5.000000e-03', // current source
  'i(lind1) = 1.200000e-03', // inductor
  '--- END SIMULATION RESULTS ---',
  'ignored trailing line',
];

describe('parseNgspiceResults', () => {
  it('parses node voltages keyed by node name', () => {
    const r = parseNgspiceResults(sample);
    expect(r.voltages['4']).toBeCloseTo(5);
    expect(r.voltages['82']).toBeCloseTo(1.8);
  });

  it('parses ALL device-current flavors (i / id / dc / inductor)', () => {
    const r = parseNgspiceResults(sample);
    expect(r.currents['rr1']).toBeCloseTo(0.009);
    expect(r.currents['dled1']).toBeCloseTo(0.0071); // was missed by the old [i]-only regex
    expect(r.currents['ics1']).toBeCloseTo(0.005);
    expect(r.currents['lind1']).toBeCloseTo(0.0012);
  });

  it('stops at the END marker and ignores trailing lines', () => {
    const r = parseNgspiceResults(sample);
    expect(Object.keys(r.voltages)).toHaveLength(2);
    expect(Object.keys(r.currents)).toHaveLength(4);
  });

  it('returns empty maps for output with no result section', () => {
    const r = parseNgspiceResults(['some ngspice banner', 'no results here']);
    expect(r.voltages).toEqual({});
    expect(r.currents).toEqual({});
  });
});
