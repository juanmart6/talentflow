<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PracticeTask extends Model
{
    use HasFactory;

    protected $fillable = [
        'practice_task_type_id',
        'created_by',
        'title',
        'description',
        'status',
        'priority',
        'due_at',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
        ];
    }

    public function type(): BelongsTo
    {
        return $this->belongsTo(PracticeTaskType::class, 'practice_task_type_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function interns(): BelongsToMany
    {
        return $this->belongsToMany(Intern::class, 'intern_practice_task')->withTimestamps();
    }

    public function comments(): HasMany
    {
        return $this->hasMany(PracticeTaskComment::class)->latest();
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(PracticeTaskAttachment::class)->latest();
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(PracticeTaskStatusHistory::class)->latest();
    }
}
