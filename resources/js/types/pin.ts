/**
 * Pin interface representing connection points on a component
 */
export interface ComponentPin {
  id: string;
  name: string;
  x: number;
  y: number;
  type?: 'anode' | 'cathode' | 'input' | 'output' | 'power' | 'ground';
  spiceNodeNumber?: number;  // Optional because it's only assigned when connected
  signals: string[];
  handle_id?: string; // Unique identifier for the pin handle in the UI
}

/**
 * Represents a connection between two pins
 */
export interface PinConnection {
  sourceId: string;
  sourcePinIndex: number;
  targetId: string;
  targetPinIndex: number;
}

/**
 * Pin information with signal type
 */
export interface PinWithSignal extends ComponentPin {
  signalType: string;
  direction?: 'input' | 'output' | 'bidirectional';
}

/**
 * Pin state interface for tracking pin state in the circuit
 */
export interface PinState {
  value: number | boolean;
  lastUpdated: number;
  signalType: string;
}

/**
 * Interface for pin visualization properties
 */
export interface PinVisualization {
  color: string;
  label?: string;
  size?: number;
  highlighted?: boolean;
}

/**
 * Enum for pin signal types
 */
export enum PinSignalType {
  POWER = 'power',
  GROUND = 'ground',
  DIGITAL = 'digital',
  ANALOG = 'analog',
  PASSIVE = 'passive',
  I2C = 'i2c',
  SPI = 'spi',
  UART = 'uart',
  RX = 'rx',
  TX = 'tx',
  CLOCK = 'clock',
  DATA = 'data',
  OTHER = 'other'
}

/**
 * Map of signal types to colors for visualization
 */
export const SIGNAL_COLOR_MAP: Record<string, string> = {
  [PinSignalType.POWER]: '#ff0000',
  [PinSignalType.GROUND]: '#000000',
  [PinSignalType.ANALOG]: '#4BC0C0',
  [PinSignalType.DIGITAL]: '#9b87f5',
  [PinSignalType.CLOCK]: '#ffcc00',
  [PinSignalType.DATA]: '#36A2EB',
  [PinSignalType.I2C]: '#8A65D4',
  [PinSignalType.SPI]: '#4CAF50',
  [PinSignalType.UART]: '#FF9800',
  [PinSignalType.RX]: '#E91E63',
  [PinSignalType.TX]: '#673AB7',
  [PinSignalType.PASSIVE]: '#795548',
  [PinSignalType.OTHER]: '#9E9E9E'
};
