<?php

namespace Database\Factories;

use App\Models\EducationCenter;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Intern>
 */
class InternFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startDate = $this->faker->dateTimeBetween('-8 months', '-2 months');
        $endDate = (clone $startDate)->modify('+4 months');
        $status = $this->faker->randomElement(['active', 'finished', 'abandoned']);

        $abandonmentReason = null;
        if ($status === 'abandoned') {
            $abandonmentReason = $this->faker->randomElement([
                'Motivos personales',
                'Cambio de ciclo formativo',
                'Incompatibilidad horaria',
                'Baja medica prolongada',
            ]);
        }

        return [
            'education_center_id' => EducationCenter::factory(),
            'first_name' => $this->faker->firstName(),
            'last_name' => $this->faker->lastName(),
            'dni_nie' => $this->faker->boolean(80)
                ? $this->generateValidDni()
                : $this->generateValidNie(),
            'email' => $this->faker->unique()->safeEmail(),
            'phone' => $this->faker->numerify('6########'),
            'address_line' => $this->faker->streetAddress(),
            'postal_code' => $this->faker->postcode(),
            'city' => $this->faker->city(),
            'province' => $this->faker->state(),
            'country' => 'Espana',
            'training_cycle' => $this->faker->randomElement([
                'Desarrollo de Aplicaciones Web',
                'Desarrollo de Aplicaciones Multiplataforma',
                'Administracion de Sistemas Informaticos en Red',
                'Marketing y Publicidad',
                'Gestion Administrativa',
            ]),
            'academic_year' => $this->faker->randomElement(['2024-2025', '2025-2026', '2026-2027']),
            'academic_tutor_name' => $this->faker->name(),
            'academic_tutor_email' => $this->faker->safeEmail(),
            'internship_start_date' => $startDate,
            'internship_end_date' => $endDate,
            'required_hours' => $this->faker->randomElement([240, 300, 320, 360, 400]),
            'status' => $status,
            'abandonment_reason' => $abandonmentReason,
        ];
    }

    private function generateValidDni(): string
    {
        $number = $this->faker->numberBetween(10000000, 99999999);
        $letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
        $letter = $letters[$number % 23];

        return sprintf('%08d%s', $number, $letter);
    }

    private function generateValidNie(): string
    {
        $prefix = $this->faker->randomElement(['X', 'Y', 'Z']);
        $number = $this->faker->numberBetween(1000000, 9999999);

        $prefixMap = ['X' => '0', 'Y' => '1', 'Z' => '2'];
        $dniNumber = (int) ($prefixMap[$prefix].sprintf('%07d', $number));

        $letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
        $letter = $letters[$dniNumber % 23];

        return sprintf('%s%07d%s', $prefix, $number, $letter);
    }
}
