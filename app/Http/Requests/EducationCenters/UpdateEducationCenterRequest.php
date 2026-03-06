<?php

namespace App\Http\Requests\EducationCenters;

use App\Concerns\EducationCenterValidationRules;
use App\Models\EducationCenter;
use Illuminate\Foundation\Http\FormRequest;

class UpdateEducationCenterRequest extends FormRequest
{
    use EducationCenterValidationRules;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $educationCenter = $this->route('educationCenter');

        return $this->educationCenterRules(
            ignoreCenterId: $educationCenter?->id,
            agreementPdfRequired: false,
        );
    }

    public function messages(): array
    {
        return $this->educationCenterMessages();
    }
}
