<?php

namespace Database\Seeders;

use App\Models\LibraryComponent;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeds the public example projects offered to every user on the dashboard.
 *
 * Circuits are assembled from the seeded component library so instance pins
 * (ids, handle_ids, coordinates) always match what dragging the part would
 * produce. Reseeding is idempotent: the example user's projects are rebuilt
 * from scratch each run.
 */
class ProjectExampleSeeder extends Seeder
{
    /** Signal-to-wire-colour map mirrored from resources/js/types/pin.ts. */
    private const SIGNAL_COLORS = [
        'power' => '#ff0000',
        'ground' => '#000000',
        'analog' => '#4BC0C0',
        'digital' => '#9b87f5',
        'i2c' => '#8A65D4',
        'spi' => '#4CAF50',
        'usart' => '#FF9800',
        'pwm' => '#9b87f5',
        'passive' => '#795548',
    ];

    /** Cache of library components keyed by type. */
    private array $library = [];

    public function run(): void
    {
        $owner = User::query()->firstOrCreate(
            ['email' => 'examples@deepcircuits.test'],
            [
                'name' => 'DeepCircuits Examples',
                'display_name' => 'DeepCircuits Examples',
                'password' => Hash::make(Str::random(40)),
                'role' => 'user',
            ],
        );

        // Rebuild from scratch so edits to this seeder always take effect.
        $owner->projects()->delete();

        foreach ($this->examples() as $example) {
            $owner->projects()->create([
                'name' => $example['name'],
                'description' => $example['description'],
                'components' => $example['components'],
                'wires' => $example['wires'],
                'code' => $example['code'] ?? '',
                'is_public' => true,
            ]);
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function examples(): array
    {
        return [
            $this->ledResistorExample(),
            $this->pushButtonExample(),
            $this->blinkExample(),
            $this->buttonControlledLedExample(),
            $this->potentiometerFadeExample(),
            $this->nanoBlinkExample(),
            $this->nanoButtonExample(),
            $this->nanoPotentiometerExample(),
        ];
    }

    // --- Example 1: series LED (beginner, no board) ----------------------

    private function ledResistorExample(): array
    {
        $b = new CircuitBuilder($this);
        $battery = $b->add('voltagesource', 120, 200);
        $resistor = $b->add('resistor', 320, 140, ['resistance' => 330]);
        $led = $b->add('led', 520, 200, ['color' => 'red']);
        $b->wire($battery, 'pin-0', $resistor, 'pin-0');
        $b->wire($resistor, 'pin-1', $led, 'pin-0');
        $b->wire($led, 'pin-1', $battery, 'pin-1');

        return [
            'name' => 'LED & Resistor',
            'description' => 'The classic first circuit: a 9V battery lights an LED through a current-limiting resistor. Press Run to see it glow.',
            'components' => $b->components(),
            'wires' => $b->wires(),
        ];
    }

    // --- Example 2: push button in series (beginner, interactive) ---------

    private function pushButtonExample(): array
    {
        $b = new CircuitBuilder($this);
        $battery = $b->add('voltagesource', 120, 220);
        $button = $b->add('pushbutton', 320, 150);
        $resistor = $b->add('resistor', 500, 150, ['resistance' => 330]);
        $led = $b->add('led', 680, 220, ['color' => 'green']);
        $b->wire($battery, 'pin-0', $button, 'pin-0');
        $b->wire($button, 'pin-1', $resistor, 'pin-0');
        $b->wire($resistor, 'pin-1', $led, 'pin-0');
        $b->wire($led, 'pin-1', $battery, 'pin-1');

        return [
            'name' => 'Push Button Light',
            'description' => 'A momentary push button in series with an LED. Run the simulation, then click and hold the button to complete the circuit.',
            'components' => $b->components(),
            'wires' => $b->wires(),
        ];
    }

    // --- Example 3: Uno blink (beginner, board + code) --------------------

    private function blinkExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 360);
        $resistor = $b->add('resistor', 360, 150, ['resistance' => 220]);
        $led = $b->add('led', 560, 210, ['color' => 'red']);
        // D13 -> resistor -> LED anode -> ... -> LED cathode -> GND.
        $b->wire($uno, 'pin-4', $resistor, 'pin-0');   // pin-4 = D13
        $b->wire($resistor, 'pin-1', $led, 'pin-0');
        $b->wire($led, 'pin-1', $uno, 'pin-22');       // pin-22 = GND.2

        return [
            'name' => 'Arduino Uno: Blink',
            'description' => 'The "hello world" of microcontrollers. An emulated Arduino Uno blinks an LED on pin 13 once per second. Run it and watch the code drive the circuit.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // Blink: turn an LED on pin 13 on and off once per second.

                void setup() {
                  pinMode(13, OUTPUT);
                  Serial.begin(115200);
                  Serial.println("Blink started");
                }

                void loop() {
                  digitalWrite(13, HIGH);
                  delay(500);
                  digitalWrite(13, LOW);
                  delay(500);
                }
                INO,
        ];
    }

