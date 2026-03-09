<?php

namespace App\Http\Requests\Interns;

use App\Concerns\InternValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class StoreInternRequest extends FormRequest
{
    use InternValidationRules;
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return $this->internRules();
    }

    public function messages(): array
    {
        return $this->internMessages();
    }
}
