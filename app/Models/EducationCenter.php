<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class EducationCenter extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'address',
        'phone',
        'institutional_email',
        'website',
        'contact_name',
        'contact_position',
        'contact_phone',
        'contact_email',
    ];

    public function collaborationAgreements(): HasMany
    {
        return $this->hasMany(\App\Models\CollaborationAgreement::class);
    }

    public function latestCollaborationAgreement(): HasOne
    {
        return $this->hasOne(\App\Models\CollaborationAgreement::class)->latestOfMany('signed_at');
    }

    public function interns(): HasMany
    {
        return $this->hasMany('App\\Models\\Intern');
    }
}
