<?php

namespace Database\Seeders;

use App\Models\LibraryComponent;
use Illuminate\Database\Seeder;

class ComponentLibrarySeeder extends Seeder
{
    /**
     * Seed the component library with the basic parts the editor needs.
     * SVGs are simple placeholders; richer artwork can be uploaded via the admin UI.
     */
    public function run(): void
    {
        $components = [
            [
                'name' => 'Resistor',
                'type' => 'resistor',
                'category' => 'Passive',
                'description' => 'Fixed resistor',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="24" viewBox="0 0 80 24"><line x1="0" y1="12" x2="16" y2="12" stroke="#333" stroke-width="2"/><rect x="16" y="4" width="48" height="16" rx="2" fill="#e8d5b7" stroke="#333" stroke-width="2"/><line x1="64" y1="12" x2="80" y2="12" stroke="#333" stroke-width="2"/></svg>',
                'pins' => [
                    ['name' => 'Pin 1', 'x' => 0, 'y' => 12, 'signals' => ['passive'], 'handle_id' => 'pin-0'],
                    ['name' => 'Pin 2', 'x' => 80, 'y' => 12, 'signals' => ['passive'], 'handle_id' => 'pin-1'],
                ],
                'properties' => ['resistance' => '1k', 'unit' => 'Ω'],
            ],
            [
                'name' => 'LED',
                'type' => 'led',
                'category' => 'Output',
                'description' => 'Light-emitting diode',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><line x1="8" y1="40" x2="18" y2="30" stroke="#333" stroke-width="2"/><line x1="40" y1="40" x2="30" y2="30" stroke="#333" stroke-width="2"/><circle id="led-body" cx="24" cy="20" r="12" fill="#f4a0a0" stroke="#333" stroke-width="2"/></svg>',
                'pins' => [
                    ['name' => 'Anode (+)', 'x' => 8, 'y' => 40, 'signals' => ['passive'], 'handle_id' => 'pin-0', 'pin_type' => 'anode'],
                    ['name' => 'Cathode (-)', 'x' => 40, 'y' => 40, 'signals' => ['passive'], 'handle_id' => 'pin-1', 'pin_type' => 'cathode'],
                ],
                'properties' => [
                    'color' => 'red',
                    'Vf' => 1.8,
                    'Is' => 1.0e-18,
                    'n' => 1.8,
                    'stateRules' => ['on' => 'voltage > 1.5'],
                    'animatableElements' => [
                        'led-body' => [
                            'transition' => 'all 0.3s ease-in-out',
                            'properties' => [
                                ['name' => 'fill', 'states' => ['on' => '#ff2020', 'default' => '#f4a0a0']],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'name' => 'Battery (9V)',
                'type' => 'voltagesource',
                'category' => 'Power',
                'description' => 'DC voltage source',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64"><rect x="8" y="8" width="32" height="48" rx="3" fill="#3b3b3b" stroke="#111" stroke-width="2"/><text x="24" y="38" fill="#fff" font-size="10" text-anchor="middle">9V</text><line x1="16" y1="8" x2="16" y2="0" stroke="#c00" stroke-width="3"/><line x1="32" y1="8" x2="32" y2="0" stroke="#333" stroke-width="3"/></svg>',
                'pins' => [
                    ['name' => 'Positive (+)', 'x' => 16, 'y' => 0, 'signals' => ['power'], 'handle_id' => 'pin-0', 'pin_type' => 'power'],
                    ['name' => 'Negative (-)', 'x' => 32, 'y' => 0, 'signals' => ['ground'], 'handle_id' => 'pin-1', 'pin_type' => 'ground'],
                ],
                'properties' => ['voltage' => 9, 'unit' => 'V'],
            ],
            [
                'name' => 'Capacitor',
                'type' => 'capacitor',
                'category' => 'Passive',
                'description' => 'Fixed capacitor (open circuit at DC)',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32"><line x1="0" y1="16" x2="26" y2="16" stroke="#333" stroke-width="2"/><line x1="26" y1="4" x2="26" y2="28" stroke="#333" stroke-width="3"/><line x1="38" y1="4" x2="38" y2="28" stroke="#333" stroke-width="3"/><line x1="38" y1="16" x2="64" y2="16" stroke="#333" stroke-width="2"/></svg>',
                'pins' => [
                    ['name' => 'Pin 1', 'x' => 0, 'y' => 16, 'signals' => ['passive'], 'handle_id' => 'pin-0'],
                    ['name' => 'Pin 2', 'x' => 64, 'y' => 16, 'signals' => ['passive'], 'handle_id' => 'pin-1'],
                ],
                'properties' => ['capacitance' => '10u', 'unit' => 'F'],
            ],
            [
                'name' => 'Inductor',
                'type' => 'inductor',
                'category' => 'Passive',
                'description' => 'Fixed inductor (short circuit at DC)',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="24" viewBox="0 0 80 24"><line x1="0" y1="16" x2="14" y2="16" stroke="#333" stroke-width="2"/><path d="M14 16 a6 6 0 0 1 13 0 a6 6 0 0 1 13 0 a6 6 0 0 1 13 0 a6 6 0 0 1 13 0" fill="none" stroke="#333" stroke-width="2"/><line x1="66" y1="16" x2="80" y2="16" stroke="#333" stroke-width="2"/></svg>',
                'pins' => [
                    ['name' => 'Pin 1', 'x' => 0, 'y' => 16, 'signals' => ['passive'], 'handle_id' => 'pin-0'],
                    ['name' => 'Pin 2', 'x' => 80, 'y' => 16, 'signals' => ['passive'], 'handle_id' => 'pin-1'],
                ],
                'properties' => ['inductance' => '10m', 'unit' => 'H'],
            ],
            [
                'name' => 'Diode',
                'type' => 'diode',
                'category' => 'Passive',
                'description' => 'Silicon diode (~0.6-0.7V forward drop)',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32"><line x1="0" y1="16" x2="22" y2="16" stroke="#333" stroke-width="2"/><polygon points="22,6 22,26 40,16" fill="#333"/><line x1="40" y1="6" x2="40" y2="26" stroke="#333" stroke-width="3"/><line x1="40" y1="16" x2="64" y2="16" stroke="#333" stroke-width="2"/></svg>',
                'pins' => [
                    ['name' => 'Anode (+)', 'x' => 0, 'y' => 16, 'signals' => ['passive'], 'handle_id' => 'pin-0', 'pin_type' => 'anode'],
                    ['name' => 'Cathode (-)', 'x' => 64, 'y' => 16, 'signals' => ['passive'], 'handle_id' => 'pin-1', 'pin_type' => 'cathode'],
                ],
                'properties' => ['Is' => 1.0e-14, 'n' => 1],
            ],
            [
                'name' => 'Switch',
                'type' => 'switch',
                'category' => 'Input',
                'description' => 'SPST switch - double-click on the canvas to toggle',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="32" viewBox="0 0 72 32"><line x1="0" y1="20" x2="20" y2="20" stroke="#333" stroke-width="2"/><circle cx="22" cy="20" r="3" fill="#333"/><circle cx="50" cy="20" r="3" fill="#333"/><line id="sw-lever-open" x1="22" y1="20" x2="46" y2="6" stroke="#333" stroke-width="2"/><line id="sw-lever-closed" x1="22" y1="20" x2="50" y2="20" stroke="#1a7f37" stroke-width="3" opacity="0"/><line x1="52" y1="20" x2="72" y2="20" stroke="#333" stroke-width="2"/></svg>',
                'pins' => [
                    ['name' => 'Pin 1', 'x' => 0, 'y' => 20, 'signals' => ['passive'], 'handle_id' => 'pin-0'],
                    ['name' => 'Pin 2', 'x' => 72, 'y' => 20, 'signals' => ['passive'], 'handle_id' => 'pin-1'],
                ],
                'properties' => [
                    'closed' => false,
                    'attributeStates' => ['closed' => ['true' => 'closed', 'false' => 'open']],
                    'animatableElements' => [
                        'sw-lever-open' => [
                            'transition' => 'all 0.15s ease-in-out',
                            'properties' => [
                                ['name' => 'opacity', 'states' => ['closed' => '0', 'default' => '1']],
                            ],
                        ],
                        'sw-lever-closed' => [
                            'transition' => 'all 0.15s ease-in-out',
                            'properties' => [
                                ['name' => 'opacity', 'states' => ['closed' => '1', 'default' => '0']],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'name' => 'Potentiometer',
                'type' => 'potentiometer',
                'category' => 'Input',
                'description' => 'Adjustable voltage divider (A / Wiper / B). Set position 0-1 in properties.',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="48" viewBox="0 0 80 48"><line x1="0" y1="36" x2="16" y2="36" stroke="#333" stroke-width="2"/><rect x="16" y="28" width="48" height="16" rx="2" fill="#e8d5b7" stroke="#333" stroke-width="2"/><line x1="64" y1="36" x2="80" y2="36" stroke="#333" stroke-width="2"/><line x1="40" y1="28" x2="40" y2="12" stroke="#333" stroke-width="2"/><polygon points="36,20 44,20 40,28" fill="#333"/><line x1="40" y1="12" x2="40" y2="0" stroke="#333" stroke-width="2"/></svg>',
                'pins' => [
                    ['name' => 'A', 'x' => 0, 'y' => 36, 'signals' => ['passive'], 'handle_id' => 'pin-0'],
                    ['name' => 'Wiper', 'x' => 40, 'y' => 0, 'signals' => ['passive'], 'handle_id' => 'pin-1'],
                    ['name' => 'B', 'x' => 80, 'y' => 36, 'signals' => ['passive'], 'handle_id' => 'pin-2'],
                ],
                'properties' => ['resistance' => '10k', 'position' => 0.5, 'unit' => 'Ω'],
            ],
            [
                'name' => 'Current Source',
                'type' => 'currentsource',
                'category' => 'Power',
                'description' => 'DC current source (current flows out of the + pin)',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="64" viewBox="0 0 48 64"><line x1="24" y1="0" x2="24" y2="12" stroke="#333" stroke-width="2"/><circle cx="24" cy="32" r="20" fill="#fff" stroke="#333" stroke-width="2"/><line x1="24" y1="44" x2="24" y2="20" stroke="#333" stroke-width="2"/><polygon points="20,26 28,26 24,18" fill="#333"/><line x1="24" y1="52" x2="24" y2="64" stroke="#333" stroke-width="2"/></svg>',
                'pins' => [
                    ['name' => 'Positive (+)', 'x' => 24, 'y' => 0, 'signals' => ['power'], 'handle_id' => 'pin-0'],
                    ['name' => 'Negative (-)', 'x' => 24, 'y' => 64, 'signals' => ['passive'], 'handle_id' => 'pin-1'],
                ],
                'properties' => ['current' => 0.005, 'unit' => 'A'],
            ],
            [
                'name' => 'Zener Diode (5.1V)',
                'type' => 'zener',
                'category' => 'Passive',
                'description' => 'Zener diode: ~0.7V forward, regulates at BV in reverse',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32"><line x1="0" y1="16" x2="22" y2="16" stroke="#333" stroke-width="2"/><polygon points="22,6 22,26 40,16" fill="#333"/><path d="M36 6 L40 6 L40 26 L44 26" fill="none" stroke="#333" stroke-width="3"/><line x1="40" y1="16" x2="64" y2="16" stroke="#333" stroke-width="2"/></svg>',
                'pins' => [
                    ['name' => 'Anode (+)', 'x' => 0, 'y' => 16, 'signals' => ['passive'], 'handle_id' => 'pin-0', 'pin_type' => 'anode'],
                    ['name' => 'Cathode (-)', 'x' => 64, 'y' => 16, 'signals' => ['passive'], 'handle_id' => 'pin-1', 'pin_type' => 'cathode'],
                ],
                'properties' => ['Is' => 1.0e-14, 'n' => 1, 'BV' => 5.1, 'IBV' => 0.001],
            ],
            [
                'name' => 'Photoresistor (LDR)',
                'type' => 'photoresistor',
                'category' => 'Input',
                'description' => 'Light-dependent resistor: edit resistance to mimic light level',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40" viewBox="0 0 80 40"><line x1="0" y1="28" x2="16" y2="28" stroke="#333" stroke-width="2"/><rect x="16" y="20" width="48" height="16" rx="2" fill="#f5e6a3" stroke="#333" stroke-width="2"/><line x1="64" y1="28" x2="80" y2="28" stroke="#333" stroke-width="2"/><line x1="28" y1="12" x2="34" y2="4" stroke="#e6a817" stroke-width="2"/><polygon points="27,13 33,10 29,7" fill="#e6a817"/><line x1="42" y1="12" x2="48" y2="4" stroke="#e6a817" stroke-width="2"/><polygon points="41,13 47,10 43,7" fill="#e6a817"/></svg>',
                'pins' => [
                    ['name' => 'Pin 1', 'x' => 0, 'y' => 28, 'signals' => ['passive'], 'handle_id' => 'pin-0'],
                    ['name' => 'Pin 2', 'x' => 80, 'y' => 28, 'signals' => ['passive'], 'handle_id' => 'pin-1'],
                ],
                'properties' => ['resistance' => '10k', 'unit' => 'Ω'],
            ],
            [
                'name' => 'Thermistor',
                'type' => 'thermistor',
                'category' => 'Input',
                'description' => 'Temperature-dependent resistor: edit resistance to mimic temperature',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40" viewBox="0 0 80 40"><line x1="0" y1="28" x2="16" y2="28" stroke="#333" stroke-width="2"/><rect x="16" y="20" width="48" height="16" rx="2" fill="#d8ecf3" stroke="#333" stroke-width="2"/><line x1="64" y1="28" x2="80" y2="28" stroke="#333" stroke-width="2"/><path d="M24 12 L48 12 L56 4" fill="none" stroke="#c0392b" stroke-width="2"/><text x="60" y="12" font-size="9" fill="#c0392b">T</text></svg>',
                'pins' => [
                    ['name' => 'Pin 1', 'x' => 0, 'y' => 28, 'signals' => ['passive'], 'handle_id' => 'pin-0'],
                    ['name' => 'Pin 2', 'x' => 80, 'y' => 28, 'signals' => ['passive'], 'handle_id' => 'pin-1'],
                ],
                'properties' => ['resistance' => '10k', 'unit' => 'Ω'],
            ],
            [
                'name' => 'Lamp',
                'type' => 'lamp',
                'category' => 'Output',
                'description' => 'Incandescent lamp (100Ω): glows above 2V',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><line x1="8" y1="40" x2="16" y2="32" stroke="#333" stroke-width="2"/><line x1="40" y1="40" x2="32" y2="32" stroke="#333" stroke-width="2"/><circle id="lamp-bulb" cx="24" cy="20" r="13" fill="#f7f3d6" stroke="#333" stroke-width="2"/><line x1="15" y1="11" x2="33" y2="29" stroke="#333" stroke-width="1.5"/><line x1="33" y1="11" x2="15" y2="29" stroke="#333" stroke-width="1.5"/></svg>',
                'pins' => [
                    ['name' => 'Pin 1', 'x' => 8, 'y' => 40, 'signals' => ['passive'], 'handle_id' => 'pin-0'],
                    ['name' => 'Pin 2', 'x' => 40, 'y' => 40, 'signals' => ['passive'], 'handle_id' => 'pin-1'],
                ],
                'properties' => [
                    'resistance' => 100,
                    'stateRules' => ['on' => 'voltage > 2'],
                    'animatableElements' => [
                        'lamp-bulb' => [
                            'transition' => 'all 0.3s ease-in-out',
                            'properties' => [
                                ['name' => 'fill', 'states' => ['on' => '#ffd93b', 'default' => '#f7f3d6']],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'name' => 'Buzzer',
                'type' => 'buzzer',
                'category' => 'Output',
                'description' => 'Piezo buzzer (100Ω): active above 1V',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><line x1="8" y1="44" x2="16" y2="36" stroke="#333" stroke-width="2"/><line x1="40" y1="44" x2="32" y2="36" stroke="#333" stroke-width="2"/><circle id="buzzer-body" cx="24" cy="22" r="14" fill="#4a4a4a" stroke="#111" stroke-width="2"/><circle cx="24" cy="22" r="4" fill="#111"/><path id="buzzer-waves" d="M42 12 a18 18 0 0 1 0 20 M46 8 a24 24 0 0 1 0 28" fill="none" stroke="#e67e22" stroke-width="2" opacity="0"/></svg>',
                'pins' => [
                    ['name' => 'Positive (+)', 'x' => 8, 'y' => 44, 'signals' => ['passive'], 'handle_id' => 'pin-0'],
                    ['name' => 'Negative (-)', 'x' => 40, 'y' => 44, 'signals' => ['passive'], 'handle_id' => 'pin-1'],
                ],
                'properties' => [
                    'resistance' => 100,
                    'stateRules' => ['on' => 'voltage > 1'],
                    'animatableElements' => [
                        'buzzer-waves' => [
                            'transition' => 'all 0.2s ease-in-out',
                            'properties' => [
                                ['name' => 'opacity', 'states' => ['on' => '1', 'default' => '0']],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'name' => 'Fuse (1A)',
                'type' => 'fuse',
                'category' => 'Protection',
                'description' => '1A fuse (1Ω): shows blown above 1A. Note: still conducts in DC analysis.',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="72" height="28" viewBox="0 0 72 28"><line x1="0" y1="14" x2="12" y2="14" stroke="#333" stroke-width="2"/><rect x="12" y="6" width="48" height="16" rx="8" fill="#f8f8f8" stroke="#333" stroke-width="2"/><line id="fuse-wire" x1="16" y1="14" x2="56" y2="14" stroke="#333" stroke-width="2"/><text id="fuse-blown" x="30" y="18" font-size="11" fill="#c0392b" opacity="0">✕</text><line x1="60" y1="14" x2="72" y2="14" stroke="#333" stroke-width="2"/></svg>',
                'pins' => [
                    ['name' => 'Pin 1', 'x' => 0, 'y' => 14, 'signals' => ['passive'], 'handle_id' => 'pin-0'],
                    ['name' => 'Pin 2', 'x' => 72, 'y' => 14, 'signals' => ['passive'], 'handle_id' => 'pin-1'],
                ],
                'properties' => [
                    'resistance' => 1,
                    'stateRules' => ['blown' => 'voltage > 1'],
                    'animatableElements' => [
                        'fuse-wire' => [
                            'transition' => 'all 0.2s ease-in-out',
                            'properties' => [
                                ['name' => 'opacity', 'states' => ['blown' => '0.15', 'default' => '1']],
                            ],
                        ],
                        'fuse-blown' => [
                            'transition' => 'all 0.2s ease-in-out',
                            'properties' => [
                                ['name' => 'opacity', 'states' => ['blown' => '1', 'default' => '0']],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'name' => 'Ground',
                'type' => 'ground',
                'category' => 'Power',
                'description' => 'Circuit ground reference',
                'svg_path' => '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><line x1="16" y1="0" x2="16" y2="14" stroke="#333" stroke-width="2"/><line x1="4" y1="14" x2="28" y2="14" stroke="#333" stroke-width="2"/><line x1="8" y1="20" x2="24" y2="20" stroke="#333" stroke-width="2"/><line x1="12" y1="26" x2="20" y2="26" stroke="#333" stroke-width="2"/></svg>',
                'pins' => [
                    ['name' => 'GND', 'x' => 16, 'y' => 0, 'signals' => ['ground'], 'handle_id' => 'pin-0', 'pin_type' => 'ground'],
                ],
                'properties' => [],
            ],
        ];

        foreach ($components as $definition) {
            $component = LibraryComponent::query()->firstOrCreate(
                ['type' => $definition['type']],
                [
                    'name' => $definition['name'],
                    'category' => $definition['category'],
                    'description' => $definition['description'],
                    'svg_path' => $definition['svg_path'],
                    'enabled' => true,
                    'is_original' => true,
                ]
            );

            if ($component->pins()->doesntExist()) {
                foreach ($definition['pins'] as $pin) {
                    $component->pins()->create($pin);
                }
            }

            foreach ($definition['properties'] as $key => $value) {
                $component->properties()->firstOrCreate(
                    ['property_key' => $key],
                    ['property_value' => $value]
                );
            }
        }
    }
}
