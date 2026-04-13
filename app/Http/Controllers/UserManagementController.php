<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Users\UserInvitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use App\Mail\UserInvitationMail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;

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

        $invitations = UserInvitation::query()
            ->with('invitedBy:id,name')
            ->whereNull('accepted_at')
            ->latest('id')
            ->get()
            ->map(fn (UserInvitation $invitation): array => [
                'id' => $invitation->id,
                'email' => $invitation->email,
                'role' => $invitation->role,
                'token' => $invitation->token,
                'expires_at' => $invitation->expires_at?->toDateTimeString(),
                'accepted_at' => $invitation->accepted_at?->toDateTimeString(),
                'invited_by_name' => $invitation->invitedBy?->name ?? 'Sistema',
                'created_at' => $invitation->created_at?->toDateTimeString(),
            ])
            ->values()
            ->all();

        return Inertia::render('users/index', [
            'users' => $users,
            'roles' => $roles,
            'availableRoles' => $availableRoles,
            'permissions' => $permissions,
            'rolePermissions' => $rolePermissions,
            'invitations' => $invitations,
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

    public function storeInvitation(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', 'string', Rule::exists('roles', 'name')],
        ]);

        $email = mb_strtolower(trim($validated['email']));
        $role = $validated['role'];

        if ($role === 'admin') {
            return back()->with('error', 'No se pueden crear invitaciones con rol admin.');
        }

        $userAlreadyExists = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->exists();

        if ($userAlreadyExists) {
            return back()->with('error', 'Ya existe un usuario registrado con ese correo.');
        }

        $hasPendingInvitation = UserInvitation::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->exists();

        if ($hasPendingInvitation) {
            return back()->with('error', 'Ya existe una invitacion activa para ese correo.');
        }

        $invitation = UserInvitation::create([
            'email' => $email,
            'role' => $role,
            'token' => Str::random(64),
            'invited_by_user_id' => $request->user()?->id,
            'expires_at' => now()->addDays(7),
            'accepted_at' => null,
        ]);

        $acceptUrl = url("/invitaciones/{$invitation->token}");

        Mail::to($invitation->email)->send(
            new UserInvitationMail($invitation, $acceptUrl)
        );

        return back()->with('success', 'Invitacion creada correctamente.');
    }

    public function destroyInvitation(UserInvitation $invitation): RedirectResponse
    {
        if ($invitation->accepted_at !== null) {
            return back()->with('error', 'No se puede cancelar una invitacion ya aceptada.');
        }

        $invitation->delete();

        return back()->with('info', 'Invitacion cancelada correctamente.');
    }

    public function showInvitation(string $token): Response
    {
        $invitation = $this->findValidInvitationOrFail($token);

        return Inertia::render('auth/accept-invitation', [
            'token' => $invitation->token,
            'email' => $invitation->email,
            'role' => $invitation->role,
            'expires_at' => $invitation->expires_at?->toDateTimeString(),
        ]);
    }

    public function acceptInvitation(Request $request, string $token): RedirectResponse
    {
        $invitation = $this->findValidInvitationOrFail($token);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $invitation->email,
            'password' => Hash::make($validated['password']),
        ]);

        $user->syncRoles([$invitation->role]);
        $user->sendEmailVerificationNotification();

        $invitation->forceFill([
            'accepted_at' => now(),
        ])->save();

        return redirect()
            ->route('login')
            ->with('success', 'Cuenta creada correctamente. Revisa tu correo para verificar la cuenta.');
    }

    private function findValidInvitationOrFail(string $token): UserInvitation
    {
        $invitation = UserInvitation::query()
            ->where('token', $token)
            ->first();

        if (!$invitation) {
            abort(404, 'Invitacion no encontrada.');
        }

        if ($invitation->accepted_at !== null) {
            abort(410, 'Esta invitacion ya fue aceptada.');
        }

        if ($invitation->expires_at === null || $invitation->expires_at->isPast()) {
            abort(410, 'Esta invitacion ha caducado.');
        }

        return $invitation;
    }
}
