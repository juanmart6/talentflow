<?php

namespace App\Http\Controllers;

use App\Models\Intern;
use App\Models\InternAbsenceRequest;
use App\Models\InternHourSchedule;
use App\Models\TimeClockEntry;
use App\Models\User;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\LaravelPdf\Facades\Pdf;

class TimeControlController extends Controller
{
    private const INCLUDED_BREAK_MINUTES = 30;

    public function index(Request $request): Response
    {
        $user = $request->user();
        abort_unless($user !== null, 403);

        $isInternUser = $user->hasRole('intern');
        $canManageTeam = $this->canManageTeam($user);
        $range = $this->normalizeRange($request->string('range')->toString());
        $requestedMonthCursor = trim((string) $request->string('month')->toString());
        $monthCursor = $this->normalizeMonthCursor($requestedMonthCursor);

        $interns = Intern::query()
            ->when($isInternUser, fn ($query) => $query->where('user_id', $user->id))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get([
                'id',
                'user_id',
                'first_name',
                'last_name',
                'email',
                'required_hours',
                'internship_start_date',
                'internship_end_date',
            ]);

        $selectedIntern = $this->resolveSelectedIntern($request, $interns, $isInternUser, $user);

        if ($selectedIntern === null) {
            return Inertia::render('time-control/index', [
                'interns' => [],
                'selectedInternId' => null,
                'selectedIntern' => null,
                'isInternUser' => $isInternUser,
                'canManageTeam' => $canManageTeam,
                'clockState' => [
                    'activeEntry' => null,
                    'canManualEntry' => $canManageTeam,
                ],
                'timeEntries' => [],
                'schedules' => [],
                'absenceRequests' => [],
                'pendingAbsenceRequests' => [],
                'calendar' => [
                    'monthCursor' => $monthCursor,
                    'monthDays' => [],
                    'weekDays' => [],
                ],
                'summary' => [
                    'range' => [
                        'label' => '',
                        'start' => null,
                        'end' => null,
                        'worked_minutes' => 0,
                        'worked_hours' => 0,
                        'planned_minutes' => 0,
                        'planned_hours' => 0,
                        'compliance_percent' => 0,
                    ],
                    'progress' => [
                        'required_hours' => 0,
                        'total_worked_minutes' => 0,
                        'total_worked_hours' => 0,
                        'progress_percent' => 0,
                        'expected_percent' => null,
                    ],
                    'alerts' => [],
                ],
                'filters' => [
                    'range' => $range,
                    'month' => $monthCursor,
                ],
            ]);
        }

        $monthCursor = $this->resolveCalendarMonthCursor(
            $requestedMonthCursor,
            $selectedIntern,
        );

        $rangeWindow = $this->resolveRangeWindow($range);
        $monthStart = Carbon::createFromFormat('Y-m', $monthCursor)->startOfMonth();
        $monthGridStart = $monthStart->copy()->startOfWeek(Carbon::MONDAY)->startOfDay();
        $monthGridEnd = $monthStart->copy()->endOfMonth()->endOfWeek(Carbon::SUNDAY)->endOfDay();

        $weekAnchor = $this->resolveCalendarWeekAnchor($monthStart, $selectedIntern);
        $weekStart = $weekAnchor->copy()->startOfWeek(Carbon::MONDAY)->startOfDay();
        $weekEnd = $weekAnchor->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay();

        $schedules = InternHourSchedule::query()
            ->where('intern_id', $selectedIntern->id)
            ->orderByDesc('starts_on')
            ->get();

        $activeEntry = TimeClockEntry::query()
            ->where('intern_id', $selectedIntern->id)
            ->whereNull('ended_at')
            ->latest('started_at')
            ->first();

        $recentEntries = TimeClockEntry::query()
            ->where('intern_id', $selectedIntern->id)
            ->latest('started_at')
            ->limit(20)
            ->get();

        $rangeEntries = TimeClockEntry::query()
            ->where('intern_id', $selectedIntern->id)
            ->whereBetween('started_at', [$rangeWindow['start'], $rangeWindow['end']])
            ->orderBy('started_at')
            ->get();

        $allEntries = TimeClockEntry::query()
            ->where('intern_id', $selectedIntern->id)
            ->orderBy('started_at')
            ->get();

        $monthEntries = TimeClockEntry::query()
            ->where('intern_id', $selectedIntern->id)
            ->whereBetween('started_at', [$monthGridStart, $monthGridEnd])
            ->get();

        $weekEntries = TimeClockEntry::query()
            ->where('intern_id', $selectedIntern->id)
            ->whereBetween('started_at', [$weekStart, $weekEnd])
            ->get();

        $monthWorkedByDate = $this->buildWorkedMinutesByDate($monthEntries);
        $weekWorkedByDate = $this->buildWorkedMinutesByDate($weekEntries);
        $rangeWorkedByDate = $this->buildWorkedMinutesByDate($rangeEntries);

        $monthDays = $this->buildDayRows($monthGridStart->copy(), $monthGridEnd->copy(), $monthWorkedByDate, $schedules);
        $weekDays = $this->buildDayRows($weekStart->copy(), $weekEnd->copy(), $weekWorkedByDate, $schedules);
        $rangeDays = $this->buildDayRows(
            $rangeWindow['start']->copy()->startOfDay(),
            $rangeWindow['end']->copy()->startOfDay(),
            $rangeWorkedByDate,
            $schedules,
        );
        $recentWindowStart = now()->subDays(6)->startOfDay();
        $recentWindowEnd = now()->endOfDay();
        $recentEntries = $allEntries->filter(
            fn ($entry): bool => $entry instanceof TimeClockEntry
                && $entry->started_at !== null
                && $entry->started_at->gte($recentWindowStart)
                && $entry->started_at->lte($recentWindowEnd),
        );
        $recentWorkedByDate = $this->buildWorkedMinutesByDate($recentEntries);
        $recentDays = $this->buildDayRows(
            $recentWindowStart->copy(),
            $recentWindowEnd->copy(),
            $recentWorkedByDate,
            $schedules,
        );

        $summary = $this->buildSummaryData($selectedIntern, $rangeWindow, $rangeDays, $allEntries);
        $alerts = $this->buildAlerts($summary, $recentDays, $activeEntry, $schedules);

        $absenceRequests = InternAbsenceRequest::query()
            ->where('intern_id', $selectedIntern->id)
            ->with(['requestedBy:id,name', 'reviewedBy:id,name'])
            ->orderByDesc('start_date')
            ->limit(20)
            ->get();

        $pendingAbsenceRequests = $canManageTeam
            ? InternAbsenceRequest::query()
                ->where('status', 'pending')
                ->with(['intern:id,first_name,last_name,email', 'requestedBy:id,name'])
                ->orderBy('start_date')
                ->limit(10)
                ->get()
            : collect();

        return Inertia::render('time-control/index', [
            'interns' => $interns
                ->map(fn (Intern $intern): array => [
                    'id' => $intern->id,
                    'name' => trim($intern->first_name.' '.$intern->last_name),
                    'email' => $intern->email,
                    'required_hours' => (int) ($intern->required_hours ?? 0),
                    'internship_start_date' => $intern->internship_start_date?->toDateString(),
                    'internship_end_date' => $intern->internship_end_date?->toDateString(),
                ])
                ->values()
                ->all(),
            'selectedInternId' => $selectedIntern->id,
            'selectedIntern' => [
                'id' => $selectedIntern->id,
                'name' => trim($selectedIntern->first_name.' '.$selectedIntern->last_name),
                'email' => $selectedIntern->email,
                'required_hours' => (int) ($selectedIntern->required_hours ?? 0),
                'internship_start_date' => $selectedIntern->internship_start_date?->toDateString(),
                'internship_end_date' => $selectedIntern->internship_end_date?->toDateString(),
            ],
            'isInternUser' => $isInternUser,
            'canManageTeam' => $canManageTeam,
            'clockState' => [
                'activeEntry' => $activeEntry ? $this->mapEntry($activeEntry) : null,
                'canManualEntry' => $canManageTeam,
            ],
            'timeEntries' => $recentEntries
                ->map(fn (TimeClockEntry $entry): array => $this->mapEntry($entry))
                ->values()
                ->all(),
            'schedules' => $schedules
                ->map(fn (InternHourSchedule $schedule): array => $this->mapSchedule($schedule))
                ->values()
                ->all(),
            'absenceRequests' => $absenceRequests
                ->map(fn (InternAbsenceRequest $absence): array => $this->mapAbsence($absence))
                ->values()
                ->all(),
            'pendingAbsenceRequests' => $pendingAbsenceRequests
                ->map(fn (InternAbsenceRequest $absence): array => [
                    ...$this->mapAbsence($absence),
                    'intern' => $absence->intern ? [
                        'id' => $absence->intern->id,
                        'name' => trim($absence->intern->first_name.' '.$absence->intern->last_name),
                        'email' => $absence->intern->email,
                    ] : null,
                ])
                ->values()
                ->all(),
            'calendar' => [
                'monthCursor' => $monthCursor,
                'monthDays' => $monthDays,
                'weekDays' => $weekDays,
            ],
            'summary' => [
                ...$summary,
                'alerts' => $alerts,
            ],
            'filters' => [
                'range' => $range,
                'month' => $monthCursor,
            ],
        ]);
    }

