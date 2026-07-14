import { describe, it, expect } from 'vitest';
import { connectAnalogInputsToMcu, connectDigitalInputsToMcu, type McuInputSink } from './mcuCoupling';
import { getBoardProfile } from '@/simulation/avr/boardProfiles';
import { PinResolver } from '@/simulation/logic/logicFamilies';

class FakeMcu implements McuInputSink {
  analog: Record<number, number> = {};
  digital: Record<number, boolean> = {};
  constructor(private outputs: number[] = []) {}
  setAnalogVoltage(channel: number, volts: number) {
    this.analog[channel] = volts;
  }
  setDigitalInput(pin: number, high: boolean) {
    this.digital[pin] = high;
  }
  getPinMode(pin: number) {
    return this.outputs.includes(pin) ? 'output' : 'input';
  }
}

const uno = getBoardProfile('arduino-uno')!;
const nano = getBoardProfile('arduino-nano')!;

describe('connectAnalogInputsToMcu', () => {
  it('routes analog pin voltages to their ADC channel', () => {
    const mcu = new FakeMcu();
    const pins = [
      { id: 'p-a0', name: 'A0' },
      { id: 'p-a3', name: 'A3' },
      { id: 'p-d7', name: '7' },
    ];
    connectAnalogInputsToMcu(mcu, uno, pins, { 'p-a0': 3.21, 'p-a3': 1.1, 'p-d7': 5 });
    expect(mcu.analog).toEqual({ 0: 3.21, 3: 1.1 }); // digital pin 7 untouched
  });

  it('skips pins with no solved voltage', () => {
    const mcu = new FakeMcu();
    connectAnalogInputsToMcu(mcu, uno, [{ id: 'p-a0', name: 'A0' }], {});
    expect(mcu.analog).toEqual({});
  });
});

describe('connectDigitalInputsToMcu', () => {
  it('reads voltages against the chip logic family, not a flat mid-rail', () => {
    const mcu = new FakeMcu();
    const resolver = new PinResolver(uno.logicFamily);
    const pins = [
      { id: 'p-2', name: '2' },
      { id: 'p-3', name: '3' },
    ];
    // 3.0V is exactly the AVR VIH — a legal HIGH the old 2.5V rule also
    // caught, but 1.4V is a solid LOW under VIL.
    connectDigitalInputsToMcu(mcu, uno, pins, { 'p-2': 3.0, 'p-3': 1.4 }, resolver);
    expect(mcu.digital).toEqual({ 2: true, 3: false });
  });

  it('never drives a pin the sketch configured as OUTPUT', () => {
    const mcu = new FakeMcu([13]);
    const resolver = new PinResolver(uno.logicFamily);
    connectDigitalInputsToMcu(mcu, uno, [{ id: 'p-13', name: '13' }], { 'p-13': 5 }, resolver);
    expect(mcu.digital).toEqual({});
  });

  it('never drives the Nano ADC-only pads A6/A7 digitally', () => {
    const mcu = new FakeMcu();
    const resolver = new PinResolver(nano.logicFamily);
    const pins = [
      { id: 'p-a6', name: 'A6' },
      { id: 'p-a0', name: 'A0' },
    ];
    connectDigitalInputsToMcu(mcu, nano, pins, { 'p-a6': 5, 'p-a0': 5 }, resolver);
    expect(mcu.digital).toEqual({ [nano.analogBase]: true }); // A0 only
  });

  it('never drives a pin claimed by a protocol responder', () => {
    const mcu = new FakeMcu();
    const resolver = new PinResolver(uno.logicFamily);
    const pins = [
      { id: 'p-7', name: '7' }, // claimed (e.g. an HC-SR04 echo line)
      { id: 'p-8', name: '8' },
    ];
    connectDigitalInputsToMcu(mcu, uno, pins, { 'p-7': 0, 'p-8': 5 }, resolver, new Set([7]));
    expect(mcu.digital).toEqual({ 8: true });
  });

  it('holds the previous level through the undefined region (hysteresis)', () => {
    const mcu = new FakeMcu();
    const resolver = new PinResolver(uno.logicFamily);
    const pins = [{ id: 'p-2', name: '2' }];
    connectDigitalInputsToMcu(mcu, uno, pins, { 'p-2': 4.8 }, resolver);
    expect(mcu.digital[2]).toBe(true);
    connectDigitalInputsToMcu(mcu, uno, pins, { 'p-2': 2.2 }, resolver); // undefined band
    expect(mcu.digital[2]).toBe(true); // held, no chatter
  });
});
