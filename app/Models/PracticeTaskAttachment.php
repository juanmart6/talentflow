<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PracticeTaskAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'practice_task_id',
        'created_by',
        'attachment_kind',
        'file_name',
        'file_path',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(PracticeTask::class, 'practice_task_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
