<?php

namespace Database\Seeders;

use App\Models\CollaborationAgreement;
use App\Models\EducationCenter;
use Illuminate\Database\Seeder;

class EducationCentersSeeder extends Seeder
{
    public function run(): void
    {
        EducationCenter::factory()
            ->count(20)
            ->create()
            ->each(function (EducationCenter $center): void {
                CollaborationAgreement::factory()->create([
                    'education_center_id' => $center->id,
                ]);
            });
    }
}
