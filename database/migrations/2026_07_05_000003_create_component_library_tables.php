<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('component_library', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('type');
            $table->string('category');
            $table->text('description')->nullable();
            $table->longText('svg_path')->nullable();
            $table->boolean('enabled')->default(true);
            $table->boolean('is_original')->default(false);
            $table->timestamps();
        });

        Schema::create('component_pins', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('component_id')->constrained('component_library')->cascadeOnDelete();
            $table->string('name');
            $table->float('x');
            $table->float('y');
            $table->json('signals')->nullable();
            $table->string('handle_id')->nullable();
            $table->string('pin_type')->nullable();
            $table->timestamps();
        });

        Schema::create('component_properties', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('component_id')->constrained('component_library')->cascadeOnDelete();
            $table->string('property_key');
            $table->json('property_value')->nullable();
            $table->timestamps();
            $table->unique(['component_id', 'property_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('component_properties');
        Schema::dropIfExists('component_pins');
        Schema::dropIfExists('component_library');
    }
};
