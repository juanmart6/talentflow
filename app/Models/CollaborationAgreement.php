<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CollaborationAgreement extends Model
{
    use HasFactory;

    protected $fillable = [
        'education_center_id',
        'signed_at',
        'expires_at',
        'agreed_slots',
        'pdf_path',
    ];

    public function educationCenter(): BelongsTo
    {
        return $this->belongsTo(EducationCenter::class);
    }

    protected function casts(): array
    {
        return [
            'signed_at' => 'date',
            'expires_at' => 'date',
        ];
    }
}