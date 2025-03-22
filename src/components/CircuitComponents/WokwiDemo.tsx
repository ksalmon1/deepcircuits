
import React, { useEffect, useRef } from 'react';
import { isWokwiLoaded, renderWokwiElement } from '@/integrations/wokwi/WokwiIntegration';

export const WokwiDemo = () => {
  const ledContainerRef = useRef<HTMLDivElement>(null);
  const arduinoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Function to attempt rendering when elements are ready
    const attemptRender = () => {
      if (isWokwiLoaded() && ledContainerRef.current && arduinoContainerRef.current) {
        // Create a red LED
        const ledElement = document.createElement('wokwi-led');
        ledElement.setAttribute('color', 'red');
        ledElement.setAttribute('value', '1'); // Turn it on
        ledContainerRef.current.innerHTML = '';
        ledContainerRef.current.appendChild(ledElement);

        // Create an Arduino Uno
        const arduinoElement = document.createElement('wokwi-arduino-uno');
        arduinoContainerRef.current.innerHTML = '';
        arduinoContainerRef.current.appendChild(arduinoElement);
      } else {
        // If not loaded yet, try again after a short delay
        setTimeout(attemptRender, 500);
      }
    };

    attemptRender();

    // Cleanup
    return () => {
      if (ledContainerRef.current) ledContainerRef.current.innerHTML = '';
      if (arduinoContainerRef.current) arduinoContainerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Wokwi Components Demo</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border p-4 rounded-md">
          <h3 className="text-lg font-medium mb-2">LED Component</h3>
          <div ref={ledContainerRef} className="h-20 flex items-center justify-center"></div>
        </div>
        
        <div className="border p-4 rounded-md">
          <h3 className="text-lg font-medium mb-2">Arduino Uno</h3>
          <div ref={arduinoContainerRef} className="h-80 flex items-center justify-center"></div>
        </div>
      </div>
      
      <p className="mt-4 text-gray-600">
        These components are rendered using wokwi-elements web components.
        In the full application, you'll be able to connect these components and simulate circuits.
      </p>
    </div>
  );
};

export default WokwiDemo;
