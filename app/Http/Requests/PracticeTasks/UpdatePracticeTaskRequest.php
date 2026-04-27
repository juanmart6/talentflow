<?php

namespace App\Http\Requests\PracticeTasks;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePracticeTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('practice-tasks.update') ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', Rule::in(['pending', 'in_progress', 'in_review', 'completed'])],
            'due_at' => ['nullable', 'date'],
        ];
    }
}
