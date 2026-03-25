<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PracticeTaskAttachment extends Model
{
    protected $fillable = [
        'practice_task_id',
        'uploader_id',
        'category',
        'original_name',
        'path',
        'mime',
        'size',
    ];

    protected function casts(): array
    {
        return [
            'size' => 'integer',
        ];
    }

    public function practiceTask(): BelongsTo
    {
        return $this->belongsTo(PracticeTask::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploader_id');
    }
}

