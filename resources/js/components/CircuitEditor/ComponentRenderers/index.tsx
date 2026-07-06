import React, { useRef, useEffect } from 'react';
import { CircuitComponent } from '@/types/component';

// Define the interface for animatable elements
interface AnimatableElement {
  properties?: Array<{
    name: string;
    states: Record<string, string>;
  }>;
  transition?: string;
}

/**
 * Evaluate "voltage > x"-style state rules against a measured voltage and
 * return the names of the states whose condition holds.
 */
function evaluateVoltageStateRules(voltage: number, stateRules?: Record<string, string>): string[] {
  const active: string[] = [];
  if (!stateRules) return active;
  Object.entries(stateRules).forEach(([stateName, rule]) => {
    const match = String(rule).match(/voltage\s*(>|>=|<|<=|==|!=)\s*([0-9.]+)/);
    if (!match) return;
    const operator = match[1];
    const threshold = parseFloat(match[2]);
    let conditionMet = false;
    switch (operator) {
      case '>': conditionMet = voltage > threshold; break;
      case '>=': conditionMet = voltage >= threshold; break;
      case '<': conditionMet = voltage < threshold; break;
      case '<=': conditionMet = voltage <= threshold; break;
      case '==': conditionMet = voltage === threshold; break;
      case '!=': conditionMet = voltage !== threshold; break;
    }
    if (conditionMet) active.push(stateName);
  });
  return active;
}

/**
 * Apply an animated SVG attribute value. Plain colors are applied directly;
 * bare element references (e.g. '#ledGradientOn') become url(#...) paint
 * server references, and filters are normalized the same way.
 */
const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function applyAnimatedAttribute(element: Element, name: string, value: string): void {
  if (name === 'fill' && value.startsWith('#') && !HEX_COLOR.test(value)) {
    element.setAttribute(name, `url(${value})`);
  } else if (name === 'filter' && !value.startsWith('url(') && !HEX_COLOR.test(value)) {
    element.setAttribute(name, `url(#${value.replace(/^#/, '')})`);
  } else {
    element.setAttribute(name, value);
  }
}

