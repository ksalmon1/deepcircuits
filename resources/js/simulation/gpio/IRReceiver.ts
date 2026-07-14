/**
 * IRReceiver — a virtual IR demodulator module (TSOP-style) that transmits
 * NEC frames on its DAT pin when the user "presses a button" on the remote.
 *
 * The module strips the 38kHz carrier, so what a sketch actually sees on
 * DAT is the envelope, **inverted** (idle high, mark low), per the NEC
 * protocol and the TSOP4838 datasheet:
 *
 *   9000µs mark, 4500µs space  — AGC leader
 *   32 bits: 560µs mark, then a 560µs space (0) or 1690µs space (1)
 *   560µs stop mark, then idle
 *
 * Bit order is LSB-first per byte: address, ~address, command, ~command.
 */
import { CYCLES_PER_US, type GpioHostOps } from './GpioHostOps';

const LEADER_MARK_US = 9000;
const LEADER_SPACE_US = 4500;
const BIT_MARK_US = 560;
const ZERO_SPACE_US = 560;
const ONE_SPACE_US = 1690;

/** Build the 32 NEC bits (LSB-first) for an address/command pair. */
export function necBits(address: number, command: number): number[] {
  const bytes = [address & 0xff, ~address & 0xff, command & 0xff, ~command & 0xff];
  const bits: number[] = [];
  for (const byte of bytes) {
    for (let i = 0; i < 8; i++) bits.push((byte >> i) & 1); // LSB first
  }
  return bits;
}

export class IRReceiver {
  private busy = false;

  constructor(
    private readonly ops: GpioHostOps,
    private readonly datPin: number,
  ) {
    // Idle high: no carrier means the demodulator output rests high.
    this.ops.drive(this.datPin, true);
  }

  /** True while a frame is being transmitted. */
  get transmitting(): boolean {
    return this.busy;
  }

  /** Send one NEC frame (a remote key press). Ignored while already busy. */
  send(address: number, command: number): void {
    if (this.busy) return;
    this.busy = true;

    // Build the envelope as (offset-µs, level) transitions; mark = low.
    const transitions: Array<[number, boolean]> = [];
    let at = 0;
    const mark = (us: number) => {
      transitions.push([at, false]);
      at += us;
    };
    const space = (us: number) => {
      transitions.push([at, true]);
      at += us;
    };

    mark(LEADER_MARK_US);
    space(LEADER_SPACE_US);
    for (const bit of necBits(address, command)) {
      mark(BIT_MARK_US);
      space(bit ? ONE_SPACE_US : ZERO_SPACE_US);
    }
    mark(BIT_MARK_US); // stop mark
    transitions.push([at, true]); // back to idle

    for (const [offsetUs, level] of transitions) {
      this.ops.schedule(() => this.ops.drive(this.datPin, level), offsetUs * CYCLES_PER_US);
    }
    this.ops.schedule(() => {
      this.busy = false;
    }, (at + 100) * CYCLES_PER_US);
  }
}
