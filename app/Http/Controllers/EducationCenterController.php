<?php

namespace App\Http\Controllers;

use App\Http\Requests\EducationCenters\StoreEducationCenterRequest;
use App\Http\Requests\EducationCenters\UpdateEducationCenterRequest;
use App\Models\CollaborationAgreement;
use App\Models\EducationCenter;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class EducationCenterController extends Controller
{

    public function index(Request $request): Response
    {

        $search = trim((string) $request->string('search')->toString());
        $agreementStatus = $request->string('agreement_status')->toString();

        $today = now()->startOfDay();
        $renewalLimit = now()->addDays(30)->startOfDay();

        $baseQuery = EducationCenter::query()
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
                    } elseif ($agreementStatus === 'vigente') {
                        $subQuery->where('expires_at', '>=', $today)
                                 ->where('expires_at', '>', $renewalLimit);
                    }
                });
            });

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
                $expiresAt = $center->latestCollaborationAgreement?->expires_at;
                $today = now()->startOfDay();
                $renewalLimit = now()->addDays(30)->startOfDay();
                $status = null;
                if ($expiresAt === null) {
                    $status = 'expired';
                } elseif ($expiresAt < $today) {
                    $status = 'expired';
                } elseif ($expiresAt >= $today && $expiresAt <= $renewalLimit) {
                    $status = 'renewal_soon';
                } elseif ($expiresAt > $renewalLimit) {
                    $status = 'vigente';
                }
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

    public function create(): Response
    {
        return Inertia::render('education-centers/form', [
            'mode' => 'create',
            'center' => null,
        ]);
    }

    public function store(StoreEducationCenterRequest $request): RedirectResponse
    {
        $validated = $request->validated();

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

        return redirect()
            ->route('education-centers.index')
            ->with('success', 'Centro educativo creado correctamente.');
    }

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
                'agreement_pdf_path' => $latestAgreement?->pdf_path,
            ],
            'internsHistory' => $internsHistory,
        ]);
    }

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
                'agreement_pdf_path' => $latestAgreement?->pdf_path,
            ],
        ]);
    }

    public function update(UpdateEducationCenterRequest $request, EducationCenter $educationCenter): RedirectResponse
    {
        $validated = $request->validated();

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

            if ($agreement) {
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

        return redirect()
            ->route('education-centers.index')
            ->with('success', 'Centro educativo actualizado correctamente.');
    }

    public function destroy(EducationCenter $educationCenter): RedirectResponse
    {
        if ($this->hasActiveInterns($educationCenter->id)) {
            return redirect()
                ->route('education-centers.index')
                ->with('error', 'No se puede eliminar el centro porque tiene becarios activos.');
        }

        $educationCenter->delete();

        return redirect()
            ->route('education-centers.index')
            ->with('success', 'Centro educativo eliminado correctamente.');
    }

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
