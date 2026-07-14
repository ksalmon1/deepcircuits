import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProject } from '@/context/ProjectContext';
import { CircuitComponent } from '@/types/component';
import { mpu6050ValuesFrom } from '@/simulation/bus/devices/MPU6050Controller';
import { dhtValuesFrom } from '@/simulation/gpio/DHT22Responder';
import { distanceCmFrom } from '@/simulation/gpio/HCSR04Responder';
import { sensorActiveFrom } from '@/simulation/bus/busHost';

/**
 * Sensor panel — inject values into virtual sensors while the simulation
 * runs. Edits write into the component's attributes; the protocol decoders
 * read them live (see busHost), so a running sketch sees the new readings
 * on its next poll, no restart needed.
 */

interface SensorPanelProps {
  onClose: () => void;
}

interface FieldSpec {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
}

interface SensorSpec {
  title: string;
  fields: FieldSpec[];
  /** Current values (attribute overrides applied over datasheet defaults). */
  values: (attributes: Record<string, unknown> | undefined) => Record<string, number>;
  /** Label for a boolean detect state (PIR "Motion", flame "Flame", ...). */
  toggleLabel?: string;
}

/** Spec shared by the one-output detect sensors: a single on/off state. */
const detectSensor = (title: string, toggleLabel: string): SensorSpec => ({
  title,
  fields: [],
  values: () => ({}),
  toggleLabel,
});

const SENSOR_SPECS: Record<string, SensorSpec> = {
  mpu6050: {
    title: 'IMU (MPU6050)',
    fields: [
      { key: 'accelX', label: 'Accel X', unit: 'g', min: -2, max: 2, step: 0.01 },
      { key: 'accelY', label: 'Accel Y', unit: 'g', min: -2, max: 2, step: 0.01 },
      { key: 'accelZ', label: 'Accel Z', unit: 'g', min: -2, max: 2, step: 0.01 },
      { key: 'gyroX', label: 'Gyro X', unit: '°/s', min: -250, max: 250, step: 1 },
      { key: 'gyroY', label: 'Gyro Y', unit: '°/s', min: -250, max: 250, step: 1 },
      { key: 'gyroZ', label: 'Gyro Z', unit: '°/s', min: -250, max: 250, step: 1 },
      { key: 'temperature', label: 'Temp', unit: '°C', min: -40, max: 85, step: 0.5 },
    ],
    values: (attributes) => mpu6050ValuesFrom(attributes) as unknown as Record<string, number>,
  },
  'hc-sr04': {
    title: 'Ultrasonic (HC-SR04)',
    fields: [{ key: 'distance', label: 'Distance', unit: 'cm', min: 2, max: 400, step: 1 }],
    values: (attributes) => ({ distance: distanceCmFrom(attributes) }),
  },
  dht22: {
    title: 'Temp & Humidity (DHT22)',
    fields: [
      { key: 'temperature', label: 'Temp', unit: '°C', min: -40, max: 80, step: 0.1 },
      { key: 'humidity', label: 'Humidity', unit: '%', min: 0, max: 100, step: 0.1 },
    ],
    values: (attributes) => dhtValuesFrom(attributes) as unknown as Record<string, number>,
  },
  'pir-motion-sensor': detectSensor('PIR Motion Sensor', 'Motion detected'),
  'tilt-switch': detectSensor('Tilt Switch', 'Tilted'),
  'flame-sensor': detectSensor('Flame Sensor', 'Flame detected'),
  'gas-sensor': detectSensor('Gas Sensor', 'Gas detected'),
  'big-sound-sensor': detectSensor('Sound Sensor (Big)', 'Sound detected'),
  'small-sound-sensor': detectSensor('Sound Sensor (Small)', 'Sound detected'),
};

const sensorType = (comp: CircuitComponent) => comp.type.toLowerCase().replace(/^wokwi-/, '');

const SensorCard = ({ component, spec }: { component: CircuitComponent; spec: SensorSpec }) => {
  const { updateComponent } = useProject();
  const values = spec.values(component.attributes);

  const setValue = (key: string, raw: string) => {
    const value = parseFloat(raw);
    if (!Number.isFinite(value)) return;
    updateComponent({
      ...component,
      attributes: { ...component.attributes, [key]: value },
    });
  };

  return (
    <div className="rounded-md border p-2" data-testid={`sensor-card-${component.id}`}>
      <div className="mb-1 text-xs font-semibold">
        {spec.title} — {component.id}
      </div>
      {spec.toggleLabel && (
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={sensorActiveFrom(component.attributes)}
            onChange={(e) =>
              updateComponent({
                ...component,
                attributes: { ...component.attributes, active: e.target.checked },
              })
            }
            data-testid={`sensor-${component.id}-active`}
          />
          <span>{spec.toggleLabel}</span>
        </label>
      )}
      <div className="grid grid-cols-1 gap-1">
        {spec.fields.map((field) => (
          <label key={field.key} className="flex items-center gap-2 text-xs">
            <span className="w-14 shrink-0 text-muted-foreground">{field.label}</span>
            <input
              type="range"
              className="min-w-0 flex-1"
              min={field.min}
              max={field.max}
              step={field.step}
              value={values[field.key]}
              onChange={(e) => setValue(field.key, e.target.value)}
              aria-label={`${field.label} slider`}
            />
            <input
              type="number"
              className="w-16 rounded border px-1 py-0.5 text-right text-xs"
              min={field.min}
              max={field.max}
              step={field.step}
              value={values[field.key]}
              onChange={(e) => setValue(field.key, e.target.value)}
              aria-label={`${field.label} (${field.unit})`}
              data-testid={`sensor-${component.id}-${field.key}`}
            />
            <span className="w-7 shrink-0 text-muted-foreground">{field.unit}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

const SensorPanel = ({ onClose }: SensorPanelProps) => {
  const { components } = useProject();
  const sensors = components.filter((comp) => SENSOR_SPECS[sensorType(comp)] !== undefined);

  return (
    <div
      className="absolute right-4 top-4 z-40 w-80 rounded-lg border bg-background p-3 shadow-lg"
      data-testid="sensor-panel"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">Sensors</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose} aria-label="Close sensor panel">
          <X className="h-4 w-4" />
        </Button>
      </div>
      {sensors.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No injectable sensors on the canvas. Add an IMU, ultrasonic ranger, or DHT22 from the library — their
          readings become editable here while the simulation runs.
        </p>
      ) : (
        <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {sensors.map((sensor) => (
            <SensorCard key={sensor.id} component={sensor} spec={SENSOR_SPECS[sensorType(sensor)]} />
          ))}
        </div>
      )}
    </div>
  );
};

export default SensorPanel;
