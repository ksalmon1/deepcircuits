<?php

namespace App\Http\Controllers;

use App\Models\LibraryComponent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComponentLibraryController extends Controller
{
    public function index(): JsonResponse
    {
        $components = LibraryComponent::query()
            ->with(['pins', 'properties'])
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        return response()->json(
            $components->map(fn (LibraryComponent $component) => $component->toClientArray())->values()
        );
    }

    public function show(LibraryComponent $component): JsonResponse
    {
        $component->load(['pins', 'properties']);

        return response()->json($component->toClientArray());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateComponent($request);

        $component = DB::transaction(function () use ($validated) {
            $component = LibraryComponent::query()->create($validated['component']);
            $this->syncDetails($component, $validated);

            return $component;
        });

        return response()->json($component->load(['pins', 'properties'])->toClientArray(), 201);
    }

    public function update(Request $request, LibraryComponent $component): JsonResponse
    {
        $validated = $this->validateComponent($request);

        DB::transaction(function () use ($component, $validated) {
            $component->update($validated['component']);
            $this->syncDetails($component, $validated);
        });

        return response()->json($component->refresh()->load(['pins', 'properties'])->toClientArray());
    }

    public function destroy(LibraryComponent $component): JsonResponse
    {
        $component->delete();

        return response()->json(['success' => true]);
    }

    /**
     * @return array{component: array<string, mixed>, pins: ?array<int, array<string, mixed>>, properties: ?array<string, mixed>}
     */
    private function validateComponent(Request $request): array
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'svgPath' => ['nullable', 'string'],
            'enabled' => ['sometimes', 'boolean'],
            'isOriginal' => ['sometimes', 'boolean'],
            'pins' => ['sometimes', 'array'],
            'pins.*.name' => ['required', 'string', 'max:255'],
            'pins.*.x' => ['required', 'numeric'],
            'pins.*.y' => ['required', 'numeric'],
            'pins.*.signals' => ['nullable', 'array'],
            'pins.*.handle_id' => ['nullable', 'string', 'max:255'],
            'pins.*.type' => ['nullable', 'string', 'max:255'],
            'properties' => ['sometimes', 'nullable', 'array'],
        ]);

        return [
            'component' => [
                'name' => $validated['name'],
                'type' => $validated['type'],
                'category' => $validated['category'],
                'description' => $validated['description'] ?? null,
                'svg_path' => $validated['svgPath'] ?? null,
                'enabled' => $validated['enabled'] ?? true,
                'is_original' => $validated['isOriginal'] ?? false,
            ],
            'pins' => $validated['pins'] ?? null,
            'properties' => array_key_exists('properties', $validated) ? ($validated['properties'] ?? []) : null,
        ];
    }

    private function syncDetails(LibraryComponent $component, array $validated): void
    {
        if ($validated['pins'] !== null) {
            $component->pins()->delete();
            foreach ($validated['pins'] as $pin) {
                $component->pins()->create([
                    'name' => $pin['name'],
                    'x' => $pin['x'],
                    'y' => $pin['y'],
                    'signals' => $pin['signals'] ?? [],
                    'handle_id' => $pin['handle_id'] ?? null,
                    'pin_type' => $pin['type'] ?? null,
                ]);
            }
        }

        if ($validated['properties'] !== null) {
            $component->properties()->delete();
            foreach ($validated['properties'] as $key => $value) {
                $component->properties()->create([
                    'property_key' => $key,
                    'property_value' => $value,
                ]);
            }
        }
    }
}
