<?php

namespace App\Http\Requests\EducationCenters;

use App\Concerns\EducationCenterValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreEducationCenterRequest extends FormRequest
{
    use EducationCenterValidationRules;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return $this->educationCenterRules(agreementPdfRequired: true);
    }

    public function messages(): array
    {
        return $this->educationCenterMessages();
    }
}
