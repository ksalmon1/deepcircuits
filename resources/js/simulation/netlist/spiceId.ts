/**
 * A component instance id maps to a SPICE device name with hyphens stripped
 * (SPICE device names can't contain '-'). ngspice also lowercases device
 * names in its output, so result-mapping uses the lowercased form. Both
 * transforms were previously inlined in several places — this is the single
 * source of truth.
 */
export function spiceId(componentId: string): string {
  return componentId.replace(/-/g, '');
}

/** Lowercased form, matching how ngspice echoes device names in results. */
export function spiceIdLower(componentId: string): string {
  return spiceId(componentId).toLowerCase();
}
