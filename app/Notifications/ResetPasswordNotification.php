<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends BaseResetPassword
{
    public function toMail($notifiable): MailMessage
    {
        $resetUrl = $this->resetUrl($notifiable);
        $passwordsConfigKey = (string) config('auth.defaults.passwords');
        $expiresMinutes = (int) config("auth.passwords.{$passwordsConfigKey}.expire", 60);

        return (new MailMessage)
            ->subject('Restablecer contraseña en TalentFlow')
            ->view('emails.reset-password', [
                'resetUrl' => $resetUrl,
                'email' => $notifiable->email,
                'expiresMinutes' => $expiresMinutes,
            ]);
    }
}

