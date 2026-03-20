<?php

namespace App\Http\Controllers;

use App\Exports\EducationCentersExport;
use App\Http\Requests\EducationCenters\StoreEducationCenterRequest;
use App\Http\Requests\EducationCenters\UpdateEducationCenterRequest;
use App\Models\CollaborationAgreement;
use App\Models\EducationCenter;
use App\Models\Intern;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;
use Inertia\Inertia;
use Inertia\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class EducationCenterController extends Controller
{
    // Lista y filtrado de centros educativos:
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search')->toString());
        $agreementStatus = $request->string('agreement_status')->toString();
        $today = now()->startOfDay();
        $renewalLimit = now()->addDays(30)->startOfDay();

        $baseQuery = $this->filteredBaseQuery($request);

        $summaryCenters = (clone $baseQuery)
            ->with('latestCollaborationAgreement')
            ->get(['id']);

        $summaryCounts = [
            'total' => $summaryCenters->count(),
            'renewal_soon' => $summaryCenters
                ->filter(function (EducationCenter $center) use ($today, $renewalLimit): bool {
                    $expiresAt = $center->latestCollaborationAgreement?->expires_at;

                    return $expiresAt !== null
                        && $today->lte($expiresAt)
                        && $renewalLimit->gte($expiresAt);
                })
                ->count(),
            'without_agreement' => $summaryCenters
                ->filter(fn (EducationCenter $center): bool => $center->latestCollaborationAgreement === null)
                ->count(),
        ];

        $centers = (clone $baseQuery)
            ->with('latestCollaborationAgreement')
            ->withCount('collaborationAgreements')
            ->orderBy('name')
            ->paginate(10)
            ->through(function (EducationCenter $center): array {
                $status = $this->resolveCenterStatus($center->latestCollaborationAgreement);
                return [
                    'id' => $center->id,
                    'name' => $center->name,
                    'address' => $center->address,
                    'phone' => $center->phone,
                    'institutional_email' => $center->institutional_email,
                    'contact_name' => $center->contact_name,
                    'contact_position' => $center->contact_position,
                    'collaboration_agreements_count' => $center->collaboration_agreements_count,
                    'latest_agreement' => $center->latestCollaborationAgreement ? [
                        'signed_at' => $center->latestCollaborationAgreement->signed_at?->toDateString(),
                        'expires_at' => $center->latestCollaborationAgreement->expires_at?->toDateString(),
                        'agreed_slots' => $center->latestCollaborationAgreement->agreed_slots,
                        'pdf_path' => $center->latestCollaborationAgreement->pdf_path,
                    ] : null,
                    'status' => $status,
                ];
            })
            ->withQueryString();

        return Inertia::render('education-centers', [
            'centers' => $centers,
            'summaryCounts' => $summaryCounts,
            'filters' => [
                'search' => $search,
                'agreement_status' => $agreementStatus,
            ],
        ]);
    }

    // Exportación de centros educativos a Excel:
    public function export(Request $request): BinaryFileResponse
    {
        $rows = $this->filteredBaseQuery($request)
            ->with('latestCollaborationAgreement')
            ->orderBy('name')
            ->get()
            ->map(function (EducationCenter $center): array {
                return [
                    'Centro' => $center->name,
                    'Email institucional' => $center->institutional_email,
                    'Telefono' => $center->phone,
                    'Contacto' => $center->contact_name,
                    'Cargo contacto' => $center->contact_position,
                    'Firma convenio' => $center->latestCollaborationAgreement?->signed_at?->toDateString() ?? '-',
                    'Vence convenio' => $center->latestCollaborationAgreement?->expires_at?->toDateString() ?? '-',
                    'Plazas' => $center->latestCollaborationAgreement?->agreed_slots ?? '-',
                    'Estado' => $this->centerStatusLabel($this->resolveCenterStatus($center->latestCollaborationAgreement)),
                ];
            });

        return Excel::download(
            new EducationCentersExport($rows),
            'education-centers.xlsx',
        );
    }

    // Creación de nuevo centro educativo:
    public function create(): Response
    {
        return Inertia::render('education-centers/form', [
            'mode' => 'create',
            'center' => null,
            'agreementHistory' => [],
        ]);
    }

    // Almacenamiento de nuevo centro educativo:
    public function store(StoreEducationCenterRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        try {
            DB::transaction(function () use ($request, $validated): void {
                $center = EducationCenter::create([
                    'name' => $validated['name'],
                    'address' => $validated['address'],
                    'phone' => $validated['phone'],
                    'institutional_email' => $validated['institutional_email'],
                    'website' => $validated['website'] ?? null,
                    'contact_name' => $validated['contact_name'],
                    'contact_position' => $validated['contact_position'],
                    'contact_phone' => $validated['contact_phone'],
                    'contact_email' => $validated['contact_email'],
                ]);

                $agreementPdfPath = $request->file('agreement_pdf')
                    ->store('education-centers/agreements', 'public');

                CollaborationAgreement::create([
                    'education_center_id' => $center->id,
                    'signed_at' => $validated['agreement_signed_at'],
                    'expires_at' => $validated['agreement_expires_at'],
                    'agreed_slots' => $validated['agreement_agreed_slots'],
                    'pdf_path' => $agreementPdfPath,
                ]);
            });
        } catch (Throwable $exception) {
            report($exception);
            return redirect()
                ->route('education-centers.index')
                ->with('error', 'No se pudo crear el centro educativo. Inténtalo de nuevo más tarde.');
        }

        return redirect()
            ->route('education-centers.index')
            ->with('success', 'Centro educativo creado correctamente.');
    }

    // Visualización de un centro educativo:
    public function show(EducationCenter $educationCenter): Response
    {
        $latestAgreement = $educationCenter
            ->collaborationAgreements()
            ->latest('signed_at')
            ->first();
 
        $internsHistory = $educationCenter
            ->interns()
            ->withTrashed()
            ->orderByDesc('internship_start_date')
            ->orderByDesc('id')
            ->get()
            ->map(fn ($intern) : array => [
                    'id' => $intern->id,
                    'first_name' => $intern->first_name,
                    'last_name' => $intern->last_name,
                    'dni_nie' => $intern->dni_nie,
                    'email' => $intern->email,
                    'phone' => $intern->phone,
                    'status' => $intern->status,
                    'internship_start_date' => $intern->internship_start_date?->toDateString(),
                    'internship_end_date' => $intern->internship_end_date?->toDateString(),
                    'deleted_at' => $intern->deleted_at?->toDateTimeString(),
                ])
                ->values();

        return Inertia::render('education-centers/form', [
            'mode' => 'show',
            'center' => [
                'id' => $educationCenter->id,
                'name' => $educationCenter->name,
                'address' => $educationCenter->address,
                'phone' => $educationCenter->phone,
                'institutional_email' => $educationCenter->institutional_email,
                'website' => $educationCenter->website,
                'contact_name' => $educationCenter->contact_name,
                'contact_position' => $educationCenter->contact_position,
                'contact_phone' => $educationCenter->contact_phone,
                'contact_email' => $educationCenter->contact_email,
                'agreement_signed_at' => $latestAgreement?->signed_at?->toDateString(),
                'agreement_expires_at' => $latestAgreement?->expires_at?->toDateString(),
                'agreement_agreed_slots' => $latestAgreement?->agreed_slots,
                'agreement_pdf_path' => $latestAgreement?->pdf_path ? Storage::url($latestAgreement->pdf_path) : null,
            ],
            'agreementHistory' => $this->agreementHistory($educationCenter),
            'internsHistory' => $internsHistory,
        ]);
    }

    // Edición de un centro educativo:
    public function edit(EducationCenter $educationCenter): Response
    {
        $latestAgreement = $educationCenter
            ->collaborationAgreements()
            ->latest('signed_at')
            ->first();

        return Inertia::render('education-centers/form', [
            'mode' => 'edit',
            'center' => [
                'id' => $educationCenter->id,
                'name' => $educationCenter->name,
                'address' => $educationCenter->address,
                'phone' => $educationCenter->phone,
                'institutional_email' => $educationCenter->institutional_email,
                'website' => $educationCenter->website,
                'contact_name' => $educationCenter->contact_name,
                'contact_position' => $educationCenter->contact_position,
                'contact_phone' => $educationCenter->contact_phone,
                'contact_email' => $educationCenter->contact_email,
                'agreement_signed_at' => $latestAgreement?->signed_at?->toDateString(),
                'agreement_expires_at' => $latestAgreement?->expires_at?->toDateString(),
                'agreement_agreed_slots' => $latestAgreement?->agreed_slots,
                'agreement_pdf_path' => $latestAgreement?->pdf_path ? Storage::url($latestAgreement->pdf_path) : null,
            ],
            'agreementHistory' => $this->agreementHistory($educationCenter),
        ]);
    }

    // Actualización de un centro educativo:
    public function update(UpdateEducationCenterRequest $request, EducationCenter $educationCenter): RedirectResponse
    {
        $validated = $request->validated();

        try {
            DB::transaction(function () use ($request, $educationCenter, $validated): void {
                $educationCenter->update([
                    'name' => $validated['name'],
                    'address' => $validated['address'],
                    'phone' => $validated['phone'],
                    'institutional_email' => $validated['institutional_email'],
                    'website' => $validated['website'] ?? null,
                    'contact_name' => $validated['contact_name'],
                    'contact_position' => $validated['contact_position'],
                    'contact_phone' => $validated['contact_phone'],
                    'contact_email' => $validated['contact_email'],
                ]);

                $agreement = CollaborationAgreement::query()
                    ->where('education_center_id', $educationCenter->id)
                    ->latest('signed_at')
                    ->first();

                $agreementPdfPath = $agreement?->pdf_path;

                if ($request->hasFile('agreement_pdf')) {
                    $agreementPdfPath = $request->file('agreement_pdf')
                        ->store('education-centers/agreements', 'public');
                }

                if ($agreement && ! $request->hasFile('agreement_pdf')) {
                    $agreement->update([
                        'signed_at' => $validated['agreement_signed_at'],
                        'expires_at' => $validated['agreement_expires_at'],
                        'agreed_slots' => $validated['agreement_agreed_slots'],
                        'pdf_path' => $agreementPdfPath,
                    ]);

                    return;
                }

                CollaborationAgreement::create([
                    'education_center_id' => $educationCenter->id,
                    'signed_at' => $validated['agreement_signed_at'],
                    'expires_at' => $validated['agreement_expires_at'],
                    'agreed_slots' => $validated['agreement_agreed_slots'],
                    'pdf_path' => $agreementPdfPath,
                ]);
            });
        } catch (Throwable $exception) {
            report($exception);
            return redirect()
                ->route('education-centers.index')
                ->with('error', 'No se pudo actualizar el centro educativo. Intenta de nuevo más tarde.');
        }

        return redirect()
            ->route('education-centers.show', $educationCenter)
            ->with('success', 'Centro educativo actualizado correctamente.');
    }

    // Consulta base para filtrado de centros educativos:
    private function filteredBaseQuery(Request $request)
    {
        $search = trim((string) $request->string('search')->toString());
        $agreementStatus = $request->string('agreement_status')->toString();
        $today = now()->startOfDay();
        $renewalLimit = now()->addDays(30)->startOfDay();

        return EducationCenter::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->whereRaw('LOWER(name) LIKE ?', ['%'.mb_strtolower($search).'%']);
            })
            ->when($agreementStatus !== '', function ($query) use ($agreementStatus, $today, $renewalLimit) {
                $query->whereHas('latestCollaborationAgreement', function ($subQuery) use ($agreementStatus, $today, $renewalLimit) {
                    if ($agreementStatus === 'expired') {
                        $subQuery->where('expires_at', '<', $today);
                    } elseif ($agreementStatus === 'renewal_soon') {
                        $subQuery->where('expires_at', '>=', $today)
                            ->where('expires_at', '<=', $renewalLimit);
                    } elseif ($agreementStatus === 'valid') {
                        $subQuery->where('expires_at', '>=', $today)
                            ->where('expires_at', '>', $renewalLimit);
                    }
                });
            });
    }

    // Determina el estado de un centro educativo basado en su acuerdo de colaboración más reciente:
    private function resolveCenterStatus(?CollaborationAgreement $agreement): string
    {
        $expiresAt = $agreement?->expires_at;
        $today = now()->startOfDay();
        $renewalLimit = now()->addDays(30)->startOfDay();

        if ($expiresAt === null || $expiresAt < $today) {
            return 'expired';
        }

        if ($expiresAt <= $renewalLimit) {
            return 'renewal_soon';
        }

        return 'valid';
    }

    // Traduce el estado del centro educativo a una etiqueta legible:
    private function centerStatusLabel(string $status): string
    {
        return match ($status) {
            'valid' => 'Vigente',
            'renewal_soon' => 'Renovacion proxima',
            'expired' => 'Caducado',
            default => $status,
        };
    }

    // Obtiene el historial de acuerdos de colaboración de un centro educativo:
    private function agreementHistory(EducationCenter $educationCenter): array
    {
        $agreements = $educationCenter
            ->collaborationAgreements()
            ->latest('signed_at')
            ->latest('id')
            ->get();

        $currentAgreementId = $agreements->first()?->id;

        return $agreements
            ->map(fn (CollaborationAgreement $agreement): array => [
                'id' => $agreement->id,
                'is_current' => $agreement->id === $currentAgreementId,
                'signed_at' => $agreement->signed_at ? (\Illuminate\Support\Carbon::parse($agreement->signed_at)->toDateString()) : null,
                'expires_at' => $agreement->expires_at ? (\Illuminate\Support\Carbon::parse($agreement->expires_at)->toDateString()) : null,
                'agreed_slots' => $agreement->agreed_slots,
                'filename' => basename((string) $agreement->pdf_path),
                'preview_url' => $agreement->pdf_path ? Storage::url($agreement->pdf_path) : null,
                'uploaded_at' => $agreement->created_at?->toDateTimeString(),
            ])
            ->values()
            ->all();
    }

    // Eliminación de un centro educativo:
    public function destroy(EducationCenter $educationCenter): RedirectResponse
    {
        if ($this->hasActiveInterns($educationCenter->id)) {
            return redirect()
                ->route('education-centers.index')
                ->with('error', 'No se puede eliminar el centro porque tiene becarios activos.');
        }

        try {
            $educationCenter->delete();
        } catch (Throwable $exception) {
            report($exception);
            return redirect()
                ->route('education-centers.index')
                ->with('error', 'No se pudo eliminar el centro educativo. Intenta de nuevo más tarde.');
        }

        return redirect()
            ->route('education-centers.index')
            ->with('success', 'Centro educativo eliminado correctamente.');
    }

    // Verifica si un centro educativo tiene becarios activos asociados:
    private function hasActiveInterns(int $educationCenterId): bool
    {
        if (! Schema::hasTable('interns')) {
            return false;
        }

        return Intern::query()
            ->where('education_center_id', $educationCenterId)
            ->whereNull('deleted_at')
            ->where('status', 'active')
            ->exists();
    }
}
