<?php

namespace App\Concerns;

use Illuminate\Validation\Rule;

trait EducationCenterValidationRules
{
    protected function educationCenterRules(?int $ignoreCenterId = null, bool $agreementPdfRequired = true): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:500'],
            'phone' => ['required', 'string', 'max:50'],
            'training_program_ids' => ['required', 'array', 'min:1'],
            'training_program_ids.*' => ['integer', Rule::exists('training_programs', 'id')],
            'institutional_email' => [
                'required',
                'email:rfc',
                'max:255',
                Rule::unique('education_centers', 'institutional_email')->ignore($ignoreCenterId),
            ],
            'website' => ['nullable', 'url', 'max:255'],

            'contact_name' => ['required', 'string', 'max:255'],
            'contact_position' => ['required', 'string', 'max:255'],
            'contact_phone' => ['required', 'string', 'max:50'],
            'contact_email' => ['required', 'email:rfc', 'max:255'],
            'general_notes' => ['nullable', 'string', 'max:5000'],

            'agreement_signed_at' => ['required', 'date'],
            'agreement_expires_at' => ['required', 'date', 'after_or_equal:agreement_signed_at'],
            'agreement_agreed_slots' => ['required', 'integer', 'min:1'],
            'agreement_pdf' => [
                $agreementPdfRequired ? 'required' : 'nullable',
                'file',
                'mimes:pdf',
                'max:10240',
            ],
        ];
    }
    
    protected function educationCenterMessages(): array
    {
        return [
            'institutional_email.unique' => 'Ya existe un centro con ese email.',
            'training_program_ids.required' => 'Selecciona al menos un grado formativo.',
            'training_program_ids.min' => 'Selecciona al menos un grado formativo.',
            'training_program_ids.*.exists' => 'Uno de los grados seleccionados no es valido.',
            'agreement_expires_at.after_or_equal' => 'La fecha de vencimiento debe ser igual o posterior a la fecha de firma.',
            'agreement_agreed_slots.min' => 'Las plazas acordadas deben ser al menos 1.',
            'agreement_pdf.mimes' => 'El documento del convenio debe ser un archivo PDF.',
            'agreement_pdf.max' => 'El PDF del convenio no puede superar los 10 MB.',
        ];
    }
}
