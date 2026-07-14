/**
 * I2CBus — the virtual I2C (TWI) bus between the emulated MCU and virtual
 * peripherals. It implements avr8js's TWIEventHandler: the AVR core raises
 * start/address/write/read events as the sketch drives the TWI registers
 * (e.g. through the Wire library), and the bus routes them to the device
 * registered at the addressed 7-bit address, completing each event so the
 * hardware handshake (TWINT, status codes) proceeds.
 *
 * An unpopulated address NACKs, exactly like leaving SDA undriven on real
 * hardware — sketches see endTransmission() return an error.
 */
import type { AVRTWI, TWIEventHandler } from 'avr8js';

/** A virtual peripheral on the bus (one 7-bit address). */
export interface I2CDevice {
  /** Address match: return true to ACK the connection. */
  i2cConnect(write: boolean): boolean;
  /** Master wrote a byte to the device: return true to ACK it. */
  i2cWriteByte(byte: number): boolean;
  /** Master reads a byte; `ack` is false on the master's final read. */
  i2cReadByte(ack: boolean): number;
  /** Stop condition after a transaction with this device. */
  i2cDisconnect?(): void;
}

export class I2CBus implements TWIEventHandler {
  private readonly devices = new Map<number, I2CDevice>();
  private active: I2CDevice | null = null;

  constructor(private readonly twi: AVRTWI) {}

  /** Attach a device at a 7-bit address (e.g. 0x3C for an SSD1306). */
  register(address: number, device: I2CDevice): void {
    this.devices.set(address & 0x7f, device);
  }

  unregisterAll(): void {
    this.devices.clear();
    this.active = null;
  }

  // --- TWIEventHandler ---

  start(): void {
    this.twi.completeStart();
  }

  stop(): void {
    this.active?.i2cDisconnect?.();
    this.active = null;
    this.twi.completeStop();
  }

  connectToSlave(addr: number, write: boolean): void {
    const device = this.devices.get(addr & 0x7f) ?? null;
    this.active = device && device.i2cConnect(write) ? device : null;
    this.twi.completeConnect(this.active !== null);
  }

  writeByte(value: number): void {
    const ack = this.active ? this.active.i2cWriteByte(value & 0xff) : false;
    this.twi.completeWrite(ack);
  }

  readByte(ack: boolean): void {
    // An undriven bus reads 0xFF (SDA pulled high).
    const value = this.active ? this.active.i2cReadByte(ack) & 0xff : 0xff;
    this.twi.completeRead(value);
  }
}
