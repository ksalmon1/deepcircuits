
/**
 * Represents a pin on a hardware component
 */
export interface ComponentPin {
  name: string;
  x: number;
  y: number;
  signals: string[];
}

/**
 * Pin position data for visualization
 */
export interface PinPosition {
  id: string;
  x: number;
  y: number;
}

/**
 * Pin connection information for wires
 */
export interface PinConnection {
  sourceId: string;
  targetId: string;
  sourcePinIndex: number;
  targetPinIndex: number;
}

/**
 * Pin signal type definitions
 */
export enum PinSignalType {
  POWER = 'power',
  GROUND = 'ground',
  DIGITAL = 'digital',
  ANALOG = 'analog',
  I2C = 'i2c',
  SPI = 'spi',
  UART = 'uart',
  PASSIVE = 'passive',
  OTHER = 'other'
}

/**
 * Wire color mapping based on signal type
 */
export const SIGNAL_COLOR_MAP: Record<string, string> = {
  [PinSignalType.POWER]: '#FF6384',    // Red
  [PinSignalType.GROUND]: '#36A2EB',   // Blue
  [PinSignalType.DIGITAL]: '#4BC0C0',  // Teal
  [PinSignalType.ANALOG]: '#FFCE56',   // Yellow
  [PinSignalType.PASSIVE]: '#9966FF',  // Purple
  [PinSignalType.I2C]: '#FF9F40',      // Orange
  [PinSignalType.SPI]: '#C9CBCF',      // Gray
  [PinSignalType.UART]: '#7CFC00',     // Lime
  'rx': '#FF00FF',                     // Magenta
  'tx': '#00FFFF',                     // Cyan
  [PinSignalType.OTHER]: '#4BC0C0'     // Default to Teal
};
