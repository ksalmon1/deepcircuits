<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['name', 'description', 'components', 'wires', 'code', 'is_public', 'thumbnail_url'])]
class Project extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return [
            'components' => 'array',
            'wires' => 'array',
            'is_public' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Shape expected by the React editor and dashboard.
     *
     * @return array<string, mixed>
     */
    public function toClientArray(): array
    {
        return [
            'id' => $this->id,
            'user_id' => (string) $this->user_id,
            'name' => $this->name,
            'description' => $this->description,
            'components' => $this->components ?? [],
            'wires' => $this->wires ?? [],
            'code' => $this->code ?? '',
            'is_public' => $this->is_public,
            'thumbnail_url' => $this->thumbnail_url,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
