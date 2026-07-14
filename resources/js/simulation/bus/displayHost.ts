/**
 * displayHost — binds wired display parts to a running board emulation:
 * resolves which displays are electrically connected (busWiring), creates a
 * protocol controller per display (SSD1306 on the I2C bus, HD44780 on GPIO
 * edge watches), and pushes decoded output straight onto the mounted
 * elements via the element registry, coalesced to animation frames.
 *
 * Returns a detach function; call it when the board stops or restarts.
 */
import type { AVRRunner } from '@/simulation/avr/AVRRunner';
import type { BoardProfile } from '@/simulation/avr/boardProfiles';
import type { CircuitComponentLike, WireLike } from '@/simulation/netlist/buildMapping';
import { getPartElement } from '@/integrations/wokwi/elementRegistry';
import { resolveDisplayBindings, type Hd44780Binding, type SpiDisplayBinding } from './busWiring';
import { SSD1306Controller, SSD1306_WIDTH, SSD1306_HEIGHT } from './devices/SSD1306Controller';
import { HD44780Controller } from './devices/HD44780Controller';
import { ILI9341Controller, ILI9341_WIDTH, ILI9341_HEIGHT } from './devices/ILI9341Controller';

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

interface SpiTarget {
  binding: SpiDisplayBinding;
  controller: ILI9341Controller;
}

/**
 * Route SPI MOSI bytes to whichever display holds its chip-select low, with
 * the D/C pin (sampled per byte, as the real controller does) picking
 * command vs data. Repaints happen on the CS rising edge — the natural
 * transaction boundary on an SPI bus.
 */
function attachSpiDisplays(runner: AVRRunner, bindings: SpiDisplayBinding[]): Array<() => void> {
  const detachers: Array<() => void> = [];
  const targets: SpiTarget[] = [];

  for (const binding of bindings) {
    const controller = new ILI9341Controller();
    const paint = framePainter(() => {
      const element = getPartElement(binding.componentId) as Ili9341ElementLike | undefined;
      const ctx = element?.canvas?.getContext('2d');
      if (!ctx) return;
      const image = ctx.createImageData(ILI9341_WIDTH, ILI9341_HEIGHT);
      controller.renderTo(image.data);
      ctx.putImageData(image, 0, 0);
    });
    detachers.push(
      runner.watchPin(binding.csPin, (level) => {
        if (level) paint(); // deselected: transaction over, repaint
      }),
    );
    targets.push({ binding, controller });
  }

  runner.onSpiByte = (mosiByte: number) => {
    for (const { binding, controller } of targets) {
      if (runner.getPinLevel(binding.csPin)) continue; // not selected
      if (runner.getPinLevel(binding.dcPin)) {
        controller.dataByte(mosiByte);
      } else {
        controller.commandByte(mosiByte);
      }
      return 0x00;
    }
    return 0xff; // no device selected: MISO floats high
  };

  return detachers;
}

export function attachDisplays(
  runner: AVRRunner,
  components: CircuitComponentLike[],
  wires: WireLike[],
  boardId: string,
  profile: BoardProfile,
): () => void {
  const bindings = resolveDisplayBindings(components, wires, boardId, profile);
  const detachers: Array<() => void> = [];

  for (const display of bindings.i2c) {
    attachSSD1306(runner, display.componentId, display.address);
  }
  for (const lcd of bindings.hd44780) {
    detachers.push(attachHD44780(runner, lcd));
  }
  if (bindings.spi.length > 0) {
    detachers.push(...attachSpiDisplays(runner, bindings.spi));
  }

  return () => {
    runner.i2cBus.unregisterAll();
    runner.onSpiByte = null;
    detachers.forEach((detach) => detach());
  };
}
