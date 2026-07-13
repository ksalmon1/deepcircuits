import { describe, it, expect } from 'vitest';
import { buildSpiceMapping, type CircuitComponentLike, type WireLike } from '@/simulation/netlist/buildMapping';
import { generateNetlist } from '@/simulation/spiceService';
import { getSubckt, SUBCKT_LIBRARY } from './subcktLibrary';

const opampPins = [
  { name: 'IN+' },
  { name: 'IN−' },
  { name: 'V+', type: 'power' },
  { name: 'V−' },
  { name: 'OUT' },
];

function opamp(id: string): CircuitComponentLike {
  return { id, type: 'opamp', attributes: { spiceType: 'subckt', subckt: 'LM358' }, pins: opampPins };
}

// Unity-gain buffer: 9V battery, 1k/1k divider into IN+, OUT strapped to IN−.
function bufferCircuit(): { components: CircuitComponentLike[]; wires: WireLike[] } {
  const components: CircuitComponentLike[] = [
    { id: 'bat-1', type: 'voltagesource', attributes: { voltage: 9 }, pins: [{ name: '+' }, { name: '-' }] },
    { id: 'r-1', type: 'resistor', attributes: { resistance: '1k' }, pins: [{ name: '1' }, { name: '2' }] },
    { id: 'r-2', type: 'resistor', attributes: { resistance: '1k' }, pins: [{ name: '1' }, { name: '2' }] },
    opamp('op-1'),
  ];
  const wires: WireLike[] = [
    { id: 'w1', source: 'bat-1', target: 'r-1', sourceHandle: 'pin-0', targetHandle: 'pin-0' },
    { id: 'w2', source: 'r-1', target: 'r-2', sourceHandle: 'pin-1', targetHandle: 'pin-0' },
    { id: 'w3', source: 'r-2', target: 'bat-1', sourceHandle: 'pin-1', targetHandle: 'pin-1' },
    { id: 'w4', source: 'r-1', target: 'op-1', sourceHandle: 'pin-1', targetHandle: 'pin-0' }, // divider -> IN+
    { id: 'w5', source: 'op-1', target: 'op-1', sourceHandle: 'pin-4', targetHandle: 'pin-1' }, // OUT -> IN-
    { id: 'w6', source: 'bat-1', target: 'op-1', sourceHandle: 'pin-0', targetHandle: 'pin-2' }, // V+
    { id: 'w7', source: 'op-1', target: 'bat-1', sourceHandle: 'pin-3', targetHandle: 'pin-1' }, // V-
  ];
  return { components, wires };
}

describe('subckt netlist emission', () => {
  it('emits one deduplicated .subckt block and an X instance line', () => {
    const { components, wires } = bufferCircuit();
    const { componentsForSpice } = buildSpiceMapping(components, wires);
    const netlist = generateNetlist(componentsForSpice);

    expect(netlist).toContain('.subckt LM358 inp inn vcc vee out');
    expect(netlist).toContain('.ends LM358');
    expect(netlist).toMatch(/^Xop1 (\S+ ){5}LM358$/m);
    // Exactly one definition even though the block text mentions the name
    // in .subckt and .ends.
    expect(netlist.match(/\.subckt LM358/g)).toHaveLength(1);
  });

  it('two instances share one .subckt definition', () => {
    const { components, wires } = bufferCircuit();
    components.push(opamp('op-2'));
    wires.push(
      { id: 'w8', source: 'bat-1', target: 'op-2', sourceHandle: 'pin-0', targetHandle: 'pin-2' },
      { id: 'w9', source: 'op-2', target: 'bat-1', sourceHandle: 'pin-3', targetHandle: 'pin-1' },
      { id: 'w10', source: 'r-1', target: 'op-2', sourceHandle: 'pin-1', targetHandle: 'pin-0' },
      { id: 'w11', source: 'op-2', target: 'op-2', sourceHandle: 'pin-4', targetHandle: 'pin-1' },
    );
    const { componentsForSpice } = buildSpiceMapping(components, wires);
    const netlist = generateNetlist(componentsForSpice);

    expect(netlist.match(/\.subckt LM358/g)).toHaveLength(1);
    expect(netlist).toMatch(/^Xop1 /m);
    expect(netlist).toMatch(/^Xop2 /m);
  });

  it('prints every node an X instance touches so results map back to IC pins', () => {
    const { components, wires } = bufferCircuit();
    const { componentsForSpice, pinToNodeMap } = buildSpiceMapping(components, wires);
    const netlist = generateNetlist(componentsForSpice);

    const outNode = pinToNodeMap.get('op-1_pin-4')!;
    expect(outNode).not.toBe('0');
    expect(netlist).toContain(`print v(${outNode})`);
  });

  it('skips an instance whose pin count does not match the subckt ports', () => {
    const bad: CircuitComponentLike = {
      id: 'op-bad',
      type: 'opamp',
      attributes: { spiceType: 'subckt', subckt: 'LM358' },
      pins: [{ name: 'IN+' }, { name: 'OUT' }],
    };
    const { componentsForSpice } = buildSpiceMapping([bad], []);
    const netlist = generateNetlist(componentsForSpice);
    expect(netlist).not.toContain('Xopbad');
    expect(netlist).not.toContain('.subckt LM358');
  });

  it('library lookups are case-insensitive and port counts match the definitions', () => {
    expect(getSubckt('lm358')?.name).toBe('LM358');
    expect(getSubckt('missing')).toBeNull();
    for (const def of Object.values(SUBCKT_LIBRARY)) {
      const portsLine = def.body.split('\n')[0].trim().split(/\s+/);
      // ".subckt <name> <ports...>"
      expect(portsLine.length - 2).toBe(def.ports);
    }
  });
});
