/**
 * DS1307Controller — virtual real-time clock on the I2C bus, from the DS1307
 * datasheet:
 *
 *  - Register-pointer protocol with wrap at 0x3F.
 *  - 0x00-0x06: BCD timekeeping (sec, min, hour, day-of-week, date, month,
 *    year). Bit 7 of seconds is CH (clock halt). 24-hour mode is modelled.
 *  - 0x07: control (stored, not interpreted — SQW output isn't modelled).
 *  - 0x08-0x3F: 56 bytes of battery-backed NVRAM.
 *
 * The clock tracks the host's wall clock plus the offset implied by any
 * time the sketch writes, so `RTC.adjust(...)`-style setup behaves like the
 * real part.
 */
import type { I2CDevice } from '../I2CBus';

export const DS1307_I2C_ADDRESS = 0x68;
const REGISTER_COUNT = 0x40;

const toBcd = (n: number) => ((Math.floor(n / 10) << 4) | (n % 10)) & 0xff;
const fromBcd = (b: number) => ((b >> 4) & 0x0f) * 10 + (b & 0x0f);

export class DS1307Controller implements I2CDevice {
  private pointer = 0;
  private pointerSet = false;
  private readonly nvram = new Uint8Array(REGISTER_COUNT - 8);
  private control = 0;
  private offsetMs = 0;
  private halted = false;
  private haltTime: Date = new Date();
  /** Time registers being written in the current transaction. */
  private pendingTime: Map<number, number> | null = null;

  constructor(private readonly now: () => Date = () => new Date()) {}

  private currentTime(): Date {
    if (this.halted) return this.haltTime;
    return new Date(this.now().getTime() + this.offsetMs);
  }

  i2cConnect(): boolean {
    this.pointerSet = false;
    return true;
  }

  i2cWriteByte(byte: number): boolean {
    if (!this.pointerSet) {
      this.pointer = byte % REGISTER_COUNT;
      this.pointerSet = true;
      return true;
    }
    this.writeRegister(this.pointer, byte & 0xff);
    this.pointer = (this.pointer + 1) % REGISTER_COUNT;
    return true;
  }

  i2cReadByte(): number {
    const value = this.readRegister(this.pointer);
    this.pointer = (this.pointer + 1) % REGISTER_COUNT;
    return value;
  }

  i2cDisconnect(): void {
    this.applyPendingTime();
  }

  private readRegister(reg: number): number {
    if (reg >= 8) return this.nvram[reg - 8];
    if (reg === 7) return this.control;
    const t = this.currentTime();
    switch (reg) {
      case 0:
        return toBcd(t.getSeconds()) | (this.halted ? 0x80 : 0);
      case 1:
        return toBcd(t.getMinutes());
      case 2:
        return toBcd(t.getHours()); // 24-hour mode (bit 6 clear)
      case 3:
        return toBcd(t.getDay() + 1); // DS1307 day-of-week is 1-7
      case 4:
        return toBcd(t.getDate());
      case 5:
        return toBcd(t.getMonth() + 1);
      case 6:
        return toBcd(t.getFullYear() % 100);
      default:
        return 0;
    }
  }

  private writeRegister(reg: number, byte: number): void {
    if (reg >= 8) {
      this.nvram[reg - 8] = byte;
      return;
    }
    if (reg === 7) {
      this.control = byte;
      return;
    }
    (this.pendingTime ??= new Map()).set(reg, byte);
  }

  /**
   * Apply a written time at the stop condition, when the whole burst has
   * arrived — matching the DS1307's write-then-tick behaviour closely
   * enough for RTC libraries.
   */
  private applyPendingTime(): void {
    if (!this.pendingTime) return;
    const written = this.pendingTime;
    this.pendingTime = null;

    const base = this.currentTime();
    const get = (reg: number, fallback: number, mask = 0xff) =>
      written.has(reg) ? fromBcd(written.get(reg)! & mask) : fallback;

    const halt = written.has(0) ? (written.get(0)! & 0x80) !== 0 : this.halted;
    const next = new Date(
      2000 + get(6, base.getFullYear() % 100),
      get(5, base.getMonth() + 1) - 1,
      get(4, base.getDate()),
      get(2, base.getHours(), 0x3f),
      get(1, base.getMinutes()),
      get(0, base.getSeconds(), 0x7f),
    );

    this.halted = halt;
    if (halt) {
      this.haltTime = next;
    } else {
      this.offsetMs = next.getTime() - this.now().getTime();
    }
  }
}
