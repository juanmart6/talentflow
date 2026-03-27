<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TrainingProgramsSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();

        $programs = [
            'Desarrollo de Aplicaciones Web (DAW)',
            'Desarrollo de Aplicaciones Moviles (DAM)',
            'Administracion de Sistemas Informaticos (ASIR)',
            'Educacion Infantil',
            'Higiene Bucodental',
            'Administracion y Finanzas',
        ];

        DB::table('training_programs')->upsert(
            array_map(
                fn (string $name) => [
                    'name' => $name,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                $programs,
            ),
            ['name'],
            ['updated_at'],
        );
    }
}
