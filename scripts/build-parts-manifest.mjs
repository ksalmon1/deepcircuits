/**
 * Builds scripts/wokwi-parts.json — the single source of truth for the
 * element-based component library — from the raw extraction in
 * wokwi-elements-raw.json (produced by instantiating every element in a
 * real browser and reading its pinInfo).
 *
 * Output: resources/data/wokwi-parts.json, consumed by:
 *  - resources/js/integrations/wokwi/catalog.ts (rendering + pins)
 *  - database/seeders/ComponentLibrarySeeder.php (library rows)
 *
 * Re-run after upgrading @wokwi/elements:
 *   node scripts/build-parts-manifest.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(here, 'wokwi-elements-raw.json'), 'utf8'));

/** Display names (keyed by clean type = tag minus 'wokwi-'). */
const NAMES = {
  '7segment': '7-Segment Display',
  'analog-joystick': 'Analog Joystick',
  'arduino-mega': 'Arduino Mega',
  'arduino-nano': 'Arduino Nano',
  'arduino-uno': 'Arduino Uno',
  'biaxial-stepper': 'Biaxial Stepper',
  'big-sound-sensor': 'Sound Sensor (Big)',
  buzzer: 'Buzzer',
  dht22: 'Temp & Humidity Sensor',
  'dip-switch-8': 'DIP Switch (8x)',
  ds1307: 'RTC Module (DS1307)',
  'esp32-devkit-v1': 'ESP32 DevKit',
  'flame-sensor': 'Flame Sensor',
  franzininho: 'Franzininho',
  'gas-sensor': 'Gas Sensor',
  'hc-sr04': 'Ultrasonic Sensor',
  'heart-beat-sensor': 'Heartbeat Sensor',
  hx711: 'Load Cell Amplifier',
  ili9341: 'TFT Display (ILI9341)',
  'ir-receiver': 'IR Receiver',
  'ir-remote': 'IR Remote',
  'ks2e-m-dc5': 'Relay (DPDT)',
  'ky-040': 'Rotary Encoder',
  lcd1602: 'LCD 16x2',
  lcd2004: 'LCD 20x4',
  led: 'LED',
  'led-bar-graph': 'LED Bar Graph',
  'led-ring': 'LED Ring',
  'membrane-keypad': 'Membrane Keypad',
  'microsd-card': 'MicroSD Module',
  mpu6050: 'IMU (MPU6050)',
  'nano-rp2040-connect': 'Nano RP2040 Connect',
  neopixel: 'NeoPixel',
  'neopixel-matrix': 'NeoPixel Matrix',
  'ntc-temperature-sensor': 'Temperature Sensor (NTC)',
  'photoresistor-sensor': 'Light Sensor (LDR)',
  'pir-motion-sensor': 'PIR Motion Sensor',
  potentiometer: 'Potentiometer',
  pushbutton: 'Pushbutton',
  'pushbutton-6mm': 'Pushbutton (6mm)',
  resistor: 'Resistor',
  'rgb-led': 'RGB LED',
  'rotary-dialer': 'Rotary Dialer',
  servo: 'Servo Motor',
  'slide-potentiometer': 'Slide Potentiometer',
  'slide-switch': 'Slide Switch',
  'small-sound-sensor': 'Sound Sensor (Small)',
  ssd1306: 'OLED Display',
  'stepper-motor': 'Stepper Motor',
  'tilt-switch': 'Tilt Switch',
};

const CATEGORIES = {
  Basic: ['led', 'rgb-led', 'resistor'],
  'Input Controls': [
    'pushbutton', 'pushbutton-6mm', 'slide-switch', 'dip-switch-8',
    'potentiometer', 'slide-potentiometer', 'analog-joystick', 'ky-040',
    'rotary-dialer', 'membrane-keypad', 'ir-remote',
  ],
  'Output & Actuators': [
    'buzzer', 'led-bar-graph', 'led-ring', 'neopixel', 'neopixel-matrix',
    'servo', 'stepper-motor', 'biaxial-stepper', 'ks2e-m-dc5',
  ],
  Displays: ['7segment', 'lcd1602', 'lcd2004', 'ssd1306', 'ili9341'],
  Sensors: [
    'photoresistor-sensor', 'ntc-temperature-sensor', 'tilt-switch', 'dht22',
    'hc-sr04', 'pir-motion-sensor', 'flame-sensor', 'gas-sensor',
    'big-sound-sensor', 'small-sound-sensor', 'heart-beat-sensor', 'mpu6050',
    'ir-receiver', 'hx711', 'ds1307', 'microsd-card',
  ],
  Boards: [
    'arduino-uno', 'arduino-mega', 'arduino-nano', 'esp32-devkit-v1',
    'nano-rp2040-connect', 'franzininho',
  ],
};

const DESCRIPTIONS = {
  led: 'Standard LED: lights when forward voltage exceeds ~1.5V',
  'rgb-led': 'Common-cathode RGB LED: each color channel lights independently',
  resistor: 'Axial resistor with live color bands',
  pushbutton: 'Momentary pushbutton - double-click on the canvas to toggle',
  'pushbutton-6mm': 'Compact 6mm pushbutton - double-click on the canvas to toggle',
  'slide-switch': 'SPDT slide switch - double-click on the canvas to toggle',
  potentiometer: 'Rotary potentiometer - drag the knob to set the wiper',
  'slide-potentiometer': 'Linear potentiometer - drag the slider to set the wiper',
  buzzer: 'Piezo buzzer (100 ohm): sounds above 1V',
};

