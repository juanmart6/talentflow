<?php

use App\Http\Controllers\EducationCenterController;
use App\Http\Controllers\InternController;
use App\Models\Intern;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {

    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Rutas para la gestiÃ³n de centros educativos:

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

        // Rutas para la gestiÃ³n de becarios:

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

    Route::get('practice-tasks', function (Request $request) {
        $viewMode = $request->user()?->hasAnyRole(['admin', 'tutor']) ? 'tutor' : 'intern';

        return Inertia::render('practice-tasks', [
            'viewMode' => $viewMode,
            'interns' => $viewMode === 'tutor'
                ? Intern::query()
                    ->get(['id', 'first_name', 'last_name'])
                    ->map(fn (Intern $intern): array => [
                        'id' => (string) $intern->id,
                        'name' => trim("{$intern->first_name} {$intern->last_name}"),
                    ])
                    ->sortBy(fn (array $intern): string => mb_strtolower(Str::ascii($intern['name'])))
                    ->values()
                : [],
        ]);
    })
        ->name('practice-tasks.index');
});

require __DIR__.'/settings.php';

