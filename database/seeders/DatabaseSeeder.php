<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->firstOrCreate(
            ['email' => 'admin@deepcircuits.test'],
            [
                'name' => 'Admin',
                'display_name' => 'Admin',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ]
        );

        $this->call(ComponentLibrarySeeder::class);
        $this->call(ProjectExampleSeeder::class);
    }
}
