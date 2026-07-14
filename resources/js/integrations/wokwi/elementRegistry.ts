/**
 * Live registry of mounted part elements, keyed by component id. Protocol
 * decoders (OLED framebuffer, LCD characters) push updates directly onto the
 * rendered web component at emulation speed — far faster than the React
 * state cadence, and without routing megabytes of pixels through context.
 */
const elements = new Map<string, HTMLElement>();

/** Register a mounted element; returns the matching unregister function. */
export function registerPartElement(componentId: string, element: HTMLElement): () => void {
  elements.set(componentId, element);
  return () => {
    if (elements.get(componentId) === element) elements.delete(componentId);
  };
}

export function getPartElement(componentId: string): HTMLElement | undefined {
  return elements.get(componentId);
}
