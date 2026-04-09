<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->with('roles:name')
            ->orderBy('name')
            ->get()
            ->map(function (User $user): array {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->roles->first()?->name,
                    'roles' => $user->roles->pluck('name')->values()->all(),
                ];
    })
            ->values()
            ->all();

        $roles = Role::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Role $role): array => [
                'id' => $role->id,
                'name' => $role->name,
            ])
            ->values()
            ->all();
        
        $availableRoles = collect($roles)->pluck('name')->values()->all();

        $permissions = Permission::query()
            ->orderBy('name')
            ->get(['name'])
            ->pluck('name')
            ->values()
            ->all();
        
        $rolePermissions = Role::query()
            ->with('permissions:name')
            ->get(['id', 'name'])
            ->mapWithKeys(fn (Role $role) => [
                $role->name => $role->permissions->pluck('name')->values()->all(),
            ])
            ->all();

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles,
            'availableRoles' => $availableRoles,
            'permissions' => $permissions,
            'rolePermissions' => $rolePermissions,
        ]);
    }

    public function updateRole(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
        ]);

        $newRole = $validated['role'];
        $isAdminUser = $user->hasRole('admin');

        if ($isAdminUser && $newRole !== 'admin') {
            return redirect()
                ->back()
                ->with('error', 'No se puede modificar el rol de un usuario admin.');
        }

        if (!$isAdminUser && $newRole === 'admin') {
            return redirect()
                ->back()
                ->with('error', 'No se puede asignar el rol admin desde esta pantalla.');
        }

        $user->syncRoles([$newRole]);

        return redirect()
            ->back()
            ->with('success', 'Rol actualizado correctamente.');
    }

    public function updateRolePermissions(Request $request, Role $role): RedirectResponse
    {
        if ($role->name === 'admin') {
            return back()->with('error', 'No se pueden modificar los permisos del rol admin.');
        }

        $validated = $request->validate([
            'permissions' => ['array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'name')],
        ]);

        $permissions = collect($validated['permissions'] ?? [])
            ->unique()
            ->values()
            ->all();

        $includesUsersManage = in_array('users.manage', $permissions, true);

        if (!$includesUsersManage) {
            $otherRoleHasUsersManage = Role::query()
                ->whereKeyNot($role->id)
                ->whereHas('permissions', fn ($query) => $query->where('name', 'users.manage'))
                ->exists();

            if (!$otherRoleHasUsersManage) {
                return back()->with('error', 'Debe existir al menos un rol con el permiso users.manage.');
            }
        }

        $role->syncPermissions($permissions);

        return back()->with('success', "Permisos del rol {$role->name} actualizados correctamente.");
    }
}
