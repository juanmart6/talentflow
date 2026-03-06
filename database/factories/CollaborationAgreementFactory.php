<?php

namespace Database\Factories;

use App\Models\CollaborationAgreement;
use App\Models\EducationCenter;
use Illuminate\Database\Eloquent\Factories\Factory;

class CollaborationAgreementFactory extends Factory
{
    protected $model = CollaborationAgreement::class;

    public function definition(): array
    {
        $signedAt = $this->faker->dateTimeBetween('-2 years', '-1 month');
        $expiresAt = (clone $signedAt)->modify('+1 year');

        return [
            'education_center_id' => EducationCenter::factory(),
            'signed_at' => $signedAt,
            'expires_at' => $expiresAt,
            'agreed_slots' => $this->faker->numberBetween(3, 40),
            'pdf_path' => 'education-centers/agreements/demo-convenio.pdf',
        ];
    }
}
