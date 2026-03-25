<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function index(): Response
    {
        $users = User::query()
            ->with('roles:name')
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'created_at'])
            ->map(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->roles->first()?->name,
                'roles' => $user->roles->pluck('name')->values()->all(),
                'created_at' => $user->created_at?->toDateTimeString(),
            ])
            ->values()
            ->all();

        $availableRoles = Role::query()
            ->orderByRaw("CASE name WHEN 'admin' THEN 1 WHEN 'tutor' THEN 2 WHEN 'intern' THEN 3 ELSE 99 END")
            ->orderBy('name')
            ->pluck('name')
            ->values()
            ->all();

        return Inertia::render('users/index', [
            'users' => $users,
            'availableRoles' => $availableRoles,
        ]);
    }

    public function updateRole(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
        ]);

        $newRole = $validated['role'];
        $currentRole = $user->roles()->value('name');

        if ($currentRole === 'admin' && $newRole !== 'admin') {
            $adminCount = User::role('admin')->count();

            if ($adminCount <= 1) {
                return redirect()
                    ->back()
                    ->with('error', 'Debe existir al menos un usuario con rol admin.');
            }
        }

        $user->syncRoles([$newRole]);

        return redirect()
            ->back()
            ->with('success', 'Rol actualizado correctamente.');
    }
}

