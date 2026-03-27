<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PracticeTaskMessage extends Model
{
    protected $fillable = [
        'practice_task_id',
        'author_id',
        'author_role',
        'body',
    ];

    public function practiceTask(): BelongsTo
    {
        return $this->belongsTo(PracticeTask::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}

