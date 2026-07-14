/**
 * The analog→digital half of the co-simulation loop: solved SPICE node
 * voltages become the emulated MCU's inputs, so digitalRead()/analogRead()
 * in the sketch see the real circuit.
 *
 * Split by signal kind (per the mixed-mode design):
 *  - analog inputs feed the ADC channel sample registers verbatim;
 *  - digital inputs go through a PinResolver, which reads the voltage
 *    against the chip's logic-family thresholds (datasheet VIL/VIH) with
 *    hysteresis instead of a flat mid-rail guess.
 *
 * Pure functions over a minimal MCU-sink interface so the coupling rules are
 * unit-testable without an AVRRunner or a solver.
 */
import { boardPinRole, isAnalogOnlyPin } from '@/simulation/avr/boardModel';
import type { BoardProfile } from '@/simulation/avr/boardProfiles';
import type { PinResolver } from '@/simulation/logic/logicFamilies';

/** The slice of AVRRunner (or any MCU emulator) the coupling needs. */
export interface McuInputSink {
  setAnalogVoltage(channel: number, volts: number): void;
  setDigitalInput(arduinoPin: number, high: boolean): void;
  getPinMode(arduinoPin: number): string;
}

export interface BoardPinLike {
  id: string;
  name?: string;
}

/** Solved voltage per pin handle id, from the SPICE result mapping. */
export type PinVoltageMap = Record<string, number> | undefined;

/** Feed solved voltages into the MCU's ADC channels (A0..A[n-1]). */
export function connectAnalogInputsToMcu(
  mcu: McuInputSink,
  profile: BoardProfile,
  pins: BoardPinLike[],
  pinVoltages: PinVoltageMap,
): void {
  for (const pin of pins) {
    const role = boardPinRole(pin.name, profile);
    const volts = pinVoltages?.[pin.id];
    if (!role || role.kind !== 'io' || volts === undefined) continue;
    if (role.arduinoPin >= profile.analogBase) {
      mcu.setAnalogVoltage(role.arduinoPin - profile.analogBase, volts);
    }
  }
}

/**
 * Feed solved voltages into the MCU's GPIO input registers. Pins the sketch
 * drives as OUTPUT are skipped (the MCU owns them), as are ADC-only pads
 * (the Nano's A6/A7 have no GPIO register) and pins claimed by a protocol
 * responder — an HC-SR04 echo or DHT22 data line is a cycle-timed digital
 * signal, and the DC operating point must not overwrite it mid-pulse.
 */
export function connectDigitalInputsToMcu(
  mcu: McuInputSink,
  profile: BoardProfile,
  pins: BoardPinLike[],
  pinVoltages: PinVoltageMap,
  resolver: PinResolver,
  claimedPins?: ReadonlySet<number>,
): void {
  for (const pin of pins) {
    const role = boardPinRole(pin.name, profile);
    const volts = pinVoltages?.[pin.id];
    if (!role || role.kind !== 'io' || volts === undefined) continue;
    if (isAnalogOnlyPin(role.arduinoPin, profile)) continue;
    if (claimedPins?.has(role.arduinoPin)) continue;
    if (mcu.getPinMode(role.arduinoPin) === 'output') continue;
    mcu.setDigitalInput(role.arduinoPin, resolver.resolve(role.arduinoPin, volts));
  }
}
