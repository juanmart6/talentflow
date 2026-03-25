<?php

namespace App\Concerns;

use App\Models\CollaborationAgreement;
use Illuminate\Validation\Rule;

trait InternValidationRules
{
    protected function internRules(?int $ignoreInternId = null): array
    {
        return [
            'education_center_id' => ['required', 'exists:education_centers,id'],
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'dni_nie' => [
                'required',
                'string',
                'max:20',
                'regex:/^([XYZxyz]\\d{7}[A-Za-z]|\\d{8}[A-Za-z])$/',
                Rule::unique('interns', 'dni_nie')->ignore($ignoreInternId),
            ],
            'email' => [
                'required',
                'email:rfc',
                'max:255',
                Rule::unique('interns', 'email')->ignore($ignoreInternId),
            ],
            'phone' => ['required', 'string', 'max:50'],
            'address_line' => ['required', 'string', 'max:500'],
            'postal_code' => ['required', 'string', 'max:20'],
            'city' => ['required', 'string', 'max:255'],
            'province' => ['required', 'string', 'max:255'],
            'country' => ['required', 'string', 'max:100'],

            'training_program_id' => [
                'required',
                'integer',
                Rule::exists('training_programs', 'id'),
                Rule::exists('education_center_training_program', 'training_program_id')
                    ->where(fn ($query) => $query->where('education_center_id', $this->input('education_center_id'))),
            ],
            'academic_year' => ['required', 'string', 'max:20'],
            'academic_tutor_name' => ['required', 'string', 'max:255'],
            'academic_tutor_email' => ['nullable', 'email:rfc', 'max:255'],

            'internship_start_date' => ['required', 'date'],
            'internship_end_date' => [
                'required',
                'date',
                'after_or_equal:internship_start_date',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $educationCenterId = (int) $this->input('education_center_id');
                    $startDate = $this->input('internship_start_date');
                    $endDate = $this->input('internship_end_date');

                    if ($educationCenterId <= 0 || !$startDate || !$endDate) {
                        return;
                    }

                    $isWithinAgreementRange = CollaborationAgreement::query()
                        ->where('education_center_id', $educationCenterId)
                        ->whereDate('signed_at', '<=', $startDate)
                        ->whereDate('expires_at', '>=', $endDate)
                        ->exists();

                    if (!$isWithinAgreementRange) {
                        $fail('Las fechas de practicas deben estar dentro del periodo de un convenio del centro educativo.');
                    }
                },
            ],
            'required_hours' => ['required', 'integer', 'min:1'],

            'status' => ['required', Rule::in(['active', 'abandoned'])],
            'abandonment_reason' => ['nullable', 'string', 'max:1000'],
            'abandonment_date' => ['required_if:status,abandoned', 'nullable', 'date', 'after_or_equal:internship_start_date'],
            'general_notes' => ['nullable', 'string', 'max:5000'],

            'collaboration_agreement_document' => ['nullable', 'file', 'mimes:pdf,jpeg,jpg,png', 'max:5120'],
            'insurance_policy_document' => ['nullable', 'file', 'mimes:pdf,jpeg,jpg,png', 'max:5120'],
            'dni_scan_document' => ['nullable', 'file', 'mimes:pdf,jpeg,jpg,png', 'max:5120'],
        ];
    }

    protected function internMessages(): array
    {
        return [
            'dni_nie.regex' => 'El formato de DNI/NIE no es valido.',
            'dni_nie.unique' => 'Ya existe un becario con ese DNI/NIE.',
            'email.unique' => 'Ya existe un becario con ese email.',
            'training_program_id.required' => 'Selecciona un grado formativo.',
            'training_program_id.exists' => 'El grado formativo seleccionado no es valido para el centro elegido.',
            'internship_end_date.after_or_equal' => 'La fecha de finalizacion debe ser igual o posterior a la fecha de inicio.',
            'required_hours.min' => 'Las horas requeridas deben ser al menos 1.',
            'status.in' => 'El estado debe ser Automatico o Abandonado.',
            'abandonment_date.required_if' => 'La fecha de abandono es obligatoria cuando el estado es Abandonado.',
            'abandonment_date.after_or_equal' => 'La fecha de abandono debe ser igual o posterior a la fecha de inicio.',

            'collaboration_agreement_document.mimes' => 'El convenio debe ser un archivo PDF, JPEG, JPG o PNG.',
            'insurance_policy_document.mimes' => 'El seguro debe ser un archivo PDF, JPEG, JPG o PNG.',
            'dni_scan_document.mimes' => 'El DNI escaneado debe ser un archivo PDF, JPEG, JPG o PNG.',

            'collaboration_agreement_document.max' => 'El archivo no puede superar los 5MB.',
            'insurance_policy_document.max' => 'El archivo no puede superar los 5MB.',
            'dni_scan_document.max' => 'El archivo no puede superar los 5MB.',
        ];
    }
}
