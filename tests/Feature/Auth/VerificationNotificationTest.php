<?php

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;

test('verification notification route is disabled', function () {
    expect(Route::has('verification.send'))->toBeFalse();
});

test('changing profile email does not send verification notification', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->actingAs($user)->patch(route('profile.update'), [
        'name' => 'User Updated',
        'email' => 'updated@example.com',
    ])->assertRedirect(route('profile.edit'));

    Notification::assertNotSentTo($user, VerifyEmail::class);
});
