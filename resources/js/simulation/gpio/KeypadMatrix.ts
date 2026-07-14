/**
 * KeypadMatrix — a 4x4 membrane keypad as a real switch matrix.
 *
 * Standard scanning (what the Keypad library and every hand-rolled scan
 * do): the host drives one row LOW at a time with the columns as
 * INPUT_PULLUP, and reads a column LOW when the key at that intersection is
 * held. This model reproduces exactly that, so any scan order works:
 *
 *   column reads LOW  ⇔  some held key sits on a row the host is driving LOW
 *
 * Columns with no such key read HIGH (the pull-up). Because it responds to
 * the live row levels rather than assuming a scan pattern, a sketch that
 * drives rows the other way round (columns as outputs) still works.
 */

export interface KeypadOps {
  /** Level the host is currently driving on a pin. */
  readPin(arduinoPin: number): boolean;
  /** Drive a board input pin (the keypad's side of the matrix). */
  drive(arduinoPin: number, level: boolean): void;
}

/** Default 4x4 key labels, row-major (matches the element's key order). */
export const KEYPAD_KEYS = ['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '*', '0', '#', 'D'];

export class KeypadMatrix {
  /** Currently-held keys, as "row,col" pairs. */
  private held = new Set<string>();

  constructor(
    private readonly ops: KeypadOps,
    private readonly rowPins: number[],
    private readonly colPins: number[],
  ) {}

  /** Press or release a key by its label ('5', '#', ...). */
  setKey(label: string, pressed: boolean): void {
    const index = KEYPAD_KEYS.indexOf(label);
    if (index < 0) return;
    const key = `${Math.floor(index / 4)},${index % 4}`;
    if (pressed) this.held.add(key);
    else this.held.delete(key);
    this.refresh();
  }

  /**
   * Recompute every column level from the live row levels. Call on any row
   * or key change; it is cheap (16 lookups) and idempotent.
   */
  refresh(): void {
    for (let col = 0; col < this.colPins.length; col++) {
      let pulledLow = false;
      for (let row = 0; row < this.rowPins.length; row++) {
        if (!this.held.has(`${row},${col}`)) continue;
        // A held key shorts its row to its column: the column follows the
        // row's level, and a scan drives that row LOW.
        if (!this.ops.readPin(this.rowPins[row])) {
          pulledLow = true;
          break;
        }
      }
      this.ops.drive(this.colPins[col], !pulledLow); // idle high (pull-up)
    }
  }
}
