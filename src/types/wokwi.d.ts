
// Type definitions for wokwi-elements
// This file declares the custom elements from the wokwi-elements library

declare namespace JSX {
  interface IntrinsicElements {
    'wokwi-led': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color?: string;
      value?: number | string;
      label?: string;
    };
    'wokwi-resistor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: string;
      bands?: number;
    };
    'wokwi-capacitor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: string;
    };
    'wokwi-battery': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      voltage?: number | string;
    };
    'wokwi-arduino-uno': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-arduino-nano': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-esp32-devkit-v1': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-pushbutton': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color?: string;
      label?: string;
    };
    'wokwi-slide-switch': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: boolean | string;
    };
    'wokwi-potentiometer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: number | string;
    };
    'wokwi-buzzer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      frequency?: number | string;
    };
    'wokwi-servo': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      horn?: string;
      angle?: number | string;
    };
    'wokwi-lcd1602': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      text?: string;
      background?: string;
    };
    'wokwi-7segment': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: number | string;
      color?: string;
    };
    'wokwi-membrane-keypad': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-stepper-motor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      speed?: number | string;
    };
    'wokwi-relay': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: boolean | string;
    };
    'wokwi-ir-remote': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-ir-receiver': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-dht22': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-logic-analyzer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-show-pins': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // Additional Wokwi elements from the official library
    'wokwi-arduino-mega': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-arduino-leonardo': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-arduino-micro': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-breadboard': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color?: string;
    };
    'wokwi-analog-joystick': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-bicolor-led': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color1?: string;
      color2?: string;
    };
    'wokwi-clock-generator': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      frequency?: number | string;
    };
    'wokwi-crystal': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      frequency?: number | string;
    };
    'wokwi-hc-sr04': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-ky-040': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-lcd2004': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      text?: string;
      background?: string;
    };
    'wokwi-led-bar-graph': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color?: string;
      values?: string;
    };
    'wokwi-led-matrix': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color?: string;
      values?: string;
    };
    'wokwi-microphone': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-mpu6050': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-max7219-matrix': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-neopixel': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color?: string;
    };
    'wokwi-photoresistor-sensor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-piezo': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-pir-motion-sensor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-raspberrypi-pico': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-rgb-led': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color?: string;
    };
    'wokwi-rotary-dialer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-sd-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-slide-potentiometer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: number | string;
    };
    'wokwi-ssd1306': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-text-lcd1602': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      text?: string;
      background?: string;
    };
    'wokwi-tilt-sensor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-ultrasonic-distance-sensor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-voltage-source': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      voltage?: number | string;
    };
  }
}

// Add the global wokwiElementsLoaded property to the Window interface
interface Window {
  wokwiElementsLoaded?: boolean;
  customElements?: {
    get: (name: string) => any;
    define: (name: string, constructor: CustomElementConstructor, options?: ElementDefinitionOptions) => void;
  };
}
