/**
 * SDCardController — virtual SD card in SPI mode, from the SD Physical Layer
 * Simplified Specification (the subset every SPI host driver uses):
 *
 *  - 6-byte command frames (0x40|cmd, 32-bit argument, CRC).
 *  - R1 responses after one Ncr filler byte; the idle bit tracks CMD0 →
 *    ACMD41 initialization.
 *  - CMD8 answers R7 echoing the check pattern (the card is a V2 SDHC, so
 *    CMD58's OCR sets CCS: block addressing, arguments are block numbers).
 *  - CMD17 single-block read: R1, 0xFE start token, 512 data bytes, CRC.
 *  - CMD24 single-block write: R1, then the host's 0xFE token + 512 bytes,
 *    answered with the data-accepted response 0x05 and a short busy phase.
 *
 * Storage is a sparse in-memory image (unwritten blocks read as zeros) —
 * enough for raw block I/O and FAT drivers alike.
 */
import type { SpiDevice } from '../SPIBus';

export const SD_BLOCK_SIZE = 512;

const R1_IDLE = 0x01;
const R1_ILLEGAL = 0x04;
const START_TOKEN = 0xfe;
const DATA_ACCEPTED = 0x05;

type Phase =
  | { kind: 'command' }
  | { kind: 'writeAwaitToken'; block: number }
  | { kind: 'writeData'; block: number; buffer: Uint8Array; received: number };

export class SDCardController implements SpiDevice {
  private readonly blocks = new Map<number, Uint8Array>();
  private frame: number[] = [];
  private response: number[] = [];
  private phase: Phase = { kind: 'command' };
  private idle = true;
  private appCommand = false;
  /** Inbound bytes to ignore (the CRC trailing a write's data block). */
  private skip = 0;

  transferByte(mosi: number): number {
    const miso = this.response.length > 0 ? this.response.shift()! : 0xff;
    this.consume(mosi & 0xff);
    return miso;
  }

  deselect(): void {
    this.frame = [];
    if (this.phase.kind !== 'command') this.phase = { kind: 'command' };
  }

  /** Test/tooling access to the card image. */
  readBlock(block: number): Uint8Array {
    return this.blocks.get(block) ?? new Uint8Array(SD_BLOCK_SIZE);
  }

  writeBlockDirect(block: number, data: Uint8Array): void {
    const copy = new Uint8Array(SD_BLOCK_SIZE);
    copy.set(data.subarray(0, SD_BLOCK_SIZE));
    this.blocks.set(block, copy);
  }

  private consume(byte: number): void {
    if (this.skip > 0) {
      this.skip--;
      return;
    }
    if (this.phase.kind === 'writeAwaitToken') {
      if (byte === START_TOKEN) {
        this.phase = {
          kind: 'writeData',
          block: this.phase.block,
          buffer: new Uint8Array(SD_BLOCK_SIZE),
          received: 0,
        };
      }
      return;
    }
    if (this.phase.kind === 'writeData') {
      const p = this.phase;
      if (p.received < SD_BLOCK_SIZE) {
        p.buffer[p.received++] = byte;
        if (p.received === SD_BLOCK_SIZE) {
          this.blocks.set(p.block, p.buffer);
          // Two CRC bytes still arrive (ignored); answer after them with
          // data-accepted and a short busy phase.
          this.skip = 2;
          this.response = [0xff, 0xff, DATA_ACCEPTED, 0x00, 0x00, 0xff];
          this.phase = { kind: 'command' };
        }
      }
      return;
    }

    // Command phase: sync on a start byte (01xxxxxx), collect 6 bytes.
    if (this.frame.length === 0 && (byte & 0xc0) !== 0x40) return;
    this.frame.push(byte);
    if (this.frame.length < 6) return;

    const [first, a0, a1, a2, a3] = this.frame;
    this.frame = [];
    this.execute(first & 0x3f, ((a0 << 24) | (a1 << 16) | (a2 << 8) | a3) >>> 0);
  }

  private execute(cmd: number, arg: number): void {
    const r1 = this.idle ? R1_IDLE : 0x00;
    const wasAppCommand = this.appCommand;
    this.appCommand = false;
    // One Ncr filler byte before every response.
    const respond = (...bytes: number[]) => {
      this.response = [0xff, ...bytes];
    };

    if (wasAppCommand && cmd === 41) {
      // ACMD41: initialization completes immediately.
      this.idle = false;
      respond(0x00);
      return;
    }

    switch (cmd) {
      case 0: // GO_IDLE_STATE
        this.idle = true;
        respond(R1_IDLE);
        break;
      case 8: // SEND_IF_COND: R7 echoing voltage + check pattern
        respond(r1, 0x00, 0x00, (arg >> 8) & 0x0f, arg & 0xff);
        break;
      case 55: // APP_CMD
        this.appCommand = true;
        respond(r1);
        break;
      case 58: // READ_OCR: powered up, CCS=1 (SDHC block addressing)
        respond(r1, 0xc0, 0xff, 0x80, 0x00);
        break;
      case 16: // SET_BLOCKLEN (fixed 512)
        respond(r1);
        break;
      case 17: { // READ_SINGLE_BLOCK
        if (this.idle) {
          respond(R1_ILLEGAL | R1_IDLE);
          break;
        }
        const data = Array.from(this.readBlock(arg));
        respond(0x00, 0xff, START_TOKEN, ...data, 0xff, 0xff);
        break;
      }
      case 24: // WRITE_BLOCK
        if (this.idle) {
          respond(R1_ILLEGAL | R1_IDLE);
          break;
        }
        respond(0x00);
        this.phase = { kind: 'writeAwaitToken', block: arg };
        break;
      default:
        respond(r1 | R1_ILLEGAL);
        break;
    }
  }
}
