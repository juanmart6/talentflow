<?php

namespace App\Concerns;

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
                'email:rfc,dns',
                'max:255',
                Rule::unique('interns', 'email')->ignore($ignoreInternId),
            ],
            'phone' => ['required', 'string', 'max:50'],
            'address_line' => ['required', 'string', 'max:500'],
            'postal_code' => ['required', 'string', 'max:20'],
            'city' => ['required', 'string', 'max:255'],
            'province' => ['required', 'string', 'max:255'],
            'country' => ['required', 'string', 'max:100'],

            'training_cycle' => ['required', 'string', 'max:255'],
            'academic_year' => ['required', 'string', 'max:20'],
            'academic_tutor_name' => ['required', 'string', 'max:255'],
            'academic_tutor_email' => ['nullable', 'email:rfc,dns', 'max:255'],

            'internship_start_date' => ['required', 'date'],
            'internship_end_date' => ['required', 'date', 'after_or_equal:internship_start_date'],
            'required_hours' => ['required', 'integer', 'min:1'],

            'status' => ['required', Rule::in(['active', 'finished', 'abandoned'])],
            'abandonment_reason' => ['nullable', 'string', 'max:1000'],
        ];
    }
    
    protected function internMessages(): array
    {
        return [
            'dni_nie.regex' => 'El formato de DNI/NIE no es válido.',
            'dni_nie.unique' => 'Ya existe un becario con ese DNI/NIE.',
            'email.unique' => 'Ya existe un becario con ese email.',
            'internship_end_date.after_or_equal' => 'La fecha de finalización debe ser igual o posterior a la fecha de inicio.',
            'required_hours.min' => 'Las horas requeridas deben ser al menos 1.',
            'status.in' => 'El estado debe ser Activo, Finalizado o Abandonado.',
        ];
    }
}
