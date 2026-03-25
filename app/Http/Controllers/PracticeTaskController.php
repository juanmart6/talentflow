<?php

namespace App\Http\Controllers;

use App\Http\Requests\PracticeTasks\StorePracticeTaskRequest;
use App\Http\Requests\PracticeTasks\UpdatePracticeTaskRequest;
use App\Models\Intern;
use App\Models\PracticeTaskAttachment;
use App\Models\PracticeTaskMessage;
use App\Models\PracticeTask;
use App\Models\PracticeTaskStatusLog;
use App\Models\TrainingProgram;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PracticeTaskController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('practice-tasks', [
            'viewMode' => 'tutor',
            'interns' => $this->internOptions(),
            'trainingPrograms' => $this->trainingProgramOptions(),
            'tasks' => $this->taskCards(),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('practice-tasks/form', [
            'interns' => $this->internOptions(),
            'trainingPrograms' => $this->trainingProgramOptions(),
            'messages' => [],
            'taskAttachments' => [],
            'statusLogs' => [],
        ]);
    }

    public function edit(PracticeTask $practiceTask): Response
    {
        $practiceTask->load(['interns:id', 'createdBy:id,name']);

        return Inertia::render('practice-tasks/form', [
            'interns' => $this->internOptions(),
            'trainingPrograms' => $this->trainingProgramOptions(),
            'task' => $this->taskFormData($practiceTask),
            'messages' => $this->taskMessages($practiceTask),
            'taskAttachments' => $this->taskAttachments($practiceTask),
            'statusLogs' => $this->taskStatusLogs($practiceTask),
        ]);
    }

    public function store(StorePracticeTaskRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $targetInternIds = $this->resolveTargetInternIds($validated);

        try {
            foreach ($targetInternIds as $internId) {
                $task = PracticeTask::create([
                    'title' => $validated['title'],
                    'description' => $validated['description'] ?? null,
                    'status' => $validated['status'] ?? 'pending',
                    'assignment_mode' => $validated['assignment_mode'],
                    'training_program_id' => $validated['assignment_mode'] === 'training_program'
                        ? (int) $validated['training_program_id']
                        : null,
                    'due_at' => $validated['due_at'] ?? null,
                    'created_by_user_id' => $request->user()?->id,
                ]);

                $task->interns()->sync([
                    $internId => ['assigned_at' => now()],
                ]);

                if (($validated['tutor_spec_file'] ?? null) instanceof UploadedFile) {
                    $this->createTaskAttachment(
                        practiceTask: $task,
                        uploadedFile: $validated['tutor_spec_file'],
                        category: 'tutor_spec',
                        uploaderId: $request->user()?->id,
                    );
                }

                if (($validated['intern_deliverable_file'] ?? null) instanceof UploadedFile) {
                    $this->createTaskAttachment(
                        practiceTask: $task,
                        uploadedFile: $validated['intern_deliverable_file'],
                        category: 'intern_deliverable',
                        uploaderId: $request->user()?->id,
                    );
                }

                $this->logTaskStatusChange(
                    task: $task,
                    fromStatus: null,
                    toStatus: $task->status,
                    changedByUserId: $request->user()?->id,
                    notes: 'Creación de la tarea.',
                );
            }
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);

            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'No se pudo crear la tarea. Intenta de nuevo mas tarde.');
        }

        return redirect()
            ->route('practice-tasks.index')
            ->with('success', count($targetInternIds) > 1
                ? 'Tareas creadas correctamente (una por becario).'
                : 'Tarea creada correctamente.');
    }

    public function update(UpdatePracticeTaskRequest $request, PracticeTask $practiceTask): RedirectResponse
    {
        $validated = $request->validated();
        $fromStatus = $practiceTask->status;

        try {
            $practiceTask->update([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'status' => $validated['status'] ?? 'pending',
                'due_at' => $validated['due_at'] ?? null,
            ]);

            $this->logTaskStatusChange(
                task: $practiceTask,
                fromStatus: $fromStatus,
                toStatus: $practiceTask->status,
                changedByUserId: $request->user()?->id,
                notes: 'Cambio de estado desde edición de la tarea.',
            );
        } catch (ValidationException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);

            return redirect()
                ->back()
                ->withInput()
                ->with('error', 'No se pudo actualizar la tarea. Intenta de nuevo mas tarde.');
        }

        return redirect()
            ->route('practice-tasks.index')
            ->with('success', 'Tarea actualizada correctamente.');
    }

    public function updateStatus(Request $request, PracticeTask $practiceTask): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['pending', 'in_progress', 'in_review', 'completed'])],
        ]);

        $fromStatus = $practiceTask->status;

        $practiceTask->update([
            'status' => $validated['status'],
        ]);

        $this->logTaskStatusChange(
            task: $practiceTask,
            fromStatus: $fromStatus,
            toStatus: $validated['status'],
            changedByUserId: $request->user()?->id,
            notes: 'Cambio de estado desde tablero Kanban.',
        );

        return redirect()
            ->route('practice-tasks.index')
            ->with('success', 'Estado actualizado correctamente.');
    }

    public function destroy(PracticeTask $practiceTask): RedirectResponse
    {
        $practiceTask->delete();

        return redirect()
            ->route('practice-tasks.index')
            ->with('success', 'Tarea eliminada correctamente.');
    }

    public function storeMessage(Request $request, PracticeTask $practiceTask): RedirectResponse
    {
        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $authorRole = $request->user()?->can('practice-tasks.update') ? 'tutor' : 'intern';

        PracticeTaskMessage::create([
            'practice_task_id' => $practiceTask->id,
            'author_id' => $request->user()?->id,
            'author_role' => $authorRole,
            'body' => trim($validated['body']),
        ]);

        return redirect()
            ->back()
            ->with('success', 'Mensaje enviado correctamente.');
    }

    public function storeTaskAttachment(Request $request, PracticeTask $practiceTask): RedirectResponse
    {
        $validated = $request->validate([
            'category' => ['required', Rule::in(['tutor_spec', 'intern_deliverable'])],
            'file' => ['required', 'file', 'max:10240', 'mimes:pdf,jpeg,jpg,png,doc,docx,xls,xlsx,ppt,pptx,txt,zip,rar'],
        ]);

        /** @var UploadedFile $uploadedFile */
        $uploadedFile = $validated['file'];
        $this->createTaskAttachment(
            practiceTask: $practiceTask,
            uploadedFile: $uploadedFile,
            category: $validated['category'],
            uploaderId: $request->user()?->id,
        );

        return redirect()
            ->back()
            ->with('success', 'Archivo subido correctamente.');
    }

    public function destroyTaskAttachment(PracticeTask $practiceTask, PracticeTaskAttachment $practiceTaskAttachment): RedirectResponse
    {
        if ((int) $practiceTaskAttachment->practice_task_id !== (int) $practiceTask->id) {
            return redirect()
                ->back()
                ->with('error', 'El adjunto no pertenece a la tarea seleccionada.');
        }

        if ($practiceTaskAttachment->path && Storage::disk('public')->exists($practiceTaskAttachment->path)) {
            Storage::disk('public')->delete($practiceTaskAttachment->path);
        }

        $practiceTaskAttachment->delete();

        return redirect()
            ->back()
            ->with('success', 'Adjunto eliminado correctamente.');
    }

    private function internOptions()
    {
        return Intern::query()
            ->with('trainingProgram:id,name')
            ->where('status', '!=', 'abandoned')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get(['id', 'first_name', 'last_name', 'training_program_id'])
            ->map(fn (Intern $intern): array => [
                'id' => (string) $intern->id,
                'name' => trim($intern->first_name.' '.$intern->last_name),
                'trainingProgramId' => $intern->training_program_id ? (string) $intern->training_program_id : null,
                'trainingProgramName' => $intern->trainingProgram?->name,
            ])
            ->values();
    }

    private function trainingProgramOptions()
    {
        return TrainingProgram::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (TrainingProgram $trainingProgram): array => [
                'id' => (string) $trainingProgram->id,
                'name' => $trainingProgram->name,
            ])
            ->values();
    }

    private function taskCards()
    {
        return PracticeTask::query()
            ->with([
                'interns:id,first_name,last_name',
                'trainingProgram:id,name',
                'latestStatusLog' => function ($query): void {
                    $query->select([
                        'practice_task_status_logs.id',
                        'practice_task_status_logs.practice_task_id',
                        'practice_task_status_logs.changed_by_user_id',
                        'practice_task_status_logs.changed_at',
                    ])->with('changedByUser:id,name');
                },
            ])
            ->latest('id')
            ->get(['id', 'title', 'description', 'status', 'assignment_mode', 'training_program_id', 'due_at'])
            ->map(function (PracticeTask $task): array {
                $internIds = $task->interns
                    ->pluck('id')
                    ->map(fn ($id): string => (string) $id)
                    ->values()
                    ->all();

                $internNames = $task->interns
                    ->map(fn (Intern $intern): string => trim($intern->first_name.' '.$intern->last_name))
                    ->values()
                    ->all();

                return [
                    'id' => (string) $task->id,
                    'title' => $task->title,
                    'description' => $task->description ?? '',
                    'status' => $task->status,
                    'assignmentMode' => $task->assignment_mode ?? 'interns',
                    'trainingProgramId' => $task->training_program_id ? (string) $task->training_program_id : null,
                    'trainingProgramName' => $task->trainingProgram?->name,
                    'internIds' => $internIds,
                    'internNames' => $internNames,
                    'dueAt' => $task->due_at?->format('d/m/Y') ?? '',
                    'latestStatusChangedAt' => $task->latestStatusLog?->changed_at?->toDateTimeString(),
                    'latestStatusChangedBy' => $task->latestStatusLog?->changedByUser?->name ?? 'Sistema',
                ];
            })
            ->values();
    }

    private function taskFormData(PracticeTask $task): array
    {
        return [
            'id' => (string) $task->id,
            'title' => $task->title,
            'description' => $task->description ?? '',
            'status' => $task->status,
            'assignment_mode' => $task->assignment_mode ?? 'interns',
            'training_program_id' => $task->training_program_id ? (string) $task->training_program_id : '',
            'due_at' => $task->due_at?->format('Y-m-d') ?? '',
            'intern_ids' => $task->interns
                ->pluck('id')
                ->map(fn ($id): string => (string) $id)
                ->values()
                ->all(),
            'created_by_name' => $task->createdBy?->name ?? 'Sistema',
            'created_at' => $task->created_at?->toDateTimeString(),
        ];
    }

    private function taskMessages(PracticeTask $task): array
    {
        return $task->messages()
            ->with('author:id,name')
            ->orderBy('created_at')
            ->get(['id', 'practice_task_id', 'author_id', 'author_role', 'body', 'created_at'])
            ->map(fn (PracticeTaskMessage $message): array => [
                'id' => $message->id,
                'author_name' => $message->author?->name ?? 'Usuario',
                'author_role' => $message->author_role,
                'body' => $message->body,
                'created_at' => $message->created_at?->toDateTimeString(),
            ])
            ->values()
            ->all();
    }

    private function taskAttachments(PracticeTask $task): array
    {
        return $task->taskAttachments()
            ->with('uploader:id,name')
            ->latest('id')
            ->get(['id', 'practice_task_id', 'uploader_id', 'category', 'original_name', 'path', 'mime', 'size', 'created_at'])
            ->map(fn (PracticeTaskAttachment $attachment): array => [
                'id' => $attachment->id,
                'category' => $attachment->category,
                'original_name' => $attachment->original_name,
                'url' => Storage::url($attachment->path),
                'mime' => $attachment->mime,
                'size' => $attachment->size,
                'uploader_name' => $attachment->uploader?->name ?? 'Usuario',
                'created_at' => $attachment->created_at?->toDateTimeString(),
            ])
            ->values()
            ->all();
    }

    private function taskStatusLogs(PracticeTask $task): array
    {
        return $task->statusLogs()
            ->with('changedByUser:id,name')
            ->latest('changed_at')
            ->latest('id')
            ->get(['id', 'practice_task_id', 'from_status', 'to_status', 'changed_by_user_id', 'changed_at', 'notes'])
            ->map(fn (PracticeTaskStatusLog $log): array => [
                'id' => $log->id,
                'from_status' => $log->from_status,
                'to_status' => $log->to_status,
                'changed_by_name' => $log->changedByUser?->name ?? 'Sistema',
                'changed_at' => $log->changed_at?->toDateTimeString(),
                'notes' => $log->notes,
            ])
            ->values()
            ->all();
    }

    private function resolveTargetInternIds(array $validated): array
    {
        if (($validated['assignment_mode'] ?? 'interns') === 'training_program') {
            $internIds = $this->resolveInternIdsForTrainingProgram((int) $validated['training_program_id']);

            if ($internIds === []) {
                throw ValidationException::withMessages([
                    'training_program_id' => 'No hay becarios disponibles en el grado seleccionado.',
                ]);
            }

            return array_map('intval', $internIds);
        }

        $internIds = array_values(array_unique(array_map('intval', $validated['intern_ids'] ?? [])));

        if ($internIds === []) {
            throw ValidationException::withMessages([
                'intern_ids' => 'Selecciona al menos un becario.',
            ]);
        }

        return $internIds;
    }

    private function resolveInternIdsForTrainingProgram(int $trainingProgramId): array
    {
        return Intern::query()
            ->where('training_program_id', $trainingProgramId)
            ->where('status', '!=', 'abandoned')
            ->pluck('id')
            ->all();
    }

    private function createTaskAttachment(
        PracticeTask $practiceTask,
        UploadedFile $uploadedFile,
        string $category,
        ?int $uploaderId = null,
    ): void {
        $path = $uploadedFile->store("practice-tasks/{$practiceTask->id}/{$category}", 'public');

        PracticeTaskAttachment::create([
            'practice_task_id' => $practiceTask->id,
            'uploader_id' => $uploaderId,
            'category' => $category,
            'original_name' => $uploadedFile->getClientOriginalName(),
            'path' => $path,
            'mime' => $uploadedFile->getClientMimeType(),
            'size' => (int) $uploadedFile->getSize(),
        ]);
    }

    private function logTaskStatusChange(
        PracticeTask $task,
        ?string $fromStatus,
        string $toStatus,
        ?int $changedByUserId = null,
        ?string $notes = null,
    ): void {
        if ($fromStatus === $toStatus) {
            return;
        }

        $latestLog = $task->statusLogs()
            ->latest('changed_at')
            ->latest('id')
            ->first(['from_status', 'to_status']);

        if (
            $latestLog !== null
            && $latestLog->from_status === $fromStatus
            && $latestLog->to_status === $toStatus
        ) {
            return;
        }

        PracticeTaskStatusLog::create([
            'practice_task_id' => $task->id,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'changed_by_user_id' => $changedByUserId,
            'changed_at' => now(),
            'notes' => $notes,
        ]);
    }
}

