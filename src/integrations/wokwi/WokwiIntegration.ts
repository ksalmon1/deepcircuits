
// This file is responsible for managing the integration with Wokwi elements

// Store a flag to track if Wokwi elements have been loaded
let wokwiElementsLoaded = false;

// List of original Wokwi components
export const ORIGINAL_WOKWI_COMPONENTS = [
  'wokwi-led',
  'wokwi-resistor',
  'wokwi-buzzer',
  'wokwi-pushbutton',
  'wokwi-switch',
  'wokwi-servo',
  'wokwi-7segment',
  'wokwi-arduino-uno',
  'wokwi-arduino-nano',
  'wokwi-arduino-mega',
  'wokwi-esp32-devkit-v1',
  'wokwi-lcd1602',
  'wokwi-dht22',
  'wokwi-potentiometer',
  'wokwi-breadboard',
  'wokwi-capacitor',
  'wokwi-rgb-led',
  'wokwi-lcd2004',
  'wokwi-bicolor-led',
  'wokwi-relay',
  'wokwi-stepper-motor',
  'wokwi-membrane-keypad',
  'wokwi-slide-switch',
  'wokwi-logic-analyzer',
  'wokwi-voltage-source',
  'wokwi-arduino-leonardo',
  'wokwi-arduino-micro',
  'wokwi-raspberrypi-pico',
  'wokwi-ssd1306',
  'wokwi-ir-receiver',
  'wokwi-ir-remote',
  'wokwi-neopixel',
  'wokwi-led-bar-graph',
  'wokwi-max7219-matrix',
  'wokwi-led-matrix',
  'wokwi-microphone',
  'wokwi-piezo',
  'wokwi-photoresistor-sensor',
  'wokwi-pir-motion-sensor',
  'wokwi-ky-040',
  'wokwi-rotary-dialer',
  'wokwi-slide-potentiometer',
  'wokwi-ultrasonic-distance-sensor',
  'wokwi-analog-joystick',
  'wokwi-clock-generator',
  'wokwi-crystal',
  'wokwi-tilt-sensor',
  'wokwi-text-lcd1602',
  'wokwi-battery',
  'wokwi-mpu6050',
  'wokwi-hc-sr04',
  'wokwi-sd-card',
];

// Check if Wokwi elements are loaded
export const isWokwiLoaded = (): boolean => {
  console.log("Checking if Wokwi elements are loaded:", wokwiElementsLoaded);
  
  // First check our internal flag
  if (wokwiElementsLoaded) {
    return true;
  }
  
  // As a fallback, check if any Wokwi element is defined in the custom elements registry
  try {
    // Check a few common components to see if they're registered
    const testElement = customElements.get('wokwi-led');
    if (testElement) {
      console.log("Wokwi elements found in registry");
      wokwiElementsLoaded = true;
      return true;
    }
  } catch (e) {
    console.error("Error checking customElements registry:", e);
  }
  
  return false;
};

// Force load Wokwi elements
export const forceLoadWokwiElements = async (): Promise<boolean> => {
  // If already loaded, don't reload
  if (isWokwiLoaded()) {
    console.log("Wokwi elements already loaded, skipping import");
    return true;
  }
  
  try {
    console.log("Loading Wokwi elements...");
    
    // Dynamic import to avoid duplicate registration
    await import('@wokwi/elements');
    
    console.log("Wokwi elements loaded successfully");
    wokwiElementsLoaded = true;
    return true;
  } catch (error) {
    console.error("Failed to load Wokwi elements:", error);
    return false;
  }
};

// Initialize Wokwi elements on module load
if (typeof window !== 'undefined') {
  // Check if already loaded
  if (!isWokwiLoaded()) {
    console.log("Initializing Wokwi elements from WokwiIntegration.ts");
    
    // We don't await this to avoid blocking - initial import is done in main.tsx
    forceLoadWokwiElements().then(result => {
      console.log("Wokwi elements initialization result:", result);
    });
  }
}
