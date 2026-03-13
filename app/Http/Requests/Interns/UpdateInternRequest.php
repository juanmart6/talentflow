<?php

namespace App\Http\Requests\Interns;

use App\Concerns\InternValidationRules;
use App\Models\Intern;
use Illuminate\Foundation\Http\FormRequest;

class UpdateInternRequest extends FormRequest
{
    use InternValidationRules;
    
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        /** @var Intern|null $intern */
        $intern = $this->route('intern');

        return $this->internRules(ignoreInternId: $intern?->id);

    }

    public function messages(): array
    {
        return $this->internMessages();
    }
}