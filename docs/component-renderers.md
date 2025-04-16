# Adding Component Renderers

This guide explains how to create custom renderers for new circuit component types in the DeepCircuits application.

## Architecture Overview

The application uses a component registry pattern to render different circuit components. This allows for:

1. Component-specific rendering logic
2. Dynamic state updates based on simulation results 
3. Consistent styling and animations

## Best Practices

### Separation of Concerns

- **CircuitComponentNode.tsx**: Generic container for all components
  - Handles common node behavior (pins, connections, rotation)
  - Provides node layout and handles user interaction
  - Uses the component registry to render specific components
  
- **ComponentRenderers/**: Specialized renderers for each component type
  - Each component type has its own renderer (LEDRenderer, ResistorRenderer, etc.)
  - Handles component-specific visual representation and state
  - Contains logic for interpreting simulation data for that component
  
This separation keeps the code modular and easier to maintain.

## File Structure

```
src/
├── components/
│   └── CircuitEditor/
│       ├── ComponentRenderers/
│       │   ├── index.tsx           # Component registry
│       │   ├── LEDRenderer.tsx     # LED component renderer
│       │   └── [YourComponent].tsx # Your new component renderer
│       └── CircuitComponentNode.tsx # Main node component
├── styles/
│   ├── components.css              # Component-specific styles
│   └── simulation.css              # Simulation-related styles
└── types/
    ├── component.ts                # Component type definitions
    └── pin.ts                      # Pin type definitions
```

## Adding a New Component Renderer

### Step 1: Create a New Renderer Component

Create a new file in `src/components/CircuitEditor/ComponentRenderers/` named after your component (e.g., `ResistorRenderer.tsx`):

```tsx
import React, { useMemo } from 'react';
import { CircuitComponent } from '@/types/component';
import '@/styles/components.css';

interface ResistorRendererProps {
  data: CircuitComponent;
}

const ResistorRenderer: React.FC<ResistorRendererProps> = ({ data }) => {
  // Calculate component state based on simulation data
  const resistorState = useMemo(() => {
    if (!data.simulationState?.currents || !data.pins) return null;

    // Identify pins (component-specific logic)
    const pin1 = data.pins[0];
    const pin2 = data.pins[1];
    
    if (!pin1 || !pin2) return null;

    // Get node numbers for simulation data lookup
    const getNodeNumber = (pin: any) => {
      if (pin.spiceNodeNumber !== undefined) return pin.spiceNodeNumber;
      const handleNumber = pin.handle_id?.split('-')[1];
      return handleNumber !== undefined ? parseInt(handleNumber) : undefined;
    };

    const node1 = getNodeNumber(pin1);
    const node2 = getNodeNumber(pin2);
    
    if (node1 === undefined || node2 === undefined) return null;

    // Calculate the current through the resistor (component-specific)
    // You'll need to update this based on your simulation data format
    const current = data.simulationState.currents[`${node1}-${node2}`] || 0;
    
    return {
      current,
      // Add other calculated properties here
    };
  }, [data.simulationState?.currents, data.pins]);

  // Render the component based on its SVG
  if (data.svgPath && typeof data.svgPath === 'string' && data.svgPath.trim().startsWith('<svg')) {
    // Parse the SVG to a DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.svgPath, 'image/svg+xml');
    const svg = doc.documentElement;
    
    // Add CSS classes for styling
    svg.classList.add('resistor-svg');
    
    // Optional: Add state-based classes
    if (resistorState) {
      // For example, highlighting resistors with high current
      if (Math.abs(resistorState.current) > 0.5) {
        svg.classList.add('high-current');
      }
    }
    
    // Update SVG elements based on state
    // Example: highlighting a resistor body based on temperature/current
    const resistorBody = svg.querySelector('#resistor-body');
    if (resistorBody && resistorState) {
      resistorBody.classList.add('resistor-animated-part');
    }
    
    return (
      <div 
        className="component-svg-wrapper" 
        dangerouslySetInnerHTML={{ __html: svg.outerHTML }}
      />
    );
  }

  // Fallback rendering
  return (
    <div style={{ padding: '5px', background: 'rgba(255,255,255,0.8)', border: '1px dashed #ccc' }}>
      Resistor
    </div>
  );
};

export default ResistorRenderer;
```

### Step 2: Update the Component Registry

Add your new renderer to the registry in `src/components/CircuitEditor/ComponentRenderers/index.tsx`:

```tsx
import React from 'react';
import { CircuitComponent } from '@/types/component';
import LEDRenderer from './LEDRenderer';
import ResistorRenderer from './ResistorRenderer';  // Import your new renderer

// Component registry maps component types to specialized renderers
export const componentRenderers: Record<string, React.ComponentType<{data: CircuitComponent}>> = {
  'led': LEDRenderer,
  'resistor': ResistorRenderer,  // Add your new renderer
  // Add more component renderers as needed
};

// ... rest of the file
```

### Step 3: Add Component-Specific CSS

Add styling for your component in `src/styles/components.css`:

```css
/* Existing LED styles */
.led-animated-part {
  transition: fill 0.3s ease, filter 0.3s ease;
}

