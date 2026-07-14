/**
 * busHost — binds wired bus peripherals to a running board emulation:
 * resolves which parts are electrically connected (busWiring), creates a
 * protocol controller per part, and routes traffic:
 *
 *  - I2C (SSD1306 OLED, MPU6050 IMU, DS1307 RTC): registered on the
 *    runner's I2CBus by 7-bit address.
 *  - SPI (ILI9341 TFT, microSD card): routed by live chip-select level
 *    through an SPIRouter; the TFT additionally samples D/C per byte.
 *  - GPIO (HD44780 character LCDs): cycle-accurate E-strobe watches.
 *
 * Display output pushes straight onto the mounted elements via the element
 * registry, coalesced to animation frames. Sensor values read live from the
 * part's attributes through `getAttributes`, so the Sensor panel can change
 * them mid-run.
 *
 * Returns a detach function; call it when the board stops or restarts.
 */
import type { AVRRunner } from '@/simulation/avr/AVRRunner';
import type { BoardProfile } from '@/simulation/avr/boardProfiles';
import type { CircuitComponentLike, WireLike } from '@/simulation/netlist/buildMapping';
import { getPartElement } from '@/integrations/wokwi/elementRegistry';
import { resolveDisplayBindings, type Hd44780Binding, type SpiDisplayBinding } from './busWiring';
import { SPIRouter, type SpiDevice } from './SPIBus';
import { SSD1306Controller, SSD1306_WIDTH, SSD1306_HEIGHT } from './devices/SSD1306Controller';
import { HD44780Controller } from './devices/HD44780Controller';
import { ILI9341Controller, ILI9341_WIDTH, ILI9341_HEIGHT } from './devices/ILI9341Controller';
import { MPU6050Controller, mpu6050ValuesFrom } from './devices/MPU6050Controller';
import { DS1307Controller } from './devices/DS1307Controller';
import { SDCardController } from './devices/SDCardController';
import type { GpioHostOps } from '@/simulation/gpio/GpioHostOps';
import { ServoDecoder } from '@/simulation/gpio/ServoDecoder';
import { HCSR04Responder, distanceCmFrom } from '@/simulation/gpio/HCSR04Responder';
import { DHT22Responder, dhtValuesFrom } from '@/simulation/gpio/DHT22Responder';
import { WS2812Decoder, type Rgb } from '@/simulation/gpio/WS2812Decoder';

interface SSD1306ElementLike extends HTMLElement {
  imageData: ImageData;
  redraw(): void;
}

interface Ili9341ElementLike extends HTMLElement {
  canvas: HTMLCanvasElement | null | undefined;
}

interface LcdElementLike extends HTMLElement {
  characters: Uint8Array | number[];
  cursor: boolean;
  blink: boolean;
  cursorX: number;
  cursorY: number;
  backlight: boolean;
}

interface ServoElementLike extends HTMLElement {
  angle: number;
}

interface NeoPixelElementLike extends HTMLElement {
  r: number;
  g: number;
  b: number;
}

interface PixelChainElementLike extends HTMLElement {
  pixels?: number;
  rows?: number;
  cols?: number;
  setPixel(...args: unknown[]): void;
}

/** Push a decoded WS2812 frame onto the matching element type. */
function paintPixels(element: HTMLElement, partType: string, frame: Rgb[]): void {
  const scale = (v: number) => v / 255;
  if (partType === 'neopixel') {
    const px = element as NeoPixelElementLike;
    const first = frame[0];
    px.r = scale(first.r);
    px.g = scale(first.g);
    px.b = scale(first.b);
    return;
  }
  const chain = element as PixelChainElementLike;
  if (typeof chain.setPixel !== 'function') return;
  if (partType === 'neopixel-matrix') {
    const cols = chain.cols ?? 8;
    frame.forEach((pixel, i) => {
      chain.setPixel(Math.floor(i / cols), i % cols, { r: scale(pixel.r), g: scale(pixel.g), b: scale(pixel.b) });
    });
    return;
  }
  // led-ring
  frame.forEach((pixel, i) => {
    chain.setPixel(i, { r: scale(pixel.r), g: scale(pixel.g), b: scale(pixel.b) });
  });
}

/** Live attribute accessor, so decoders see Sensor-panel edits mid-run. */
export type AttributesAccessor = (componentId: string) => Record<string, unknown> | undefined;

