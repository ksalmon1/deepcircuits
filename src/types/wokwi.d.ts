
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
    'wokwi-arduino-mega': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-arduino-mkr1000': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-esp32-devkit-v1': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-raspberry-pi-pico': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
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
    'wokwi-dht22': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      temperature?: number | string;
      humidity?: number | string;
    };
    'wokwi-logic-analyzer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-neopixel': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color?: string;
    };
    'wokwi-piezo': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-ultrasonic-distance-sensor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      distance?: number | string;
    };
    'wokwi-rgb-led': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color?: string;
      cathode?: boolean | string;
    };
    'wokwi-timer-ic': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-photoresistor-sensor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: number | string;
    };
    'wokwi-temperature-sensor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: number | string;
    };
    'wokwi-hall-effect-sensor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-ds1307': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-ds18b20': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      temperature?: number | string;
    };
    'wokwi-breadboard': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-mpu6050': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-ssd1306': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-hc-sr04': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      distance?: number | string;
    };
    'wokwi-max7219-matrix': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-pir-motion-sensor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      activated?: boolean | string;
    };
    'wokwi-gas-sensor': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: number | string;
    };
    'wokwi-microsd-card': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-show-pins': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-2x16-lcd-pcf8574': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      text?: string;
    };
    'wokwi-arduino-nano-33-ble-sense': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-attiny85': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-bme280': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      temperature?: number | string;
      pressure?: number | string;
      humidity?: number | string;
    };
    'wokwi-led-bar-graph': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color?: string;
      values?: string;
    };
    'wokwi-led-matrix': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-led-ring': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      color?: string;
      values?: string;
    };
    'wokwi-microbit': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-ht16k33': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-tca9548a': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-rtc-ds1307': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-analog-joystick': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      xValue?: number | string;
      yValue?: number | string;
      buttonPressed?: boolean | string;
    };
    'wokwi-ttp223': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-ili9341': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-st7789': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-ssd1351': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-level-shifter': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-display-spi': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-oled-spi': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-servo-sg90': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      angle?: number | string;
    };
    'wokwi-keypad': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-braille-display': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-buzzer-passive': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    'wokwi-fsr': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: number | string;
    };
    'wokwi-potentiometer-slide': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      value?: number | string;
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
