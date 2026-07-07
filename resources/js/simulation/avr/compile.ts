/**
 * Compiles Arduino sketches to AVR hex through this app's own backend
 * (POST /api/compile → arduino-cli on the server). Sketches never leave
 * the machine hosting the app. Results are cached by sketch text so
 * re-running an unchanged sketch never re-compiles.
 */
import { isAxiosError } from 'axios';
import { http } from '@/lib/http';

export interface CompileResult {
  hex: string;
  stdout: string;
  stderr: string;
}

export class CompileError extends Error {
  constructor(message: string, readonly output: string) {
    super(message);
    this.name = 'CompileError';
  }
}

let cachedSketch: string | null = null;
let cachedResult: CompileResult | null = null;

export async function compileSketch(sketch: string): Promise<CompileResult> {
  if (cachedSketch === sketch && cachedResult) {
    return cachedResult;
  }
  let result: CompileResult;
  try {
    const { data } = await http.post<CompileResult>('/api/compile', { sketch });
    result = data;
  } catch (err) {
    if (isAxiosError(err) && err.response) {
      const data = err.response.data as { message?: string; stderr?: string; stdout?: string };
      throw new CompileError(
        data.message || `Sketch compiler returned HTTP ${err.response.status}.`,
        [data.stderr, data.stdout].filter(Boolean).join('\n'),
      );
    }
    throw new CompileError('Could not reach the sketch compiler.', String(err));
  }
  if (!result.hex) {
    throw new CompileError(
      'Sketch failed to compile.',
      [result.stderr, result.stdout].filter(Boolean).join('\n'),
    );
  }
  cachedSketch = sketch;
  cachedResult = result;
  return result;
}