    // --- Example 4: button-controlled LED (intermediate, board + code) ----

    private function buttonControlledLedExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 360);
        $button = $b->add('pushbutton', 380, 150);
        $resistor = $b->add('resistor', 560, 150, ['resistance' => 220]);
        $led = $b->add('led', 740, 210, ['color' => 'blue']);
        // Button between D2 and GND (D2 uses the internal pull-up).
        $b->wire($button, 'pin-0', $uno, 'pin-15');    // pin-15 = D2
        $b->wire($button, 'pin-1', $uno, 'pin-23');    // pin-23 = GND.3
        // LED on D13 through a resistor to GND.
        $b->wire($uno, 'pin-4', $resistor, 'pin-0');   // pin-4 = D13
        $b->wire($resistor, 'pin-1', $led, 'pin-0');
        $b->wire($led, 'pin-1', $uno, 'pin-22');       // pin-22 = GND.2

        return [
            'name' => 'Arduino Uno: Button Input',
            'description' => 'Reads a push button with the internal pull-up resistor and mirrors it to an LED. Run it, then click and hold the button to light the LED.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // Button input: light the LED on pin 13 while the button on
                // pin 2 is pressed. The button ties pin 2 to ground, so the
                // internal pull-up makes it read HIGH when released.

                const int BUTTON_PIN = 2;
                const int LED_PIN = 13;
                int lastState = HIGH;

                void setup() {
                  pinMode(BUTTON_PIN, INPUT_PULLUP);
                  pinMode(LED_PIN, OUTPUT);
                  Serial.begin(115200);
                }

                void loop() {
                  int pressed = digitalRead(BUTTON_PIN) == LOW;
                  digitalWrite(LED_PIN, pressed ? HIGH : LOW);
                  if (pressed != (lastState == LOW)) {
                    Serial.println(pressed ? "pressed" : "released");
                    lastState = pressed ? LOW : HIGH;
                  }
                }
                INO,
        ];
    }

    // --- Example 5: potentiometer fade + serial (advanced, board + code) --

    private function potentiometerFadeExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 300, 380);
        $pot = $b->add('potentiometer', 120, 150, ['position' => 0.5]);
        $resistor = $b->add('resistor', 620, 150, ['resistance' => 220]);
        $led = $b->add('led', 800, 210, ['color' => 'orange']);
        // Potentiometer as a divider across 5V/GND, wiper into A0.
        $b->wire($pot, 'pin-0', $uno, 'pin-21');       // A (VCC) -> 5V
        $b->wire($pot, 'pin-2', $uno, 'pin-23');       // B (GND) -> GND.3
        $b->wire($pot, 'pin-1', $uno, 'pin-25');       // Wiper -> A0
        // LED on D9 (PWM) through a resistor to GND.
        $b->wire($uno, 'pin-8', $resistor, 'pin-0');   // pin-8 = D9 (PWM)
        $b->wire($resistor, 'pin-1', $led, 'pin-0');
        $b->wire($led, 'pin-1', $uno, 'pin-22');       // pin-22 = GND.2

        return [
            'name' => 'Arduino Uno: Potentiometer Fade',
            'description' => 'Reads a potentiometer on A0 and fades an LED on pin 9 with PWM, printing the value to the Serial Monitor. Run it and drag the knob to change the brightness.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // Analog in, PWM out: read a potentiometer on A0 (0-1023) and
                // set the LED brightness on pin 9 (0-255) to match.

                const int POT_PIN = A0;
                const int LED_PIN = 9;

                void setup() {
                  pinMode(LED_PIN, OUTPUT);
                  Serial.begin(115200);
                }

                void loop() {
                  int reading = analogRead(POT_PIN);
                  int brightness = map(reading, 0, 1023, 0, 255);
                  analogWrite(LED_PIN, brightness);
                  Serial.print("pot=");
                  Serial.print(reading);
                  Serial.print("  brightness=");
                  Serial.println(brightness);
                  delay(200);
                }
                INO,
        ];
    }

    // --- Arduino Nano variants (same ATmega328p, different pinout) --------
    // Nano pin handles: D13=pin-15, D9(PWM)=pin-3, D2=pin-10, A0=pin-18,
    // 5V=pin-26, GND.1=pin-28, GND.2=pin-11, GND.3=pin-35.

    private function nanoBlinkExample(): array
    {
        $b = new CircuitBuilder($this);
        $nano = $b->add('arduino-nano', 300, 340);
        $resistor = $b->add('resistor', 360, 150, ['resistance' => 220]);
        $led = $b->add('led', 560, 210, ['color' => 'red']);
        $b->wire($nano, 'pin-15', $resistor, 'pin-0');  // D13 -> resistor
        $b->wire($resistor, 'pin-1', $led, 'pin-0');
        $b->wire($led, 'pin-1', $nano, 'pin-28');       // -> GND.1

        return [
            'name' => 'Arduino Nano: Blink',
            'description' => 'Blink on the compact Arduino Nano (same ATmega328p as the Uno). The emulated board toggles an LED on pin 13 once per second.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // Blink: turn an LED on pin 13 on and off once per second.

                void setup() {
                  pinMode(13, OUTPUT);
                  Serial.begin(115200);
                  Serial.println("Nano blink started");
                }

                void loop() {
                  digitalWrite(13, HIGH);
                  delay(500);
                  digitalWrite(13, LOW);
                  delay(500);
                }
                INO,
        ];
    }

    private function nanoButtonExample(): array
    {
        $b = new CircuitBuilder($this);
        $nano = $b->add('arduino-nano', 300, 340);
        $button = $b->add('pushbutton', 380, 150);
        $resistor = $b->add('resistor', 560, 150, ['resistance' => 220]);
        $led = $b->add('led', 740, 210, ['color' => 'blue']);
        $b->wire($button, 'pin-0', $nano, 'pin-10');    // D2 (INPUT_PULLUP)
        $b->wire($button, 'pin-1', $nano, 'pin-35');    // -> GND.3
        $b->wire($nano, 'pin-15', $resistor, 'pin-0');  // D13 -> resistor
        $b->wire($resistor, 'pin-1', $led, 'pin-0');
        $b->wire($led, 'pin-1', $nano, 'pin-28');       // -> GND.1

        return [
            'name' => 'Arduino Nano: Button Input',
            'description' => 'Reads a push button on the Nano with the internal pull-up and mirrors it to an LED. Run it, then click and hold the button.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // Button input: light the LED on pin 13 while the button on
                // pin 2 is pressed (the internal pull-up reads HIGH when open).

                const int BUTTON_PIN = 2;
                const int LED_PIN = 13;
                int lastState = HIGH;

                void setup() {
                  pinMode(BUTTON_PIN, INPUT_PULLUP);
                  pinMode(LED_PIN, OUTPUT);
                  Serial.begin(115200);
                }

                void loop() {
                  int pressed = digitalRead(BUTTON_PIN) == LOW;
                  digitalWrite(LED_PIN, pressed ? HIGH : LOW);
                  if (pressed != (lastState == LOW)) {
                    Serial.println(pressed ? "pressed" : "released");
                    lastState = pressed ? LOW : HIGH;
                  }
                }
                INO,
        ];
    }

    private function nanoPotentiometerExample(): array
    {
        $b = new CircuitBuilder($this);
        $nano = $b->add('arduino-nano', 340, 360);
        $pot = $b->add('potentiometer', 120, 150, ['position' => 0.5]);
        $resistor = $b->add('resistor', 620, 150, ['resistance' => 220]);
        $led = $b->add('led', 800, 210, ['color' => 'orange']);
        $b->wire($pot, 'pin-0', $nano, 'pin-26');       // A (VCC) -> 5V
        $b->wire($pot, 'pin-2', $nano, 'pin-35');       // B (GND) -> GND.3
        $b->wire($pot, 'pin-1', $nano, 'pin-18');       // Wiper -> A0
        $b->wire($nano, 'pin-3', $resistor, 'pin-0');   // D9 (PWM) -> resistor
        $b->wire($resistor, 'pin-1', $led, 'pin-0');
        $b->wire($led, 'pin-1', $nano, 'pin-28');       // -> GND.1

        return [
            'name' => 'Arduino Nano: Potentiometer Fade',
            'description' => 'Reads a potentiometer on A0 and fades an LED on pin 9 with PWM on the Nano, printing the value to the Serial Monitor. Drag the knob to change brightness.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // Analog in, PWM out: read a potentiometer on A0 (0-1023) and
                // set the LED brightness on pin 9 (0-255) to match.

                const int POT_PIN = A0;
                const int LED_PIN = 9;

                void setup() {
                  pinMode(LED_PIN, OUTPUT);
                  Serial.begin(115200);
                }

                void loop() {
                  int reading = analogRead(POT_PIN);
                  int brightness = map(reading, 0, 1023, 0, 255);
                  analogWrite(LED_PIN, brightness);
                  Serial.print("pot=");
                  Serial.print(reading);
                  Serial.print("  brightness=");
                  Serial.println(brightness);
                  delay(200);
                }
                INO,
        ];
    }

    /**
     * Load a library component by type (cached), with pins and properties.
     */
    public function libraryComponent(string $type): LibraryComponent
    {
        return $this->library[$type] ??= LibraryComponent::query()
            ->with('pins', 'properties')
            ->where('type', $type)
            ->firstOrFail();
    }

    public static function wireColor(array $signals): string
    {
        foreach ($signals as $signal) {
            if (isset(self::SIGNAL_COLORS[$signal])) {
                return self::SIGNAL_COLORS[$signal];
            }
        }

        return self::SIGNAL_COLORS['passive'];
    }
}

