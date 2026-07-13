/**
 * Pin → SPICE-node assignment for a circuit. This is the single place that
 * decides which physical pins share an electrical node, and it is consumed by
 * BOTH netlist generation and result mapping so the two always agree.
 *
 * Extracted from SimulationContext so it can be unit-tested in isolation. The
 * net-merging (previously a bounded fixed-point re-scan) is now a single
 * union-find pass; ground and voltage-source-negative pins are pinned to
 * node "0".
 */
import type { AppComponentModel } from '@/simulation/appStateTypes';
import { pinHandleId } from '@/utils/pinUtils';
import { UnionFind } from './unionFind';

/** Raw component shape as held in editor/project state. */
export interface CircuitComponentLike {
  id: string;
  type: string;
  attributes?: Record<string, unknown>;
  pins?: Array<{ id?: string; handle_id?: string; name?: string; type?: string; signals?: string[] }>;
}

/** Raw wire shape (React Flow edge). */
export interface WireLike {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/** Map of `${componentId}_${pinId}` → SPICE node name. */
export type PinToSpiceNodeMap = Map<string, string>;

export interface ComponentForSpice extends AppComponentModel {
  /** Node name per pin, index-aligned with `pins`. */
  spiceConnections: string[];
}

type NormalizedPin = { id: string; name?: string; type?: string; signals?: string[] };
type NormalizedComponent = AppComponentModel & { pins: NormalizedPin[] };

/**
 * Ground detection keyed on the pin's typed metadata. The display-name check
 * applies only to legacy pins with no type/signals, so a label like 'A (GND)'
 * on a passive pin can never accidentally ground a net. A conventional
 * voltage-source / power part also grounds its negative (second) terminal.
 */
function isGroundPin(comp: NormalizedComponent, pin: NormalizedPin, pinIndex: number): boolean {
  const name = pin.name?.toUpperCase();
  const signals = (pin.signals || []).map((s) => String(s).toLowerCase());
  const hasTypedMetadata = signals.length > 0 || Boolean(pin.type);
  if (
    pin.type === 'ground' ||
    signals.includes('ground') ||
    (!hasTypedMetadata && (name === 'GND' || name === 'GROUND'))
  ) {
    return true;
  }
  const spiceType =
    typeof comp.properties?.spiceType === 'string'
      ? (comp.properties.spiceType as string).toLowerCase()
      : comp.type.toLowerCase();
  if ((spiceType === 'voltagesource' || spiceType === 'power') && comp.pins.length > 1 && pinIndex === 1) {
    const isPositive =
      pin.type === 'power' || signals.includes('power') || name === 'POSITIVE' || name === '+';
    if (!isPositive) return true;
  }
  return false;
}

const pinKeyOf = (componentId: string, pinId: string) => `${componentId}_${pinId}`;

/**
 * Build the pin→node map and the component list augmented with per-pin node
 * names. Throws if a pin cannot be mapped (should never happen — every pin is
 * added to the union-find).
 */
export function buildSpiceMapping(
  components: CircuitComponentLike[],
  wires: WireLike[],
): { componentsForSpice: ComponentForSpice[]; pinToNodeMap: PinToSpiceNodeMap } {
  const appComponents: NormalizedComponent[] = components.map((instance) => ({
    id: instance.id,
    type: instance.type,
    properties: { ...(instance.attributes || {}) },
    pins: (instance.pins || []).map((pin, index) => ({
      id: pinHandleId(pin, index),
      name: pin.name,
      type: pin.type,
      signals: pin.signals,
    })),
  }));

  const uf = new UnionFind();
  const knownKeys = new Set<string>();
  for (const comp of appComponents) {
    comp.pins.forEach((pin, index) => {
      const key = pinKeyOf(comp.id, pin.id);
      uf.add(key);
      knownKeys.add(key);
      if (isGroundPin(comp, pin, index)) uf.setCanonical(key, '0');
    });
  }

  for (const edge of wires || []) {
    const fromKey = pinKeyOf(edge.source, edge.sourceHandle || '');
    const toKey = pinKeyOf(edge.target, edge.targetHandle || '');
    if (knownKeys.has(fromKey) && knownKeys.has(toKey)) uf.union(fromKey, toKey);
  }

  // Name each net: a set pinned to "0" is ground, otherwise the next integer.
  const pinToNodeMap: PinToSpiceNodeMap = new Map();
  const rootToNode = new Map<string, string>();
  let nextNode = 1;
  for (const comp of appComponents) {
    for (const pin of comp.pins) {
      const key = pinKeyOf(comp.id, pin.id);
      const root = uf.find(key);
      if (!rootToNode.has(root)) {
        rootToNode.set(root, uf.getCanonical(key) ?? String(nextNode++));
      }
      pinToNodeMap.set(key, rootToNode.get(root)!);
    }
  }

  const componentsForSpice: ComponentForSpice[] = appComponents.map((comp) => ({
    ...comp,
    spiceConnections: comp.pins.map((pin) => {
      const node = pinToNodeMap.get(pinKeyOf(comp.id, pin.id));
      if (node === undefined) {
        throw new Error(
          `Pin ${pin.id} ('${pin.name}') on component ${comp.id} (${comp.type}) could not be mapped to a SPICE node.`,
        );
      }
      return node;
    }),
  }));

  return { componentsForSpice, pinToNodeMap };
}
