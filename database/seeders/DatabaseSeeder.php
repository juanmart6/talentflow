<?php

namespace Database\Seeders;

use App\Models\User;
use Database\Seeders\InternsSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesSeeder::class,
            TrainingProgramsSeeder::class,
            EducationCentersSeeder::class,
            InternsSeeder::class,
        ]);

        $user = User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        $user->assignRole('admin');
    }
}