/**
 * Accumulates component instances and wires for one example, mirroring the
 * shape the editor persists (see CircuitCanvas onDrop / onConnect).
 */
class CircuitBuilder
{
    private array $components = [];
    private array $wires = [];
    private int $counter = 0;

    public function __construct(private ProjectExampleSeeder $seeder) {}

    /**
     * Place a library part at (left, top) with optional attribute overrides,
     * returning the generated instance id for wiring.
     */
    public function add(string $type, float $left, float $top, array $overrides = []): string
    {
        $lib = $this->seeder->libraryComponent($type);
        $id = $type.'-'.substr(md5($type.($this->counter++)), 0, 8);

        $properties = $lib->properties
            ->mapWithKeys(fn ($p) => [$p->property_key => $p->property_value])
            ->all();

        $pins = $lib->pins->map(fn ($pin) => [
            'id' => $pin->id,
            'name' => $pin->name,
            'x' => $pin->x,
            'y' => $pin->y,
            'signals' => $pin->signals ?? [],
            'handle_id' => $pin->handle_id,
            'type' => $pin->pin_type,
        ])->values()->all();

        $this->components[] = [
            'id' => $id,
            'type' => $type,
            'left' => $left,
            'top' => $top,
            'attributes' => array_merge($properties, $overrides),
            'pins' => $pins,
            'svgPath' => $lib->svg_path,
            'isOriginal' => $lib->is_original,
        ];

        return $id;
    }

