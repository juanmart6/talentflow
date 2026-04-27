<?php

namespace Database\Factories;

use App\Models\EducationCenter;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class EducationCenterFactory extends Factory
{
    protected $model = EducationCenter::class;

    public function definition(): array
    {
        $faker = fake('es_ES');
        $city = $faker->randomElement([
            'Madrid',
            'Barcelona',
            'Valencia',
            'Sevilla',
            'Malaga',
            'Bilbao',
            'Zaragoza',
            'Valladolid',
            'A Coruna',
            'Murcia',
        ]);

        $centerName = $faker->unique()->randomElement([
            'IES San Isidro',
            'IES Alameda',
            'IES Ramon y Cajal',
            'IES Miguel de Cervantes',
            'IES Valle Verde',
            'IES Costa Azul',
            'CIFP Los Olivos',
            'CIFP Nuestra Senora del Pilar',
            'CIFP Torreblanca',
            'CIFP Puerta del Mar',
            'Centro Integrado La Merced',
            'Centro Integrado Santa Lucia',
            'Centro Integrado El Prado',
            'Centro Integrado Montealto',
            'Centro Integrado Vistalegre',
            'IES Clara Campoamor',
            'IES Antonio Machado',
            'IES Blas Infante',
            'CIFP La Arboleda',
            'CIFP Camino Real',
            'Centro Integrado Sierra Norte',
            'IES Mar de Alboran',
            'IES Alto Guadalquivir',
            'CIFP Rio Ebro',
            'Centro Integrado Campus Sur',
        ]);

        $slug = Str::slug($centerName, '-').'-'.$faker->unique()->numerify('##');

        return [
            'name' => $centerName,
            'address' => $faker->streetName().', '.$faker->buildingNumber().', '.$city,
            'phone' => $faker->numerify('9########'),
            'institutional_email' => 'info@'.$slug.'.es',
            'website' => $faker->boolean(80) ? 'https://www.'.$slug.'.es' : null,
            'contact_name' => $faker->name(),
            'contact_position' => $faker->randomElement(['Coordinador de practicas', 'Director academico', 'Jefe de estudios']),
            'contact_phone' => $faker->numerify('6########'),
            'contact_email' => $faker->unique()->userName().'@'.$slug.'.es',
        ];
    }
}
