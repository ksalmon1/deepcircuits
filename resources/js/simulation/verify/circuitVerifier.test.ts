import { describe, it, expect } from 'vitest';
import { FakeSolverAdapter } from '@/simulation/netlist/adapters/FakeSolverAdapter';
import { verifyCircuit } from './circuitVerifier';
import type { CircuitComponentLike, WireLike } from '@/simulation/netlist/buildMapping';

// A battery driving an LED through a resistor — every rule can be triggered
// from this one circuit purely by what the (fake) solver reports.
const battery: CircuitComponentLike = {
  id: 'bat-1',
  type: 'voltagesource',
  attributes: { voltage: 9, name: 'Battery' },
  pins: [{ name: '+' }, { name: '-' }],
};
const resistor: CircuitComponentLike = {
  id: 'res-1',
  type: 'resistor',
  attributes: { resistance: '100', name: 'R1' },
  pins: [{ name: '1' }, { name: '2' }],
};
const led: CircuitComponentLike = {
  id: 'led-1',
  type: 'led',
  attributes: { name: 'LED1' },
  pins: [{ name: 'anode' }, { name: 'cathode' }],
};
const components = [battery, resistor, led];
const wires: WireLike[] = [
  { id: 'w1', source: 'bat-1', target: 'res-1', sourceHandle: 'pin-0', targetHandle: 'pin-0' },
  { id: 'w2', source: 'res-1', target: 'led-1', sourceHandle: 'pin-1', targetHandle: 'pin-0' },
  { id: 'w3', source: 'led-1', target: 'bat-1', sourceHandle: 'pin-1', targetHandle: 'pin-1' },
];

// Device names arrive lowercased with hyphens stripped (ngspice output form):
// V<bat-1> → 'vbat1', D<led-1> → 'dled1', R<res-1> → 'rres1'.
function solverWith(currents: Record<string, number>) {
  return new FakeSolverAdapter({ voltages: {}, currents });
}

describe('verifyCircuit', () => {
  it('passes a healthy circuit with no findings', async () => {
    const result = await verifyCircuit(components, wires, solverWith({ vbat1: 0.02, dled1: 0.01, rres1: 0.01 }));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.solverError).toBeUndefined();
  });

  it('flags a source delivering more than 500mA as a short circuit', async () => {
    const result = await verifyCircuit(components, wires, solverWith({ vbat1: -2.5, dled1: 0.01, rres1: 0.01 }));
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ code: 'short-circuit', componentId: 'bat-1', severity: 'error' });
    expect(result.errors[0].message).toContain('2.50 A');
  });

  it('flags an LED over its 20mA absolute max', async () => {
    const result = await verifyCircuit(components, wires, solverWith({ vbat1: 0.05, dled1: 0.05, rres1: 0.05 }));
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain('led-overcurrent');
    const finding = result.errors.find((e) => e.code === 'led-overcurrent')!;
    expect(finding.componentId).toBe('led-1');
  });

  it('respects a per-instance LED maxCurrent override', async () => {
    const highPowerLed = { ...led, attributes: { ...led.attributes, maxCurrent: '0.1' } };
    const result = await verifyCircuit(
      [battery, resistor, highPowerLed],
      wires,
      solverWith({ vbat1: 0.05, dled1: 0.05, rres1: 0.05 }),
    );
    expect(result.errors).toEqual([]);
  });

  it('warns about a wired LED that carries no current', async () => {
    const result = await verifyCircuit(components, wires, solverWith({ vbat1: 0, dled1: 0, rres1: 0 }));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({ code: 'dead-indicator', componentId: 'led-1', severity: 'warning' });
  });

  it('does not report a dead indicator when the LED is dangling', async () => {
    // Only w1 — the LED is placed but unwired, so silence is expected.
    const result = await verifyCircuit(components, [wires[0]], solverWith({ vbat1: 0, dled1: 0, rres1: 0 }));
    expect(result.warnings).toEqual([]);
  });

  it('warns when a resistor dissipates more than its power rating', async () => {
    // 0.1A² × 100Ω = 1W against the default ¼W rating.
    const result = await verifyCircuit(components, wires, solverWith({ vbat1: 0.1, dled1: 0.019, rres1: 0.1 }));
    const codes = result.warnings.map((w) => w.code);
    expect(codes).toContain('resistor-overpower');
    const finding = result.warnings.find((w) => w.code === 'resistor-overpower')!;
    expect(finding.componentId).toBe('res-1');
    expect(finding.message).toContain('1.00 W');
  });

  it('respects a per-instance resistor power rating override', async () => {
    const bigResistor = { ...resistor, attributes: { ...resistor.attributes, power: '2' } };
    const result = await verifyCircuit(
      [battery, bigResistor, led],
      wires,
      solverWith({ vbat1: 0.1, dled1: 0.019, rres1: 0.1 }),
    );
    expect(result.warnings).toEqual([]);
  });

  it('surfaces a solver failure without inventing findings', async () => {
    const result = await verifyCircuit(components, wires, new FakeSolverAdapter({ voltages: {}, currents: {}, error: 'ngspice exploded' }));
    expect(result.solverError).toBe('ngspice exploded');
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('stays silent when the solver reports no current for a device', async () => {
    // No keys at all (e.g. the print list omitted the device): rules that
    // need a number must not fire on undefined.
    const result = await verifyCircuit(components, wires, solverWith({}));
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('sends the generated netlist to the solver', async () => {
    const solver = solverWith({});
    await verifyCircuit(components, wires, solver);
    expect(solver.seen).toHaveLength(1);
    expect(solver.seen[0]).toContain('Vbat1');
    expect(solver.seen[0]).toContain('Dled1');
  });
});