/** Parts with an electrical model; everything else is placeable but visual-only. */
const CURATED = {
  led: {
    pins: [
      { name: 'Anode (+)', x: 25, y: 42, signals: ['passive'], pin_type: 'anode' },
      { name: 'Cathode (-)', x: 15, y: 42, signals: ['passive'], pin_type: 'cathode' },
    ],
    properties: {
      spiceType: 'led', color: 'red', Vf: 1.8, Is: 1.0e-18, n: 1.8,
      stateRules: { on: 'voltage > 1.5' },
    },
  },
  'rgb-led': {
    pins: [
      { name: 'Red (+)', x: 8.5, y: 44, signals: ['passive'], pin_type: 'anode' },
      { name: 'Common (-)', x: 18, y: 54, signals: ['passive'], pin_type: 'cathode' },
      { name: 'Green (+)', x: 26.4, y: 44, signals: ['passive'], pin_type: 'anode' },
      { name: 'Blue (+)', x: 35.7, y: 44, signals: ['passive'], pin_type: 'anode' },
    ],
    properties: { spiceType: 'rgbled', Vf: 2.0, Is: 1.0e-18, n: 1.8 },
  },
  resistor: {
    pins: [
      { name: 'Pin 1', x: 0, y: 5.65, signals: ['passive'] },
      { name: 'Pin 2', x: 58.8, y: 5.65, signals: ['passive'] },
    ],
    properties: { spiceType: 'resistor', resistance: '1k', unit: 'Ω' },
  },
  pushbutton: {
    pins: [
      { name: 'Pin 1', x: 0, y: 13, signals: ['passive'] },
      { name: 'Pin 2', x: 67, y: 32, signals: ['passive'] },
    ],
    properties: {
      spiceType: 'switch', closed: false, color: 'green',
      attributeStates: { closed: { true: 'closed', false: 'open' } },
    },
  },
  'pushbutton-6mm': {
    pins: [
      { name: 'Pin 1', x: 0, y: 2.2, signals: ['passive'] },
      { name: 'Pin 2', x: 28, y: 21, signals: ['passive'] },
    ],
    properties: {
      spiceType: 'switch', closed: false,
      attributeStates: { closed: { true: 'closed', false: 'open' } },
    },
  },
  'slide-switch': {
    pins: [
      { name: 'Pin 1', x: 6.5, y: 34, signals: ['passive'] },
      { name: 'Common', x: 16, y: 34, signals: ['passive'] },
      { name: 'Pin 2', x: 25.5, y: 34, signals: ['passive'] },
    ],
    properties: {
      spiceType: 'slideswitch', closed: false,
      attributeStates: { closed: { true: 'closed', false: 'open' } },
    },
  },
  potentiometer: {
    pins: [
      { name: 'A (GND)', x: 29, y: 68.5, signals: ['passive'] },
      { name: 'Wiper (SIG)', x: 39, y: 68.5, signals: ['passive'] },
      { name: 'B (VCC)', x: 49, y: 68.5, signals: ['passive'] },
    ],
    properties: { spiceType: 'potentiometer', resistance: '10k', position: 0.5, unit: 'Ω' },
  },
  'slide-potentiometer': {
    pins: [
      { name: 'A (VCC)', x: 1, y: 43, signals: ['passive'] },
      { name: 'Wiper (SIG)', x: 1, y: 63, signals: ['passive'] },
      { name: 'B (GND)', x: 207, y: 43, signals: ['passive'] },
    ],
    properties: { spiceType: 'potentiometer', resistance: '10k', position: 0.5, unit: 'Ω' },
  },
  buzzer: {
    pins: [
      { name: 'Positive (+)', x: 27, y: 84, signals: ['passive'] },
      { name: 'Negative (-)', x: 37, y: 84, signals: ['passive'] },
    ],
    properties: {
      spiceType: 'buzzer', resistance: 100,
      stateRules: { on: 'voltage > 1' },
    },
  },
};

/** Map wokwi PinSignalInfo objects onto the app's string signal tags. */
function mapSignals(pinName, signals) {
  const tags = [];
  for (const s of signals ?? []) {
    if (s.type === 'power' && s.signal === 'GND') {
      // Only treat as ground when the pin is actually named like one; the
      // upstream data has a few mislabeled pins (e.g. neopixel DIN).
      if (/^(A?GND|VSS)/i.test(pinName)) tags.push('ground');
    } else if (s.type === 'power' && s.signal === 'VCC') {
      tags.push('power');
    } else if (s.type) {
      tags.push(String(s.type));
    }
  }
  return tags.length ? tags : ['passive'];
}

const categoryOf = {};
for (const [category, types] of Object.entries(CATEGORIES)) {
  for (const type of types) categoryOf[type] = category;
}

const parts = raw
  .map((el) => {
    const type = el.tag.replace(/^wokwi-/, '');
    const curated = CURATED[type];
    const pins = (curated?.pins ?? el.pins.map((p) => ({
      name: p.name,
      x: p.x,
      y: p.y,
      signals: mapSignals(p.name, p.signals),
    }))).map((pin, index) => ({ signals: ['passive'], ...pin, handle_id: `pin-${index}` }));
    return {
      type,
      tag: el.tag,
      name: NAMES[type] ?? type,
      category: categoryOf[type] ?? 'Sensors',
      description: DESCRIPTIONS[type] ?? `${NAMES[type] ?? type} (visual only for now)`,
      pins,
      properties: curated?.properties ?? {},
    };
  })
  .sort((a, b) => a.type.localeCompare(b.type));

writeFileSync(join(here, '..', 'resources', 'data', 'wokwi-parts.json'), JSON.stringify(parts, null, 2));
console.log(`wrote ${parts.length} parts to resources/data/wokwi-parts.json`);
