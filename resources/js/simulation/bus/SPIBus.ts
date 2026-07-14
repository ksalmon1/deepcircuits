/**
 * SPIBus — routing between the MCU's hardware SPI and virtual peripherals.
 * SPI has no addressing: a device participates while its chip-select is
 * held low, so each registered target supplies an `isSelected` probe (backed
 * by the emulator's live CS pin level) and a full-duplex byte handler.
 */

/** A virtual SPI peripheral: one full-duplex byte exchange at a time. */
export interface SpiDevice {
  /** Handle a MOSI byte and return the simultaneous MISO byte. */
  transferByte(mosi: number): number;
  /** Chip-select released — reset any partial-frame state. */
  deselect?(): void;
}

interface SpiTarget {
  isSelected: () => boolean;
  device: SpiDevice;
}

export class SPIRouter {
  private targets: SpiTarget[] = [];

  add(isSelected: () => boolean, device: SpiDevice): void {
    this.targets.push({ isSelected, device });
  }

  /** Route one byte to the selected device; an idle bus reads 0xFF. */
  transfer(mosi: number): number {
    for (const target of this.targets) {
      if (target.isSelected()) return target.device.transferByte(mosi & 0xff) & 0xff;
    }
    return 0xff;
  }

  clear(): void {
    this.targets = [];
  }
}
