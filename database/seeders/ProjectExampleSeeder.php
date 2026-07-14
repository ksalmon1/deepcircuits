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
            $this->megaBlinkExample(),
            $this->nanoBlinkExample(),
            $this->nanoButtonExample(),
            $this->nanoPotentiometerExample(),

            // Analog ICs (no board: pure SPICE).
            $this->opAmpBufferExample(),
            $this->comparatorNightLightExample(),

            // Displays.
            $this->oledExample(),
            $this->lcdExample(),
            $this->sevenSegmentExample(),
            $this->neoPixelExample(),

            // Sensors and actuators.
            $this->imuExample(),
            $this->ultrasonicExample(),
            $this->dhtExample(),
            $this->servoExample(),
            $this->stepperExample(),
            $this->keypadExample(),
            $this->loadCellExample(),
            $this->irRemoteExample(),
            $this->rtcExample(),

            // Instrumentation.
            $this->scopeExample(),
        ];
    }

    // --- Example 1: series LED (beginner, no board) ----------------------

    private function ledResistorExample(): array
    {
        $b = new CircuitBuilder($this);
        $battery = $b->add('voltagesource', 120, 200);
        // 470R keeps the LED at ~15mA on 9V; 330R would push it past its
        // 20mA rating (the pre-Run circuit check will tell you so).
        $resistor = $b->add('resistor', 320, 140, ['resistance' => 470]);
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
        $resistor = $b->add('resistor', 500, 150, ['resistance' => 470]);
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

    // --- Arduino Mega (ATmega2560, different pinout) ---------------------
    // Mega pin handles: D13=pin-4, GND.1=pin-3.

    private function megaBlinkExample(): array
    {
        $b = new CircuitBuilder($this);
        $mega = $b->add('arduino-mega', 260, 360);
        $resistor = $b->add('resistor', 400, 150, ['resistance' => 220]);
        $led = $b->add('led', 600, 210, ['color' => 'red']);
        $b->wire($mega, 'pin-4', $resistor, 'pin-0');   // D13 -> resistor
        $b->wire($resistor, 'pin-1', $led, 'pin-0');
        $b->wire($led, 'pin-1', $mega, 'pin-3');        // -> GND.1

        return [
            'name' => 'Arduino Mega: Blink',
            'description' => 'Blink on the Arduino Mega (ATmega2560). The emulated board runs the same sketch as the Uno, toggling an LED on pin 13 once per second.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // Blink: turn an LED on pin 13 on and off once per second.

                void setup() {
                  pinMode(13, OUTPUT);
                  Serial.begin(115200);
                  Serial.println("Mega blink started");
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

    // --- Analog ICs: SPICE subckt models, no microcontroller --------------

    private function opAmpBufferExample(): array
    {
        $b = new CircuitBuilder($this);
        $battery = $b->add('voltagesource', 100, 300, ['voltage' => 9]);
        $r1 = $b->add('resistor', 300, 120, ['resistance' => '10k']);
        $r2 = $b->add('resistor', 300, 320, ['resistance' => '10k']);
        $opamp = $b->add('opamp', 560, 200);
        $rLoad = $b->add('resistor', 800, 120, ['resistance' => '100']);

        // 10k/10k divider across the 9V supply: 4.5V at the midpoint.
        $b->wire($battery, 'pin-0', $r1, 'pin-0');
        $b->wire($r1, 'pin-1', $r2, 'pin-0');
        $b->wire($r2, 'pin-1', $battery, 'pin-1');
        // Midpoint into IN+; OUT strapped back to IN- (unity-gain buffer).
        $b->wire($r1, 'pin-1', $opamp, 'pin-0');   // IN+
        $b->wire($opamp, 'pin-4', $opamp, 'pin-1'); // OUT -> IN-
        $b->wire($battery, 'pin-0', $opamp, 'pin-2'); // V+
        $b->wire($opamp, 'pin-3', $battery, 'pin-1'); // V-
        // The buffer holds 4.5V across a 100R load the divider could not drive.
        $b->wire($opamp, 'pin-4', $rLoad, 'pin-0');
        $b->wire($rLoad, 'pin-1', $battery, 'pin-1');

        return [
            'name' => 'Op-Amp: Unity-Gain Buffer',
            'description' => 'An LM358 buffers a 10k/10k divider. Run it and hover the wires: the op-amp holds 4.5V across a 100Ω load that would collapse the divider on its own — the classic reason buffers exist.',
            'components' => $b->components(),
            'wires' => $b->wires(),
        ];
    }

    private function comparatorNightLightExample(): array
    {
        $b = new CircuitBuilder($this);
        $battery = $b->add('voltagesource', 100, 320, ['voltage' => 9]);
        // Reference: fixed 10k/10k divider = 4.5V into IN-.
        $rRef1 = $b->add('resistor', 300, 120, ['resistance' => '10k']);
        $rRef2 = $b->add('resistor', 300, 300, ['resistance' => '10k']);
        // Sensor leg: an LDR against 10k. Edit the LDR's resistance to change
        // the "light level" and watch the output flip.
        $ldr = $b->add('photoresistor', 300, 480, ['resistance' => '2k']);
        $rSense = $b->add('resistor', 300, 640, ['resistance' => '10k']);
        $cmp = $b->add('comparator', 600, 300);
        $pullup = $b->add('resistor', 840, 160, ['resistance' => '10k']);
        $rLed = $b->add('resistor', 840, 400, ['resistance' => '470']);
        $led = $b->add('led', 1020, 460, ['color' => 'yellow']);

        $b->wire($battery, 'pin-0', $rRef1, 'pin-0');
        $b->wire($rRef1, 'pin-1', $rRef2, 'pin-0');
        $b->wire($rRef2, 'pin-1', $battery, 'pin-1');
        $b->wire($battery, 'pin-0', $ldr, 'pin-0');
        $b->wire($ldr, 'pin-1', $rSense, 'pin-0');
        $b->wire($rSense, 'pin-1', $battery, 'pin-1');

        $b->wire($ldr, 'pin-1', $cmp, 'pin-0');    // sensor -> IN+
        $b->wire($rRef1, 'pin-1', $cmp, 'pin-1');  // 4.5V reference -> IN-
        $b->wire($battery, 'pin-0', $cmp, 'pin-2'); // VCC
        $b->wire($cmp, 'pin-3', $battery, 'pin-1'); // GND
        // Open-collector output needs a pull-up; the LED hangs off it.
        $b->wire($battery, 'pin-0', $pullup, 'pin-0');
        $b->wire($pullup, 'pin-1', $cmp, 'pin-4');
        $b->wire($cmp, 'pin-4', $rLed, 'pin-0');
        $b->wire($rLed, 'pin-1', $led, 'pin-0');
        $b->wire($led, 'pin-1', $battery, 'pin-1');

        return [
            'name' => 'Comparator: Light-Triggered Switch',
            'description' => 'An LM393 compares a light sensor against a fixed 4.5V reference and switches an LED. Select the light sensor and raise its resistance (2k = bright, 50k = dark) to cross the threshold — the open-collector output snaps rail to rail.',
            'components' => $b->components(),
            'wires' => $b->wires(),
        ];
    }

    // --- Displays ---------------------------------------------------------

    private function oledExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 400);
        $oled = $b->add('ssd1306', 620, 120);
        $b->connect($uno, 'A4', $oled, 'DATA');   // SDA
        $b->connect($uno, 'A5', $oled, 'CLK');    // SCL
        $b->connect($uno, '5V', $oled, 'VIN');
        $b->connect($oled, 'GND', $uno, 'GND.2');

        return [
            'name' => 'OLED Display (I2C)',
            'description' => 'Drives an SSD1306 OLED over the emulated I2C bus, drawing a moving bar. The sketch talks to the raw controller registers — the same bytes a real display would receive.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // SSD1306 over I2C, driven with raw controller commands.
                // Every transaction starts with a control byte: 0x00 = command,
                // 0x40 = pixel data (see the SSD1306 datasheet).

                #include <Wire.h>

                const uint8_t OLED_ADDR = 0x3C;

                void cmd(uint8_t c) {
                  Wire.beginTransmission(OLED_ADDR);
                  Wire.write((uint8_t)0x00);
                  Wire.write(c);
                  Wire.endTransmission();
                }

                void setup() {
                  Serial.begin(115200);
                  Wire.begin();
                  cmd(0xAF);              // display on
                  cmd(0x20); cmd(0x00);   // horizontal addressing mode
                  Serial.println("OLED ready");
                }

                void loop() {
                  static uint8_t phase = 0;
                  // Redraw all 8 pages: a solid bar that walks down the screen.
                  cmd(0x21); cmd(0); cmd(127);   // column window
                  cmd(0x22); cmd(0); cmd(7);     // page window
                  for (uint8_t page = 0; page < 8; page++) {
                    uint8_t fill = (page == phase) ? 0xFF : 0x00;
                    for (uint8_t x = 0; x < 128; x += 16) {
                      Wire.beginTransmission(OLED_ADDR);
                      Wire.write((uint8_t)0x40);
                      for (uint8_t i = 0; i < 16; i++) Wire.write(fill);
                      Wire.endTransmission();
                    }
                  }
                  phase = (phase + 1) % 8;
                  delay(400);
                }
                INO,
        ];
    }

    private function lcdExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 240, 460);
        $lcd = $b->add('lcd1602', 620, 120);
        $b->connect($uno, 'D12', $lcd, 'RS');
        $b->connect($uno, 'D11', $lcd, 'E');
        $b->connect($uno, 'D5', $lcd, 'D4');
        $b->connect($uno, 'D4', $lcd, 'D5');
        $b->connect($uno, 'D3', $lcd, 'D6');
        $b->connect($uno, 'D2', $lcd, 'D7');
        $b->connect($uno, '5V', $lcd, 'VDD');
        $b->connect($lcd, 'VSS', $uno, 'GND.2');

        return [
            'name' => 'LCD 16x2 (4-bit parallel)',
            'description' => 'Prints to a character LCD over the classic 4-bit HD44780 interface and counts seconds on the second line. The display decodes the real E-strobe handshake, nibble by nibble.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // HD44780 character LCD in 4-bit mode, bit-banged.
                // Data is latched on the falling edge of E, a nibble at a time.

                const int RS = 12, EN = 11, D4 = 5, D5 = 4, D6 = 3, D7 = 2;

                void pulse() {
                  digitalWrite(EN, HIGH);
                  delayMicroseconds(2);
                  digitalWrite(EN, LOW);
                  delayMicroseconds(100);
                }

                void nibble(uint8_t value) {
                  digitalWrite(D4, value & 1);
                  digitalWrite(D5, value & 2);
                  digitalWrite(D6, value & 4);
                  digitalWrite(D7, value & 8);
                  pulse();
                }

                void command(uint8_t value) {
                  digitalWrite(RS, LOW);
                  nibble(value >> 4);
                  nibble(value & 0x0F);
                  delay(2);
                }

                void writeChar(uint8_t value) {
                  digitalWrite(RS, HIGH);
                  nibble(value >> 4);
                  nibble(value & 0x0F);
                }

                void print(const char *text) {
                  while (*text) writeChar(*text++);
                }

                void setup() {
                  int pins[] = {RS, EN, D4, D5, D6, D7};
                  for (int i = 0; i < 6; i++) pinMode(pins[i], OUTPUT);
                  Serial.begin(115200);
                  delay(50);

                  // Wake-up sequence, then switch into 4-bit mode.
                  digitalWrite(RS, LOW);
                  nibble(0x3); delay(5);
                  nibble(0x3); delay(5);
                  nibble(0x3);
                  nibble(0x2);
                  command(0x28);  // 4-bit, 2 lines
                  command(0x0C);  // display on, cursor off
                  command(0x01);  // clear
                  command(0x06);  // entry mode: increment

                  print("DeepCircuits");
                  Serial.println("LCD ready");
                }

                void loop() {
                  static unsigned long seconds = 0;
                  command(0x80 | 0x40);   // start of the second row
                  char line[17];
                  snprintf(line, sizeof(line), "uptime: %lus", seconds++);
                  print(line);
                  delay(1000);
                }
                INO,
        ];
    }

    private function sevenSegmentExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 240, 460);
        $seg = $b->add('7segment', 640, 140);
        // Segments A-G, DP on D9..D2 (a resistor per segment is omitted here:
        // the display's own model limits current).
        $pins = ['D9' => 'A', 'D8' => 'B', 'D7' => 'C', 'D6' => 'D', 'D5' => 'E', 'D4' => 'F', 'D3' => 'G', 'D2' => 'DP'];
        foreach ($pins as $board => $segment) {
            $b->connect($uno, $board, $seg, $segment);
        }
        $b->connect($seg, 'COM.1', $uno, 'GND.2');

        return [
            'name' => '7-Segment Counter',
            'description' => 'Counts 0-9 on a common-cathode 7-segment display. Each segment is driven from its own pin, and the display lights from the solved circuit voltages — not a lookup table.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // 7-segment counter. Segment order: A B C D E F G DP.
                const int SEGMENTS[8] = {9, 8, 7, 6, 5, 4, 3, 2};

                // Which segments light for each digit (1 = on).
                const uint8_t DIGITS[10][8] = {
                  {1,1,1,1,1,1,0,0}, // 0
                  {0,1,1,0,0,0,0,0}, // 1
                  {1,1,0,1,1,0,1,0}, // 2
                  {1,1,1,1,0,0,1,0}, // 3
                  {0,1,1,0,0,1,1,0}, // 4
                  {1,0,1,1,0,1,1,0}, // 5
                  {1,0,1,1,1,1,1,0}, // 6
                  {1,1,1,0,0,0,0,0}, // 7
                  {1,1,1,1,1,1,1,0}, // 8
                  {1,1,1,1,0,1,1,0}, // 9
                };

                void setup() {
                  for (int i = 0; i < 8; i++) pinMode(SEGMENTS[i], OUTPUT);
                  Serial.begin(115200);
                  Serial.println("Counting");
                }

                void loop() {
                  static int digit = 0;
                  for (int i = 0; i < 8; i++) {
                    digitalWrite(SEGMENTS[i], DIGITS[digit][i] ? HIGH : LOW);
                  }
                  Serial.println(digit);
                  digit = (digit + 1) % 10;
                  delay(800);
                }
                INO,
        ];
    }

    private function neoPixelExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 400);
        $pixel = $b->add('neopixel', 660, 200);
        $b->connect($uno, 'D8', $pixel, 'DIN');
        $b->connect($uno, '5V', $pixel, 'VDD');
        $b->connect($pixel, 'VSS', $uno, 'GND.2');

        return [
            'name' => 'NeoPixel: Colour Cycle',
            'description' => 'Bit-bangs the WS2812 one-wire protocol — sub-microsecond pulses, timed in CPU cycles with interrupts off — and cycles the pixel through red, green and blue. The decoder recovers the colours from the pulse widths alone.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // WS2812 ("NeoPixel") on pin 8 = PORTB bit 0.
                //
                // The protocol encodes each bit in the width of a high pulse:
                // ~0.4us for a 0, ~0.8us for a 1. That is far too tight for
                // digitalWrite, so we write the port register directly and count
                // CPU cycles — exactly what a real NeoPixel library does.

                static inline void sendBit(bool one) {
                  if (one) {
                    PORTB |= _BV(0);
                    __builtin_avr_delay_cycles(10);
                    PORTB &= ~_BV(0);
                    __builtin_avr_delay_cycles(4);
                  } else {
                    PORTB |= _BV(0);
                    __builtin_avr_delay_cycles(2);
                    PORTB &= ~_BV(0);
                    __builtin_avr_delay_cycles(10);
                  }
                }

                static void sendByte(uint8_t value) {
                  for (int8_t i = 7; i >= 0; i--) sendBit((value >> i) & 1);
                }

                // WS2812 wants green, then red, then blue.
                void setPixel(uint8_t r, uint8_t g, uint8_t b) {
                  noInterrupts();          // a timer ISR would stretch a pulse
                  sendByte(g);
                  sendByte(r);
                  sendByte(b);
                  interrupts();
                  delayMicroseconds(100);  // >50us idle latches the frame
                }

                void setup() {
                  pinMode(8, OUTPUT);
                  digitalWrite(8, LOW);
                  Serial.begin(115200);
                  Serial.println("NeoPixel ready");
                }

                void loop() {
                  setPixel(255, 0, 0);
                  Serial.println("red");
                  delay(600);
                  setPixel(0, 255, 0);
                  Serial.println("green");
                  delay(600);
                  setPixel(0, 0, 255);
                  Serial.println("blue");
                  delay(600);
                }
                INO,
        ];
    }

    // --- Sensors and actuators --------------------------------------------

    private function imuExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 400);
        $imu = $b->add('mpu6050', 640, 160);
        $b->connect($uno, 'A4', $imu, 'SDA');
        $b->connect($uno, 'A5', $imu, 'SCL');
        $b->connect($uno, '5V', $imu, 'VCC');
        $b->connect($imu, 'GND', $uno, 'GND.2');

        return [
            'name' => 'IMU: Motion Sensing (I2C)',
            'description' => 'Reads acceleration and rotation from an MPU6050 over I2C. Run it, open the Sensors panel, and drag the accel/gyro sliders — the sketch sees the new readings live.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // MPU6050 IMU over I2C. The chip has a register pointer: write
                // the register you want, then read from it. Measurements are
                // big-endian 16-bit values starting at 0x3B.

                #include <Wire.h>

                const uint8_t MPU = 0x68;

                void setup() {
                  Serial.begin(115200);
                  Wire.begin();

                  Wire.beginTransmission(MPU);
                  Wire.write(0x75);                 // WHO_AM_I
                  Wire.endTransmission(false);
                  Wire.requestFrom((uint8_t)MPU, (uint8_t)1);
                  Serial.print("WHO_AM_I = 0x");
                  Serial.println(Wire.read(), HEX); // 0x68 on a real MPU6050

                  Wire.beginTransmission(MPU);
                  Wire.write(0x6B);                 // PWR_MGMT_1
                  Wire.write(0x00);                 // clear the sleep bit
                  Wire.endTransmission();
                }

                void loop() {
                  Wire.beginTransmission(MPU);
                  Wire.write(0x3B);                 // ACCEL_XOUT_H
                  Wire.endTransmission(false);
                  Wire.requestFrom((uint8_t)MPU, (uint8_t)14);

                  int16_t ax = (Wire.read() << 8) | Wire.read();
                  int16_t ay = (Wire.read() << 8) | Wire.read();
                  int16_t az = (Wire.read() << 8) | Wire.read();
                  Wire.read(); Wire.read();          // temperature
                  int16_t gx = (Wire.read() << 8) | Wire.read();
                  int16_t gy = (Wire.read() << 8) | Wire.read();
                  int16_t gz = (Wire.read() << 8) | Wire.read();

                  // At the default +/-2g and +/-250 deg/s ranges:
                  // 16384 counts per g, 131 counts per deg/s.
                  Serial.print("accel g: ");
                  Serial.print(ax / 16384.0, 2); Serial.print(", ");
                  Serial.print(ay / 16384.0, 2); Serial.print(", ");
                  Serial.print(az / 16384.0, 2);
                  Serial.print("   gyro d/s: ");
                  Serial.print(gx / 131.0, 1); Serial.print(", ");
                  Serial.print(gy / 131.0, 1); Serial.print(", ");
                  Serial.println(gz / 131.0, 1);
                  delay(500);
                }
                INO,
        ];
    }

    private function ultrasonicExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 420);
        $sonar = $b->add('hc-sr04', 640, 140);
        $resistor = $b->add('resistor', 640, 380, ['resistance' => 220]);
        $led = $b->add('led', 840, 440, ['color' => 'red']);
        $b->connect($uno, 'D8', $sonar, 'TRIG');
        $b->connect($uno, 'D7', $sonar, 'ECHO');
        $b->connect($uno, '5V', $sonar, 'VCC');
        $b->connect($sonar, 'GND', $uno, 'GND.2');
        $b->connect($uno, 'D13', $resistor, 'Pin 1');
        $b->wire($resistor, 'pin-1', $led, 'pin-0');
        $b->connect($led, 'Cathode (-)', $uno, 'GND.3');

        return [
            'name' => 'Ultrasonic Distance + Alarm',
            'description' => 'An HC-SR04 measures distance by timing its echo pulse, and the LED lights when something comes within 50cm. Open the Sensors panel and slide the distance while it runs.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // HC-SR04 ultrasonic ranger.
                //
                // A 10us trigger pulse makes the sensor chirp; it then holds ECHO
                // high for as long as the sound takes to fly out and back. Sound
                // covers 1cm out-and-back in about 58us.

                const int TRIG = 8, ECHO = 7, LED = 13;

                void setup() {
                  pinMode(TRIG, OUTPUT);
                  pinMode(ECHO, INPUT);
                  pinMode(LED, OUTPUT);
                  Serial.begin(115200);
                }

                void loop() {
                  digitalWrite(TRIG, LOW);
                  delayMicroseconds(5);
                  digitalWrite(TRIG, HIGH);
                  delayMicroseconds(10);
                  digitalWrite(TRIG, LOW);

                  unsigned long echoUs = pulseIn(ECHO, HIGH, 100000UL);
                  if (echoUs == 0) {
                    Serial.println("out of range");
                  } else {
                    long cm = (echoUs + 29) / 58;   // round to the nearest cm
                    Serial.print(cm);
                    Serial.println(" cm");
                    digitalWrite(LED, cm < 50 ? HIGH : LOW);
                  }
                  delay(300);
                }
                INO,
        ];
    }

    private function dhtExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 400);
        $dht = $b->add('dht22', 660, 160);
        $b->connect($uno, 'D4', $dht, 'SDA');
        $b->connect($uno, '5V', $dht, 'VCC');
        $b->connect($dht, 'GND', $uno, 'GND.2');

        return [
            'name' => 'Temperature & Humidity (DHT22)',
            'description' => 'Reads a DHT22 with a hand-written one-wire decoder: a start pulse, then 40 bits whose values are encoded in their pulse widths. Slide the temperature and humidity in the Sensors panel while it runs.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // DHT22 one-wire protocol, decoded by hand.
                //
                // Pull the line low for >1ms to ask for a reading, then release
                // it. The sensor answers with an 80us/80us preamble and 40 bits:
                // each bit is a 50us low, then a high that is short (0) or long
                // (1). The last byte is a checksum of the first four.

                const int DATA = 4;

                void loop() {
                  pinMode(DATA, OUTPUT);
                  digitalWrite(DATA, LOW);
                  delay(2);                       // start signal
                  pinMode(DATA, INPUT_PULLUP);    // release the line

                  if (pulseIn(DATA, HIGH, 10000UL) == 0) {
                    Serial.println("no response");
                    delay(2000);
                    return;
                  }

                  uint8_t data[5] = {0, 0, 0, 0, 0};
                  for (int i = 0; i < 40; i++) {
                    unsigned long width = pulseIn(DATA, HIGH, 1000UL);
                    data[i / 8] <<= 1;
                    if (width > 40) data[i / 8] |= 1;   // long high = 1
                  }

                  uint8_t sum = data[0] + data[1] + data[2] + data[3];
                  if (sum != data[4]) {
                    Serial.println("checksum error");
                    delay(2000);
                    return;
                  }

                  // Values arrive as tenths; the top bit of the temperature is
                  // its sign.
                  int humidity = (data[0] << 8) | data[1];
                  int raw = ((data[2] & 0x7F) << 8) | data[3];
                  float temperature = (data[2] & 0x80) ? -raw / 10.0 : raw / 10.0;

                  Serial.print(temperature, 1);
                  Serial.print(" C   ");
                  Serial.print(humidity / 10.0, 1);
                  Serial.println(" %RH");
                  delay(2000);
                }

                void setup() {
                  Serial.begin(115200);
                  Serial.println("DHT22 starting");
                }
                INO,
        ];
    }

    private function servoExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 400);
        $servo = $b->add('servo', 680, 180);
        $b->connect($uno, 'D9', $servo, 'PWM');
        $b->connect($uno, '5V', $servo, 'V+');
        $b->connect($servo, 'GND', $uno, 'GND.2');

        return [
            'name' => 'Servo Sweep',
            'description' => 'Sweeps a servo from 0° to 180° and back by bit-banging the standard pulse train: a 1-2ms pulse every 20ms, where the pulse width is the angle.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // Hobby servo, driven without a library.
                //
                // A servo reads its target from the width of a pulse repeated
                // ~50 times a second: 1000us = 0 degrees, 1500us = 90, 2000us = 180.

                const int SIGNAL = 9;

                void writeAngle(int degrees) {
                  int pulseUs = map(degrees, 0, 180, 1000, 2000);
                  digitalWrite(SIGNAL, HIGH);
                  delayMicroseconds(pulseUs);
                  digitalWrite(SIGNAL, LOW);
                  delay(20 - pulseUs / 1000);   // pad out the 20ms frame
                }

                void setup() {
                  pinMode(SIGNAL, OUTPUT);
                  Serial.begin(115200);
                  Serial.println("Sweeping");
                }

                void loop() {
                  for (int angle = 0; angle <= 180; angle += 5) {
                    // Hold each angle for a few frames so the servo can travel.
                    for (int frame = 0; frame < 4; frame++) writeAngle(angle);
                  }
                  for (int angle = 180; angle >= 0; angle -= 5) {
                    for (int frame = 0; frame < 4; frame++) writeAngle(angle);
                  }
                }
                INO,
        ];
    }

    private function stepperExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 420);
        $stepper = $b->add('stepper-motor', 680, 160);
        $b->connect($uno, 'D8', $stepper, 'A+');
        $b->connect($uno, 'D9', $stepper, 'A-');
        $b->connect($uno, 'D10', $stepper, 'B+');
        $b->connect($uno, 'D11', $stepper, 'B-');

        return [
            'name' => 'Stepper Motor: Quarter Turn',
            'description' => 'Drives a bipolar stepper through the four-phase coil sequence: 50 full steps = 90°, then back again. The shaft angle comes from decoding the coil currents, so any drive sequence works.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // Bipolar stepper, driven one coil phase at a time (the four
                // pins would go to an H-bridge such as an L298N in real life).
                //
                // A 200-step motor advances 1.8 degrees per full step, so 50
                // steps is a quarter turn.

                const int A_PLUS = 8, A_MINUS = 9, B_PLUS = 10, B_MINUS = 11;

                const int SEQUENCE[4][4] = {
                  {1, 0, 0, 0},   // A+
                  {0, 0, 1, 0},   // B+
                  {0, 1, 0, 0},   // A-
                  {0, 0, 0, 1},   // B-
                };

                void applyPhase(int phase) {
                  const int *coils = SEQUENCE[phase & 3];
                  digitalWrite(A_PLUS, coils[0]);
                  digitalWrite(A_MINUS, coils[1]);
                  digitalWrite(B_PLUS, coils[2]);
                  digitalWrite(B_MINUS, coils[3]);
                  delay(5);   // step rate
                }

                void setup() {
                  int pins[] = {A_PLUS, A_MINUS, B_PLUS, B_MINUS};
                  for (int i = 0; i < 4; i++) pinMode(pins[i], OUTPUT);
                  Serial.begin(115200);
                }

                void loop() {
                  Serial.println("forward 90 degrees");
                  for (int step = 0; step < 50; step++) applyPhase(step);
                  delay(500);

                  Serial.println("back again");
                  for (int step = 49; step >= 0; step--) applyPhase(step);
                  delay(500);
                }
                INO,
        ];
    }

    private function keypadExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 240, 440);
        $keypad = $b->add('membrane-keypad', 640, 140);
        foreach (['D5' => 'R1', 'D6' => 'R2', 'D7' => 'R3', 'D8' => 'R4',
                  'D9' => 'C1', 'D10' => 'C2', 'D11' => 'C3', 'D12' => 'C4'] as $board => $pad) {
            $b->connect($uno, $board, $keypad, $pad);
        }

        return [
            'name' => 'Keypad: Door Code',
            'description' => 'Scans a 4x4 membrane keypad the classic way — one row low at a time, columns pulled up — and checks the digits against a passcode. Run it and click the keys.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // 4x4 membrane keypad, scanned by hand.
                //
                // Each key is just a switch joining its row to its column. Drive
                // one row LOW at a time with the columns pulled up: whichever
                // column reads LOW tells you the key that is held.

                const int ROWS[4] = {5, 6, 7, 8};
                const int COLS[4] = {9, 10, 11, 12};

                const char KEYS[4][4] = {
                  {'1', '2', '3', 'A'},
                  {'4', '5', '6', 'B'},
                  {'7', '8', '9', 'C'},
                  {'*', '0', '#', 'D'},
                };

                const char *PASSCODE = "1234";
                char entered[8];
                int length = 0;

                char scanKey() {
                  for (int r = 0; r < 4; r++) {
                    digitalWrite(ROWS[r], LOW);
                    delayMicroseconds(50);
                    for (int c = 0; c < 4; c++) {
                      if (digitalRead(COLS[c]) == LOW) {
                        digitalWrite(ROWS[r], HIGH);
                        return KEYS[r][c];
                      }
                    }
                    digitalWrite(ROWS[r], HIGH);
                  }
                  return 0;
                }

                void setup() {
                  for (int i = 0; i < 4; i++) {
                    pinMode(ROWS[i], OUTPUT);
                    digitalWrite(ROWS[i], HIGH);
                    pinMode(COLS[i], INPUT_PULLUP);
                  }
                  Serial.begin(115200);
                  Serial.println("Enter the code (1234), then #");
                }

                void loop() {
                  char key = scanKey();
                  if (!key) return;

                  Serial.print("key: ");
                  Serial.println(key);

                  if (key == '#') {
                    entered[length] = '\0';
                    Serial.println(strcmp(entered, PASSCODE) == 0 ? "unlocked" : "wrong code");
                    length = 0;
                  } else if (key == '*') {
                    length = 0;
                    Serial.println("cleared");
                  } else if (length < 7) {
                    entered[length++] = key;
                  }

                  // Wait for the key to be released, so one press is one entry.
                  while (scanKey()) delay(5);
                  delay(20);
                }
                INO,
        ];
    }

    private function loadCellExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 400);
        $hx = $b->add('hx711', 660, 160);
        $b->connect($uno, 'D3', $hx, 'DT');
        $b->connect($uno, 'D4', $hx, 'SCK');
        $b->connect($uno, '5V', $hx, 'VCC');
        $b->connect($hx, 'GND', $uno, 'GND.2');

        return [
            'name' => 'Digital Scale (HX711)',
            'description' => 'Clocks a 24-bit reading out of an HX711 load-cell amplifier and converts it to grams. Open the Sensors panel and change the weight while the sketch runs.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // HX711 load-cell amplifier.
                //
                // The chip pulls DT low when a conversion is ready. You then
                // clock SCK 24 times to shift out the reading, MSB first, plus a
                // 25th pulse to select the gain for the next one.

                const int DT = 3, SCK_PIN = 4;

                // Counts per gram for this load cell (found by calibration).
                const long SCALE = 420;

                long readCounts() {
                  while (digitalRead(DT) == HIGH) {}   // wait for "ready"

                  long value = 0;
                  for (int i = 0; i < 24; i++) {
                    digitalWrite(SCK_PIN, HIGH);
                    delayMicroseconds(2);
                    value = (value << 1) | digitalRead(DT);
                    digitalWrite(SCK_PIN, LOW);
                    delayMicroseconds(2);
                  }

                  digitalWrite(SCK_PIN, HIGH);          // 25th pulse: gain select
                  delayMicroseconds(2);
                  digitalWrite(SCK_PIN, LOW);

                  // Sign-extend the 24-bit two's-complement value.
                  if (value & 0x800000) value |= ~0xFFFFFFL;
                  return value;
                }

                void setup() {
                  pinMode(DT, INPUT);
                  pinMode(SCK_PIN, OUTPUT);
                  digitalWrite(SCK_PIN, LOW);
                  Serial.begin(115200);
                  Serial.println("Scale ready");
                }

                void loop() {
                  long grams = readCounts() / SCALE;
                  Serial.print(grams);
                  Serial.println(" g");
                  delay(500);
                }
                INO,
        ];
    }

    private function irRemoteExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 420);
        $ir = $b->add('ir-receiver', 660, 160);
        $resistor = $b->add('resistor', 660, 380, ['resistance' => 220]);
        $led = $b->add('led', 860, 440, ['color' => 'green']);
        $b->connect($uno, 'D2', $ir, 'DAT');
        $b->connect($uno, '5V', $ir, 'VCC');
        $b->connect($ir, 'GND', $uno, 'GND.2');
        $b->connect($uno, 'D13', $resistor, 'Pin 1');
        $b->wire($resistor, 'pin-1', $led, 'pin-0');
        $b->connect($led, 'Cathode (-)', $uno, 'GND.3');

        return [
            'name' => 'IR Remote Control',
            'description' => 'Decodes NEC infrared frames by timing the receiver output, and toggles an LED when it sees the right button. Run it, open the Sensors panel, and set a code to "press" a remote key.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // NEC infrared remote, decoded by measuring pulse widths.
                //
                // The receiver strips the 38kHz carrier and gives us the envelope,
                // inverted: the line rests HIGH and a "mark" pulls it low. A frame
                // is a 9ms mark, a 4.5ms space, then 32 bits whose values are set
                // by the length of the space after each bit's mark.
                //
                // Measuring only the spaces keeps us in step with the frame.

                const int IR_PIN = 2, LED = 13;

                void setup() {
                  pinMode(IR_PIN, INPUT);
                  pinMode(LED, OUTPUT);
                  Serial.begin(115200);
                  Serial.println("Waiting for a remote code");
                }

                void loop() {
                  unsigned long leader = pulseIn(IR_PIN, HIGH, 200000UL);
                  if (leader < 4000 || leader > 5000) return;   // not a frame start

                  uint32_t value = 0;
                  for (int i = 0; i < 32; i++) {
                    unsigned long space = pulseIn(IR_PIN, HIGH, 20000UL);
                    if (space == 0) return;                     // frame broke up
                    if (space > 1000) value |= (1UL << i);      // long space = 1
                  }

                  uint8_t command = (value >> 16) & 0xFF;
                  Serial.print("command: ");
                  Serial.println(command);

                  if (command == 69) {                          // classic power key
                    digitalWrite(LED, !digitalRead(LED));
                    Serial.println("toggled the LED");
                  }
                  delay(200);
                }
                INO,
        ];
    }

    private function rtcExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 400);
        $rtc = $b->add('ds1307', 660, 180);
        $b->connect($uno, 'A4', $rtc, 'SDA');
        $b->connect($uno, 'A5', $rtc, 'SCL');
        $b->connect($uno, '5V', $rtc, '5V');
        $b->connect($rtc, 'GND', $uno, 'GND.2');

        return [
            'name' => 'Real-Time Clock (DS1307)',
            'description' => 'Sets a DS1307 clock over I2C and then reads the time back every second. The registers hold BCD digits, exactly as the chip does.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // DS1307 real-time clock over I2C.
                //
                // Registers 0-6 hold the time as BCD (binary-coded decimal): the
                // hex digits *are* the decimal digits, so 0x45 means 45 seconds.

                #include <Wire.h>

                const uint8_t RTC = 0x68;

                uint8_t fromBcd(uint8_t value) {
                  return (value >> 4) * 10 + (value & 0x0F);
                }

                uint8_t toBcd(uint8_t value) {
                  return ((value / 10) << 4) | (value % 10);
                }

                void setTime(uint8_t hour, uint8_t minute, uint8_t second) {
                  Wire.beginTransmission(RTC);
                  Wire.write((uint8_t)0x00);
                  Wire.write(toBcd(second));   // bit 7 clear = clock running
                  Wire.write(toBcd(minute));
                  Wire.write(toBcd(hour));     // 24-hour mode
                  Wire.endTransmission();
                }

                void setup() {
                  Serial.begin(115200);
                  Wire.begin();
                  setTime(9, 30, 0);
                  Serial.println("Clock set to 09:30:00");
                }

                void loop() {
                  Wire.beginTransmission(RTC);
                  Wire.write((uint8_t)0x00);
                  Wire.endTransmission(false);
                  Wire.requestFrom((uint8_t)RTC, (uint8_t)3);

                  uint8_t second = fromBcd(Wire.read() & 0x7F);
                  uint8_t minute = fromBcd(Wire.read());
                  uint8_t hour = fromBcd(Wire.read() & 0x3F);

                  char line[9];
                  snprintf(line, sizeof(line), "%02u:%02u:%02u", hour, minute, second);
                  Serial.println(line);
                  delay(1000);
                }
                INO,
        ];
    }

    // --- Instrumentation ---------------------------------------------------

    private function scopeExample(): array
    {
        $b = new CircuitBuilder($this);
        $uno = $b->add('arduino-uno', 260, 400);
        $r1 = $b->add('resistor', 620, 140, ['resistance' => 220]);
        $led1 = $b->add('led', 820, 200, ['color' => 'red']);
        $r2 = $b->add('resistor', 620, 340, ['resistance' => 220]);
        $led2 = $b->add('led', 820, 400, ['color' => 'blue']);
        $b->connect($uno, 'D9', $r1, 'Pin 1');
        $b->wire($r1, 'pin-1', $led1, 'pin-0');
        $b->connect($led1, 'Cathode (-)', $uno, 'GND.2');
        $b->connect($uno, 'D10', $r2, 'Pin 1');
        $b->wire($r2, 'pin-1', $led2, 'pin-0');
        $b->connect($led2, 'Cathode (-)', $uno, 'GND.3');

        return [
            'name' => 'Scope: PWM Waveforms',
            'description' => 'Two PWM signals at different duty cycles. Run it, then open the Scope panel: you can see the pulse trains, compare their widths, and pause to inspect them.',
            'components' => $b->components(),
            'wires' => $b->wires(),
            'code' => <<<'INO'
                // Two square waves, bit-banged so their timing is easy to read
                // on the Scope panel:
                //
                //   pin 9  : 10ms period (100Hz), 20% duty  - 2ms high, 8ms low
                //   pin 10 : 50ms period  (20Hz), 60% duty  - 30ms high, 20ms low
                //
                // Run the sketch, open the Scope, and compare the two traces.
                // Pause the capture to measure a pulse.

                const int FAST = 9, SLOW = 10;

                // One 10ms cycle of the fast pin.
                void fastCycle() {
                  digitalWrite(FAST, HIGH);
                  delay(2);
                  digitalWrite(FAST, LOW);
                  delay(8);
                }

                void setup() {
                  pinMode(FAST, OUTPUT);
                  pinMode(SLOW, OUTPUT);
                  Serial.begin(115200);
                  Serial.println("Open the Scope panel to see the waveforms");
                }

                void loop() {
                  // The slow pin is high for three fast cycles (30ms)...
                  digitalWrite(SLOW, HIGH);
                  for (int i = 0; i < 3; i++) fastCycle();

                  // ...and low for two (20ms).
                  digitalWrite(SLOW, LOW);
                  for (int i = 0; i < 2; i++) fastCycle();
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

    /**
     * Wire by pin *name* rather than handle id. Boards and peripherals carry
     * dozens of pins whose handle numbering is an implementation detail, so
     * naming them ('D13', 'SDA', 'TRIG') keeps the examples readable and
     * survives a library reseed that renumbers handles.
     *
     * Board digital pins may be given as 'D13' or '13'; duplicated header
     * pads ('GND.2') are matched exactly, and a bare 'GND' picks the first.
     */
    public function connect(string $source, string $sourcePin, string $target, string $targetPin): void
    {
        $this->wire(
            $source,
            $this->handleFor($source, $sourcePin),
            $target,
            $this->handleFor($target, $targetPin),
        );
    }

    private function handleFor(string $componentId, string $pinName): string
    {
        // 'D13' is a friendlier way to say the board's '13' pin.
        $candidates = [$pinName];
        if (preg_match('/^D(\d{1,2})$/', $pinName, $m)) {
            $candidates[] = $m[1];
        }

        foreach ($this->components as $component) {
            if ($component['id'] !== $componentId) {
                continue;
            }
            // Exact name match first, then a base-name match ('GND' -> 'GND.1').
            foreach ($candidates as $candidate) {
                foreach ($component['pins'] as $pin) {
                    if ($pin['name'] === $candidate) {
                        return $pin['handle_id'];
                    }
                }
                foreach ($component['pins'] as $pin) {
                    if (preg_replace('/\.\d+$/', '', $pin['name']) === $candidate) {
                        return $pin['handle_id'];
                    }
                }
            }

            $names = implode(', ', array_column($component['pins'], 'name'));
            throw new \RuntimeException("Pin '{$pinName}' not found on {$componentId} (has: {$names})");
        }

        throw new \RuntimeException("Component {$componentId} not placed");
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
