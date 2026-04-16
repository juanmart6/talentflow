<?php

namespace App\Models;

use App\Notifications\ResetPasswordNotification;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable, HasRoles;

    public const PROTECTED_ADMIN_EMAIL = 'admin@talentflow.es';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'is_active',
        'deactivated_at',
        'deactivated_reason',
        'avatar_path',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
        'avatar_path',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var list<string>
     */
    protected $appends = [
        'avatar',
    ];

    /**
     * Guard name for Spatie roles/permissions.
     *
     * @var string
     */
    protected $guard_name = 'web';

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'is_active' => 'boolean',
            'deactivated_at' => 'datetime',
        ];
    }

    public function practiceTasksCreated(): HasMany
    {
        return $this->hasMany(PracticeTask::class, 'created_by_user_id');
    }

    public function timeClockEntriesEntered(): HasMany
    {
        return $this->hasMany(TimeClockEntry::class, 'entered_by_user_id');
    }

    public function hourSchedulesCreated(): HasMany
    {
        return $this->hasMany(InternHourSchedule::class, 'created_by_user_id');
    }

    public function absenceRequestsCreated(): HasMany
    {
        return $this->hasMany(InternAbsenceRequest::class, 'requested_by_user_id');
    }

    public function absenceRequestsReviewed(): HasMany
    {
        return $this->hasMany(InternAbsenceRequest::class, 'reviewed_by_user_id');
    }

    public function intern(): HasOne
    {
        return $this->hasOne(Intern::class);
    }

    public function sendPasswordResetNotification($token): void
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    public function getAvatarAttribute(): ?string
    {
        $avatarPath = $this->avatar_path;

        if (!is_string($avatarPath) || trim($avatarPath) === '') {
            return null;
        }

        if (Str::startsWith($avatarPath, ['http://', 'https://'])) {
            return $avatarPath;
        }

        return Storage::disk('public')->url($avatarPath);
    }

    public function isDeletionProtected(): bool
    {
        return mb_strtolower(trim((string) $this->email)) === self::PROTECTED_ADMIN_EMAIL;
    }
}
