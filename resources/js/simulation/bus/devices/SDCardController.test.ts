import { describe, it, expect } from 'vitest';
import { SDCardController, SD_BLOCK_SIZE } from './SDCardController';

/** Clock one byte out on MOSI, returning MISO. */
const xfer = (card: SDCardController, mosi: number) => card.transferByte(mosi);

/** Send a 6-byte command and collect the response bytes that follow. */
function command(card: SDCardController, cmd: number, arg = 0, responseLen = 1): number[] {
  xfer(card, 0x40 | cmd);
  xfer(card, (arg >>> 24) & 0xff);
  xfer(card, (arg >>> 16) & 0xff);
  xfer(card, (arg >>> 8) & 0xff);
  xfer(card, arg & 0xff);
  xfer(card, 0x95); // CRC (ignored except by real CMD0)
  const out: number[] = [];
  // One Ncr filler byte, then the response.
  xfer(card, 0xff);
  for (let i = 0; i < responseLen; i++) out.push(xfer(card, 0xff));
  return out;
}

function initCard(card: SDCardController): void {
  expect(command(card, 0)).toEqual([0x01]); // idle
  expect(command(card, 8, 0x1aa, 5)).toEqual([0x01, 0x00, 0x00, 0x01, 0xaa]);
  command(card, 55);
  expect(command(card, 41)).toEqual([0x00]); // ready
}

describe('SDCardController', () => {
  it('runs the SPI-mode init handshake (CMD0/CMD8/ACMD41/CMD58)', () => {
    const card = new SDCardController();
    initCard(card);
    // OCR: powered up + CCS=1 (block addressing).
    expect(command(card, 58, 0, 5)).toEqual([0x00, 0xc0, 0xff, 0x80, 0x00]);
  });

  it('reads an unwritten block as zeros with the 0xFE token', () => {
    const card = new SDCardController();
    initCard(card);
    const bytes = command(card, 17, 7, 3 + SD_BLOCK_SIZE + 2);
    expect(bytes[0]).toBe(0x00); // R1
    expect(bytes[1]).toBe(0xff); // gap
    expect(bytes[2]).toBe(0xfe); // start token
    expect(bytes.slice(3, 3 + SD_BLOCK_SIZE).every((b) => b === 0)).toBe(true);
  });

  it('writes a block with CMD24 and reads it back with CMD17', () => {
    const card = new SDCardController();
    initCard(card);

    expect(command(card, 24, 5)).toEqual([0x00]); // R1 for WRITE_BLOCK
    xfer(card, 0xff); // gap before the data packet
    xfer(card, 0xfe); // start token
    for (let i = 0; i < SD_BLOCK_SIZE; i++) xfer(card, i & 0xff);
    xfer(card, 0x00); // CRC
    xfer(card, 0x00);
    expect(xfer(card, 0xff)).toBe(0x05); // data accepted
    // Busy phase, then released.
    xfer(card, 0xff);
    xfer(card, 0xff);
    expect(xfer(card, 0xff)).toBe(0xff);

    const bytes = command(card, 17, 5, 3 + SD_BLOCK_SIZE + 2);
    const data = bytes.slice(3, 3 + SD_BLOCK_SIZE);
    expect(data[0]).toBe(0);
    expect(data[255]).toBe(255);
    expect(data[511]).toBe(511 & 0xff);
    expect(card.readBlock(5)[42]).toBe(42);
  });

  it('rejects reads before initialization and unknown commands', () => {
    const card = new SDCardController();
    expect(command(card, 0)).toEqual([0x01]);
    expect(command(card, 17, 0)).toEqual([0x05]); // illegal + idle
    expect(command(card, 33)).toEqual([0x05]);
  });

  it('deselect clears a partial command frame', () => {
    const card = new SDCardController();
    initCard(card);
    xfer(card, 0x40 | 17); // half a command...
    xfer(card, 0x00);
    card.deselect();
    // ...must not corrupt the next full command.
    expect(command(card, 58, 0, 5)).toEqual([0x00, 0xc0, 0xff, 0x80, 0x00]);
  });
});