    public function wire(string $source, string $sourceHandle, string $target, string $targetHandle): void
    {
        $sourcePin = $this->pin($source, $sourceHandle);
        $this->wires[] = [
            'id' => 'wire-'.substr(md5($source.$sourceHandle.$target.$targetHandle), 0, 10),
            'source' => $source,
            'target' => $target,
            'sourceHandle' => $sourceHandle,
            'targetHandle' => $targetHandle,
            'type' => 'customWire',
            'data' => [
                'color' => ProjectExampleSeeder::wireColor($sourcePin['signals'] ?? []),
                'sourcePinIndex' => $this->handleIndex($sourceHandle),
                'targetPinIndex' => $this->handleIndex($targetHandle),
                'signal' => $sourcePin['signals'][0] ?? null,
            ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function components(): array
    {
        return $this->components;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function wires(): array
    {
        return $this->wires;
    }

    private function pin(string $componentId, string $handle): array
    {
        foreach ($this->components as $component) {
            if ($component['id'] !== $componentId) {
                continue;
            }
            foreach ($component['pins'] as $pin) {
                if ($pin['handle_id'] === $handle) {
                    return $pin;
                }
            }
        }

        throw new \RuntimeException("Pin {$handle} not found on {$componentId}");
    }

    private function handleIndex(string $handle): int
    {
        return (int) str_replace('pin-', '', $handle);
    }
}
