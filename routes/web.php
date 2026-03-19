<?php

use App\Http\Controllers\EducationCenterController;
use App\Http\Controllers\InternController;
use App\Http\Controllers\PracticeTaskController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Rutas para la gestión de centros educativos:

    Route::get('education-centers', [EducationCenterController::class, 'index'])
        ->middleware('permission:education-centers.view')
        ->name('education-centers.index');

    Route::get('education-centers/export', [EducationCenterController::class, 'export'])
        ->middleware('permission:education-centers.view')
        ->name('education-centers.export');

    Route::get('education-centers/create', [EducationCenterController::class, 'create'])
        ->middleware('permission:education-centers.create')
        ->name('education-centers.create');

    Route::post('education-centers', [EducationCenterController::class, 'store'])
        ->middleware('permission:education-centers.create')
        ->name('education-centers.store');
    
    Route::get('education-centers/{education_center}', [EducationCenterController::class, 'show'])
        ->middleware('permission:education-centers.view')
        ->name('education-centers.show');

    Route::get('education-centers/{education_center}/edit', [EducationCenterController::class, 'edit'])
        ->middleware('permission:education-centers.view')
        ->name('education-centers.edit');

    Route::match(['put', 'patch'], 'education-centers/{education_center}', [EducationCenterController::class, 'update'])
        ->middleware('permission:education-centers.update')
        ->name('education-centers.update');

    Route::delete('education-centers/{education_center}', [EducationCenterController::class, 'destroy'])
        ->middleware('permission:education-centers.delete')
        ->name('education-centers.destroy');

        // Rutas para la gestión de becarios:

    Route::get('interns', [InternController::class, 'index'])
        ->middleware('permission:interns.view')
        ->name('interns.index');

    Route::get('interns/export', [InternController::class, 'export'])
        ->middleware('permission:interns.view')
        ->name('interns.export');

    Route::get('interns/create', [InternController::class, 'create'])
        ->middleware('permission:interns.create')
        ->name('interns.create');

    Route::post('interns', [InternController::class, 'store'])
        ->middleware('permission:interns.create')
        ->name('interns.store');

    Route::get('interns/{intern}', [InternController::class, 'show'])
        ->middleware('permission:interns.view')
        ->name('interns.show');

    Route::get('interns/{intern}/edit', [InternController::class, 'edit'])
        ->middleware('permission:interns.view')
        ->name('interns.edit');

    Route::match(['put', 'patch'], 'interns/{intern}', [InternController::class, 'update'])
        ->middleware('permission:interns.update')
        ->name('interns.update');

    Route::get('interns/{intern}/documents/{document}/{filename}/preview', [InternController::class, 'previewDocument'])
        ->where('filename', '^[^/]+$')
        ->middleware('permission:interns.view')
        ->name('interns.documents.preview');

    Route::get('interns/{intern}/documents/{document}/{filename}/download', [InternController::class, 'downloadDocument'])
        ->where('filename', '^[^/]+$')
        ->middleware('permission:interns.view')
        ->name('interns.documents.download');

    Route::delete('interns/{intern}', [InternController::class, 'destroy'])
        ->middleware('permission:interns.delete')
        ->name('interns.destroy');

        // Rutas para la gestión de tareas:

    Route::get('practice-tasks', [PracticeTaskController::class, 'index'])
        ->name('practice-tasks.index');

    Route::post('practice-task-types', [PracticeTaskController::class, 'storeType'])
        ->name('practice-task-types.store');

    Route::put('practice-task-types/{practice_task_type}', [PracticeTaskController::class, 'updateType'])
        ->name('practice-task-types.update');

    Route::post('practice-tasks', [PracticeTaskController::class, 'storeTask'])
        ->name('practice-tasks.store');

    Route::put('practice-tasks/{practice_task}', [PracticeTaskController::class, 'updateTask'])
        ->name('practice-tasks.update');

    Route::patch('practice-tasks/{practice_task}/status', [PracticeTaskController::class, 'updateStatus'])
        ->name('practice-tasks.status');

    Route::post('practice-tasks/{practice_task}/comments', [PracticeTaskController::class, 'storeComment'])
        ->name('practice-tasks.comments.store');

    Route::post('practice-tasks/{practice_task}/attachments', [PracticeTaskController::class, 'storeAttachment'])
        ->name('practice-tasks.attachments.store');
});

require __DIR__.'/settings.php';
