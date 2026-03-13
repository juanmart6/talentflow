<?php

namespace Database\Seeders;

use App\Models\EducationCenter;
use App\Models\Intern;
use Illuminate\Database\Seeder;

class InternsSeeder extends Seeder
{
    public function run(): void
    {
        $centerIds = EducationCenter::query()->pluck('id');

        if ($centerIds->isEmpty()) {
            $centerIds = EducationCenter::factory()->count(5)->create()->pluck('id');
        }

        Intern::factory()
            ->count(60)
            ->state(fn () => [
                'education_center_id' => $centerIds->random(),
            ])
            ->create();
    }
}
