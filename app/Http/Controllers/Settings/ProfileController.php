<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Intern;
use App\Models\User;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $newEmail = mb_strtolower(trim((string) $validated['email']));

        $linkedIntern = Intern::query()
            ->where('user_id', $request->user()->id)
            ->first(['id']);

        if ($linkedIntern !== null) {
            $emailTakenByAnotherIntern = Intern::query()
                ->whereKeyNot($linkedIntern->id)
                ->whereRaw('LOWER(email) = ?', [$newEmail])
                ->exists();

            if ($emailTakenByAnotherIntern) {
                return back()->withErrors([
                    'email' => 'Ese correo ya está en uso por otro becario.',
                ]);
            }
        }

        DB::transaction(function () use ($request, $validated, $newEmail, $linkedIntern): void {
            $request->user()->fill([
                'name' => $validated['name'],
                'email' => $newEmail,
            ]);
            $request->user()->save();

            if ($linkedIntern !== null) {
                $linkedIntern->update([
                    'email' => $newEmail,
                ]);
            }
        });

        return to_route('profile.edit');
    }

    /**
     * Update the user's profile avatar.
     */
    public function updateAvatar(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $user = $request->user();
        $newAvatarPath = $validated['avatar']->store("users/{$user->id}/avatar", 'public');
        $oldAvatarPath = $user->avatar_path;

        DB::transaction(function () use ($user, $newAvatarPath, $oldAvatarPath): void {
            $user->forceFill([
                'avatar_path' => $newAvatarPath,
            ])->save();

            if (is_string($oldAvatarPath) && $oldAvatarPath !== '' && $oldAvatarPath !== $newAvatarPath) {
                Storage::disk('public')->delete($oldAvatarPath);
            }
        });

        return back()->with('success', 'Foto de perfil actualizada correctamente.');
    }

    /**
     * Remove the user's profile avatar.
     */
    public function destroyAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();
        $oldAvatarPath = $user->avatar_path;

        if (!is_string($oldAvatarPath) || $oldAvatarPath === '') {
            return back()->with('info', 'No hay foto de perfil para eliminar.');
        }

        DB::transaction(function () use ($user, $oldAvatarPath): void {
            $user->forceFill([
                'avatar_path' => null,
            ])->save();

            Storage::disk('public')->delete($oldAvatarPath);
        });

        return back()->with('success', 'Foto de perfil eliminada correctamente.');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();
        DB::transaction(function () use ($user): void {
            if (Schema::hasTable('sessions') && Schema::hasColumn('sessions', 'user_id')) {
                DB::table('sessions')
                    ->where('user_id', $user->id)
                    ->delete();
            }

            User::query()
                ->whereKey($user->id)
                ->update([
                    'is_active' => false,
                    'deactivated_at' => now(),
                    'deactivated_reason' => 'self-service',
                    'remember_token' => null,
                ]);
        });

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/')->with('success', 'CUENTA ELIMINADA POR USUARIO');
    }
}
