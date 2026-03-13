<?php

namespace Database\Factories;

use App\Models\EducationCenter;
use Illuminate\Database\Eloquent\Factories\Factory;

class EducationCenterFactory extends Factory
{
    protected $model = EducationCenter::class;

    public function definition(): array
    {
        return [
            'name' => 'Centro '.$this->faker->unique()->company(),
            'address' => $this->faker->streetAddress().', '.$this->faker->city(),
            'phone' => $this->faker->phoneNumber(),
            'institutional_email' => $this->faker->unique()->companyEmail(),
            'website' => $this->faker->optional()->url(),
            'contact_name' => $this->faker->name(),
            'contact_position' => $this->faker->randomElement(['Coordinador de practicas', 'Director academico', 'Jefe de estudios']),
            'contact_phone' => $this->faker->phoneNumber(),
            'contact_email' => $this->faker->unique()->safeEmail(),
        ];
    }
}
