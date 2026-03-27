<?php

namespace App\Http\Controllers;

use App\Exports\InternsExport;
use App\Http\Requests\Interns\StoreInternRequest;
use App\Http\Requests\Interns\UpdateInternRequest;
use App\Models\EducationCenter;
use App\Models\Intern;
use App\Models\TrainingProgram;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class InternController extends Controller
{
    // Listado de becarios con filtros y conteo por estado:
    public function index(Request $request): Response
    {
        $status = trim((string) $request->string('status')->toString());
        $search = trim((string) $request->string('search')->toString());
        $educationCenterId = $request->integer('education_center_id');
        $trainingProgramId = $request->integer('training_program_id');
        $startDateFrom = $request->string('start_date_from')->toString();
        $startDateTo = $request->string('start_date_to')->toString();
        $endDateFrom = $request->string('end_date_from')->toString();
        $endDateTo = $request->string('end_date_to')->toString();
        $baseQuery = $this->filteredBaseQuery($request);

        $statusSnapshot = (clone $baseQuery)
            ->get(['status', 'internship_start_date', 'internship_end_date']);

        $statusCounts = [
            'upcoming_active' => 0,
            'active' => 0,
            'finished' => 0,
            'abandoned' => 0,
        ];

        foreach ($statusSnapshot as $internStatusItem) {
            $resolvedStatus = $this->resolveInternStatus($internStatusItem);
            $statusCounts[$resolvedStatus] = ($statusCounts[$resolvedStatus] ?? 0) + 1;
        }

        $internsQuery = $this->applyStatusFilter(clone $baseQuery, $status);

        $interns = $internsQuery
            ->with(['educationCenter', 'trainingProgram'])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(10)
            ->through(function (Intern $intern): array {
                return [
                    'id' => $intern->id,
                    'first_name' => $intern->first_name,
                    'last_name' => $intern->last_name,
                    'dni_nie' => $intern->dni_nie,
                    'email' => $intern->email,
                    'phone' => $intern->phone,
                    'status' => $this->resolveInternStatus($intern),
                    'internship_start_date' => $intern->internship_start_date
                        ? Carbon::parse($intern->internship_start_date)->toDateString()
                        : null,
                    'internship_end_date' => $intern->internship_end_date
                        ? Carbon::parse($intern->internship_end_date)->toDateString()
                        : null,
                    'required_hours' => $intern->required_hours,
                    'education_center' => $intern->educationCenter ? [
                        'id' => $intern->educationCenter->id,
                        'name' => $intern->educationCenter->name,
                    ] : null,
                    'training_program' => $intern->trainingProgram ? [
                        'id' => $intern->trainingProgram->id,
                        'name' => $intern->trainingProgram->name,
                    ] : null,
                ];
            })
            ->withQueryString();

        return Inertia::render('interns', [
            'interns' => $interns,
            'statusCounts' => $statusCounts,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'education_center_id' => $educationCenterId,
                'training_program_id' => $trainingProgramId,
                'start_date_from' => $startDateFrom,
                'start_date_to' => $startDateTo,
                'end_date_from' => $endDateFrom,
                'end_date_to' => $endDateTo,
            ],
            'educationCenters' => EducationCenter::query()
                ->orderBy('name')
                ->get(['id', 'name']),
            'trainingPrograms' => TrainingProgram::query()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    // Exportación de becarios a Excel con filtros aplicados:
    public function export(Request $request): BinaryFileResponse
    {
        $status = trim((string) $request->string('status')->toString());

        $exportRows = $this->applyStatusFilter($this->filteredBaseQuery($request), $status)
            ->with('educationCenter')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get()
            ->map(fn (Intern $intern): array => [
                'Becario' => trim($intern->first_name.' '.$intern->last_name),
                'DNI/NIE' => $intern->dni_nie,
                'Centro' => $intern->educationCenter?->name ?? '-',
                'Fecha inicio' => $intern->internship_start_date
                    ? Carbon::parse($intern->internship_start_date)->toDateString()
                    : '-',
                'Fecha fin' => $intern->internship_end_date
                    ? Carbon::parse($intern->internship_end_date)->toDateString()
                    : '-',
                'Estado' => $this->internStatusLabel($this->resolveInternStatus($intern)),
            ]);

        return Excel::download(
            new InternsExport($exportRows),
            'interns.xlsx',
        );
    }

    // Consulta base para aplicar filtros de búsqueda, centro educativo y fechas:
    private function filteredBaseQuery(Request $request)
    {
        $search = trim((string) $request->string('search')->toString());
        $educationCenterId = $request->integer('education_center_id');
        $trainingProgramId = $request->integer('training_program_id');
        $startDateFrom = $request->string('start_date_from')->toString();
        $startDateTo = $request->string('start_date_to')->toString();
        $endDateFrom = $request->string('end_date_from')->toString();
        $endDateTo = $request->string('end_date_to')->toString();
        $legacyDateFrom = $request->string('date_from')->toString();
        $legacyDateTo = $request->string('date_to')->toString();

        return Intern::query()
            ->when($search !== '', function ($query) use ($search) {
                $normalizedSearch = '%'.$this->normalizeSearchTerm($search).'%';

                $query->where(function ($subQuery) use ($normalizedSearch) {
                    $subQuery
                        ->whereRaw($this->normalizedSqlField('first_name').' LIKE ?', [$normalizedSearch])
                        ->orWhereRaw($this->normalizedSqlField('last_name').' LIKE ?', [$normalizedSearch])
                        ->orWhereRaw($this->normalizedSqlField('dni_nie').' LIKE ?', [$normalizedSearch])
                        ->orWhereRaw($this->normalizedSqlField('email').' LIKE ?', [$normalizedSearch]);
                });
            })
            ->when($educationCenterId, fn ($query) => $query->where('education_center_id', $educationCenterId))
            ->when($trainingProgramId, fn ($query) => $query->where('training_program_id', $trainingProgramId))
            ->when($startDateFrom !== '', fn ($query) => $query->whereDate('internship_start_date', '>=', $startDateFrom))
            ->when($startDateTo !== '', fn ($query) => $query->whereDate('internship_start_date', '<=', $startDateTo))
            ->when($endDateFrom !== '', fn ($query) => $query->whereDate('internship_end_date', '>=', $endDateFrom))
            ->when($endDateTo !== '', fn ($query) => $query->whereDate('internship_end_date', '<=', $endDateTo))
            // Compatibilidad con enlaces/filtros legacy.
            ->when(
                $startDateFrom === '' && $startDateTo === '' && $endDateFrom === '' && $endDateTo === '',
                function ($query) use ($legacyDateFrom, $legacyDateTo) {
                    $query
                        ->when($legacyDateFrom !== '' && $legacyDateTo !== '', function ($legacyQuery) use ($legacyDateFrom, $legacyDateTo) {
                            $legacyQuery
                                ->whereDate('internship_start_date', '<=', $legacyDateTo)
                                ->whereDate('internship_end_date', '>=', $legacyDateFrom);
                        })
                        ->when($legacyDateFrom !== '' && $legacyDateTo === '', function ($legacyQuery) use ($legacyDateFrom) {
                            $legacyQuery->whereDate('internship_end_date', '>=', $legacyDateFrom);
                        })
                        ->when($legacyDateFrom === '' && $legacyDateTo !== '', function ($legacyQuery) use ($legacyDateTo) {
                            $legacyQuery->whereDate('internship_start_date', '<=', $legacyDateTo);
                        });
                }
            );
    }

    private function normalizeSearchTerm(string $value): string
    {
        return Str::ascii(mb_strtolower(trim($value)));
    }


    private function normalizedSqlField(string $field): string
    {
        // Postgres: normaliza acentos sin depender de extension unaccent.
        return "LOWER(TRANSLATE($field,"
            ."CHR(225)||CHR(224)||CHR(228)||CHR(226)||"
            ."CHR(233)||CHR(232)||CHR(235)||CHR(234)||"
            ."CHR(237)||CHR(236)||CHR(239)||CHR(238)||"
            ."CHR(243)||CHR(242)||CHR(246)||CHR(244)||"
            ."CHR(250)||CHR(249)||CHR(252)||CHR(251)||"
            ."CHR(241),"
            ."'aaaaeeeeiiiioooouuuun'))";
    }


    // Aplica filtro de estado a una consulta de becarios:
    private function applyStatusFilter($query, string $status)
    {
        if ($status === '' || $status === 'all') {
            return $query;
        }

        $today = now()->toDateString();

        return match ($status) {
            'abandoned' => $query->where('status', 'abandoned'),
            'upcoming_active' => $query
                ->where('status', '!=', 'abandoned')
                ->whereDate('internship_start_date', '>', $today),
            'finished' => $query
                ->where('status', '!=', 'abandoned')
                ->whereDate('internship_end_date', '<', $today),
            'active' => $query
                ->where('status', '!=', 'abandoned')
                ->whereDate('internship_start_date', '<=', $today)
                ->whereDate('internship_end_date', '>=', $today),
            default => $query,
        };
    }

    // Traduce el estado del becario a una etiqueta legible:
    private function internStatusLabel(string $status): string
    {
        return match ($status) {
            'upcoming_active' => 'Activo proximamente',
            'active' => 'Activo',
            'finished' => 'Finalizado',
            'abandoned' => 'Abandonado',
            default => $status,
        };
    }

    // Formulario de creación de becario:
    public function create(): Response
    {
        return Inertia::render('interns/form', [
            'mode' => 'create',
            'intern' => null,
            'documentHistory' => $this->emptyDocumentHistory(),
            'educationCenters' => $this->educationCenterOptions(),
        ]);
    }

    // Almacenamiento de nuevo becario:
    public function store(StoreInternRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $internPayload = collect($validated)->except([
            'collaboration_agreement_document',
            'insurance_policy_document',
            'dni_scan_document',
        ])->all();

        if (($internPayload['status'] ?? null) !== 'abandoned') {
            $internPayload['abandonment_reason'] = null;
            $internPayload['abandonment_date'] = null;
            $internPayload['status'] = $this->resolveAutomaticStatus(
                (string) $internPayload['internship_start_date'],
                (string) $internPayload['internship_end_date'],
            );
        }

        try {
            $intern = Intern::create($internPayload);

            $this->syncUploadedDocuments($request, $intern);
        } catch (QueryException $exception) {
            report($exception);

            $errorMessage = str_contains($exception->getMessage(), 'abandonment_date')
                ? 'Falta aplicar una migracion en la base de datos (columna abandonment_date). Ejecuta php artisan migrate y vuelve a intentarlo.'
                : 'No se pudo crear el becario. Intenta de nuevo más tarde.';

            return redirect()
                ->route('interns.index')
                ->with('error', $errorMessage);
        } catch (Throwable $exception) {
            report($exception);
            return redirect()
                ->route('interns.index')
                ->with('error', 'No se pudo crear el becario. Intenta de nuevo más tarde.');
        }

        return redirect()
            ->route('interns.index')
            ->with('success', 'Becario creado correctamente.');
    }

    // Formulario de edición de becario:
    public function edit(Intern $intern): Response
    {
        return Inertia::render('interns/form', [
            'mode' => 'edit',
            'intern' => $intern,
            'documentHistory' => $this->documentHistory($intern),
            'educationCenters' => $this->educationCenterOptions(),
        ]);
    }

    // Actualización de un becario:
    public function update(UpdateInternRequest $request, Intern $intern): RedirectResponse
    {
        $validated = $request->validated();
        $internPayload = collect($validated)->except([
            'collaboration_agreement_document',
            'insurance_policy_document',
            'dni_scan_document',
        ])->all();

        if (($internPayload['status'] ?? null) !== 'abandoned') {
            $internPayload['abandonment_reason'] = null;
            $internPayload['abandonment_date'] = null;
            $internPayload['status'] = $this->resolveAutomaticStatus(
                (string) $internPayload['internship_start_date'],
                (string) $internPayload['internship_end_date'],
            );
        }

        try {
            $intern->update($internPayload);

            $this->syncUploadedDocuments($request, $intern);
        } catch (QueryException $exception) {
            report($exception);

            $errorMessage = str_contains($exception->getMessage(), 'abandonment_date')
                ? 'Falta aplicar una migración en la base de datos (columna abandonment_date). Ejecuta php artisan migrate y vuelve a intentarlo.'
                : 'No se pudo actualizar el becario. Intenta de nuevo más tarde.';

            return redirect()
                ->route('interns.index')
                ->with('error', $errorMessage);
        } catch (Throwable $exception) {
            report($exception);
            return redirect()
                ->route('interns.index')
                ->with('error', 'No se pudo actualizar el becario. Intenta de nuevo más tarde.');
        }

        return redirect()
            ->route('interns.show', $intern)
            ->with('success', 'Becario actualizado correctamente.');
    }

    // Eliminación de un becario:
    public function destroy(Intern $intern): RedirectResponse
    {
        try {
            $intern->delete();
        } catch (Throwable $exception) {
            report($exception);
            return redirect()
                ->route('interns.index')
                ->with('error', 'No se pudo eliminar el becario. Intenta de nuevo más tarde.');
        }

        return redirect()
            ->route('interns.index')
            ->with('success', 'Becario eliminado correctamente.');
    }

    // Visualización de un becario:
    public function show(Intern $intern): Response
    {
        return Inertia::render('interns/form', [
            'mode' => 'show',
            'intern' => $intern,
            'documentHistory' => $this->documentHistory($intern),
            'educationCenters' => $this->educationCenterOptions(),
        ]);
    }

    // Vista previa de un documento de becario:
    public function previewDocument(Intern $intern, string $document, string $filename)
    {
        $path = $this->resolveDocumentPath($intern, $document, $filename);

        return response()->file(Storage::disk('public')->path($path));
    }

    // Descarga de un documento de becario:
    public function downloadDocument(Intern $intern, string $document, string $filename)
    {
        $path = $this->resolveDocumentPath($intern, $document, $filename);

        return response()->download(Storage::disk('public')->path($path), basename($path));
    }

    // Almacenamiento de un documento subido para un becario:
    private function storeInternDocument(UploadedFile $file, string $category, Intern $intern) : string
    {
        $directory = "interns/{$intern->id}/{$category}";

        return $file->store($directory, 'public');
    }

    // Sincroniza los documentos subidos en la solicitud con el becario, almacenándolos y actualizando las rutas en la base de datos:
    private function syncUploadedDocuments(Request $request, Intern $intern): void
    {
        $documentPaths = [];

        foreach ($this->documentDefinitions() as $document => $definition) {
            $requestField = $definition['request_field'];

            if (!$request->hasFile($requestField)) {
                continue;
            }

            $documentPaths[$definition['path_column']] = $this->storeInternDocument(
                $request->file($requestField),
                $definition['folder'],
                $intern,
            );
        }

        if (!empty($documentPaths)) {
            $intern->update($documentPaths);
            $intern->refresh();
        }
    }

    // Resuelve la ruta de un documento de becario para su visualización o descarga, validando su existencia y seguridad:
    private function resolveDocumentPath(Intern $intern, string $document, string $filename): string
    {
        $definition = $this->documentDefinitions()[$document] ?? null;

        if ($definition === null) {
            abort(404);
        }

        $safeFilename = basename($filename);

        if ($safeFilename !== $filename) {
            abort(404);
        }

        $path = "interns/{$intern->id}/{$definition['folder']}/{$safeFilename}";

        if (!Storage::disk('public')->exists($path)) {
            abort(404);
        }

        return $path;
    }

    // Obtiene el historial de documentos subidos para un becario, organizados por categoría y ordenados por fecha de subida:
    private function documentHistory(Intern $intern): array
    {
        $history = [];

        foreach ($this->documentDefinitions() as $document => $definition) {
            $directory = "interns/{$intern->id}/{$definition['folder']}";
            $files = Storage::disk('public')->exists($directory)
                ? Storage::disk('public')->files($directory)
                : [];

            usort($files, fn (string $a, string $b) => Storage::disk('public')->lastModified($b) <=> Storage::disk('public')->lastModified($a));

            $history[$document] = array_map(function (string $path) use ($intern, $document, $definition): array {
                $filename = basename($path);

                return [
                    'filename' => $filename,
                    'is_current' => $intern->{$definition['path_column']} === $path,
                    'preview_url' => URL::route('interns.documents.preview', [
                        'intern' => $intern->id,
                        'document' => $document,
                        'filename' => $filename,
                    ]),
                    'download_url' => URL::route('interns.documents.download', [
                        'intern' => $intern->id,
                        'document' => $document,
                        'filename' => $filename,
                    ]),
                    'uploaded_at' => Carbon::createFromTimestamp(Storage::disk('public')->lastModified($path))->toDateTimeString(),
                ];
            }, $files);
        }

        return $history;
    }

    // Genera una estructura vacía para el historial de documentos, útil para la vista cuando no hay documentos subidos:
    private function emptyDocumentHistory(): array
    {
        $history = [];

        foreach (array_keys($this->documentDefinitions()) as $document) {
            $history[$document] = [];
        }

        return $history;
    }

    private function educationCenterOptions(): array
    {
        return EducationCenter::query()
            ->with(['trainingPrograms:id,name'])
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (EducationCenter $center): array => [
                'id' => $center->id,
                'name' => $center->name,
                'training_programs' => $center->trainingPrograms
                    ->map(fn ($program): array => [
                        'id' => $program->id,
                        'name' => $program->name,
                    ])
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();
    }

    // Define las categorías de documentos para los becarios, incluyendo el campo de solicitud, la columna de ruta en la base de datos y la carpeta de almacenamiento:
    private function documentDefinitions(): array
    {
        return [
            'collaboration_agreement' => [
                'request_field' => 'collaboration_agreement_document',
                'path_column' => 'collaboration_agreement_path',
                'folder' => 'collaboration-agreement',
            ],
            'insurance_policy' => [
                'request_field' => 'insurance_policy_document',
                'path_column' => 'insurance_policy_path',
                'folder' => 'insurance-policy',
            ],
            'dni_scan' => [
                'request_field' => 'dni_scan_document',
                'path_column' => 'dni_scan_path',
                'folder' => 'dni-scan',
            ],
        ];
    }

    private function resolveInternStatus(Intern $intern): string
    {
        if ($intern->status === 'abandoned') {
            return 'abandoned';
        }

        return $this->resolveAutomaticStatus(
            (string) $intern->internship_start_date?->toDateString(),
            (string) $intern->internship_end_date?->toDateString(),
        );
    }

    private function resolveAutomaticStatus(string $startDate, string $endDate): string
    {
        $today = now()->toDateString();

        if ($startDate !== '' && $today < $startDate) {
            return 'upcoming_active';
        }

        if ($endDate !== '' && $today > $endDate) {
            return 'finished';
        }

        return 'active';
    }
}
