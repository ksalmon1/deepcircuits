
import React, { useEffect, useRef } from 'react';
import { isWokwiLoaded, renderWokwiElement } from '@/integrations/wokwi/WokwiIntegration';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const WokwiDemo = () => {
  const componentsContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Function to attempt rendering when elements are ready
    const attemptRender = () => {
      if (isWokwiLoaded() && componentsContainerRef.current) {
        const container = componentsContainerRef.current;
        container.innerHTML = '';

        // Create a demo circuit with multiple components
        const components = [
          { type: 'wokwi-led', props: { color: 'red', value: '1' } },
          { type: 'wokwi-led', props: { color: 'green', value: '1' } },
          { type: 'wokwi-resistor', props: { value: '1000' } },
          { type: 'wokwi-pushbutton', props: {} },
          { type: 'wokwi-slide-switch', props: {} },
        ];

        // Render each component in its own container
        components.forEach((component, index) => {
          const componentDiv = document.createElement('div');
          componentDiv.id = `component-${index}`;
          componentDiv.className = 'p-4 border rounded-md flex items-center justify-center h-24';
          container.appendChild(componentDiv);
          
          renderWokwiElement(component.type, componentDiv.id, component.props);
        });
        
        // Add Arduino in a separate, larger container
        const arduinoDiv = document.createElement('div');
        arduinoDiv.id = 'arduino-container';
        arduinoDiv.className = 'col-span-2 p-4 border rounded-md flex items-center justify-center h-80';
        container.appendChild(arduinoDiv);
        
        renderWokwiElement('wokwi-arduino-uno', 'arduino-container', {});
      } else {
        // If not loaded yet, try again after a short delay
        setTimeout(attemptRender, 500);
      }
    };

    attemptRender();

    // Cleanup
    return () => {
      if (componentsContainerRef.current) {
        componentsContainerRef.current.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-4xl mx-auto my-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Wokwi Components Demo</h2>
        <Link to="/circuit-editor">
          <Button>
            Open Circuit Editor
          </Button>
        </Link>
      </div>
      
      <div 
        ref={componentsContainerRef} 
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        <div className="flex items-center justify-center h-40 bg-gray-100 rounded-md">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h3 className="font-semibold mb-2">About Wokwi Components</h3>
        <p className="text-gray-600">
          These components are rendered using wokwi-elements web components.
          In the full application, you'll be able to connect these components and simulate circuits.
          Click the "Open Circuit Editor" button to try out the interactive circuit editor.
        </p>
      </div>
    </div>
  );
};

export default WokwiDemo;
