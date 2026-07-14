/**
 * busWiring — figures out which display parts are actually wired to the
 * running board, using the same pin→net mapping that builds the SPICE
 * netlist. Like real hardware (and unlike "any part on the canvas is
 * magically connected"), an OLED only joins the I2C bus if its DATA/CLK pins
 * share nets with the board's SDA/SCL, and a character LCD only decodes if
 * RS, E, and D4-D7 each land on a board GPIO.
 */
import { buildSpiceMapping, type CircuitComponentLike, type WireLike } from '@/simulation/netlist/buildMapping';
import { pinHandleId } from '@/utils/pinUtils';
import { boardPinRole } from '@/simulation/avr/boardModel';
import type { BoardProfile } from '@/simulation/avr/boardProfiles';
import { SSD1306_I2C_ADDRESS } from './devices/SSD1306Controller';
import { MPU6050_I2C_ADDRESS } from './devices/MPU6050Controller';
import { DS1307_I2C_ADDRESS } from './devices/DS1307Controller';

export interface I2CDeviceBinding {
  componentId: string;
  kind: 'ssd1306' | 'mpu6050' | 'ds1307';
  address: number;
}

export interface Hd44780Binding {
  componentId: string;
  kind: 'hd44780';
  cols: number;
  rows: number;
  /** Arduino pin numbers driving each LCD input. */
  pins: { rs: number; e: number; d4: number; d5: number; d6: number; d7: number };
}

export interface SpiDisplayBinding {
  componentId: string;
  kind: 'ili9341';
  /** Arduino pin numbers of the chip-select and data/command lines. */
  csPin: number;
  dcPin: number;
}

export interface SdCardBinding {
  componentId: string;
  kind: 'sdcard';
  csPin: number;
}

export type SpiDeviceBinding = SpiDisplayBinding | SdCardBinding;

/** Parts speaking ad-hoc single/dual-GPIO protocols (no shared bus). */
export type GpioBinding =
  | { componentId: string; kind: 'servo'; signalPin: number }
  | { componentId: string; kind: 'hc-sr04'; trigPin: number; echoPin: number }
  | { componentId: string; kind: 'dht22'; dataPin: number }
  | {
      componentId: string;
      kind: 'digital-sensor';
      sensorType: string;
      outPin: number;
      /** LM393-comparator modules pull DOUT low on detection. */
      activeLow: boolean;
    };

/** Sensor modules with one digital detect output: part type → pin/polarity. */
const DIGITAL_SENSOR_TYPES: Record<string, { pinName: string; activeLow: boolean }> = {
  'pir-motion-sensor': { pinName: 'OUT', activeLow: false }, // HC-SR501: high on motion
  'tilt-switch': { pinName: 'OUT', activeLow: false },
  'flame-sensor': { pinName: 'DOUT', activeLow: true }, // LM393 modules sink on detect
  'gas-sensor': { pinName: 'DOUT', activeLow: true },
  'big-sound-sensor': { pinName: 'DOUT', activeLow: true },
  'small-sound-sensor': { pinName: 'DOUT', activeLow: true },
};

export interface DisplayBindings {
  i2c: I2CDeviceBinding[];
  hd44780: Hd44780Binding[];
  spi: SpiDeviceBinding[];
  gpio: GpioBinding[];
}

const baseType = (componentType: string) => componentType.toLowerCase().replace(/^wokwi-/, '');

/**
 * Resolve a board pin name to its Arduino pin number, including the
 * dedicated SDA/SCL header pads (electrically the same pins as A4/A5 on
 * 328p boards and 20/21 on the Mega) that boardPinRole treats as passive.
 */
function boardPinNumber(pinName: string | undefined, profile: BoardProfile): number | null {
  if (!pinName) return null;
  const base = pinName.replace(/\.\d+$/, '').toUpperCase();
  if (base === 'SDA') return profile.i2cPins.sda;
  if (base === 'SCL') return profile.i2cPins.scl;
  const role = boardPinRole(pinName, profile);
  return role && role.kind === 'io' ? role.arduinoPin : null;
}

