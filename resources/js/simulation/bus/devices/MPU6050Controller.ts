/**
 * MPU6050Controller — virtual 6-axis IMU on the I2C bus, from the MPU-6050
 * register map (RM-MPU-6000A):
 *
 *  - Register-pointer protocol: the first written byte sets the register
 *    pointer; further writes store into registers; reads auto-increment.
 *  - Measurement registers (big-endian int16 pairs): accel 0x3B-0x40,
 *    temperature 0x41-0x42, gyro 0x43-0x48.
 *  - Scale factors at the reset ranges (±2g, ±250°/s): 16384 LSB/g and
 *    131 LSB/(°/s); temperature: raw = (°C − 36.53) × 340.
 *  - WHO_AM_I (0x75) reads 0x68. PWR_MGMT_1 (0x6B) resets to 0x40 (sleep).
 *
 * Sensor values come from a supplier reading the part's live attributes
 * (accelX/accelY/accelZ in g, gyroX/gyroY/gyroZ in °/s, temperature in °C),
 * so the Sensor panel can change them while the sketch runs.
 */
import type { I2CDevice } from '../I2CBus';

export const MPU6050_I2C_ADDRESS = 0x68;
const WHO_AM_I = 0x75;
const PWR_MGMT_1 = 0x6b;
const ACCEL_XOUT_H = 0x3b;

export interface Mpu6050Values {
  accelX: number;
  accelY: number;
  accelZ: number;
  gyroX: number;
  gyroY: number;
  gyroZ: number;
  temperature: number;
}

/** Reset-default readings: device flat on the bench at room temperature. */
export const MPU6050_DEFAULTS: Mpu6050Values = {
  accelX: 0,
  accelY: 0,
  accelZ: 1, // gravity
  gyroX: 0,
  gyroY: 0,
  gyroZ: 0,
  temperature: 24,
};

function toNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? parseFloat(value) : (value as number);
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

/** Read injectable values out of a component's attribute bag. */
export function mpu6050ValuesFrom(attributes: Record<string, unknown> | undefined): Mpu6050Values {
  const a = attributes ?? {};
  return {
    accelX: toNumber(a.accelX, MPU6050_DEFAULTS.accelX),
    accelY: toNumber(a.accelY, MPU6050_DEFAULTS.accelY),
    accelZ: toNumber(a.accelZ, MPU6050_DEFAULTS.accelZ),
    gyroX: toNumber(a.gyroX, MPU6050_DEFAULTS.gyroX),
    gyroY: toNumber(a.gyroY, MPU6050_DEFAULTS.gyroY),
    gyroZ: toNumber(a.gyroZ, MPU6050_DEFAULTS.gyroZ),
    temperature: toNumber(a.temperature, MPU6050_DEFAULTS.temperature),
  };
}

const clamp16 = (v: number) => Math.max(-32768, Math.min(32767, Math.round(v)));

export class MPU6050Controller implements I2CDevice {
  private pointer = 0;
  private pointerSet = false;
  private registers = new Uint8Array(0x80);

  constructor(private readonly values: () => Mpu6050Values = () => MPU6050_DEFAULTS) {
    this.registers[PWR_MGMT_1] = 0x40; // reset value: sleep bit set
  }

  i2cConnect(): boolean {
    this.pointerSet = false;
    return true;
  }

  i2cWriteByte(byte: number): boolean {
    if (!this.pointerSet) {
      this.pointer = byte & 0x7f;
      this.pointerSet = true;
      return true;
    }
    this.registers[this.pointer] = byte & 0xff;
    this.pointer = (this.pointer + 1) & 0x7f;
    return true;
  }

  i2cReadByte(): number {
    const value = this.readRegister(this.pointer);
    this.pointer = (this.pointer + 1) & 0x7f;
    return value;
  }

  private readRegister(reg: number): number {
    if (reg === WHO_AM_I) return MPU6050_I2C_ADDRESS;
    if (reg >= ACCEL_XOUT_H && reg <= 0x48) {
      const v = this.values();
      const words = [
        clamp16(v.accelX * 16384),
        clamp16(v.accelY * 16384),
        clamp16(v.accelZ * 16384),
        clamp16((v.temperature - 36.53) * 340),
        clamp16(v.gyroX * 131),
        clamp16(v.gyroY * 131),
        clamp16(v.gyroZ * 131),
      ];
      const offset = reg - ACCEL_XOUT_H;
      const word = words[offset >> 1] & 0xffff;
      return offset % 2 === 0 ? word >> 8 : word & 0xff;
    }
    return this.registers[reg];
  }
}
