<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PracticeTask extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'status',
        'assignment_mode',
        'training_program_id',
        'due_at',
        'created_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'date',
            'deleted_at' => 'datetime',
        ];
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function trainingProgram(): BelongsTo
    {
        return $this->belongsTo(TrainingProgram::class);
    }

    public function interns(): BelongsToMany
    {
        return $this->belongsToMany(Intern::class, 'practice_task_intern')
            ->withPivot('assigned_at');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(PracticeTaskMessage::class);
    }

    public function taskAttachments(): HasMany
    {
        return $this->hasMany(PracticeTaskAttachment::class);
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(PracticeTaskStatusLog::class);
    }

    public function latestStatusLog(): HasOne
    {
        return $this->hasOne(PracticeTaskStatusLog::class)->latestOfMany('changed_at');
    }
}
