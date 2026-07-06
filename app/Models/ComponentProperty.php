<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['property_key', 'property_value'])]
class ComponentProperty extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return [
            'property_value' => 'json',
        ];
    }

    public function component(): BelongsTo
    {
        return $this->belongsTo(LibraryComponent::class, 'component_id');
    }
}
