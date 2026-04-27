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
        $faker = fake('es_ES');
        $startDate = $faker->dateTimeBetween('-8 months', '-2 months');
        $endDate = (clone $startDate)->modify('+4 months');
        $status = $faker->boolean(12) ? 'abandoned' : 'active';

        $abandonmentReason = null;
        $abandonmentDate = null;
        if ($status === 'abandoned') {
            $abandonmentReason = $faker->randomElement([
                'Motivos personales',
                'Cambio de ciclo formativo',
                'Incompatibilidad horaria',
                'Baja medica prolongada',
            ]);
            $abandonmentDate = $faker->dateTimeBetween($startDate, $endDate);
        }

        return [
            'education_center_id' => EducationCenter::factory(),
            'training_program_id' => null,
            'first_name' => $faker->firstName(),
            'last_name' => $faker->lastName(),
            'dni_nie' => $faker->boolean(80)
                ? $this->generateValidDni()
                : $this->generateValidNie(),
            'email' => $faker->unique()->safeEmail(),
            'phone' => $faker->numerify('6########'),
            'address_line' => $faker->streetAddress(),
            'postal_code' => $faker->numerify('#####'),
            'city' => $faker->city(),
            'province' => $faker->randomElement([
                'Madrid',
                'Barcelona',
                'Valencia',
                'Sevilla',
                'Malaga',
                'Alicante',
                'Murcia',
                'Vizcaya',
                'Zaragoza',
                'A Coruna',
            ]),
            'country' => 'Espana',
            'training_cycle' => $faker->randomElement([
                'Desarrollo de Aplicaciones Web (DAW)',
                'Desarrollo de Aplicaciones Moviles (DAM)',
                'Administracion de Sistemas Informaticos (ASIR)',
                'Educacion Infantil',
                'Higiene Bucodental',
                'Administracion y Finanzas',
            ]),
            'academic_year' => $faker->randomElement(['2024-2025', '2025-2026', '2026-2027']),
            'academic_tutor_name' => $faker->name(),
            'academic_tutor_email' => $faker->safeEmail(),
            'internship_start_date' => $startDate,
            'internship_end_date' => $endDate,
            'required_hours' => $faker->randomElement([240, 300, 320, 360, 400]),
            'status' => $status,
            'abandonment_reason' => $abandonmentReason,
            'abandonment_date' => $abandonmentDate,
        ];
    }

    private function generateValidDni(): string
    {
        $number = fake('es_ES')->numberBetween(10000000, 99999999);
        $letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
        $letter = $letters[$number % 23];

        return sprintf('%08d%s', $number, $letter);
    }

    private function generateValidNie(): string
    {
        $faker = fake('es_ES');
        $prefix = $faker->randomElement(['X', 'Y', 'Z']);
        $number = $faker->numberBetween(1000000, 9999999);

        $prefixMap = ['X' => '0', 'Y' => '1', 'Z' => '2'];
        $dniNumber = (int) ($prefixMap[$prefix].sprintf('%07d', $number));

        $letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
        $letter = $letters[$dniNumber % 23];

        return sprintf('%s%07d%s', $prefix, $number, $letter);
    }
}
