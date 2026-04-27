<?php

use App\Models\Intern;
use App\Models\User;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

test('admin can load control horario page with interns', function () {
    $user = User::factory()->create();
    $intern = Intern::factory()->create();

    $role = Role::findOrCreate('admin', 'web');
    Permission::findOrCreate('time-control.view', 'web');
    $role->givePermissionTo('time-control.view');
    $user->assignRole($role);

    $response = $this
        ->actingAs($user)
        ->get(route('time-control.index', [
            'intern_id' => $intern->id,
        ]));

    $response->assertOk();
});