// Universal ComponentRenderer
const UniversalComponentRenderer: React.FC<{data: CircuitComponent}> = ({ data }) => {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  
  // Get simulation state
  const isOn = data.simulationState?.isOn || false;
  const simulationActiveStates = data.simulationState?.activeStates;
  const activeStates = React.useMemo(
    () => simulationActiveStates || [],
    [simulationActiveStates]
  );
  const pinVoltages = data.simulationState?.pinVoltages;

  // ADDED: Calculate active states directly if we have pinVoltages but no activeStates
  const calculatedActiveStates = React.useMemo(() => {
    if (data.type.toLowerCase() === 'led') {
      // For LEDs, we'll check the simulationState
      // If pinVoltages is unavailable, we can extract component ID and check nodes from data
      const ledId = data.id;
      const componentNumber = ledId.split('-')[1];
      
      // Direct check for voltage in simulationResults
      // This is a hardcoded fallback when simulationState.pinVoltages is missing
      if (!pinVoltages && window.simulationResults) {
        const voltageResults = window.simulationResults.voltages || {};
        const currentResults = window.simulationResults.currents || {};
        
        // Look for component current
        const ledCurrent = currentResults[`Dled${componentNumber}`];
      }
      
      // Regular calculation from pinVoltages if available
      if (pinVoltages && Object.keys(pinVoltages).length > 0) {
        // For LEDs, find anode and cathode pins
        const anodePin = data.pins?.find(p => p.name?.toLowerCase().includes('anode') || p.type === 'anode' || p.name?.includes('(+)'));
        const cathodePin = data.pins?.find(p => p.name?.toLowerCase().includes('cathode') || p.type === 'cathode' || p.name?.includes('(-)'));

        if (anodePin && cathodePin && pinVoltages[anodePin.id] !== undefined && pinVoltages[cathodePin.id] !== undefined) {
          const calculatedVoltage = pinVoltages[anodePin.id] - pinVoltages[cathodePin.id];
          const stateRules = data.attributes?.stateRules as Record<string, string> | undefined;
          const statesFromPins = evaluateVoltageStateRules(calculatedVoltage, stateRules);
          if (statesFromPins.length > 0) {
            return statesFromPins;
          }
        }
      }
      
      // CRITICAL OVERRIDE: If LED is a component in this circuit and simulation was run,
      // check the Circuit Summary in logs for indication that LED is on
      // This allows animation to work even without simulationState.pinVoltages data
      if (data.id.includes('led-') && window.lastCircuitSummary) {
        // Extract the component number to search for in the summary
        const componentNumber = data.id.split('-')[1];
        const ledPattern = new RegExp(`Led\\s*${componentNumber}\\s*\\n[\\s\\S]*?Voltage\\s*Drop:\\s*([0-9.]+)V`, 'i');
        const match = window.lastCircuitSummary.match(ledPattern);
        
        if (match && match[1]) {
          const dropVoltage = parseFloat(match[1]);
          
          // No hardcoded voltage threshold - check stateRules
          // The calculated states we'll return
          const directActiveStates: string[] = [];
          
          // Check state rules if defined in attributes
          const stateRules = data.attributes?.stateRules as Record<string, string> | undefined;
          if (stateRules) {
            
            // Apply custom rules
            Object.entries(stateRules).forEach(([stateName, rule]) => {
              // Basic rule parsing for common formats
              // Match voltage expressions like "voltage > 1.5" or "voltage <= 1.5"
              const voltageRuleMatch = rule.match(/voltage\s*(>|>=|<|<=|==|!=)\s*([0-9.]+)/);
              if (voltageRuleMatch) {
                const operator = voltageRuleMatch[1];
                const threshold = parseFloat(voltageRuleMatch[2]);
                let conditionMet = false;
                
                switch (operator) {
                  case '>': conditionMet = dropVoltage > threshold; break;
                  case '>=': conditionMet = dropVoltage >= threshold; break;
                  case '<': conditionMet = dropVoltage < threshold; break;
                  case '<=': conditionMet = dropVoltage <= threshold; break;
                  case '==': conditionMet = dropVoltage === threshold; break;
                  case '!=': conditionMet = dropVoltage !== threshold; break;
                }
                
                if (conditionMet) {
                  directActiveStates.push(stateName);
                }
              }
            });
          }
          
          if (directActiveStates.length > 0) {
            return directActiveStates;
          }
        }
      }
      
      // No voltage or couldn't calculate
      return [];
    } else if (pinVoltages && Object.keys(pinVoltages).length > 0 && activeStates.length === 0) {
      // Calculate voltage for other components
      let calculatedVoltage = 0;
      
      if (data.pins?.length === 2) {
        // For other 2-pin components, use the first two pins
        const pin1 = data.pins[0];
        const pin2 = data.pins[1];
        if (pin1 && pin2 && pinVoltages[pin1.id] !== undefined && pinVoltages[pin2.id] !== undefined) {
          calculatedVoltage = Math.abs(pinVoltages[pin1.id] - pinVoltages[pin2.id]);
        }
      }
      
      // The calculated states we'll return
      const directActiveStates: string[] = [];
      
      // Check state rules if defined in attributes
      const stateRules = data.attributes?.stateRules as Record<string, string> | undefined;
      if (stateRules) {
        
        // Apply custom rules
        Object.entries(stateRules).forEach(([stateName, rule]) => {
          // Basic rule parsing for common formats
          // Match voltage expressions like "voltage > 1.5" or "voltage <= 1.5"
          const voltageRuleMatch = rule.match(/voltage\s*(>|>=|<|<=|==|!=)\s*([0-9.]+)/);
          if (voltageRuleMatch) {
            const operator = voltageRuleMatch[1];
            const threshold = parseFloat(voltageRuleMatch[2]);
            let conditionMet = false;
            
            switch (operator) {
              case '>': conditionMet = calculatedVoltage > threshold; break;
              case '>=': conditionMet = calculatedVoltage >= threshold; break;
              case '<': conditionMet = calculatedVoltage < threshold; break;
              case '<=': conditionMet = calculatedVoltage <= threshold; break;
              case '==': conditionMet = calculatedVoltage === threshold; break;
              case '!=': conditionMet = calculatedVoltage !== threshold; break;
            }
            
            if (conditionMet) {
              directActiveStates.push(stateName);
            }
          }
        });
      }
      
      return directActiveStates;
    }
    return [];
  }, [data, pinVoltages, activeStates]);
  
  // Only use explicit state rules, no hardcoded values
  const combinedActiveStates = React.useMemo(
    () => [...activeStates, ...calculatedActiveStates],
    [activeStates, calculatedActiveStates]
  );

  // Effect to update the SVG after it's rendered
  useEffect(() => {
    if (!svgContainerRef.current) return;
    
    // If we have animation data, apply it to the SVG elements
    if (data.attributes?.animatableElements) {
      const animatableElements = data.attributes.animatableElements as Record<string, AnimatableElement>;
      
      Object.entries(animatableElements).forEach(([elementId, animatableElement]) => {
        const svgElement = svgContainerRef.current?.querySelector(`#${elementId}`);
        
        if (svgElement) {
          // Process each property for this element
          if (animatableElement.properties && Array.isArray(animatableElement.properties)) {
            // Format: [{ name: 'fill', states: { 'on': '#ledRedOn', 'default': '#ledRedOff' } }]
            animatableElement.properties.forEach(prop => {
              const propName = prop.name;
              const propValues = prop.states;
              
              // Find animation value for active states
              const activeStateIndex = combinedActiveStates.findIndex(state => 
                propValues[state] !== undefined
              );
              
              if (activeStateIndex !== -1) {
                const activeState = combinedActiveStates[activeStateIndex];
                const value = propValues[activeState];
                
                // Apply the property - generic handling for any component type
                applyAnimatedAttribute(svgElement, propName, value);
              } else if (propValues['default'] !== undefined) {
                // Use default value if no active state matches
                const defaultValue = propValues['default'];
                
                // Apply default - generic handling for any component type
                applyAnimatedAttribute(svgElement, propName, defaultValue);
              }
            });
          }
        }
      });
    }
  }, [data, combinedActiveStates]);

  // If we have an SVG path, use it
  if (data.svgPath && typeof data.svgPath === 'string' && data.svgPath.trim().startsWith('<svg')) {
    // Parse the SVG to modify its properties
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.svgPath, 'image/svg+xml');
    const svg = doc.documentElement;

    // Add component type as a class for basic styling if needed
    svg.classList.add(`${data.type}-svg`);
    
    // Add data attributes for debugging/identification
    svg.setAttribute('data-component-type', data.type);
    svg.setAttribute('data-component-id', data.id);
    svg.setAttribute('data-is-on', (isOn || combinedActiveStates.includes('on')).toString());
    svg.setAttribute('data-active-states', combinedActiveStates.join(','));
    
    // Add voltage information if available
    if (pinVoltages && Object.keys(pinVoltages).length > 0) {
      Object.entries(pinVoltages).forEach(([pinId, voltage]) => {
        svg.setAttribute(`data-pin-${pinId}-voltage`, voltage.toFixed(2));
      });
    }

    // Return the modified SVG
    return (
      <div 
        ref={svgContainerRef}
        className={`component-svg-wrapper ${data.type}-component`}
        dangerouslySetInnerHTML={{ __html: svg.outerHTML }}
      />
    );
  }

  // Fallback rendering if no SVG
  return (
    <div 
      className={`${data.type}-fallback`}
      style={{ 
        padding: '5px', 
        background: 'rgba(255,255,255,0.8)', 
        border: '1px dashed #ccc',
        borderRadius: '4px',
        textAlign: 'center'
      }}
    >
      {data.type.charAt(0).toUpperCase() + data.type.slice(1)}
      {isOn !== undefined && ` (${isOn ? 'ON' : 'OFF'})`}
      {combinedActiveStates.length > 0 && ` - ${combinedActiveStates.join(', ')}`}
      {data.attributes?.value !== undefined && data.attributes.value !== null &&
        <div style={{ fontSize: '0.8em', marginTop: '2px' }}>
          {String(data.attributes.value)}
          {data.attributes?.unit ? String(data.attributes.unit) : null}
        </div>
      }
    </div>
  );
};

// Add global property for the circuit summary to be accessed cross-component
declare global {
  interface Window {
    simulationResults?: {
      voltages: Record<string, number>;
      currents: Record<string, number>;
    };
    lastCircuitSummary?: string;
  }
}

// Component registry maps component types to specialized renderers
export const componentRenderers: Record<string, React.ComponentType<{data: CircuitComponent}>> = {
  'led': UniversalComponentRenderer,
  'resistor': UniversalComponentRenderer,
  'battery': UniversalComponentRenderer,
  // Add more component renderers as needed
};

/**
 * Renders a circuit component based on its type
 * Uses the universal renderer for all components
 */
export const renderComponent = (data: CircuitComponent) => {
  return <UniversalComponentRenderer data={data} />;
}; 