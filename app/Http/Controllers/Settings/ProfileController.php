<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\Intern;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