    public function clockIn(Request $request): RedirectResponse
    {
        $intern = $this->resolveActionIntern($request, true);
        if ($intern === null) {
            return back()->with('error', 'Selecciona un becario valido para fichar.');
        }

        $existingActiveEntry = TimeClockEntry::query()
            ->where('intern_id', $intern->id)
            ->whereNull('ended_at')
            ->exists();

        if ($existingActiveEntry) {
            return back()->with('error', 'Ya existe un fichaje de entrada activo.');
        }

        TimeClockEntry::query()->create([
            'intern_id' => $intern->id,
            'entered_by_user_id' => $request->user()?->id,
            'source' => 'self',
            'started_at' => now(),
            'break_minutes' => 0,
        ]);

        return back()->with('success', 'Entrada registrada correctamente.');
    }

    public function startBreak(Request $request): RedirectResponse
    {
        $intern = $this->resolveActionIntern($request, true);
        if ($intern === null) {
            return back()->with('error', 'Selecciona un becario valido para iniciar la pausa.');
        }

        $activeEntry = TimeClockEntry::query()
            ->where('intern_id', $intern->id)
            ->whereNull('ended_at')
            ->latest('started_at')
            ->first();

        if ($activeEntry === null) {
            return back()->with('error', 'No hay un fichaje activo para iniciar la pausa.');
        }

        if ($activeEntry->break_started_at !== null) {
            return back()->with('error', 'La pausa ya esta iniciada.');
        }

        $activeEntry->update([
            'break_started_at' => now(),
        ]);

        return back()->with('success', 'Pausa iniciada correctamente.');
    }

    public function endBreak(Request $request): RedirectResponse
    {
        $intern = $this->resolveActionIntern($request, true);
        if ($intern === null) {
            return back()->with('error', 'Selecciona un becario valido para finalizar la pausa.');
        }

        $activeEntry = TimeClockEntry::query()
            ->where('intern_id', $intern->id)
            ->whereNull('ended_at')
            ->latest('started_at')
            ->first();

        if ($activeEntry === null || $activeEntry->break_started_at === null) {
            return back()->with('error', 'No hay una pausa activa para finalizar.');
        }

        $newBreakMinutes = (int) $activeEntry->break_minutes
            + $this->elapsedWholeMinutes($activeEntry->break_started_at, now());

        $activeEntry->update([
            'break_started_at' => null,
            'break_minutes' => $newBreakMinutes,
        ]);

        return back()->with('success', 'Pausa finalizada correctamente.');
    }

