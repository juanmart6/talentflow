<?php

namespace App\Http\Controllers;

use App\Exports\InternsExport;
use App\Http\Requests\Interns\StoreInternRequest;
use App\Http\Requests\Interns\UpdateInternRequest;
use App\Models\EducationCenter;
use App\Models\Intern;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class InternController extends Controller
{
    public function index(Request $request): Response
    {
        $status = trim((string) $request->string('status')->toString());
        $search = trim((string) $request->string('search')->toString());
        $educationCenterId = $request->integer('education_center_id');
        $date_from = $request->string('date_from')->toString();
        $date_to = $request->string('date_to')->toString();
        $baseQuery = $this->filteredBaseQuery($request);

        $statusCountsRaw = (clone $baseQuery)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $statusCounts = [
            'active' => (int) ($statusCountsRaw['active'] ?? 0),
            'finished' => (int) ($statusCountsRaw['finished'] ?? 0),
            'abandoned' => (int) ($statusCountsRaw['abandoned'] ?? 0),
        ];

        $internsQuery = $this->applyStatusFilter(clone $baseQuery, $status);

        $interns = $internsQuery
            ->with('educationCenter')
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
                    'status' => $intern->status,
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
                'date_from' => $date_from,
                'date_to' => $date_to,
            ],
            'educationCenters' => EducationCenter::query()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

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
                'Fecha inicio' => $intern->internship_start_date?->toDateString() ?? '-',
                'Fecha fin' => $intern->internship_end_date?->toDateString() ?? '-',
                'Estado' => $this->internStatusLabel($intern->status),
            ]);

        return Excel::download(
            new InternsExport($exportRows),
            'interns.xlsx',
        );
    }

    private function filteredBaseQuery(Request $request)
    {
        $search = trim((string) $request->string('search')->toString());
        $educationCenterId = $request->integer('education_center_id');
        $date_from = $request->string('date_from')->toString();
        $date_to = $request->string('date_to')->toString();

        return Intern::query()
            ->when($search !== '', function ($query) use ($search) {
                $normalizedSearch = '%'.mb_strtolower($search).'%';

                $query->where(function ($subQuery) use ($normalizedSearch) {
                    $subQuery
                        ->whereRaw('LOWER(first_name) LIKE ?', [$normalizedSearch])
                        ->orWhereRaw('LOWER(last_name) LIKE ?', [$normalizedSearch])
                        ->orWhereRaw('LOWER(dni_nie) LIKE ?', [$normalizedSearch])
                        ->orWhereRaw('LOWER(email) LIKE ?', [$normalizedSearch]);
                });
            })
            ->when($educationCenterId, fn ($query) => $query->where('education_center_id', $educationCenterId))
            ->when($date_from !== '' && $date_to !== '', function ($query) use ($date_from, $date_to) {
                $query
                    ->whereDate('internship_start_date', '<=', $date_to)
                    ->whereDate('internship_end_date', '>=', $date_from);
            })
            ->when($date_from !== '' && $date_to === '', function ($query) use ($date_from) {
                $query->whereDate('internship_end_date', '>=', $date_from);
            })
            ->when($date_from === '' && $date_to !== '', function ($query) use ($date_to) {
                $query->whereDate('internship_start_date', '<=', $date_to);
            });
    }

    private function applyStatusFilter($query, string $status)
    {
        return $query->when($status !== '', fn ($query) => $query->where('status', $status));
    }

    private function internStatusLabel(string $status): string
    {
        return match ($status) {
            'active' => 'Activo',
            'finished' => 'Finalizado',
            'abandoned' => 'Abandonado',
            default => $status,
        };
    }

    public function create(): Response
    {
        return Inertia::render('interns/form', [
            'mode' => 'create',
            'intern' => null,
            'documentHistory' => $this->emptyDocumentHistory(),
            'educationCenters' => EducationCenter::query()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function store(StoreInternRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        $intern = Intern::create(collect($validated)->except([
            'collaboration_agreement_document',
            'insurance_policy_document',
            'dni_scan_document',
        ])->all());

        $this->syncUploadedDocuments($request, $intern);

        return redirect()
            ->route('interns.show', $intern)
            ->with('success', 'Becario creado correctamente.');
    }

    public function edit(Intern $intern): Response
    {
        return Inertia::render('interns/form', [
            'mode' => 'edit',
            'intern' => $intern,
            'documentHistory' => $this->documentHistory($intern),
            'educationCenters' => EducationCenter::query()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function update(UpdateInternRequest $request, Intern $intern): RedirectResponse
    {
        $validated = $request->validated();

        $intern->update(collect($validated)->except([
            'collaboration_agreement_document',
            'insurance_policy_document',
            'dni_scan_document',
        ])->all());

        $this->syncUploadedDocuments($request, $intern);

        return redirect()
            ->route('interns.show', $intern)
            ->with('success', 'Becario actualizado correctamente.');
    }

    public function destroy(Intern $intern): RedirectResponse
    {
        $intern->delete();

        return redirect()
            ->route('interns.index')
            ->with('success', 'Becario eliminado correctamente.');
    }

    public function show(Intern $intern): Response
    {
        return Inertia::render('interns/form', [
            'mode' => 'show',
            'intern' => $intern,
            'documentHistory' => $this->documentHistory($intern),
            'educationCenters' => EducationCenter::query()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function previewDocument(Intern $intern, string $document, string $filename)
    {
        $path = $this->resolveDocumentPath($intern, $document, $filename);

        return response()->file(Storage::disk('public')->path($path));
    }

    public function downloadDocument(Intern $intern, string $document, string $filename)
    {
        $path = $this->resolveDocumentPath($intern, $document, $filename);

        return response()->download(Storage::disk('public')->path($path), basename($path));
    }

    private function storeInternDocument(UploadedFile $file, string $category, Intern $intern) : string
    {
        $directory = "interns/{$intern->id}/{$category}";

        return $file->store($directory, 'public');
    }

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

    private function emptyDocumentHistory(): array
    {
        $history = [];

        foreach (array_keys($this->documentDefinitions()) as $document) {
            $history[$document] = [];
        }

        return $history;
    }

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
}
