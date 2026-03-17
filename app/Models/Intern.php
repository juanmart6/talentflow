<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Intern extends Model
{
    /** @use HasFactory<\Database\Factories\InternFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'education_center_id',
        'first_name',
        'last_name',
        'dni_nie',
        'email',
        'phone',
        'address_line',
        'postal_code',
        'city',
        'province',
        'country',
        'training_cycle',
        'academic_year',
        'academic_tutor_name',
        'academic_tutor_email',
        'internship_start_date',
        'internship_end_date',
        'required_hours',
        'status',
        'abandonment_reason',
        'collaboration_agreement_path',
        'insurance_policy_path',
        'dni_scan_path',
    ];

    protected function casts(): array
    {
        return [
            'internship_start_date' => 'date',
            'internship_end_date' => 'date',
            'required_hours' => 'integer',
            'deleted_at' => 'datetime',
        ];
    }

    public function educationCenter(): BelongsTo
    {
        return $this->belongsTo(EducationCenter::class);
    }

    public function practiceTasks(): BelongsToMany
    {
        return $this->belongsToMany(PracticeTask::class, 'intern_practice_task')->withTimestamps();
    }
}
