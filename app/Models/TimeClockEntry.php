<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Model;

class TimeClockEntry extends Model
{
    protected $fillable = [
        'intern_id',
        'entered_by_user_id',
        'source',
        'started_at',
        'ended_at',
        'break_started_at',
        'break_minutes',
        'manual_reason',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'break_started_at' => 'datetime',
            'break_minutes' => 'integer',
        ];
    }

    public function intern(): BelongsTo
    {
        return $this->belongsTo(Intern::class);
    }

    public function enteredBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'entered_by_user_id');
    }
}
