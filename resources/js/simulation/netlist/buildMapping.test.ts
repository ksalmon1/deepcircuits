import { describe, it, expect } from 'vitest';
import { buildSpiceMapping, type CircuitComponentLike, type WireLike } from './buildMapping';

/** Convenience: node assigned to a component pin. */
function node(map: Map<string, string>, compId: string, pin: number): string | undefined {
  return map.get(`${compId}_pin-${pin}`);
}

const battery = (id: string): CircuitComponentLike => ({
  id,
  type: 'voltagesource',
  attributes: { voltage: 9 },
  pins: [{ name: '+' }, { name: '-' }],
});
const resistor = (id: string): CircuitComponentLike => ({
  id,
  type: 'resistor',
  attributes: { resistance: '1k' },
  pins: [{ name: '1' }, { name: '2' }],
});
const wire = (id: string, source: string, s: number, target: string, t: number): WireLike => ({
  id,
  source,
  target,
  sourceHandle: `pin-${s}`,
  targetHandle: `pin-${t}`,
});

describe('buildSpiceMapping', () => {
  it('grounds a voltage-source negative terminal to node 0', () => {
    const { pinToNodeMap } = buildSpiceMapping([battery('bat')], []);
    expect(node(pinToNodeMap, 'bat', 1)).toBe('0');
    expect(node(pinToNodeMap, 'bat', 0)).not.toBe('0');
  });

  it('wired pins share one node', () => {
    const comps = [battery('bat'), resistor('r1')];
    const wires = [wire('w1', 'bat', 0, 'r1', 0)];
    const { pinToNodeMap } = buildSpiceMapping(comps, wires);
    expect(node(pinToNodeMap, 'bat', 0)).toBe(node(pinToNodeMap, 'r1', 0));
  });

  it('resolves a two-resistor divider into three distinct nets (+, midpoint, gnd)', () => {
    const comps = [battery('bat'), resistor('r1'), resistor('r2')];
    const wires = [
      wire('w1', 'bat', 0, 'r1', 0), // + -> R1
      wire('w2', 'r1', 1, 'r2', 0), // R1 -> R2 (midpoint)
      wire('w3', 'r2', 1, 'bat', 1), // R2 -> battery -
    ];
    const { pinToNodeMap, componentsForSpice } = buildSpiceMapping(comps, wires);

    const vplus = node(pinToNodeMap, 'bat', 0)!;
    const mid = node(pinToNodeMap, 'r1', 1)!;
    expect(node(pinToNodeMap, 'r1', 0)).toBe(vplus);
    expect(node(pinToNodeMap, 'r2', 0)).toBe(mid);
    expect(node(pinToNodeMap, 'r2', 1)).toBe('0'); // tied to grounded battery -
    expect(node(pinToNodeMap, 'bat', 1)).toBe('0');
    // three distinct nets
    expect(new Set([vplus, mid, '0']).size).toBe(3);

    // spiceConnections are index-aligned with pins
    const batSpice = componentsForSpice.find((c) => c.id === 'bat')!;
    expect(batSpice.spiceConnections).toEqual([vplus, '0']);
  });

  it('honours an explicit ground component via its ground signal', () => {
    const comps: CircuitComponentLike[] = [
      resistor('r1'),
      { id: 'gnd', type: 'ground', pins: [{ name: 'GND', signals: ['ground'] }] },
    ];
    const wires = [wire('w1', 'r1', 1, 'gnd', 0)];
    const { pinToNodeMap } = buildSpiceMapping(comps, wires);
    expect(node(pinToNodeMap, 'gnd', 0)).toBe('0');
    expect(node(pinToNodeMap, 'r1', 1)).toBe('0');
    expect(node(pinToNodeMap, 'r1', 0)).not.toBe('0');
  });

  it('does not ground a passive pin merely named GND when it carries typed metadata', () => {
    const comps: CircuitComponentLike[] = [
      { id: 'pot', type: 'potentiometer', pins: [{ name: 'A (GND)', signals: ['passive'] }, { name: 'W' }] },
    ];
    const { pinToNodeMap } = buildSpiceMapping(comps, []);
    // signals present (typed metadata) → the display name must NOT force ground
    expect(node(pinToNodeMap, 'pot', 0)).not.toBe('0');
  });
});
