<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'type', 'category', 'description', 'svg_path', 'enabled', 'is_original'])]
class LibraryComponent extends Model
{
    use HasUuids;

    protected $table = 'component_library';

    protected function casts(): array
    {
        return [
            'enabled' => 'boolean',
            'is_original' => 'boolean',
        ];
    }

    public function pins(): HasMany
    {
        return $this->hasMany(ComponentPin::class, 'component_id');
    }

    public function properties(): HasMany
    {
        return $this->hasMany(ComponentProperty::class, 'component_id');
    }

    /**
     * Shape matching the frontend ComponentLibraryItem interface.
     *
     * @return array<string, mixed>
     */
    public function toClientArray(bool $withDetails = true): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'category' => $this->category,
            'description' => $this->description,
            'svgPath' => $this->svg_path,
            'enabled' => $this->enabled,
            'isOriginal' => $this->is_original,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];

        if ($withDetails) {
            $data['pins'] = $this->pins->map(fn (ComponentPin $pin) => $pin->toClientArray())->values()->all();
            $data['properties'] = $this->properties
                ->mapWithKeys(fn (ComponentProperty $property) => [$property->property_key => $property->property_value])
                ->all();
        }

        return $data;
    }
}
