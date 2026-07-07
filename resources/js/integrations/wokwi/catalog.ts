/**
 * Element parts catalog
 *
 * The component library renders through the @wokwi/elements web components
 * (an implementation detail — the app never surfaces the wokwi name). The
 * part list, pin positions, and electrical properties come from the
 * generated manifest (resources/data/wokwi-parts.json, rebuilt with
 * scripts/build-parts-manifest.mjs); this module layers the interactive
 * behaviours on top: pushing simulation state onto the live elements and
 * wiring element events back into component attributes.
 */
import '@wokwi/elements';

import type { ArduinoUnoElement } from '@wokwi/elements/dist/esm/arduino-uno-element';
import type { ArduinoNanoElement } from '@wokwi/elements/dist/esm/arduino-nano-element';
import type { LEDElement } from '@wokwi/elements/dist/esm/led-element';
import type { RGBLedElement } from '@wokwi/elements/dist/esm/rgb-led-element';
import type { ResistorElement } from '@wokwi/elements/dist/esm/resistor-element';
import type { PushbuttonElement } from '@wokwi/elements/dist/esm/pushbutton-element';
import type { Pushbutton6mmElement } from '@wokwi/elements/dist/esm/pushbutton-6mm-element';
import type { PotentiometerElement } from '@wokwi/elements/dist/esm/potentiometer-element';
import type { SlidePotentiometerElement } from '@wokwi/elements/dist/esm/slide-potentiometer-element';
import type { SlideSwitchElement } from '@wokwi/elements/dist/esm/slide-switch-element';
import type { BuzzerElement } from '@wokwi/elements/dist/esm/buzzer-element';

import { parseSpiceNumber } from '@/simulation/spiceService';
import type { ComponentPin } from '@/types/pin';
import partsManifest from '../../../data/wokwi-parts.json';

export interface WokwiPinSpec {
  name: string;
  x: number;
  y: number;
  signals: string[];
  handle_id: string;
  pin_type?: string;
}

type PinVoltages = { [pinId: string]: number };

export interface WokwiPartSpec {
  /** Clean component type, e.g. 'led' (doubles as the manifest key). */
  type: string;
  /** Custom element tag name, e.g. 'wokwi-led'. */
  tag: string;
  name: string;
  category: string;
  description: string;
  /** Pins in the order the SPICE layer expects, positioned on the artwork. */
  pins: WokwiPinSpec[];
  /** Default instance attributes (includes spiceType for simulatable parts). */
  properties: Record<string, unknown>;
  /** Push component attributes and simulation state onto the live element. */
  applyState?: (
    element: HTMLElement,
    attributes: Record<string, unknown>,
    activeStates: string[],
    pinVoltages?: PinVoltages,
    pins?: ComponentPin[],
  ) => void;
  /** Wire element interaction events back into component attributes. */
  bindEvents?: (
    element: HTMLElement,
    updateAttributes: (patch: Record<string, unknown>) => void,
  ) => () => void;
}

/**
 * Drive an emulated board element's own indicators (Uno and Nano share the
 * same ATmega328p layout): the pin-13 LED follows the solved voltage on pin
 * 13, and the power LED lights whenever the simulation has produced results.
 */
const applyBoardIndicators: WokwiPartSpec['applyState'] = (element, _attributes, _activeStates, pinVoltages, pins) => {
  const board = element as ArduinoUnoElement | ArduinoNanoElement;
  const powered = !!pinVoltages && Object.keys(pinVoltages).length > 0;
  board.ledPower = powered;
  const pin13 = pins?.find((pin) => pin.name === '13');
  const volts = pin13 ? pinVoltages?.[pin13.id] : undefined;
  board.led13 = powered && volts !== undefined && volts > 2.5;
};

/** Momentary press/release wiring shared by the pushbutton variants. */
function bindPressEvents(
  element: HTMLElement,
  updateAttributes: (patch: Record<string, unknown>) => void,
): () => void {
  const press = () => updateAttributes({ closed: true });
  const release = () => updateAttributes({ closed: false });
  element.addEventListener('button-press', press);
  element.addEventListener('button-release', release);
  return () => {
    element.removeEventListener('button-press', press);
    element.removeEventListener('button-release', release);
  };
}

