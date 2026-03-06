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

        $centers = EducationCenter::query()
            ->with('latestCollaborationAgreement')
            ->withCount('collaborationAgreements')
            ->when($search !== '', function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->paginate(10)
            ->through(function (EducationCenter $center): array {
                $expiresAt = $center->latestCollaborationAgreement?->expires_at;
                $today = now()->startOfDay();
                $renewalLimit = now()->addDays(30)->startOfDay();

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
                    'renewal_soon' => $expiresAt !== null
                        && $today->lte($expiresAt)
                        && $renewalLimit->gte($expiresAt),
                ];
            })
            ->withQueryString();

        return Inertia::render('education-centers', [
            'centers' => $centers,
            'filters' => [
                'search' => $search,
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

        return DB::table('interns')
            ->where('education_center_id', $educationCenterId)
            ->where('status', 'active')
            ->exists();
    }
}
