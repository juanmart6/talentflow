<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class InternHourSchedule extends Model
{
    protected $fillable = [
        'intern_id',
        'created_by_user_id',
        'season_name',
        'starts_on',
        'ends_on',
        'is_active',
        'monday_minutes',
        'tuesday_minutes',
        'wednesday_minutes',
        'thursday_minutes',
        'friday_minutes',
        'saturday_minutes',
        'sunday_minutes',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'is_active' => 'boolean',
            'monday_minutes' => 'integer',
            'tuesday_minutes' => 'integer',
            'wednesday_minutes' => 'integer',
            'thursday_minutes' => 'integer',
            'friday_minutes' => 'integer',
            'saturday_minutes' => 'integer',
            'sunday_minutes' => 'integer',
        ];
    }

    public function intern(): BelongsTo
    {
        return $this->belongsTo(Intern::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