/**
 * Interactive behaviours for the parts whose visuals react to simulation
 * state or whose controls write back into component attributes.
 */
const behaviors: Record<string, Pick<WokwiPartSpec, 'applyState' | 'bindEvents'>> = {
  led: {
    applyState(element, attributes, activeStates) {
      const led = element as LEDElement;
      led.value = activeStates.includes('on');
      if (typeof attributes.color === 'string' && attributes.color) {
        led.color = attributes.color;
      }
    },
  },
  'rgb-led': {
    // Pins: [Red, Common(-), Green, Blue]. Each channel lights from its own
    // anode-to-common voltage.
    applyState(element, _attributes, _activeStates, pinVoltages, pins) {
      const led = element as RGBLedElement;
      const voltage = (pinIndex: number) => {
        const pinId = pins?.[pinIndex]?.id;
        return pinId !== undefined ? pinVoltages?.[pinId] : undefined;
      };
      const common = voltage(1);
      const channel = (pinIndex: number) => {
        const v = voltage(pinIndex);
        return v !== undefined && common !== undefined && v - common > 1.5 ? 1 : 0;
      };
      led.ledRed = channel(0);
      led.ledGreen = channel(2);
      led.ledBlue = channel(3);
    },
  },
  resistor: {
    applyState(element, attributes) {
      const resistor = element as ResistorElement;
      resistor.value = String(parseSpiceNumber(attributes.resistance, 1000));
    },
  },
  pushbutton: {
    applyState(element, attributes, activeStates) {
      const button = element as PushbuttonElement;
      button.pressed = activeStates.includes('closed');
      if (typeof attributes.color === 'string' && attributes.color) {
        button.color = attributes.color;
      }
    },
    bindEvents: bindPressEvents,
  },
  'pushbutton-6mm': {
    applyState(element, _attributes, activeStates) {
      (element as Pushbutton6mmElement).pressed = activeStates.includes('closed');
    },
    bindEvents: bindPressEvents,
  },
  'arduino-uno': { applyState: applyBoardIndicators },
  'arduino-nano': { applyState: applyBoardIndicators },
  'slide-switch': {
    applyState(element, _attributes, activeStates) {
      (element as SlideSwitchElement).value = activeStates.includes('closed') ? 1 : 0;
    },
  },
  buzzer: {
    applyState(element, _attributes, activeStates) {
      (element as BuzzerElement).hasSignal = activeStates.includes('on');
    },
  },
  potentiometer: {
    applyState(element, attributes) {
      const pot = element as PotentiometerElement;
      pot.min = 0;
      pot.max = 1;
      pot.value = Math.min(Math.max(parseSpiceNumber(attributes.position, 0.5), 0), 1);
    },
    bindEvents(element, updateAttributes) {
      const onInput = () => updateAttributes({ position: (element as PotentiometerElement).value });
      element.addEventListener('input', onInput);
      return () => element.removeEventListener('input', onInput);
    },
  },
  'slide-potentiometer': {
    applyState(element, attributes) {
      const pot = element as SlidePotentiometerElement;
      pot.min = 0;
      pot.max = 1;
      pot.value = Math.min(Math.max(parseSpiceNumber(attributes.position, 0.5), 0), 1);
    },
    bindEvents(element, updateAttributes) {
      const onInput = () => updateAttributes({ position: (element as SlidePotentiometerElement).value });
      element.addEventListener('input', onInput);
      return () => element.removeEventListener('input', onInput);
    },
  },
};

export const wokwiCatalog: Record<string, WokwiPartSpec> = Object.fromEntries(
  (partsManifest as Array<Omit<WokwiPartSpec, 'applyState' | 'bindEvents'>>).map((part) => [
    part.type,
    { ...part, ...behaviors[part.type] },
  ]),
);

/**
 * Look up the element part spec for a component type. Accepts both clean
 * type names ('led') and the legacy 'wokwi-' prefixed types from older
 * saved projects.
 */
export function getWokwiPart(componentType: string): WokwiPartSpec | null {
  return wokwiCatalog[componentType.toLowerCase().replace(/^wokwi-/, '')] ?? null;
}
