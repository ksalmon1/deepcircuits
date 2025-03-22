
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
  }
}