    public function clockOut(Request $request): RedirectResponse
    {
        $intern = $this->resolveActionIntern($request, true);
        if ($intern === null) {
            return back()->with('error', 'Selecciona un becario valido para fichar salida.');
        }

        $activeEntry = TimeClockEntry::query()
            ->where('intern_id', $intern->id)
            ->whereNull('ended_at')
            ->latest('started_at')
            ->first();

        if ($activeEntry === null) {
            return back()->with('error', 'No hay un fichaje activo para cerrar.');
        }

        $breakMinutes = (int) $activeEntry->break_minutes;

        if ($activeEntry->break_started_at !== null) {
            $breakMinutes += $this->elapsedWholeMinutes($activeEntry->break_started_at, now());
        }

        $activeEntry->update([
            'ended_at' => now(),
            'break_started_at' => null,
            'break_minutes' => $breakMinutes,
        ]);

        return back()->with('success', 'Salida registrada correctamente.');
    }

    public function storeManualEntry(Request $request): RedirectResponse
    {
        if (!$this->canManageTeam($request->user())) {
            return back()->with('error', 'No tienes permisos para registrar fichajes manuales.');
        }

        $validated = $this->validateManualEntryPayload($request);

        TimeClockEntry::query()->create([
            'intern_id' => (int) $validated['intern_id'],
            'entered_by_user_id' => $request->user()?->id,
            'source' => 'tutor_manual',
            'started_at' => Carbon::parse((string) $validated['started_at']),
            'ended_at' => Carbon::parse((string) $validated['ended_at']),
            'break_minutes' => (int) ($validated['break_minutes'] ?? 0),
            'manual_reason' => trim((string) $validated['manual_reason']),
        ]);

        return back()->with('success', 'Fichaje manual registrado correctamente.');
    }

    public function updateManualEntry(Request $request, TimeClockEntry $entry): RedirectResponse
    {
        if (!$this->canManageTeam($request->user())) {
            return back()->with('error', 'No tienes permisos para editar fichajes.');
        }

        $validated = $this->validateManualEntryPayload($request);

        if ((int) $entry->intern_id !== (int) $validated['intern_id']) {
            return back()->with('error', 'El fichaje no pertenece al becario seleccionado.');
        }

        $entry->update([
            'started_at' => Carbon::parse((string) $validated['started_at']),
            'ended_at' => Carbon::parse((string) $validated['ended_at']),
            'break_minutes' => (int) ($validated['break_minutes'] ?? 0),
            'manual_reason' => trim((string) $validated['manual_reason']),
            'break_started_at' => null,
        ]);

        return back()->with('success', 'Fichaje actualizado correctamente.');
    }

    public function destroyManualEntry(Request $request, TimeClockEntry $entry): RedirectResponse
    {
        if (!$this->canManageTeam($request->user())) {
            return back()->with('error', 'No tienes permisos para eliminar fichajes.');
        }

        $validated = $request->validate([
            'intern_id' => ['required', 'integer', Rule::exists('interns', 'id')],
        ]);

        if ((int) $entry->intern_id !== (int) $validated['intern_id']) {
            return back()->with('error', 'El fichaje no pertenece al becario seleccionado.');
        }

        $entry->delete();

        return back()->with('success', 'Fichaje eliminado correctamente.');
    }

