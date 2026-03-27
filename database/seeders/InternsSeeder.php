<?php

namespace Database\Seeders;

use App\Models\EducationCenter;
use App\Models\Intern;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class InternsSeeder extends Seeder
{
    public function run(): void
    {
        $centers = EducationCenter::query()
            ->with(['latestCollaborationAgreement', 'trainingPrograms'])
            ->get()
            ->filter(
                fn (EducationCenter $center): bool =>
                $center->latestCollaborationAgreement !== null
                && $center->trainingPrograms->isNotEmpty()
            )
            ->values();

        if ($centers->isEmpty()) {
            return;
        }

        $faker = fake('es_ES');

        foreach (range(1, 70) as $_) {
            $center = $centers->random();
            $agreement = $center->latestCollaborationAgreement;
            $program = $center->trainingPrograms->random();

            $signedAt = Carbon::parse($agreement->signed_at)->startOfDay();
            $expiresAt = Carbon::parse($agreement->expires_at)->endOfDay();

            $minStart = $signedAt->copy()->addDays(3);
            $maxStart = $expiresAt->copy()->subDays(45);

            if ($minStart->greaterThan($maxStart)) {
                $minStart = $signedAt->copy();
                $maxStart = $expiresAt->copy()->subDays(1);
            }

            $startDate = Carbon::instance($faker->dateTimeBetween($minStart, $maxStart))->startOfDay();
            $maxDuration = max(15, min(120, $startDate->diffInDays($expiresAt)));
            $durationDays = $faker->numberBetween(15, $maxDuration);
            $endDate = $startDate->copy()->addDays($durationDays);

            $status = $faker->boolean(12) ? 'abandoned' : 'active';
            $abandonmentReason = null;
            $abandonmentDate = null;

            if ($status === 'abandoned') {
                $abandonmentReason = $faker->randomElement([
                    'Motivos personales',
                    'Incorporacion laboral',
                    'Cambio de disponibilidad',
                    'Baja medica',
                ]);
                $abandonmentDate = Carbon::instance($faker->dateTimeBetween($startDate, $endDate))->toDateString();
            }

            Intern::factory()->create([
                'education_center_id' => $center->id,
                'training_program_id' => $program->id,
                'training_cycle' => $program->name,
                'internship_start_date' => $startDate->toDateString(),
                'internship_end_date' => $endDate->toDateString(),
                'status' => $status,
                'abandonment_reason' => $abandonmentReason,
                'abandonment_date' => $abandonmentDate,
            ]);
        }
    }
}
