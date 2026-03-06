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
            'education-centers.view',
            'education-centers.create',
            'education-centers.update',
            'education-centers.delete',
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
                ]);
            }

            if ($role === 'intern') {
                $roleModel->syncPermissions([
                    'education-centers.view',
                ]);
            }
        }
    }
}