/* Add styles for your new component */
.resistor-animated-part {
  transition: fill 0.3s ease, stroke 0.3s ease;
}

.resistor-svg {
  --resistor-body-color: #d9d9d9;
}

.resistor-svg.high-current {
  --resistor-body-color: #ffcccc;
}
```

## SVG Requirements

For your component SVG to work correctly with renderers:

1. **Element IDs**: Use consistent IDs for the parts that will be animated or updated
   - Example: `id="resistor-body"` for the main body of a resistor

2. **SVG Structure**: Make sure your SVG is well-formed and uses standard elements
   - Use `<defs>` for gradients, filters, and other reusable elements
   - Place animations in a separate `<style>` element

3. **CSS Variables**: Use CSS variables in your SVG for styles that might change
   - Example: `fill="var(--resistor-body-color)"`

## Simulation Data

Component renderers get simulation data from `data.simulationState`:

```typescript
interface SimulationState {
  voltages: { [nodeId: string]: number };
  currents: { [branchId: string]: number };
  // Add other simulation data as needed
}
```

Make sure your component correctly identifies the relevant nodes for data lookup.

## Pin Identification

Each component type has specific pins with different meanings:

- For LEDs: anode (+) and cathode (-)
- For resistors: two terminals
- For transistors: base, collector, emitter

Your renderer should identify these pins by:
1. Explicit type (`pin.type`)
2. Pin name (e.g., `pin.name.includes('base')`)
3. Pin signals (e.g., `pin.signals.includes('control')`)

## Advanced Features

### 1. Interactive Components

For components that need interactivity (like switches):

```tsx
const SwitchRenderer: React.FC<{data: CircuitComponent}> = ({ data }) => {
  const [isOn, setIsOn] = useState(false);
  
  const handleClick = () => {
    setIsOn(prev => !prev);
    // You might need to trigger a circuit update here
  };
  
  return (
    <div onClick={handleClick}>
      {/* Render switch based on isOn state */}
    </div>
  );
};
```

### 2. Animated Components

For components with complex animations:

```tsx
// In your CSS
@keyframes pulse {
  0% { opacity: 0.5; }
  100% { opacity: 1; }
}

.pulsing-component {
  animation: pulse 1s infinite alternate;
}
```

### 3. Debugging Components

Add voltage/current values for debugging:

```tsx
const DebugRenderer: React.FC<{data: CircuitComponent}> = ({ data }) => {
  const nodeVoltages = data.simulationState?.voltages;
  
  return (
    <div>
      {data.pins.map((pin, i) => (
        <div key={i}>
          Pin {i}: {nodeVoltages?.[pin.spiceNodeNumber] || 'N/A'} V
        </div>
      ))}
    </div>
  );
};
```

## Testing Your Renderer

1. Create a circuit with your new component
2. Run a simulation
3. Check that your component renders correctly with the simulation data
4. Verify that animations and state changes work as expected

## Common Issues

- **SVG not displaying**: Check for proper SVG structure and required IDs
- **No state updates**: Verify that simulation data is correct and pins are identified
- **CSS not applying**: Make sure CSS variables and classes are correctly set
- **Performance issues**: Use `useMemo` for expensive calculations 