export function resolveDisplayBindings(
  components: CircuitComponentLike[],
  wires: WireLike[],
  boardId: string,
  profile: BoardProfile,
): DisplayBindings {
  const bindings: DisplayBindings = { i2c: [], hd44780: [], spi: [], gpio: [] };
  const board = components.find((comp) => comp.id === boardId);
  if (!board) return bindings;

  let pinToNodeMap;
  try {
    ({ pinToNodeMap } = buildSpiceMapping(components, wires));
  } catch {
    return bindings;
  }

  // Net → the board Arduino pin driving it.
  const netToArduinoPin = new Map<string, number>();
  (board.pins || []).forEach((pin, index) => {
    const arduinoPin = boardPinNumber(pin.name, profile);
    if (arduinoPin === null) return;
    const net = pinToNodeMap.get(`${board.id}_${pinHandleId(pin, index)}`);
    if (net !== undefined && net !== '0' && !netToArduinoPin.has(net)) {
      netToArduinoPin.set(net, arduinoPin);
    }
  });

  for (const comp of components) {
    if (comp.id === boardId) continue;
    const type = baseType(comp.type);

    // Net of a display pin by (base) name, tolerating '.N' duplicates.
    const netOf = (name: string): string | undefined => {
      const pins = comp.pins || [];
      for (let index = 0; index < pins.length; index++) {
        const pinName = (pins[index].name || '').replace(/\.\d+$/, '').toUpperCase();
        if (pinName === name) return pinToNodeMap.get(`${comp.id}_${pinHandleId(pins[index], index)}`);
      }
      return undefined;
    };
    const gpioOf = (name: string): number | null => {
      const net = netOf(name);
      return net !== undefined ? netToArduinoPin.get(net) ?? null : null;
    };

    if (type === 'ssd1306') {
      // Wokwi's board-ssd1306 is the I2C variant: DATA = SDA, CLK = SCL.
      if (gpioOf('DATA') === profile.i2cPins.sda && gpioOf('CLK') === profile.i2cPins.scl) {
        bindings.i2c.push({ componentId: comp.id, kind: 'ssd1306', address: SSD1306_I2C_ADDRESS });
      }
      continue;
    }

    if (type === 'mpu6050' || type === 'ds1307') {
      if (gpioOf('SDA') === profile.i2cPins.sda && gpioOf('SCL') === profile.i2cPins.scl) {
        bindings.i2c.push({
          componentId: comp.id,
          kind: type,
          // Note: both parts default to 0x68 on real hardware too — the
          // last one registered wins if a circuit wires up both.
          address: type === 'mpu6050' ? MPU6050_I2C_ADDRESS : DS1307_I2C_ADDRESS,
        });
      }
      continue;
    }

    if (type === 'microsd-card') {
      // DI is the card's MOSI, DO its MISO.
      const cs = gpioOf('CS');
      if (
        cs !== null &&
        gpioOf('DI') === profile.spiPins.mosi &&
        gpioOf('SCK') === profile.spiPins.sck &&
        gpioOf('DO') === profile.spiPins.miso
      ) {
        bindings.spi.push({ componentId: comp.id, kind: 'sdcard', csPin: cs });
      }
      continue;
    }

    if (type === 'ili9341') {
      // SPI TFT: MOSI/SCK must reach the hardware SPI pins; CS and D/C can
      // sit on any GPIO (MISO is unused for display writes).
      const cs = gpioOf('CS');
      const dc = gpioOf('D/C');
      if (
        cs !== null &&
        dc !== null &&
        gpioOf('MOSI') === profile.spiPins.mosi &&
        gpioOf('SCK') === profile.spiPins.sck
      ) {
        bindings.spi.push({ componentId: comp.id, kind: 'ili9341', csPin: cs, dcPin: dc });
      }
      continue;
    }

    if (type === 'servo') {
      const signal = gpioOf('PWM');
      if (signal !== null) bindings.gpio.push({ componentId: comp.id, kind: 'servo', signalPin: signal });
      continue;
    }

    if (type === 'hc-sr04') {
      const trig = gpioOf('TRIG');
      const echo = gpioOf('ECHO');
      if (trig !== null && echo !== null) {
        bindings.gpio.push({ componentId: comp.id, kind: 'hc-sr04', trigPin: trig, echoPin: echo });
      }
      continue;
    }

    if (type === 'dht22') {
      const data = gpioOf('SDA'); // the part's data pin is labelled SDA
      if (data !== null) bindings.gpio.push({ componentId: comp.id, kind: 'dht22', dataPin: data });
      continue;
    }

    const digitalSensor = DIGITAL_SENSOR_TYPES[type];
    if (digitalSensor) {
      const out = gpioOf(digitalSensor.pinName);
      if (out !== null) {
        bindings.gpio.push({
          componentId: comp.id,
          kind: 'digital-sensor',
          sensorType: type,
          outPin: out,
          activeLow: digitalSensor.activeLow,
        });
      }
      continue;
    }

    if (type === 'lcd1602' || type === 'lcd2004') {
      const rs = gpioOf('RS');
      const e = gpioOf('E');
      const d4 = gpioOf('D4');
      const d5 = gpioOf('D5');
      const d6 = gpioOf('D6');
      const d7 = gpioOf('D7');
      if (rs !== null && e !== null && d4 !== null && d5 !== null && d6 !== null && d7 !== null) {
        bindings.hd44780.push({
          componentId: comp.id,
          kind: 'hd44780',
          cols: type === 'lcd2004' ? 20 : 16,
          rows: type === 'lcd2004' ? 4 : 2,
          pins: { rs, e, d4, d5, d6, d7 },
        });
      }
    }
  }

  return bindings;
}
