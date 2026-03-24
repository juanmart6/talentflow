<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TrainingProgram extends Model
{
    protected $fillable = [
        'name',
    ];

    public function educationCenters(): BelongsToMany
    {
        return $this->belongsToMany(
            EducationCenter::class,
            'education_center_training_program',
            'training_program_id',
            'education_center_id',
        )->withTimestamps();
    }

    public function interns(): HasMany
    {
        return $this->hasMany(Intern::class);
    }
}
