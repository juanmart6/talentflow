<?php

namespace App\Http\Controllers;

use App\Http\Requests\PracticeTasks\StorePracticeTaskRequest;
use App\Http\Requests\PracticeTasks\UpdatePracticeTaskRequest;
use App\Models\Intern;
use App\Models\PracticeTask;
use App\Models\TrainingProgram;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
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
        ]);
    }

    public function edit(PracticeTask $practiceTask): Response
    {
        $practiceTask->load('interns:id');

        return Inertia::render('practice-tasks/form', [
            'interns' => $this->internOptions(),
            'trainingPrograms' => $this->trainingProgramOptions(),
            'task' => $this->taskFormData($practiceTask),
        ]);
    }

    public function store(StorePracticeTaskRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        try {
            $task = PracticeTask::create([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'practice_type' => $validated['practice_type'],
                'status' => $validated['status'] ?? 'pending',
                'assignment_mode' => $validated['assignment_mode'],
                'training_program_id' => $validated['assignment_mode'] === 'training_program'
                    ? (int) $validated['training_program_id']
                    : null,
                'due_at' => $validated['due_at'] ?? null,
                'attachments' => [],
                'created_by_user_id' => $request->user()?->id,
            ]);

            $this->syncTaskInternAssignments($task, $validated);

            if ($request->hasFile('attachments')) {
                $storedAttachments = $this->storeAttachments($task, $request->file('attachments'));

                $task->update([
                    'attachments' => $storedAttachments,
                ]);
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
            ->with('success', 'Tarea creada correctamente.');
    }

    public function update(UpdatePracticeTaskRequest $request, PracticeTask $practiceTask): RedirectResponse
    {
        $validated = $request->validated();

        try {
            $practiceTask->update([
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'practice_type' => $validated['practice_type'],
                'status' => $validated['status'] ?? 'pending',
                'assignment_mode' => $validated['assignment_mode'],
                'training_program_id' => $validated['assignment_mode'] === 'training_program'
                    ? (int) $validated['training_program_id']
                    : null,
                'due_at' => $validated['due_at'] ?? null,
            ]);

            $this->syncTaskInternAssignments($practiceTask, $validated);

            if ($request->hasFile('attachments')) {
                $storedAttachments = $this->storeAttachments($practiceTask, $request->file('attachments'));
                $existingAttachments = $practiceTask->attachments ?? [];

                $practiceTask->update([
                    'attachments' => [...$existingAttachments, ...$storedAttachments],
                ]);
            }
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

        $practiceTask->update([
            'status' => $validated['status'],
        ]);

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

    /**
     * @param array<int, UploadedFile>|UploadedFile $files
     * @return array<int, array{name: string, path: string}>
     */
    private function storeAttachments(PracticeTask $task, array|UploadedFile $files): array
    {
        $normalizedFiles = is_array($files) ? $files : [$files];

        return collect($normalizedFiles)
            ->map(function (UploadedFile $file) use ($task): array {
                $path = $file->store("practice-tasks/{$task->id}/attachments", 'public');

                return [
                    'name' => $file->getClientOriginalName(),
                    'path' => $path,
                ];
            })
            ->values()
            ->all();
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
            ->with(['interns:id,first_name,last_name', 'trainingProgram:id,name'])
            ->latest('id')
            ->get(['id', 'title', 'description', 'practice_type', 'status', 'assignment_mode', 'training_program_id', 'due_at'])
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
                    'practiceType' => $task->practice_type,
                    'status' => $task->status,
                    'assignmentMode' => $task->assignment_mode ?? 'interns',
                    'trainingProgramId' => $task->training_program_id ? (string) $task->training_program_id : null,
                    'trainingProgramName' => $task->trainingProgram?->name,
                    'internIds' => $internIds,
                    'internNames' => $internNames,
                    'dueAt' => $task->due_at?->format('d/m/Y') ?? '',
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
            'practice_type' => $task->practice_type,
            'status' => $task->status,
            'assignment_mode' => $task->assignment_mode ?? 'interns',
            'training_program_id' => $task->training_program_id ? (string) $task->training_program_id : '',
            'due_at' => $task->due_at?->format('Y-m-d') ?? '',
            'intern_ids' => $task->interns
                ->pluck('id')
                ->map(fn ($id): string => (string) $id)
                ->values()
                ->all(),
        ];
    }

    private function syncTaskInternAssignments(PracticeTask $task, array $validated): void
    {
        if (($validated['assignment_mode'] ?? 'interns') === 'training_program') {
            $trainingProgramId = (int) $validated['training_program_id'];

            $internIds = Intern::query()
                ->where('training_program_id', $trainingProgramId)
                ->where('status', '!=', 'abandoned')
                ->pluck('id')
                ->all();

            if ($internIds === []) {
                throw ValidationException::withMessages([
                    'training_program_id' => 'No hay becarios disponibles en el grado seleccionado.',
                ]);
            }

            $task->interns()->sync(
                collect($internIds)
                    ->mapWithKeys(fn ($internId): array => [(int) $internId => ['assigned_at' => now()]])
                    ->all(),
            );

            return;
        }

        $task->interns()->sync(
            collect($validated['intern_ids'] ?? [])
                ->mapWithKeys(fn ($internId): array => [(int) $internId => ['assigned_at' => now()]])
                ->all(),
        );
    }
}

