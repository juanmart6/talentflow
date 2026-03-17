<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PracticeTaskComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'practice_task_id',
        'created_by',
        'body',
        'is_feedback',
    ];

    protected function casts(): array
    {
        return [
            'is_feedback' => 'boolean',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(PracticeTask::class, 'practice_task_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
