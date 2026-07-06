import { Page, APIRequestContext, expect } from '@playwright/test';

/** Library component shape returned by GET /api/components. */
export interface LibraryItem {
  id: string;
  name: string;
  type: string;
  svgPath?: string;
  pins: Array<{ id: string; name: string; x: number; y: number; signals: string[]; handle_id?: string; type?: string }>;
  properties: Record<string, unknown>;
}

export interface PlacedComponent {
  id: string;
  type: string;
  name?: string;
  top: number;
  left: number;
  attributes: Record<string, unknown>;
  pins: LibraryItem['pins'];
  svgPath?: string;
}

export interface Wire {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
  type: string;
  data: { color: string; sourcePinIndex: number; targetPinIndex: number };
}

let wireCounter = 0;

/** Connect pin `fromPin` of component `from` to pin `toPin` of component `to`. */
export function wire(from: PlacedComponent, fromPin: number, to: PlacedComponent, toPin: number): Wire {
  return {
    id: `e2e-wire-${++wireCounter}`,
    source: from.id,
    target: to.id,
    sourceHandle: `pin-${fromPin}`,
    targetHandle: `pin-${toPin}`,
    type: 'customWire',
    data: { color: '#555', sourcePinIndex: fromPin, targetPinIndex: toPin },
  };
}

export class CircuitBuilder {
  private library: Map<string, LibraryItem> = new Map();
  private counter = 0;

  async load(request: APIRequestContext): Promise<void> {
    const res = await request.get('/api/components');
    expect(res.ok()).toBeTruthy();
    const items: LibraryItem[] = await res.json();
    for (const item of items) {
      this.library.set(item.type, item);
    }
  }

  has(type: string): boolean {
    return this.library.has(type);
  }

  /** Place a component of a library type with optional attribute overrides. */
  place(type: string, position: { top: number; left: number }, attributes: Record<string, unknown> = {}): PlacedComponent {
    const item = this.library.get(type);
    if (!item) throw new Error(`Component type '${type}' not in library`);
    this.counter += 1;
    return {
      id: `${type}-${this.counter}`,
      type,
      name: item.name,
      top: position.top,
      left: position.left,
      attributes: { ...item.properties, ...attributes },
      pins: item.pins,
      svgPath: item.svgPath,
    };
  }
}

async function csrfHeaders(page: Page): Promise<Record<string, string>> {
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === 'XSRF-TOKEN')?.value ?? '';
  return {
    'X-XSRF-TOKEN': decodeURIComponent(token),
    'X-Requested-With': 'XMLHttpRequest',
    Accept: 'application/json',
  };
}

export async function login(page: Page, email = 'admin@deepcircuits.test', password = 'password'): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard');
}

/** Create a project holding the given circuit and return its id. */
export async function createCircuitProject(
  page: Page,
  name: string,
  components: PlacedComponent[],
  wires: Wire[],
): Promise<string> {
  const headers = await csrfHeaders(page);
  const created = await page.request.post('/projects', { data: { name }, headers });
  expect(created.ok(), `create project: ${created.status()}`).toBeTruthy();
  const project = await created.json();
  const saved = await page.request.put(`/projects/${project.id}`, {
    data: { name, components, wires, code: '' },
    headers,
  });
  expect(saved.ok(), `save project: ${saved.status()}`).toBeTruthy();
  return project.id;
}

export interface SimResults {
  voltages: Record<string, number>;
  currents: Record<string, number>;
}

/** Open the editor for a project, run the simulation, and return the results. */
export async function runSimulation(page: Page, projectId: string): Promise<SimResults> {
  await page.goto(`/circuit-editor/${projectId}`);
  // Wait for the canvas and library to be ready.
  await expect(page.locator('.react-flow')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start' })).toBeEnabled();
  // Clear any stale results from a previous run in this tab.
  await page.evaluate(() => {
    window.simulationResults = undefined;
    window.lastCircuitSummary = undefined;
  });
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
  // The formatter stores results on window when the run completes.
  await page.waitForFunction(
    () => window.simulationResults && Object.keys(window.simulationResults.voltages || {}).length > 0,
    undefined,
    { timeout: 60_000 },
  );
  return page.evaluate(() => window.simulationResults as { voltages: Record<string, number>; currents: Record<string, number> });
}

declare global {
  interface Window {
    simulationResults?: { voltages: Record<string, number>; currents: Record<string, number> };
    lastCircuitSummary?: string;
  }
}
