import { describe, it, expect } from 'vitest';
import { MPU6050Controller, mpu6050ValuesFrom, MPU6050_DEFAULTS } from './MPU6050Controller';

/** Point the register pointer, then burst-read n bytes (the Wire pattern). */
function readFrom(ctl: MPU6050Controller, reg: number, n: number): number[] {
  ctl.i2cConnect();
  ctl.i2cWriteByte(reg);
  ctl.i2cConnect(); // repeated start for the read phase
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(ctl.i2cReadByte());
  return out;
}

const int16 = (hi: number, lo: number) => {
  const v = (hi << 8) | lo;
  return v >= 0x8000 ? v - 0x10000 : v;
};

describe('MPU6050Controller', () => {
  it('answers WHO_AM_I with 0x68', () => {
    const ctl = new MPU6050Controller();
    expect(readFrom(ctl, 0x75, 1)).toEqual([0x68]);
  });

  it('converts accel g-values at 16384 LSB/g (±2g default)', () => {
    const ctl = new MPU6050Controller(() => ({ ...MPU6050_DEFAULTS, accelX: 0.5, accelZ: 1 }));
    const [xh, xl, , , zh, zl] = readFrom(ctl, 0x3b, 6);
    expect(int16(xh, xl)).toBe(8192);
    expect(int16(zh, zl)).toBe(16384);
  });

  it('converts gyro and temperature per the datasheet scales', () => {
    const ctl = new MPU6050Controller(() => ({ ...MPU6050_DEFAULTS, gyroY: -100, temperature: 36.53 }));
    const bytes = readFrom(ctl, 0x41, 6); // temp(2) + gyroX(2) + gyroY(2)
    expect(int16(bytes[0], bytes[1])).toBe(0); // 36.53°C → raw 0
    expect(int16(bytes[4], bytes[5])).toBe(-13100); // -100°/s × 131
  });

  it('auto-increments through a 14-byte burst like real drivers do', () => {
    const ctl = new MPU6050Controller(() => ({ ...MPU6050_DEFAULTS, accelX: 1, gyroZ: 10 }));
    const bytes = readFrom(ctl, 0x3b, 14);
    expect(int16(bytes[0], bytes[1])).toBe(16384); // accelX
    expect(int16(bytes[12], bytes[13])).toBe(1310); // gyroZ
  });

  it('PWR_MGMT_1 resets to sleep and is writable', () => {
    const ctl = new MPU6050Controller();
    expect(readFrom(ctl, 0x6b, 1)).toEqual([0x40]);
    ctl.i2cConnect();
    ctl.i2cWriteByte(0x6b);
    ctl.i2cWriteByte(0x00); // wake (what every init sketch does)
    expect(readFrom(ctl, 0x6b, 1)).toEqual([0x00]);
  });

  it('reads live values from attributes with defaults', () => {
    expect(mpu6050ValuesFrom(undefined)).toEqual(MPU6050_DEFAULTS);
    expect(mpu6050ValuesFrom({ accelX: '0.25', gyroZ: 45 })).toMatchObject({ accelX: 0.25, gyroZ: 45, accelZ: 1 });
  });
});