    public function upsertSchedule(Request $request): RedirectResponse
    {
        if (!$this->canManageTeam($request->user())) {
            return back()->with('error', 'No tienes permisos para gestionar horarios.');
        }

        $validated = $request->validate([
            'schedule_id' => ['nullable', 'integer', Rule::exists('intern_hour_schedules', 'id')],
            'intern_id' => ['required', 'integer', Rule::exists('interns', 'id')],
            'season_name' => ['required', 'string', 'max:120'],
            'starts_on' => ['required', 'date'],
            'ends_on' => ['required', 'date', 'after_or_equal:starts_on'],
            'is_active' => ['nullable', 'boolean'],
            'monday_minutes' => ['required', 'integer', 'min:0', 'max:1440'],
            'tuesday_minutes' => ['required', 'integer', 'min:0', 'max:1440'],
            'wednesday_minutes' => ['required', 'integer', 'min:0', 'max:1440'],
            'thursday_minutes' => ['required', 'integer', 'min:0', 'max:1440'],
            'friday_minutes' => ['required', 'integer', 'min:0', 'max:1440'],
            'saturday_minutes' => ['required', 'integer', 'min:0', 'max:1440'],
            'sunday_minutes' => ['required', 'integer', 'min:0', 'max:1440'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $schedule = null;
        if (!empty($validated['schedule_id'])) {
            $schedule = InternHourSchedule::query()
                ->where('intern_id', (int) $validated['intern_id'])
                ->find($validated['schedule_id']);
        }

        $startsOn = Carbon::parse((string) $validated['starts_on'])->toDateString();
        $endsOn = Carbon::parse((string) $validated['ends_on'])->toDateString();
        $intern = Intern::query()->find((int) $validated['intern_id']);

        if ($intern === null) {
            return back()->with('error', 'No se encontro el becario seleccionado.');
        }

        $internshipStartsOn = $intern->internship_start_date?->toDateString();
        $internshipEndsOn = $intern->internship_end_date?->toDateString();
        $isOutsideInternshipPeriod = (
            ($internshipStartsOn !== null && $startsOn < $internshipStartsOn)
            || ($internshipEndsOn !== null && $endsOn > $internshipEndsOn)
        );

        if ($isOutsideInternshipPeriod) {
            $internshipPeriodLabel = sprintf(
                '%s - %s',
                $internshipStartsOn !== null
                    ? Carbon::parse($internshipStartsOn)->format('d/m/Y')
                    : '-',
                $internshipEndsOn !== null
                    ? Carbon::parse($internshipEndsOn)->format('d/m/Y')
                    : '-',
            );

            return back()
                ->withErrors([
                    'date_range' => "El horario debe estar dentro del periodo de practicas del becario ({$internshipPeriodLabel}).",
                ])
                ->withInput();
        }

        $hasOverlap = InternHourSchedule::query()
            ->where('intern_id', (int) $validated['intern_id'])
            ->when(
                $schedule !== null,
                fn ($query) => $query->whereKeyNot($schedule->getKey()),
            )
            ->where(function ($query) use ($startsOn, $endsOn): void {
                $query
                    ->where(function ($innerQuery) use ($startsOn, $endsOn): void {
                        $innerQuery
                            ->whereNotNull('ends_on')
                            ->whereDate('starts_on', '<=', $endsOn)
                            ->whereDate('ends_on', '>=', $startsOn);
                    })
                    ->orWhere(function ($innerQuery) use ($endsOn): void {
                        // Compatibilidad con registros antiguos sin fecha de fin.
                        $innerQuery
                            ->whereNull('ends_on')
                            ->whereDate('starts_on', '<=', $endsOn);
                    });
            })
            ->exists();

        if ($hasOverlap) {
            return back()
                ->withErrors([
                    'date_range' => 'El rango de fechas se solapa con otro horario existente para este becario.',
                ])
                ->withInput();
        }

        $payload = [
            'intern_id' => (int) $validated['intern_id'],
            'created_by_user_id' => $request->user()?->id,
            'season_name' => trim((string) $validated['season_name']),
            'starts_on' => $startsOn,
            'ends_on' => $endsOn,
            'is_active' => (bool) ($validated['is_active'] ?? true),
            'monday_minutes' => (int) $validated['monday_minutes'],
            'tuesday_minutes' => (int) $validated['tuesday_minutes'],
            'wednesday_minutes' => (int) $validated['wednesday_minutes'],
            'thursday_minutes' => (int) $validated['thursday_minutes'],
            'friday_minutes' => (int) $validated['friday_minutes'],
            'saturday_minutes' => (int) $validated['saturday_minutes'],
            'sunday_minutes' => (int) $validated['sunday_minutes'],
            'notes' => trim((string) ($validated['notes'] ?? '')) ?: null,
        ];

        if ($schedule !== null) {
            $schedule->update($payload);

            return back()->with('success', 'Horario actualizado correctamente.');
        }

        InternHourSchedule::query()->create($payload);

        return back()->with('success', 'Horario creado correctamente.');
    }

    public function destroySchedule(InternHourSchedule $schedule): RedirectResponse
    {
        if (!$this->canManageTeam(request()->user())) {
            return back()->with('error', 'No tienes permisos para eliminar horarios.');
        }

        $schedule->delete();

        return back()->with('success', 'Horario eliminado correctamente.');
    }

    public function storeAbsenceRequest(Request $request): RedirectResponse
    {
        $intern = $this->resolveActionIntern($request, true);
        if ($intern === null) {
            return back()->with('error', 'Selecciona un becario valido para registrar la ausencia.');
        }

        $validated = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['required', 'string', 'max:500'],
            'attachment' => ['nullable', 'file', 'max:5120', 'mimes:pdf,png,jpg,jpeg,webp'],
        ]);

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store("time-control/absence/{$intern->id}", 'public');
        }

        InternAbsenceRequest::query()->create([
            'intern_id' => $intern->id,
            'requested_by_user_id' => $request->user()?->id,
            'start_date' => Carbon::parse((string) $validated['start_date'])->toDateString(),
            'end_date' => Carbon::parse((string) $validated['end_date'])->toDateString(),
            'reason' => trim((string) $validated['reason']),
            'attachment_path' => $attachmentPath,
            'status' => 'pending',
        ]);

        return back()->with('success', 'Ausencia registrada correctamente.');
    }

    public function reviewAbsenceRequest(Request $request, InternAbsenceRequest $absence): RedirectResponse
    {
        if (!$this->canManageTeam($request->user())) {
            return back()->with('error', 'No tienes permisos para revisar ausencias.');
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'review_note' => ['nullable', 'string', 'max:500'],
        ]);

        $absence->update([
            'status' => $validated['status'],
            'review_note' => trim((string) ($validated['review_note'] ?? '')) ?: null,
            'reviewed_by_user_id' => $request->user()?->id,
            'reviewed_at' => now(),
        ]);

