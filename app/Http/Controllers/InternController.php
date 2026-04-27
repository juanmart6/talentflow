<?php

namespace App\Http\Controllers;

use App\Exports\InternsExport;
use App\Http\Requests\Interns\StoreInternRequest;
use App\Http\Requests\Interns\UpdateInternRequest;
use App\Mail\UserInvitationMail;
use App\Models\EducationCenter;
use App\Models\Intern;
use App\Models\TrainingProgram;
use App\Models\User;
use App\Models\Users\UserInvitation;
use Illuminate\Database\QueryException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
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
            ->with(['educationCenter', 'trainingProgram', 'user:id,is_active,deactivated_at,avatar_path'])
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(10);

        $internRows = $interns->getCollection();
        $internIds = $internRows->pluck('id')->all();
        $internEmails = $internRows
            ->pluck('email')
            ->filter(fn ($email) => is_string($email) && trim($email) !== '')
            ->map(fn (string $email) => mb_strtolower(trim($email)))
            ->values()
            ->all();

        $invitationsByInternAndEmail = collect();

        if (!empty($internIds) || !empty($internEmails)) {
            $invitationsByInternAndEmail = UserInvitation::query()
                ->where(function ($query) use ($internIds, $internEmails) {
                    if (!empty($internIds)) {
                        $query->whereIn('intern_id', $internIds);
                    }

                    if (!empty($internEmails)) {
                        $query->orWhereIn(DB::raw('LOWER(email)'), $internEmails);
                    }
                })
                ->get(['id', 'intern_id', 'email', 'accepted_at', 'expires_at'])
                ->groupBy(function (UserInvitation $invitation): string {
                    if ($invitation->intern_id !== null) {
                        return 'intern:'.$invitation->intern_id;
                    }

                    return 'email:'.mb_strtolower($invitation->email);
                });
        }

        $interns->setCollection(
            $internRows->map(function (Intern $intern) use ($invitationsByInternAndEmail): array {
                $invitationsForIntern = $invitationsByInternAndEmail->get('intern:'.$intern->id)
                    ?? $invitationsByInternAndEmail->get('email:'.mb_strtolower($intern->email))
                    ?? collect();

                $hasPendingInvitation = $invitationsForIntern->contains(fn (UserInvitation $invitation) => $invitation->accepted_at === null
                    && $invitation->expires_at !== null
                    && $invitation->expires_at->isFuture());

                $hasExpiredInvitation = $invitationsForIntern->contains(fn (UserInvitation $invitation) => $invitation->accepted_at === null
                    && ($invitation->expires_at === null || $invitation->expires_at->isPast()));

                $accessStatus = 'none';
                $linkedUser = $intern->user;

                if ($linkedUser !== null) {
                    $accessStatus = $linkedUser->is_active === false ? 'disabled' : 'accepted';
                } elseif ($hasPendingInvitation) {
                    $accessStatus = 'pending';
                } elseif ($hasExpiredInvitation) {
                    $accessStatus = 'expired';
                }

                return [
                    'id' => $intern->id,
                    'user_id' => $intern->user_id,
                    'user_avatar' => $linkedUser?->avatar,
                    'access_status' => $accessStatus,
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
        );

        $interns->withQueryString();

        return Inertia::render('interns/index', [
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
            'access' => null,
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
            $invitationResult = $this->createInitialAccessForIntern($request, $intern);
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

        $redirect = redirect()
            ->route('interns.index')
            ->with('success', 'Usuario creado correctamente.');

        return match ($invitationResult) {
            'invited' => $redirect->with('info', 'Invitación enviada correctamente.'),
            'already-pending-invitation' => $redirect->with('info', 'Ya existía una invitación pendiente para este correo.'),
            'existing-user-email' => $redirect->with('info', 'No se envió invitación porque ese correo ya existe en usuarios.'),
            default => $redirect,
        };
    }

    // Formulario de edición de becario:
    public function edit(Intern $intern): Response
    {
        return Inertia::render('interns/form', [
            'mode' => 'edit',
            'intern' => $intern,
            'access' => $this->buildInternAccessData($intern),
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
        $newEmail = mb_strtolower(trim((string) ($internPayload['email'] ?? $intern->email)));

        if (($internPayload['status'] ?? null) !== 'abandoned') {
            $internPayload['abandonment_reason'] = null;
            $internPayload['abandonment_date'] = null;
            $internPayload['status'] = $this->resolveAutomaticStatus(
                (string) $internPayload['internship_start_date'],
                (string) $internPayload['internship_end_date'],
            );
        }

        $internPayload['email'] = $newEmail;

        if ($intern->user_id !== null) {
            $emailTakenByAnotherUser = User::query()
                ->whereKeyNot($intern->user_id)
                ->whereRaw('LOWER(email) = ?', [$newEmail])
                ->exists();

            if ($emailTakenByAnotherUser) {
                return back()->withErrors([
                    'email' => 'Ese correo ya está en uso por otro usuario con acceso.',
                ]);
            }
        }

        try {
            DB::transaction(function () use ($intern, $internPayload, $newEmail): void {
                $intern->update($internPayload);

                if ($intern->user_id !== null) {
                    User::query()
                        ->whereKey($intern->user_id)
                        ->update([
                            'email' => $newEmail,
                        ]);
                }
            });

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

    public function inviteAccess(Request $request, Intern $intern): RedirectResponse
    {
        $linkedUser = $intern->user()
            ->first(['id', 'email', 'is_active']);

        if ($linkedUser !== null && $linkedUser->is_active) {
            return back()->with('error', 'Este becario ya tiene una cuenta activa vinculada.');
        }

        $email = mb_strtolower(trim((string) $intern->email));

        if ($email === '') {
            return back()->with('error', 'El becario no tiene correo electrónico válido para enviar invitación.');
        }

        $existingUser = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first(['id', 'is_active']);

        if (
            $existingUser !== null
            && ($linkedUser === null || $existingUser->id !== $linkedUser->id || $existingUser->is_active)
        ) {
            return back()->with('error', 'Ya existe otra cuenta con ese correo. Revisa el email del becario antes de invitar.');
        }

        $hadPendingInvitation = UserInvitation::query()
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->where(function ($query) use ($intern, $email) {
                $query
                    ->where('intern_id', $intern->id)
                    ->orWhereRaw('LOWER(email) = ?', [$email]);
            })
            ->exists();

        UserInvitation::query()
            ->whereNull('accepted_at')
            ->where(function ($query) use ($intern, $email) {
                $query
                    ->where('intern_id', $intern->id)
                    ->orWhereRaw('LOWER(email) = ?', [$email]);
            })
            ->update([
                'expires_at' => now()->subSecond(),
            ]);

        $invitation = UserInvitation::create([
            'intern_id' => $intern->id,
            'email' => $email,
            'role' => 'intern',
            'token' => Str::random(64),
            'invited_by_user_id' => $request->user()?->id,
            'expires_at' => now()->addDays(7),
            'accepted_at' => null,
        ]);

        $acceptUrl = url("/invitaciones/{$invitation->token}");

        Mail::to($invitation->email)->send(
            new UserInvitationMail($invitation, $acceptUrl)
        );

        return back()->with('success', $hadPendingInvitation
            ? 'Invitación reenviada correctamente al becario.'
            : 'Invitación enviada correctamente al becario.');
    }

    // Visualización de un becario:
    public function show(Intern $intern): Response
    {
        return Inertia::render('interns/form', [
            'mode' => 'show',
            'intern' => $intern,
            'access' => $this->buildInternAccessData($intern),
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

    private function buildInternAccessData(Intern $intern): array
    {
        $intern->loadMissing('user:id,is_active,deactivated_at');
        $status = 'none';
        $invitations = UserInvitation::query()
            ->where(function ($query) use ($intern) {
                $query
                    ->where('intern_id', $intern->id)
                    ->orWhereRaw('LOWER(email) = ?', [mb_strtolower($intern->email)]);
            })
            ->latest('id')
            ->with('invitedBy:id,name')
            ->get(['id', 'invited_by_user_id', 'created_at', 'accepted_at', 'expires_at']);

        $latestInvitation = $invitations->first();

        $history = $invitations
            ->flatMap(function (UserInvitation $invitation): array {
                $events = [];

                if ($invitation->created_at !== null) {
                    $events[] = [
                        'id' => "{$invitation->id}-sent",
                        'step' => 'sent',
                        'happened_at' => $invitation->created_at->toIso8601String(),
                        'by_name' => $invitation->invitedBy?->name ?? 'Sistema',
                    ];
                }

                if ($invitation->accepted_at !== null) {
                    $events[] = [
                        'id' => "{$invitation->id}-accepted",
                        'step' => 'accepted',
                        'happened_at' => $invitation->accepted_at->toIso8601String(),
                        'by_name' => null,
                    ];
                } elseif ($invitation->expires_at !== null && $invitation->expires_at->isPast()) {
                    $events[] = [
                        'id' => "{$invitation->id}-expired",
                        'step' => 'expired',
                        'happened_at' => $invitation->expires_at->toIso8601String(),
                        'by_name' => null,
                    ];
                }

                return $events;
            });

        $linkedUser = $intern->user;

        if ($linkedUser !== null && $linkedUser->is_active === false) {
            $history->push([
                'id' => "user-{$linkedUser->id}-disabled",
                'step' => 'disabled',
                'happened_at' => $linkedUser->deactivated_at?->toIso8601String(),
                'by_name' => null,
            ]);
        }

        $history = $history
            ->sortByDesc('happened_at')
            ->take(20)
            ->values()
            ->all();

        if ($linkedUser !== null) {
            $status = $linkedUser->is_active === false ? 'disabled' : 'accepted';
        } elseif ($latestInvitation !== null) {
            if ($latestInvitation->accepted_at === null && $latestInvitation->expires_at !== null && $latestInvitation->expires_at->isFuture()) {
                $status = 'pending';
            } elseif ($latestInvitation->accepted_at === null) {
                $status = 'expired';
            } else {
                // Invitation was accepted in the past, but account is no longer linked.
                // Keep status as "none" so admins can invite again.
                $status = 'none';
            }
        }

        return [
            'status' => $status,
            'can_invite' => in_array($status, ['none', 'pending', 'expired', 'disabled'], true),
            'history' => $history,
        ];
    }

    private function createInitialAccessForIntern(Request $request, Intern $intern): string
    {
        if ($intern->user_id !== null) {
            return 'already-linked';
        }

        $email = mb_strtolower(trim((string) $intern->email));

        if ($email === '') {
            return 'no-email';
        }

        $existingUser = User::query()
            ->whereRaw('LOWER(email) = ?', [$email])
            ->exists();

        if ($existingUser) {
            return 'existing-user-email';
        }

        $hasPendingInvitation = UserInvitation::query()
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->where(function ($query) use ($intern, $email) {
                $query
                    ->where('intern_id', $intern->id)
                    ->orWhereRaw('LOWER(email) = ?', [$email]);
            })
            ->exists();

        if ($hasPendingInvitation) {
            return 'already-pending-invitation';
        }

        $invitation = UserInvitation::create([
            'intern_id' => $intern->id,
            'email' => $email,
            'role' => 'intern',
            'token' => Str::random(64),
            'invited_by_user_id' => $request->user()?->id,
            'expires_at' => now()->addDays(7),
            'accepted_at' => null,
        ]);

        $acceptUrl = url("/invitaciones/{$invitation->token}");

        Mail::to($invitation->email)->send(
            new UserInvitationMail($invitation, $acceptUrl)
        );

        return 'invited';
    }
}
