<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['name', 'x', 'y', 'signals', 'handle_id', 'pin_type'])]
class ComponentPin extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return [
            'x' => 'float',
            'y' => 'float',
            'signals' => 'array',
        ];
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(LibraryComponent::class, 'component_id');
    }

    /**
     * Shape matching the frontend ComponentPin interface.
     *
     * @return array<string, mixed>
     */
    public function toClientArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'x' => $this->x,
            'y' => $this->y,
            'signals' => $this->signals ?? [],
            'handle_id' => $this->handle_id,
            'type' => $this->pin_type,
        ];
    }
}
