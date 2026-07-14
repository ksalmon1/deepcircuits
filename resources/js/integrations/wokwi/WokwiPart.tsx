import React, { useEffect, useRef } from 'react';
import { CircuitComponent } from '@/types/component';
import { useProject } from '@/context/ProjectContext';
import { getWokwiPart } from './catalog';
import { registerPartElement } from './elementRegistry';

interface WokwiPartProps {
  data: CircuitComponent;
  activeStates: string[];
}

/**
 * Renders a circuit component as a Wokwi web component (@wokwi/elements).
 *
 * The custom element is created imperatively so its Lit-managed properties
 * (led.value, pushbutton.pressed, ...) can be set directly, and interaction
 * events (e.g. dragging the potentiometer knob) are written back into the
 * component's attributes through the project context.
 */
const WokwiPart: React.FC<WokwiPartProps> = ({ data, activeStates }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const { updateComponent } = useProject();

  // Keep latest data/updateComponent visible to event handlers bound on mount.
  const dataRef = useRef(data);
  dataRef.current = data;
  const updateComponentRef = useRef(updateComponent);
  updateComponentRef.current = updateComponent;

  const spec = getWokwiPart(data.type);

  useEffect(() => {
    if (!spec || !containerRef.current) return;
    const element = document.createElement(spec.tag);
    elementRef.current = element;
    containerRef.current.appendChild(element);
    // Let protocol decoders (displays) push straight onto the element.
    const unregister = registerPartElement(dataRef.current.id, element);

    const unbind = spec.bindEvents?.(element, (patch) => {
      const current = dataRef.current;
      updateComponentRef.current({
        ...current,
        attributes: { ...current.attributes, ...patch },
      });
    });

    return () => {
      unbind?.();
      unregister();
      element.remove();
      elementRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.type]);

  useEffect(() => {
    if (spec && elementRef.current) {
      spec.applyState?.(
        elementRef.current,
        data.attributes || {},
        activeStates,
        data.simulationState?.pinVoltages,
        data.pins,
      );
    }
  }, [spec, data.attributes, activeStates, data.simulationState, data.pins]);

  if (!spec) return null;

  return (
    <div
      ref={containerRef}
      className={`component-wokwi-wrapper ${data.type}-component`}
      data-component-type={data.type}
      data-component-id={data.id}
      data-active-states={activeStates.join(',')}
      style={{ lineHeight: 0 }}
    />
  );
};

export default WokwiPart;
