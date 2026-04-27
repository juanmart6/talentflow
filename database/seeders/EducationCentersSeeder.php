<?php

namespace Database\Seeders;

use App\Models\CollaborationAgreement;
use App\Models\EducationCenter;
use App\Models\TrainingProgram;
use Illuminate\Database\Seeder;

class EducationCentersSeeder extends Seeder
{
    public function run(): void
    {
        $programIds = TrainingProgram::query()->pluck('id');

        if ($programIds->isEmpty()) {
            return;
        }

        EducationCenter::factory()
            ->count(20)
            ->create()
            ->each(function (EducationCenter $center) use ($programIds): void {
                $faker = fake('es_ES');
                $signedAt = $faker->dateTimeBetween('-16 months', '+3 months');
                $expiresAt = (clone $signedAt)->modify('+12 months');

                CollaborationAgreement::query()->create([
                    'education_center_id' => $center->id,
                    'signed_at' => $signedAt,
                    'expires_at' => $expiresAt,
                    'agreed_slots' => $faker->numberBetween(3, 30),
                    'pdf_path' => 'education-centers/agreements/demo-convenio.pdf',
                ]);

                $selectedProgramIds = $programIds->shuffle()->take($faker->numberBetween(2, 4))->all();
                $center->trainingPrograms()->sync($selectedProgramIds);
            });
    }
}
