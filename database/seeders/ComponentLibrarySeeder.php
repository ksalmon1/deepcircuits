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
