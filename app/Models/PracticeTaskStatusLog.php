<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PracticeTaskStatusLog extends Model
{
    protected $fillable = [
        'practice_task_id',
        'from_status',
        'to_status',
        'changed_by_user_id',
        'changed_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'changed_at' => 'datetime',
        ];
    }

    public function practiceTask(): BelongsTo
    {
        return $this->belongsTo(PracticeTask::class);
    }

    public function changedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
