<?php

namespace App\Http\Controllers;

use App\Models\Intern;
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
    public function index(Request $request): Response
    {
        $invitationFilter = $request->string('invitation_filter')->toString();
        if (!in_array($invitationFilter, ['all', 'pending', 'accepted', 'expired'], true)) {
            $invitationFilter = 'all';
        }

        $users = User::query()
            ->with('roles:id,name')
            ->whereDoesntHave('roles', fn ($query) => $query->where('name', 'intern'))
            ->orderBy('name')
            ->paginate(8, ['*'], 'users_page')
            ->withQueryString()
            ->through(function (User $user): array {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'role' => $user->roles->first()?->name,
                    'roles' => $user->roles->pluck('name')->values()->all(),
                    'created_at' => $user->created_at?->toIso8601String(),
                ];
            });

        $roles = Role::query()
            ->where('name', '!=', 'intern')
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
            ->where('name', '!=', 'intern')
            ->with('permissions:name')
            ->get(['id', 'name'])
            ->mapWithKeys(fn (Role $role) => [
                $role->name => $role->permissions->pluck('name')->values()->all(),
            ])
            ->all();

        $baseInvitationsQuery = UserInvitation::query()
            ->where('role', '!=', 'intern')
            ->with('invitedBy:id,name');

        $invitationStatusCounts = [
            'all' => (clone $baseInvitationsQuery)->count(),
            'pending' => (clone $baseInvitationsQuery)
                ->whereNull('accepted_at')
                ->where('expires_at', '>', now())
                ->count(),
            'accepted' => (clone $baseInvitationsQuery)
                ->whereNotNull('accepted_at')
                ->count(),
            'expired' => (clone $baseInvitationsQuery)
                ->whereNull('accepted_at')
                ->where(function ($query): void {
                    $query
                        ->whereNull('expires_at')
                        ->orWhere('expires_at', '<=', now());
                })
                ->count(),
        ];

        $invitationsQuery = (clone $baseInvitationsQuery);

        if ($invitationFilter === 'pending') {
            $invitationsQuery
                ->whereNull('accepted_at')
                ->where('expires_at', '>', now());
        } elseif ($invitationFilter === 'accepted') {
            $invitationsQuery->whereNotNull('accepted_at');
        } elseif ($invitationFilter === 'expired') {
            $invitationsQuery
                ->whereNull('accepted_at')
                ->where(function ($query): void {
                    $query
                        ->whereNull('expires_at')
                        ->orWhere('expires_at', '<=', now());
                });
        }

        $invitations = $invitationsQuery
            ->latest('id')
            ->paginate(8, ['*'], 'invitations_page')
            ->withQueryString()
            ->through(fn (UserInvitation $invitation): array => [
                'id' => $invitation->id,
                'email' => $invitation->email,
                'role' => $invitation->role,
                'token' => $invitation->token,
                'expires_at' => $invitation->expires_at?->toIso8601String(),
                'accepted_at' => $invitation->accepted_at?->toIso8601String(),
                'invited_by_name' => $invitation->invitedBy?->name ?? 'Sistema',
                'created_at' => $invitation->created_at?->toIso8601String(),
            ]);

        return Inertia::render('access-permissions/index', [
            'users' => $users,
            'roles' => $roles,
            'availableRoles' => $availableRoles,
            'permissions' => $permissions,
            'rolePermissions' => $rolePermissions,
            'invitations' => $invitations,
            'invitationFilter' => $invitationFilter,
            'invitationStatusCounts' => $invitationStatusCounts,
        ]);
    }

    public function updateRole(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => [
                'required',
                'string',
                Rule::exists('roles', 'name')->where(fn ($query) => $query->where('name', '!=', 'intern')),
            ],
        ]);

        $newRole = $validated['role'];
        $isAdminUser = $user->hasRole('admin');
        $isInternUser = $user->hasRole('intern');

        if ($isInternUser || $newRole === 'intern') {
            return redirect()
                ->back()
                ->with('error', 'Los becarios se gestionan desde GestiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de Becarios.');
        }

        if ($isAdminUser && $newRole !== 'admin') {
            return redirect()
                ->back()
                ->with('error', 'No se puede modificar el rol de una cuenta administradora.');
        }

        if (!$isAdminUser && $newRole === 'admin') {
            return redirect()
                ->back()
                ->with('error', 'No se puede asignar el rol administrador desde esta pantalla.');
        }

        $user->syncRoles([$newRole]);

        return redirect()
            ->back()
            ->with('success', 'Rol actualizado correctamente.');
    }

    public function updateRolePermissions(Request $request, Role $role): RedirectResponse
    {
        if ($role->name === 'admin') {
            return back()->with('error', 'No se pueden modificar los permisos del rol administrador.');
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
            'role' => [
                'required',
                'string',
                Rule::exists('roles', 'name')->where(fn ($query) => $query->where('name', '!=', 'intern')),
            ],
        ]);

        $email = mb_strtolower(trim($validated['email']));
        $role = $validated['role'];

        if ($role === 'intern') {
            return back()->with('error', 'Las invitaciones de becarios se envian desde Gestion de Becarios.');
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
            return back()->with('error', 'Ya existe una invitaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n activa para ese correo.');
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

        return back()->with('success', 'InvitaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n de staff creada correctamente.');
    }

    public function destroyInvitation(UserInvitation $invitation): RedirectResponse
    {
        if ($invitation->accepted_at !== null) {
            return back()->with('error', 'No se puede cancelar una invitaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n ya aceptada.');
        }

        $invitation->forceFill([
            'expires_at' => now()->subSecond(),
        ])->save();

        return back()->with('info', 'InvitaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n cancelada correctamente.');
    }

    public function showInvitation(string $token): Response
    {
        $invitation = $this->findValidInvitationOrFail($token);
        $invitation->loadMissing('intern.educationCenter:id,name', 'intern.trainingProgram:id,name');

        $intern = $invitation->intern;

        return Inertia::render('auth/accept-invitation', [
            'token' => $invitation->token,
            'email' => $invitation->email,
            'role' => $invitation->role,
            'expires_at' => $invitation->expires_at?->toIso8601String(),
            'display_name' => $this->resolveInvitationDisplayName($invitation),
            'intern_summary' => $intern ? [
                'dni_nie' => $intern->dni_nie,
                'education_center_name' => $intern->educationCenter?->name,
                'training_program_name' => $intern->trainingProgram?->name,
            ] : null,
        ]);
    }

    public function acceptInvitation(Request $request, string $token): RedirectResponse
    {
        $invitation = $this->findValidInvitationOrFail($token);

        $validated = $request->validate([
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $invitationEmail = mb_strtolower(trim($invitation->email));
        $displayName = $this->resolveInvitationDisplayName($invitation);
        $invitation->loadMissing('intern.user');

        $linkedInternUser = $invitation->role === 'intern'
            ? $invitation->intern?->user
            : null;

        $existingUser = $linkedInternUser
            ?? User::query()
                ->whereRaw('LOWER(email) = ?', [$invitationEmail])
                ->first();

        if ($existingUser !== null && $existingUser->is_active) {
            return redirect()
                ->route('login')
                ->with('error', 'Ya existe una cuenta activa para este correo.');
        }

        $user = $existingUser ?? new User();
        $user->forceFill([
            'name' => $displayName,
            'email' => $invitationEmail,
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
            'is_active' => true,
            'deactivated_at' => null,
            'deactivated_reason' => null,
        ]);
        $user->save();

        $user->syncRoles([$invitation->role]);
        $this->linkInternProfileToUserIfNeeded($user, $invitation);

        $invitation->forceFill([
            'accepted_at' => now(),
        ])->save();

        return redirect()
            ->route('login')
            ->with('success', 'Cuenta creada correctamente.');
    }

    private function findValidInvitationOrFail(string $token): UserInvitation
    {
        $invitation = UserInvitation::query()
            ->where('token', $token)
            ->first();

        if (!$invitation) {
            abort(404, 'InvitaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n no encontrada.');
        }

        if ($invitation->accepted_at !== null) {
            abort(410, 'Esta invitaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n ya fue aceptada.');
        }

        if ($invitation->expires_at === null || $invitation->expires_at->isPast()) {
            abort(410, 'Esta invitaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n ha caducado.');
        }

        return $invitation;
    }

    public function destroyUser(User $user): RedirectResponse
    {
        if (request()->user()?->id === $user->id) {
            return back()->with('error', 'No puedes eliminar tu propio usuario.');
        }

        if ($user->hasRole('admin')) {
            return back()->with('error', 'No se puede eliminar una cuenta administradora.');
        }

        $user->delete();

        return back()->with('success', 'Usuario eliminado correctamente.');
    }

    private function linkInternProfileToUserIfNeeded(User $user, UserInvitation $invitation): void
    {
        if ($invitation->role !== 'intern') {
            return;
        }

        if ($invitation->intern_id !== null) {
            Intern::query()
                ->whereKey($invitation->intern_id)
                ->whereNull('user_id')
                ->first()
                ?->update([
                    'user_id' => $user->id,
                ]);

            return;
        }

        Intern::query()
                ->whereNull('user_id')
                ->whereRaw('LOWER(email) = ?', [mb_strtolower($user->email)])
                ->first()
                ?->update([
                    'user_id' => $user->id,
                ]);
    }

    private function resolveInvitationDisplayName(UserInvitation $invitation): string
    {
        $invitation->loadMissing('intern');

        if ($invitation->intern) {
            $fullName = trim(
                implode(' ', array_filter([
                    $invitation->intern->first_name,
                    $invitation->intern->last_name,
                ]))
            );

            if ($fullName !== '') {
                return $fullName;
            }
        }

        $emailLocalPart = trim((string) strstr($invitation->email, '@', true));

        if ($emailLocalPart !== '') {
            $normalized = str_replace(['.', '_', '-'], ' ', $emailLocalPart);
            $normalized = preg_replace('/\s+/', ' ', $normalized) ?? $normalized;

            return mb_convert_case(trim($normalized), MB_CASE_TITLE, 'UTF-8');
        }

        return 'Usuario';
    }
}

