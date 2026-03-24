<?php

namespace App\Http\Requests\PracticeTasks;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePracticeTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('practice-tasks.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'practice_type' => ['required', Rule::in(['development', 'test', 'live_activity'])],
            'status' => ['nullable', Rule::in(['pending', 'in_progress', 'in_review', 'completed'])],
            'assignment_mode' => ['required', Rule::in(['interns', 'training_program'])],
            'training_program_id' => ['required_if:assignment_mode,training_program', 'nullable', 'integer', 'exists:training_programs,id'],
            'due_at' => ['nullable', 'date'],
            'intern_ids' => ['required_if:assignment_mode,interns', 'nullable', 'array', 'min:1'],
            'intern_ids.*' => ['integer', 'exists:interns,id'],
            'attachments' => ['nullable', 'array'],
            'attachments.*' => ['file', 'max:5120', 'mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx,ppt,pptx,txt'],
        ];
    }
}