        return back()->with('success', 'Ausencia revisada correctamente.');
    }

    public function exportPdf(Request $request)
    {
        $intern = $this->resolveActionIntern($request, true);
        if ($intern === null) {
            return back()->with('error', 'Selecciona un becario valido para exportar el parte.');
        }

        $range = $this->normalizeRange($request->string('range')->toString());
        $rangeWindow = $this->resolveRangeWindow($range);
        $schedules = InternHourSchedule::query()
            ->where('intern_id', $intern->id)
            ->orderByDesc('starts_on')
            ->get();

        $entries = TimeClockEntry::query()
            ->where('intern_id', $intern->id)
            ->whereBetween('started_at', [$rangeWindow['start'], $rangeWindow['end']])
            ->orderBy('started_at')
            ->get();

        $allEntries = TimeClockEntry::query()
            ->where('intern_id', $intern->id)
            ->orderBy('started_at')
            ->get();

        $workedByDate = $this->buildWorkedMinutesByDate($entries);
        $days = $this->buildDayRows(
            $rangeWindow['start']->copy()->startOfDay(),
            $rangeWindow['end']->copy()->startOfDay(),
            $workedByDate,
            $schedules,
        );
        $summary = $this->buildSummaryData($intern, $rangeWindow, $days, $allEntries);

        $filename = 'parte-horas-'.$intern->id.'-'.$rangeWindow['start']->format('Ymd').'-'.$rangeWindow['end']->format('Ymd').'.pdf';

        return Pdf::view('pdf.time-control-report', [
            'intern' => [
                'name' => trim($intern->first_name.' '.$intern->last_name),
                'email' => $intern->email,
            ],
            'generatedAt' => now()->format('d/m/Y H:i'),
            'range' => $summary['range'],
            'days' => $days,
            'summary' => $summary,
        ])->name($filename)->download();
    }

    public function dayDetails(Request $request): JsonResponse
    {
        $intern = $this->resolveActionIntern($request, true);
        if ($intern === null) {
            return response()->json([
                'message' => 'Selecciona un becario valido para consultar el detalle diario.',
            ], 422);
        }

        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $targetDate = Carbon::createFromFormat('Y-m-d', (string) $validated['date'])->startOfDay();
        $entries = TimeClockEntry::query()
            ->where('intern_id', $intern->id)
            ->whereDate('started_at', $targetDate->toDateString())
            ->orderBy('started_at')
            ->get();
        $schedules = InternHourSchedule::query()
            ->where('intern_id', $intern->id)
            ->orderByDesc('starts_on')
            ->get();

        $plannedDayMeta = $this->plannedDayMetaForDate($targetDate, $schedules);
        $plannedMinutes = (int) $plannedDayMeta['planned_minutes'];
        $workedMinutes = (int) $entries->sum(fn ($entry) => $entry instanceof TimeClockEntry
            ? $this->effectiveMinutesForEntry($entry)
            : 0);
        $breakMinutes = (int) $entries->sum(function ($entry): int {
            if (!$entry instanceof TimeClockEntry) {
                return 0;
            }

            $minutes = max(0, (int) $entry->break_minutes);
            if ($entry->ended_at === null && $entry->break_started_at !== null) {
                $minutes += $this->elapsedWholeMinutes($entry->break_started_at, now());
            }

            return $minutes;
        });
        $status = $this->resolveDayStatus($targetDate, $workedMinutes, $plannedMinutes);
        $compliancePercent = $plannedMinutes > 0
            ? round(($workedMinutes / $plannedMinutes) * 100, 1)
            : 0;
        $firstClockIn = $entries->first()?->started_at?->toIso8601String();
        $lastClockOut = $entries
            ->filter(fn ($entry) => $entry instanceof TimeClockEntry && $entry->ended_at !== null)
            ->last()?->ended_at?->toIso8601String();
        $activeBreakStartedAt = $entries
            ->first(
                fn ($entry) => $entry instanceof TimeClockEntry
                    && $entry->ended_at === null
                    && $entry->break_started_at !== null,
            )?->break_started_at?->toIso8601String();

        return response()->json([
            'date' => $targetDate->toDateString(),
            'label' => $targetDate->format('d/m'),
            'weekday' => $this->weekdayLabel($targetDate),
            'status' => $status,
            'planned_minutes' => $plannedMinutes,
            'planned_hours' => $this->minutesToHours($plannedMinutes),
            'worked_minutes' => $workedMinutes,
            'worked_hours' => $this->minutesToHours($workedMinutes),
            'break_minutes' => $breakMinutes,
            'break_hours' => $this->minutesToHours($breakMinutes),
            'compliance_percent' => $compliancePercent,
            'first_clock_in' => $firstClockIn,
            'last_clock_out' => $lastClockOut,
            'active_break_started_at' => $activeBreakStartedAt,
            'off_kind' => $plannedDayMeta['off_kind'],
            'entries' => $entries
                ->map(fn (TimeClockEntry $entry): array => $this->mapEntry($entry))
                ->values()
                ->all(),
        ]);
    }

    private function resolveSelectedIntern(Request $request, Collection $interns, bool $isInternUser, User $user): ?Intern
    {
        if ($isInternUser) {
            return $interns->firstWhere('user_id', $user->id);
        }

        $selectedInternId = $request->integer('intern_id');
        if ($selectedInternId > 0) {
            $selected = $interns->firstWhere('id', $selectedInternId);

            if ($selected instanceof Intern) {
                return $selected;
            }
        }

        $firstIntern = $interns->first();

        return $firstIntern instanceof Intern ? $firstIntern : null;
    }

    private function resolveActionIntern(Request $request, bool $requireForStaff): ?Intern
    {
        $user = $request->user();
        if ($user === null) {
            return null;
        }

        if ($user->hasRole('intern')) {
            return $user->intern()->first();
        }

        $internId = $request->integer('intern_id');
        if ($internId > 0) {
            return Intern::query()->find($internId);
        }

        if ($requireForStaff) {
            return null;
        }

        return Intern::query()
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->first();
    }

    private function canManageTeam(?User $user): bool
    {
        if ($user === null) {
            return false;
        }

        return $user->hasAnyRole(['admin', 'tutor']);
    }

    /**
     * @return array{intern_id: int, started_at: string, ended_at: string, break_minutes?: int, manual_reason: string}
     */
    private function validateManualEntryPayload(Request $request): array
    {
        return $request->validate([
            'intern_id' => ['required', 'integer', Rule::exists('interns', 'id')],
            'started_at' => ['required', 'date'],
            'ended_at' => ['required', 'date', 'after:started_at'],
            'break_minutes' => ['nullable', 'integer', 'min:0', 'max:720'],
            'manual_reason' => ['required', 'string', 'max:500'],
        ]);
    }

    private function normalizeRange(string $range): string
    {
        if (in_array($range, ['week', 'biweekly', 'month'], true)) {
            return $range;
        }

        return 'month';
    }

    private function normalizeMonthCursor(string $monthCursor): string
    {
        if (preg_match('/^\d{4}\-\d{2}$/', $monthCursor) === 1) {
            try {
                return Carbon::createFromFormat('Y-m', $monthCursor)->format('Y-m');
            } catch (\Throwable) {
                return now()->format('Y-m');
            }
        }

        return now()->format('Y-m');
    }

    private function resolveCalendarMonthCursor(string $requestedMonthCursor, Intern $intern): string
    {
        if (preg_match('/^\d{4}\-\d{2}$/', $requestedMonthCursor) === 1) {
            return $this->normalizeMonthCursor($requestedMonthCursor);
        }

        if ($intern->internship_start_date !== null) {
            return Carbon::parse($intern->internship_start_date)->format('Y-m');
        }

        return now()->format('Y-m');
    }

    private function resolveCalendarWeekAnchor(CarbonInterface $monthStart, Intern $intern): CarbonInterface
    {
        if ($intern->internship_start_date !== null) {
            $internshipStart = Carbon::parse($intern->internship_start_date)->startOfDay();

            if ($internshipStart->isSameMonth($monthStart)) {
                return $internshipStart;
            }
        }

        return $monthStart->isSameMonth(now())
            ? now()
            : $monthStart->copy();
    }

    /**
     * @return array{start: CarbonInterface, end: CarbonInterface, label: string}
     */
    private function resolveRangeWindow(string $range): array
    {
        $today = now();

        if ($range === 'week') {
            return [
                'start' => $today->copy()->startOfWeek(Carbon::MONDAY)->startOfDay(),
                'end' => $today->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay(),
                'label' => 'Semanal',
            ];
        }

        if ($range === 'biweekly') {
            return [
                'start' => $today->copy()->subDays(13)->startOfDay(),
                'end' => $today->copy()->endOfDay(),
                'label' => 'Quincenal',
            ];
        }

        return [
            'start' => $today->copy()->startOfMonth()->startOfDay(),
            'end' => $today->copy()->endOfMonth()->endOfDay(),
            'label' => 'Mensual',
        ];
    }

    /**
     * @return array<string, int>
     */
    private function buildWorkedMinutesByDate(Collection $entries): array
    {
        $workedByDate = [];

        foreach ($entries as $entry) {
            if (!$entry instanceof TimeClockEntry || !$entry->started_at) {
                continue;
            }

            $dateKey = $entry->started_at->toDateString();
            $workedByDate[$dateKey] = ($workedByDate[$dateKey] ?? 0) + $this->effectiveMinutesForEntry($entry);
        }

        return $workedByDate;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildDayRows(CarbonInterface $start, CarbonInterface $end, array $workedByDate, Collection $schedules): array
    {
        $rows = [];
        $today = now()->startOfDay();
        $cursor = $start->copy()->startOfDay();

        while ($cursor->lte($end)) {
            $dateKey = $cursor->toDateString();
            $workedMinutes = (int) ($workedByDate[$dateKey] ?? 0);
            $plannedDayMeta = $this->plannedDayMetaForDate($cursor, $schedules);
            $plannedMinutes = (int) $plannedDayMeta['planned_minutes'];
            $status = $this->resolveDayStatus($cursor, $workedMinutes, $plannedMinutes);

            $rows[] = [
                'date' => $dateKey,
                'label' => $cursor->format('d/m'),
                'weekday' => $this->weekdayLabel($cursor),
                'worked_minutes' => $workedMinutes,
                'planned_minutes' => $plannedMinutes,
                'worked_hours' => $this->minutesToHours($workedMinutes),
                'planned_hours' => $this->minutesToHours($plannedMinutes),
                'status' => $status,
                'off_kind' => $plannedDayMeta['off_kind'],
                'is_today' => $cursor->equalTo($today),
                'is_past' => $cursor->lt($today),
            ];

            $cursor = $cursor->addDay();
        }

        return $rows;
    }

    /**
     * @return array{range: array<string, mixed>, progress: array<string, mixed>}
     */
    private function buildSummaryData(Intern $intern, array $rangeWindow, array $rangeDays, Collection $allEntries): array
    {
        $rangeWorkedMinutes = (int) collect($rangeDays)->sum('worked_minutes');
        $rangePlannedMinutes = (int) collect($rangeDays)->sum('planned_minutes');
        $rangeCompliancePercent = $rangePlannedMinutes > 0
            ? round(($rangeWorkedMinutes / $rangePlannedMinutes) * 100, 1)
            : 0;

        $totalWorkedMinutes = (int) $allEntries->sum(fn ($entry) => $entry instanceof TimeClockEntry
            ? $this->effectiveMinutesForEntry($entry)
            : 0);
        $requiredHours = (int) ($intern->required_hours ?? 0);
        $requiredMinutes = max(0, $requiredHours * 60);
        $progressPercent = $requiredMinutes > 0
            ? min(100, round(($totalWorkedMinutes / $requiredMinutes) * 100, 1))
            : 0;
        $expectedPercent = $this->expectedProgressPercent($intern);

        return [
            'range' => [
                'label' => (string) ($rangeWindow['label'] ?? 'Mensual'),
                'start' => ($rangeWindow['start'] ?? now())->toDateString(),
                'end' => ($rangeWindow['end'] ?? now())->toDateString(),
                'worked_minutes' => $rangeWorkedMinutes,
                'worked_hours' => $this->minutesToHours($rangeWorkedMinutes),
                'planned_minutes' => $rangePlannedMinutes,
                'planned_hours' => $this->minutesToHours($rangePlannedMinutes),
                'compliance_percent' => $rangeCompliancePercent,
            ],
            'progress' => [
                'required_hours' => $requiredHours,
                'total_worked_minutes' => $totalWorkedMinutes,
                'total_worked_hours' => $this->minutesToHours($totalWorkedMinutes),
                'progress_percent' => $progressPercent,
                'expected_percent' => $expectedPercent,
            ],
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $recentDays
     * @return array<int, array<string, string>>
     */
    private function buildAlerts(array $summary, array $recentDays, ?TimeClockEntry $activeEntry, Collection $schedules): array
    {
        $alerts = [];
        $expectedPercent = data_get($summary, 'progress.expected_percent');
        $realPercent = (float) data_get($summary, 'progress.progress_percent', 0);
        $requiredHours = (int) data_get($summary, 'progress.required_hours', 0);
        $totalWorkedMinutes = (int) data_get($summary, 'progress.total_worked_minutes', 0);
        $rangeWorkedMinutes = (int) data_get($summary, 'range.worked_minutes', 0);
        $rangePlannedMinutes = (int) data_get($summary, 'range.planned_minutes', 0);
        $effectiveBelowPlanned = $rangePlannedMinutes > 0 && $rangeWorkedMinutes < $rangePlannedMinutes;
        $internshipHasStarted = is_numeric($expectedPercent) && (float) $expectedPercent > 0;
        $minimumGapMinutes = 60;
        $hasAnyActiveSchedule = $schedules->contains(
            fn ($schedule) => $schedule instanceof InternHourSchedule
                && $schedule->is_active
                && $schedule->starts_on !== null
        );

        if ($requiredHours > 0 && $totalWorkedMinutes === 0 && $internshipHasStarted) {
            $alerts[] = [
                'level' => 'warning',
                'title' => 'Sin horas efectivas',
                'message' => 'No hay horas efectivas registradas pese a que el periodo de practicas ya esta en curso.',
            ];
        }

        if ($requiredHours > 0 && $rangePlannedMinutes === 0 && !$hasAnyActiveSchedule) {
            $alerts[] = [
                'level' => 'info',
                'title' => 'Sin planificacion activa',
                'message' => 'No hay horarios activos configurados para este becario.',
            ];
        }

        if ($effectiveBelowPlanned && ($rangePlannedMinutes - $rangeWorkedMinutes) >= $minimumGapMinutes) {
            $workedHours = number_format($this->minutesToHours($rangeWorkedMinutes), 1);
            $plannedHours = number_format($this->minutesToHours($rangePlannedMinutes), 1);
            $alerts[] = [
                'level' => 'warning',
                'title' => 'Horas efectivas por debajo de planificadas',
                'message' => "Horas efectivas {$workedHours}h frente a {$plannedHours}h planificadas en el rango actual.",
            ];
        }

        $daysWithoutClocking = collect($recentDays)
            ->filter(function (array $day): bool {
                $date = (string) ($day['date'] ?? '');
                $plannedMinutes = (int) ($day['planned_minutes'] ?? 0);
                $workedMinutes = (int) ($day['worked_minutes'] ?? 0);

                return $date !== ''
                    && $plannedMinutes > 0
                    && $workedMinutes === 0;
            })
            ->count();

        if ($daysWithoutClocking >= 1) {
            $alerts[] = [
                'level' => 'warning',
                'title' => 'Dias sin fichaje',
                'message' => "Se han detectado {$daysWithoutClocking} dias recientes sin fichaje.",
            ];
        }

        if ($activeEntry !== null && $activeEntry->started_at?->lt(now()->subHours(12))) {
            $alerts[] = [
                'level' => 'info',
                'title' => 'Fichaje abierto',
                'message' => 'Hay un fichaje abierto con una duracion superior a 12 horas.',
            ];
        }

        $isInternshipFinished = is_numeric($expectedPercent) && (float) $expectedPercent >= 100;
        $isBehindRequiredGoal = is_numeric($expectedPercent)
            && (
                ($isInternshipFinished && $realPercent < 100)
                || (!$isInternshipFinished && $realPercent + 5 < (float) $expectedPercent)
            );

        if ($requiredHours > 0 && $isBehindRequiredGoal) {
            $workedHours = number_format($this->minutesToHours($totalWorkedMinutes), 1);
            $alerts[] = [
                'level' => 'warning',
                'title' => 'Desfase respecto al objetivo de horas requeridas',
                'message' => "Horas efectivas acumuladas {$workedHours}h de {$requiredHours}h requeridas.",
            ];
        }

        if (empty($alerts)) {
            if ($requiredHours <= 0) {
                $alerts[] = [
                    'level' => 'info',
                    'title' => 'Sin datos suficientes para evaluar',
                    'message' => 'El becario no tiene horas requeridas configuradas.',
                ];
            } else {
                $alerts[] = [
                    'level' => 'success',
                    'title' => 'Sin incidencias',
                    'message' => 'No se detectaron alertas relevantes en el periodo revisado.',
                ];
            }
        }

        return $alerts;
    }

    private function expectedProgressPercent(Intern $intern): ?float
    {
        if ($intern->internship_start_date === null || $intern->internship_end_date === null) {
            return null;
        }

        $start = Carbon::parse($intern->internship_start_date)->startOfDay();
        $end = Carbon::parse($intern->internship_end_date)->endOfDay();
        $today = now();

        if ($today->lte($start)) {
            return 0;
        }

        if ($today->gte($end)) {
            return 100;
        }

        $totalDays = max(1, $start->diffInDays($end));
        $elapsedDays = max(0, $start->diffInDays($today));

        return round(($elapsedDays / $totalDays) * 100, 1);
    }

    /**
     * @return array{planned_minutes: int, off_kind: 'rest'|'unscheduled'|null}
     */
    private function plannedDayMetaForDate(CarbonInterface $date, Collection $schedules): array
    {
        foreach ($schedules as $schedule) {
            if (!$schedule instanceof InternHourSchedule || !$schedule->is_active || !$schedule->starts_on) {
                continue;
            }

            $startsOn = Carbon::parse($schedule->starts_on)->startOfDay();
            $endsOn = $schedule->ends_on ? Carbon::parse($schedule->ends_on)->endOfDay() : null;

            if ($date->lt($startsOn)) {
                continue;
            }

            if ($endsOn !== null && $date->gt($endsOn)) {
                continue;
            }

            $plannedMinutes = match ($date->dayOfWeekIso) {
                1 => (int) $schedule->monday_minutes,
                2 => (int) $schedule->tuesday_minutes,
                3 => (int) $schedule->wednesday_minutes,
                4 => (int) $schedule->thursday_minutes,
                5 => (int) $schedule->friday_minutes,
                6 => (int) $schedule->saturday_minutes,
                7 => (int) $schedule->sunday_minutes,
                default => 0,
            };

            return [
                'planned_minutes' => $plannedMinutes,
                'off_kind' => $plannedMinutes === 0 ? 'rest' : null,
            ];
        }

        return [
            'planned_minutes' => 0,
            'off_kind' => 'unscheduled',
        ];
    }

    private function plannedMinutesForDate(CarbonInterface $date, Collection $schedules): int
    {
        return (int) $this->plannedDayMetaForDate($date, $schedules)['planned_minutes'];
    }

    private function resolveDayStatus(CarbonInterface $date, int $workedMinutes, int $plannedMinutes): string
    {
        if ($plannedMinutes === 0 && $workedMinutes === 0) {
            return 'off';
        }

        if ($plannedMinutes > 0 && $workedMinutes === 0) {
            return $date->isFuture() ? 'scheduled' : 'missing';
        }

        if ($plannedMinutes > 0 && $workedMinutes < $plannedMinutes) {
            return 'partial';
        }

        if ($workedMinutes > $plannedMinutes + 30) {
            return 'overtime';
        }

        return 'complete';
    }

    private function effectiveMinutesForEntry(TimeClockEntry $entry): int
    {
        if ($entry->started_at === null) {
            return 0;
        }

        $endedAt = $entry->ended_at ?? now();
        $grossMinutes = $this->elapsedWholeMinutes($entry->started_at, $endedAt);
        $breakMinutes = max(0, (int) $entry->break_minutes);

        if ($entry->ended_at === null && $entry->break_started_at !== null) {
            $breakMinutes += $this->elapsedWholeMinutes($entry->break_started_at, now());
        }

        $discountableBreakMinutes = max(0, $breakMinutes - self::INCLUDED_BREAK_MINUTES);

        return max(0, $grossMinutes - $discountableBreakMinutes);
    }

    private function minutesToHours(int $minutes): float
    {
        return round($minutes / 60, 2);
    }

    private function elapsedWholeMinutes(CarbonInterface $from, CarbonInterface $to): int
    {
        $seconds = max(0, $from->diffInSeconds($to));

        return (int) floor($seconds / 60);
    }

    private function weekdayLabel(CarbonInterface $date): string
    {
        return match ($date->dayOfWeekIso) {
            1 => 'Lun',
            2 => 'Mar',
            3 => 'Mie',
            4 => 'Jue',
            5 => 'Vie',
            6 => 'Sab',
            7 => 'Dom',
            default => '',
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function mapEntry(TimeClockEntry $entry): array
    {
        $effectiveMinutes = $this->effectiveMinutesForEntry($entry);

        return [
            'id' => $entry->id,
            'source' => $entry->source,
            'started_at' => $entry->started_at?->toIso8601String(),
            'ended_at' => $entry->ended_at?->toIso8601String(),
            'break_started_at' => $entry->break_started_at?->toIso8601String(),
            'break_minutes' => (int) $entry->break_minutes,
            'manual_reason' => $entry->manual_reason,
            'is_on_break' => $entry->break_started_at !== null,
            'effective_minutes' => $effectiveMinutes,
            'effective_hours' => $this->minutesToHours($effectiveMinutes),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapSchedule(InternHourSchedule $schedule): array
    {
        $weeklyTotal = (int) (
            $schedule->monday_minutes
            + $schedule->tuesday_minutes
            + $schedule->wednesday_minutes
            + $schedule->thursday_minutes
            + $schedule->friday_minutes
            + $schedule->saturday_minutes
            + $schedule->sunday_minutes
        );

        return [
            'id' => $schedule->id,
            'season_name' => $schedule->season_name,
            'starts_on' => $schedule->starts_on?->toDateString(),
            'ends_on' => $schedule->ends_on?->toDateString(),
            'is_active' => (bool) $schedule->is_active,
            'notes' => $schedule->notes,
            'weekly_total_minutes' => $weeklyTotal,
            'weekly_total_hours' => $this->minutesToHours($weeklyTotal),
            'days' => [
                'monday' => (int) $schedule->monday_minutes,
                'tuesday' => (int) $schedule->tuesday_minutes,
                'wednesday' => (int) $schedule->wednesday_minutes,
                'thursday' => (int) $schedule->thursday_minutes,
                'friday' => (int) $schedule->friday_minutes,
                'saturday' => (int) $schedule->saturday_minutes,
                'sunday' => (int) $schedule->sunday_minutes,
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function mapAbsence(InternAbsenceRequest $absence): array
    {
        return [
            'id' => $absence->id,
            'start_date' => $absence->start_date?->toDateString(),
            'end_date' => $absence->end_date?->toDateString(),
            'reason' => $absence->reason,
            'status' => $absence->status,
            'attachment_url' => $absence->attachment_url,
            'review_note' => $absence->review_note,
            'reviewed_at' => $absence->reviewed_at?->toIso8601String(),
            'requested_by_name' => $absence->requestedBy?->name,
            'reviewed_by_name' => $absence->reviewedBy?->name,
            'created_at' => $absence->created_at?->toIso8601String(),
        ];
    }
}
