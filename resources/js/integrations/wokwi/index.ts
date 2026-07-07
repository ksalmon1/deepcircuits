/**
 * Wokwi elements integration (https://github.com/wokwi/wokwi-elements).
 *
 * Importing this module registers the Wokwi custom elements and plugs a
 * renderer into the shared component registry so pin lookups
 * (getComponentPinPositions / createCircuitComponent) work for Wokwi parts.
 */
import componentRegistry, { ComponentRenderer } from '@/integrations/components/registry';
import { wokwiCatalog, getWokwiPart } from './catalog';

const wokwiRenderer: ComponentRenderer = {
  canRender(componentType: string): boolean {
    return getWokwiPart(componentType) !== null;
  },

  render(element: HTMLElement, componentType: string): void {
    const spec = getWokwiPart(componentType);
    if (!spec) return;
    element.innerHTML = '';
    element.appendChild(document.createElement(spec.tag));
  },

  getComponentPinInfo(componentType: string) {
    const spec = getWokwiPart(componentType);
    return spec ? spec.pins.map((pin) => ({ ...pin, signals: [...pin.signals] })) : [];
  },

  cleanup(element: HTMLElement): void {
    element.innerHTML = '';
  },
};

componentRegistry.registerRenderer(wokwiRenderer);

export { wokwiCatalog, getWokwiPart };
export type { WokwiPartSpec, WokwiPinSpec } from './catalog';
export { default as WokwiPart } from './WokwiPart';