/** Detect state of a simple digital sensor (PIR, tilt, flame, ...). */
export function sensorActiveFrom(attributes: Record<string, unknown> | undefined): boolean {
  const raw = attributes?.active;
  return raw === true || raw === 'true' || raw === 1;
}

/** Coalesce high-frequency decoder updates into one paint per frame. */
function framePainter(paint: () => void): () => void {
  let scheduled = false;
  const schedule = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (cb: () => void) => setTimeout(cb, 16);
  return () => {
    if (scheduled) return;
    scheduled = true;
    schedule(() => {
      scheduled = false;
      paint();
    });
  };
}

function attachSSD1306(runner: AVRRunner, componentId: string, address: number): void {
  const paint = framePainter(() => {
    const element = getPartElement(componentId) as SSD1306ElementLike | undefined;
    if (!element || !element.imageData) return;
    if (element.imageData.width !== SSD1306_WIDTH || element.imageData.height !== SSD1306_HEIGHT) return;
    controller.renderTo(element.imageData.data);
    element.redraw();
  });
  const controller = new SSD1306Controller(() => paint());
  runner.i2cBus.register(address, controller);
}

function attachHD44780(runner: AVRRunner, binding: Hd44780Binding): () => void {
  const { pins, componentId } = binding;
  const paint = framePainter(() => {
    const element = getPartElement(componentId) as LcdElementLike | undefined;
    if (!element) return;
    element.characters = controller.characters();
    element.backlight = true;
    const cursor = controller.cursorPosition();
    element.cursor = cursor !== null;
    element.blink = controller.blink && cursor !== null;
    if (cursor) {
      element.cursorX = cursor.x;
      element.cursorY = cursor.y;
    }
  });
  const controller = new HD44780Controller(binding.cols, binding.rows, () => paint());
  // Sample RS and the data nibble on each falling edge of E (the HD44780
  // latches on E's high→low transition).
  return runner.watchPin(pins.e, (level) => {
    if (level) return;
    const nibble =
      (runner.getPinLevel(pins.d7) ? 8 : 0) |
      (runner.getPinLevel(pins.d6) ? 4 : 0) |
      (runner.getPinLevel(pins.d5) ? 2 : 0) |
      (runner.getPinLevel(pins.d4) ? 1 : 0);
    controller.strobe(runner.getPinLevel(pins.rs), nibble);
  });
}

/** ILI9341 as an SpiDevice: D/C sampled per byte, repaint on deselect. */
function ili9341SpiDevice(runner: AVRRunner, binding: SpiDisplayBinding): { device: SpiDevice; detach: () => void } {
  const controller = new ILI9341Controller();
  const paint = framePainter(() => {
    const element = getPartElement(binding.componentId) as Ili9341ElementLike | undefined;
    const ctx = element?.canvas?.getContext('2d');
    if (!ctx) return;
    const image = ctx.createImageData(ILI9341_WIDTH, ILI9341_HEIGHT);
    controller.renderTo(image.data);
    ctx.putImageData(image, 0, 0);
  });
  const detach = runner.watchPin(binding.csPin, (level) => {
    if (level) paint(); // deselected: transaction over, repaint
  });
  const device: SpiDevice = {
    transferByte(mosi: number): number {
      if (runner.getPinLevel(binding.dcPin)) {
        controller.dataByte(mosi);
      } else {
        controller.commandByte(mosi);
      }
      return 0x00;
    },
  };
  return { device, detach };
}

export interface BusAttachment {
  /** Unbind everything (call when the board stops or restarts). */
  detach: () => void;
  /**
   * Board input pins owned by a protocol responder (echo, 1-wire data).
   * The analog co-sim feedback must skip these — see mcuCoupling.
   */
  claimedInputPins: ReadonlySet<number>;
}

