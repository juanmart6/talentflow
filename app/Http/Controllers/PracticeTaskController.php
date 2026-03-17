<?php

namespace App\Http\Controllers;

use App\Models\Intern;
use App\Models\PracticeTask;
use App\Models\PracticeTaskAttachment;
use App\Models\PracticeTaskComment;
use App\Models\PracticeTaskStatusHistory;
use App\Models\PracticeTaskType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class PracticeTaskController extends Controller
{
    private const STATUSES = ['pending', 'in_progress', 'in_review', 'completed', 'rejected'];
    private const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
    private const ATTACHMENT_KINDS = ['specification', 'deliverable'];

    public function index(Request $request): Response
    {
        $search = trim((string) $request->string('search')->toString());
        $internId = $request->integer('intern_id');
        $practiceTypeId = $request->integer('practice_task_type_id');
        $dueFilter = trim((string) $request->string('due_filter')->toString());

        $today = now()->startOfDay();
        $nextWeek = now()->addDays(7)->endOfDay();

        $tasks = PracticeTask::query()
            ->with(['type', 'interns:id,first_name,last_name', 'comments.creator:id,name', 'attachments', 'statusHistory.changer:id,name'])
            ->when($search !== '', function ($query) use ($search) {
                $normalized = '%'.mb_strtolower($search).'%';
                $query->where(function ($subQuery) use ($normalized) {
                    $subQuery
                        ->whereRaw('LOWER(title) LIKE ?', [$normalized])
                        ->orWhereRaw('LOWER(description) LIKE ?', [$normalized]);
                });
            })
            ->when($internId, fn ($query) => $query->whereHas('interns', fn ($subQuery) => $subQuery->where('interns.id', $internId)))
            ->when($practiceTypeId, fn ($query) => $query->where('practice_task_type_id', $practiceTypeId))
            ->when($dueFilter !== '', function ($query) use ($dueFilter, $today, $nextWeek) {
                if ($dueFilter === 'overdue') {
                    $query->whereNotNull('due_at')->where('due_at', '<', $today)->whereNotIn('status', ['completed', 'rejected']);
                }

                if ($dueFilter === 'upcoming') {
                    $query->whereNotNull('due_at')->whereBetween('due_at', [$today, $nextWeek])->whereNotIn('status', ['completed', 'rejected']);
                }
            })
            ->orderByRaw("
                CASE status
                    WHEN 'pending' THEN 1
                    WHEN 'in_progress' THEN 2
                    WHEN 'in_review' THEN 3
                    WHEN 'completed' THEN 4
                    WHEN 'rejected' THEN 5
                    ELSE 6
                END
            ")
            ->orderBy('due_at')
            ->get()
            ->map(fn (PracticeTask $task): array => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status,
                'priority' => $task->priority,
                'due_at' => $task->due_at?->toDateTimeString(),
                'type' => $task->type ? [
                    'id' => $task->type->id,
                    'name' => $task->type->name,
                ] : null,
                'interns' => $task->interns->map(fn (Intern $intern): array => [
                    'id' => $intern->id,
                    'name' => trim("{$intern->first_name} {$intern->last_name}"),
                ])->values()->all(),
                'comments' => $task->comments->map(fn (PracticeTaskComment $comment): array => [
                    'id' => $comment->id,
                    'body' => $comment->body,
                    'is_feedback' => $comment->is_feedback,
                    'author' => $comment->creator?->name ?? 'Sistema',
                    'created_at' => $comment->created_at?->toDateTimeString(),
                ])->values()->all(),
                'attachments' => $task->attachments->map(fn (PracticeTaskAttachment $attachment): array => [
                    'id' => $attachment->id,
                    'kind' => $attachment->attachment_kind,
                    'file_name' => $attachment->file_name,
                    'url' => Storage::disk('public')->url($attachment->file_path),
                    'uploaded_at' => $attachment->created_at?->toDateTimeString(),
                ])->values()->all(),
                'status_history' => $task->statusHistory->map(fn (PracticeTaskStatusHistory $history): array => [
                    'id' => $history->id,
                    'from_status' => $history->from_status,
                    'to_status' => $history->to_status,
                    'changed_by' => $history->changer?->name ?? 'Sistema',
                    'created_at' => $history->created_at?->toDateTimeString(),
                ])->values()->all(),
            ])
            ->values();

        return Inertia::render('practice-tasks', [
            'tasks' => $tasks,
            'practiceTypes' => PracticeTaskType::query()->orderBy('name')->get(['id', 'name', 'description', 'is_active']),
            'interns' => Intern::query()->orderBy('last_name')->orderBy('first_name')->get(['id', 'first_name', 'last_name']),
            'filters' => [
                'search' => $search,
                'intern_id' => $internId,
                'practice_task_type_id' => $practiceTypeId,
                'due_filter' => $dueFilter,
            ],
            'statusOptions' => self::STATUSES,
            'priorityOptions' => self::PRIORITIES,
            'attachmentKindOptions' => self::ATTACHMENT_KINDS,
        ]);
    }

    public function storeType(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['nullable', 'boolean'],
        ]);

        PracticeTaskType::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'is_active' => (bool) ($validated['is_active'] ?? true),
        ]);

        return back()->with('success', 'Tipo de práctica creado correctamente.');
    }

    public function updateType(Request $request, PracticeTaskType $practiceTaskType): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'is_active' => ['required', 'boolean'],
        ]);

        $practiceTaskType->update($validated);

        return back()->with('success', 'Tipo de práctica actualizado correctamente.');
    }

    public function storeTask(Request $request): RedirectResponse
    {
        $validated = $this->validateTask($request);

        $task = PracticeTask::create([
            'practice_task_type_id' => $validated['practice_task_type_id'] ?? null,
            'created_by' => $request->user()?->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
            'priority' => $validated['priority'],
            'due_at' => $validated['due_at'] ?? null,
        ]);

        $task->interns()->sync($validated['intern_ids']);
        $this->recordStatusChange($task, null, $task->status, $request->user()?->id);

        return back()->with('success', 'Tarea creada correctamente.');
    }

    public function updateTask(Request $request, PracticeTask $practiceTask): RedirectResponse
    {
        $validated = $this->validateTask($request);
        $previousStatus = $practiceTask->status;

        $practiceTask->update([
            'practice_task_type_id' => $validated['practice_task_type_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
            'priority' => $validated['priority'],
            'due_at' => $validated['due_at'] ?? null,
        ]);

        $practiceTask->interns()->sync($validated['intern_ids']);

        if ($previousStatus !== $validated['status']) {
            $this->recordStatusChange($practiceTask, $previousStatus, $validated['status'], $request->user()?->id);
        }

        return back()->with('success', 'Tarea actualizada correctamente.');
    }

    public function updateStatus(Request $request, PracticeTask $practiceTask): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:'.implode(',', self::STATUSES)],
        ]);

        $previousStatus = $practiceTask->status;
        $practiceTask->update(['status' => $validated['status']]);

        if ($previousStatus !== $validated['status']) {
            $this->recordStatusChange($practiceTask, $previousStatus, $validated['status'], $request->user()?->id);
        }

        return back()->with('success', 'Estado de la tarea actualizado.');
    }

    public function storeComment(Request $request, PracticeTask $practiceTask): RedirectResponse
    {
        $validated = $request->validate([
            'body' => ['required', 'string', 'max:3000'],
            'is_feedback' => ['nullable', 'boolean'],
        ]);

        $practiceTask->comments()->create([
            'created_by' => $request->user()?->id,
            'body' => $validated['body'],
            'is_feedback' => (bool) ($validated['is_feedback'] ?? false),
        ]);

        return back()->with('success', 'Comentario añadido correctamente.');
    }

    public function storeAttachment(Request $request, PracticeTask $practiceTask): RedirectResponse
    {
        $validated = $request->validate([
            'attachment_kind' => ['required', 'in:'.implode(',', self::ATTACHMENT_KINDS)],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx,txt', 'max:10240'],
        ]);

        $path = $request->file('file')->store("practice-tasks/{$practiceTask->id}", 'public');

        $practiceTask->attachments()->create([
            'created_by' => $request->user()?->id,
            'attachment_kind' => $validated['attachment_kind'],
            'file_name' => $request->file('file')->getClientOriginalName(),
            'file_path' => $path,
        ]);

        return back()->with('success', 'Archivo adjunto subido correctamente.');
    }

    private function validateTask(Request $request): array
    {
        return $request->validate([
            'practice_task_type_id' => ['nullable', 'exists:practice_task_types,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'status' => ['required', 'in:'.implode(',', self::STATUSES)],
            'priority' => ['required', 'in:'.implode(',', self::PRIORITIES)],
            'due_at' => ['nullable', 'date'],
            'intern_ids' => ['required', 'array', 'min:1'],
            'intern_ids.*' => ['integer', 'exists:interns,id'],
        ]);
    }

    private function recordStatusChange(PracticeTask $task, ?string $fromStatus, string $toStatus, ?int $userId): void
    {
        $task->statusHistory()->create([
            'changed_by' => $userId,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
        ]);
    }
}
