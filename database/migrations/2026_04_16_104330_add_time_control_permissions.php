<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        $permissions = [
            'time-control.view',
            'time-control.update',
            'time-control.manual-entry',
            'time-control.manage-schedules',
            'time-control.approve-absences',
            'time-control.export',
        ];

        foreach ($permissions as $permissionName) {
            Permission::query()->firstOrCreate([
                'name' => $permissionName,
                'guard_name' => 'web',
            ]);
        }

        $adminRole = Role::query()->where('name', 'admin')->first();
        if ($adminRole !== null) {
            $adminRole->givePermissionTo($permissions);
        }

        $tutorRole = Role::query()->where('name', 'tutor')->first();
        if ($tutorRole !== null) {
            $tutorRole->givePermissionTo([
                'time-control.view',
                'time-control.update',
                'time-control.manual-entry',
                'time-control.manage-schedules',
                'time-control.approve-absences',
                'time-control.export',
            ]);
        }

        $internRole = Role::query()->where('name', 'intern')->first();
        if ($internRole !== null) {
            $internRole->givePermissionTo([
                'time-control.view',
                'time-control.update',
                'time-control.export',
            ]);
        }
    }

    public function down(): void
    {
        $permissions = [
            'time-control.view',
            'time-control.update',
            'time-control.manual-entry',
            'time-control.manage-schedules',
            'time-control.approve-absences',
            'time-control.export',
        ];

        $roles = Role::query()
            ->whereIn('name', ['admin', 'tutor', 'intern'])
            ->get();

        foreach ($roles as $role) {
            $role->revokePermissionTo($permissions);
        }

        Permission::query()
            ->whereIn('name', $permissions)
            ->delete();
    }
};
