<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesSeeder extends Seeder
{
    public function run(): void
    {
        $roles = ['admin', 'tutor', 'intern'];

        $permissions = [

            // Centros Educativos:
            'education-centers.view',
            'education-centers.create',
            'education-centers.update',
            'education-centers.delete',

            //Becarios:
            'interns.view',
            'interns.create',
            'interns.update',
            'interns.delete',

            //Prácticas y tareas:
            'practice-tasks.view',
            'practice-tasks.create',
            'practice-tasks.update',
            'practice-tasks.delete',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        foreach ($roles as $role) {
            $roleModel = Role::firstOrCreate([
                'name' => $role,
                'guard_name' => 'web',
            ]);

            if ($role === 'admin') {
                $roleModel->syncPermissions($permissions);
            }

            if ($role === 'tutor') {
                $roleModel->syncPermissions([
                    'education-centers.view',
                    'education-centers.create',
                    'education-centers.update',
                    'interns.view',
                    'interns.create',
                    'interns.update',
                    'practice-tasks.view',
                    'practice-tasks.create',
                    'practice-tasks.update',
                    'practice-tasks.delete',
                ]);
            }

            if ($role === 'intern') {
                $roleModel->syncPermissions([
                    'education-centers.view',
                    'interns.view',
                    'practice-tasks.view',
                ]);
            }
        }
    }
}
