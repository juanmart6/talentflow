<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;

class EducationCentersExport implements FromCollection, ShouldAutoSize, WithHeadings
{
    public function __construct(private readonly Collection $rows) {}

    public function collection(): Collection
    {
        return $this->rows->map(fn (array $row): array => array_values($row));
    }

    public function headings(): array
    {
        $firstRow = $this->rows->first();

        return $firstRow ? array_keys($firstRow) : [
            'Centro',
            'Email institucional',
            'Telefono',
            'Contacto',
            'Cargo contacto',
            'Firma convenio',
            'Vence convenio',
            'Plazas',
            'Estado',
        ];
    }
}
