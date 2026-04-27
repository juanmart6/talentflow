<?php

use Illuminate\Support\Facades\Route;

test('public registration routes are disabled', function () {
    expect(Route::has('register'))->toBeFalse();
    expect(Route::has('register.store'))->toBeFalse();
});

test('new users cannot self-register publicly', function () {
    $this->post('/register', [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ])->assertNotFound();

    $this->assertGuest();
});
