<?php

namespace App\Http\Controllers;

use App\Http\Requests\Interns\StoreInternRequest;
use App\Http\Requests\Interns\UpdateInternRequest;
use App\Models\EducationCenter;
use App\Models\Intern;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class InternController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search')->toString());
        $status = trim((string) $request->string('status')->toString());
        $educationCenterId = $request->integer('education_center_id');

        $interns = Intern::query()
            ->with('educationCenter')
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
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->when($educationCenterId, fn ($query) => $query->where('education_center_id', $educationCenterId))
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
            'filters' => [
                'search' => $search,
                'status' => $status,
                'education_center_id' => $educationCenterId,
            ],
            'educationCenters' => EducationCenter::query()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('interns/form', [
            'mode' => 'create',
            'intern' => null,
            'educationCenters' => EducationCenter::query()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function store(StoreInternRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        Intern::create($validated);

        return redirect()
            ->route('interns.index')
            ->with('success', 'Becario creado correctamente.');
    }

    public function edit(Intern $intern): Response
    {
        return Inertia::render('interns/form', [
            'mode' => 'edit',
            'intern' => $intern,
            'educationCenters' => EducationCenter::query()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function update(UpdateInternRequest $request, Intern $intern): RedirectResponse
    {
        $validated = $request->validated();

        $intern->update($validated);

        return redirect()
            ->route('interns.index')
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
            'educationCenters' => EducationCenter::query()
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }
}