export function attachBusDevices(
  runner: AVRRunner,
  components: CircuitComponentLike[],
  wires: WireLike[],
  boardId: string,
  profile: BoardProfile,
  getAttributes: AttributesAccessor = () => undefined,
): BusAttachment {
  const bindings = resolveDisplayBindings(components, wires, boardId, profile);
  const detachers: Array<() => void> = [];
  const claimedInputPins = new Set<number>();

  for (const binding of bindings.i2c) {
    if (binding.kind === 'ssd1306') {
      attachSSD1306(runner, binding.componentId, binding.address);
    } else if (binding.kind === 'mpu6050') {
      const id = binding.componentId;
      runner.i2cBus.register(
        binding.address,
        new MPU6050Controller(() => mpu6050ValuesFrom(getAttributes(id))),
      );
    } else {
      runner.i2cBus.register(binding.address, new DS1307Controller());
    }
  }

  for (const lcd of bindings.hd44780) {
    detachers.push(attachHD44780(runner, lcd));
  }

  if (bindings.gpio.length > 0) {
    // Cycle-clock operations for the ad-hoc GPIO protocols (echo timing,
    // 1-wire bit streams): scheduled in emulated time, not wall time.
    const ops: GpioHostOps = {
      now: () => runner.cpu.cycles,
      schedule: (callback, afterCycles) => {
        runner.cpu.addClockEvent(callback, afterCycles);
      },
      drive: (arduinoPin, level) => runner.setDigitalInput(arduinoPin, level),
    };

    for (const binding of bindings.gpio) {
      if (binding.kind === 'servo') {
        const id = binding.componentId;
        let lastAngle = 0;
        const paint = framePainter(() => {
          const element = getPartElement(id) as ServoElementLike | undefined;
          if (element) element.angle = lastAngle;
        });
        const decoder = new ServoDecoder((degrees) => {
          lastAngle = degrees;
          paint();
        });
        detachers.push(runner.watchPin(binding.signalPin, (level) => decoder.edge(level, runner.cpu.cycles)));
      } else if (binding.kind === 'ws2812') {
        const id = binding.componentId;
        const partType = binding.partType;
        let lastFrame: Rgb[] = [];
        const paint = framePainter(() => {
          const element = getPartElement(id);
          if (element && lastFrame.length > 0) paintPixels(element, partType, lastFrame);
        });
        const decoder = new WS2812Decoder(ops, (frame) => {
          lastFrame = frame;
          paint();
        });
        detachers.push(runner.watchPin(binding.dinPin, (level) => decoder.edge(level, runner.cpu.cycles)));
      } else if (binding.kind === 'digital-sensor') {
        // One digital detect line, refreshed on a ~1ms emulated-time tick so
        // Sensor-panel toggles reach the pin without needing an edge.
        const id = binding.componentId;
        const activeLow = binding.activeLow;
        const outPin = binding.outPin;
        let detached = false;
        const refresh = () => {
          if (detached) return;
          const active = sensorActiveFrom(getAttributes(id));
          runner.setDigitalInput(outPin, activeLow ? !active : active);
          ops.schedule(refresh, 16_000); // 1ms at 16MHz
        };
        refresh();
        claimedInputPins.add(outPin);
        detachers.push(() => {
          detached = true;
        });
      } else if (binding.kind === 'hc-sr04') {
        const id = binding.componentId;
        const sonar = new HCSR04Responder(ops, binding.echoPin, () => distanceCmFrom(getAttributes(id)));
        detachers.push(runner.watchPin(binding.trigPin, (level) => sonar.trigEdge(level)));
        claimedInputPins.add(binding.echoPin);
      } else {
        const id = binding.componentId;
        const dht = new DHT22Responder(ops, binding.dataPin, () => dhtValuesFrom(getAttributes(id)));
        // The DHT line is bidirectional with a pull-up: the host "releasing"
        // the pin (input mode) reads as the line going high.
        detachers.push(
          runner.watchPin(binding.dataPin, (level) => dht.dataEdge(level), { releasedReadsHigh: true }),
        );
        claimedInputPins.add(binding.dataPin);
      }
    }
  }

  if (bindings.spi.length > 0) {
    const router = new SPIRouter();
    for (const binding of bindings.spi) {
      const selected = () => !runner.getPinLevel(binding.csPin);
      if (binding.kind === 'ili9341') {
        const { device, detach } = ili9341SpiDevice(runner, binding);
        router.add(selected, device);
        detachers.push(detach);
      } else {
        const card = new SDCardController();
        router.add(selected, card);
        // Reset any partial frame when the host releases chip-select.
        detachers.push(
          runner.watchPin(binding.csPin, (level) => {
            if (level) card.deselect();
          }),
        );
      }
    }
    runner.onSpiByte = (mosiByte: number) => router.transfer(mosiByte);
  }

  return {
    detach: () => {
      runner.i2cBus.unregisterAll();
      runner.onSpiByte = null;
      detachers.forEach((detach) => detach());
    },
    claimedInputPins,
  };
}
