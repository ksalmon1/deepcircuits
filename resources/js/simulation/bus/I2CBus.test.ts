import { describe, it, expect } from 'vitest';
import type { AVRTWI } from 'avr8js';
import { I2CBus, type I2CDevice } from './I2CBus';

/** Records the completions the bus sends back to the AVR core. */
class FakeTwi {
  log: Array<[string, unknown?]> = [];
  completeStart() {
    this.log.push(['start']);
  }
  completeStop() {
    this.log.push(['stop']);
  }
  completeConnect(ack: boolean) {
    this.log.push(['connect', ack]);
  }
  completeWrite(ack: boolean) {
    this.log.push(['write', ack]);
  }
  completeRead(value: number) {
    this.log.push(['read', value]);
  }
}

class EchoDevice implements I2CDevice {
  received: number[] = [];
  stops = 0;
  i2cConnect() {
    return true;
  }
  i2cWriteByte(byte: number) {
    this.received.push(byte);
    return true;
  }
  i2cReadByte() {
    return 0x42;
  }
  i2cDisconnect() {
    this.stops++;
  }
}

function makeBus() {
  const twi = new FakeTwi();
  const bus = new I2CBus(twi as unknown as AVRTWI);
  return { twi, bus };
}

describe('I2CBus', () => {
  it('routes a write transaction to the device at the address', () => {
    const { twi, bus } = makeBus();
    const device = new EchoDevice();
    bus.register(0x3c, device);

    bus.start();
    bus.connectToSlave(0x3c, true);
    bus.writeByte(0x00);
    bus.writeByte(0xaf);
    bus.stop();

    expect(device.received).toEqual([0x00, 0xaf]);
    expect(device.stops).toBe(1);
    expect(twi.log).toEqual([
      ['start'],
      ['connect', true],
      ['write', true],
      ['write', true],
      ['stop'],
    ]);
  });

  it('NACKs an empty address like an undriven bus', () => {
    const { twi, bus } = makeBus();
    bus.start();
    bus.connectToSlave(0x50, true);
    bus.writeByte(0x12);
    bus.readByte(false);
    expect(twi.log).toEqual([
      ['start'],
      ['connect', false],
      ['write', false],
      ['read', 0xff],
    ]);
  });

  it('reads bytes from the connected device', () => {
    const { twi, bus } = makeBus();
    bus.register(0x68, new EchoDevice());
    bus.start();
    bus.connectToSlave(0x68, false);
    bus.readByte(true);
    expect(twi.log[twi.log.length - 1]).toEqual(['read', 0x42]);
  });

  it('unregisterAll() detaches every device', () => {
    const { twi, bus } = makeBus();
    bus.register(0x3c, new EchoDevice());
    bus.unregisterAll();
    bus.connectToSlave(0x3c, true);
    expect(twi.log).toEqual([['connect', false]]);
  });
});
