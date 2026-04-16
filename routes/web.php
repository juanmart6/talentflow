<?php

use App\Http\Controllers\EducationCenterController;
use App\Http\Controllers\InternController;
use App\Http\Controllers\PracticeTaskController;
use App\Http\Controllers\TimeControlController;
use App\Http\Controllers\UserManagementController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth'])->group(function () {

    Route::get('dashboard', function (Request $request) {
        $user = $request->user();

        if ($user?->hasRole('intern')) {
            return redirect()->route('practice-tasks.index');
        }

        abort_unless($user?->hasAnyRole(['admin', 'tutor']), 403, 'USER DOES NOT HAVE THE RIGHT ROLES.');

        return Inertia::render('dashboard');
    })->name('dashboard');

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

    Route::delete('education-centers/{education_center}/agreements/{agreement}', [EducationCenterController::class, 'destroyAgreement'])
        ->middleware('permission:education-centers.update')
        ->name('education-centers.agreements.destroy');

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

    Route::post('interns/{intern}/invite-access', [InternController::class, 'inviteAccess'])
        ->middleware('permission:interns.update')
        ->name('interns.invite-access');

        // Rutas para el módulo de prácticas y tareas:

    Route::get('practice-tasks', [PracticeTaskController::class, 'index'])
        ->middleware('permission:practice-tasks.view')
        ->name('practice-tasks.index');

    Route::get('practice-tasks/create', [PracticeTaskController::class, 'create'])
        ->middleware('permission:practice-tasks.create')
        ->name('practice-tasks.create');
    
    Route::post('practice-tasks', [PracticeTaskController::class, 'store'])
        ->middleware('permission:practice-tasks.create')
        ->name('practice-tasks.store');

    Route::patch('practice-tasks/reorder', [PracticeTaskController::class, 'reorder'])
        ->middleware('permission:practice-tasks.update')
        ->name('practice-tasks.reorder');

    Route::get('practice-tasks/{practice_task}/edit', [PracticeTaskController::class, 'edit'])
        ->middleware('permission:practice-tasks.update')
        ->name('practice-tasks.edit');

    Route::match(['put', 'patch'], 'practice-tasks/{practice_task}', [PracticeTaskController::class, 'update'])
        ->middleware('permission:practice-tasks.update')
        ->name('practice-tasks.update');

    Route::patch('practice-tasks/{practice_task}/status', [PracticeTaskController::class, 'updateStatus'])
        ->middleware('permission:practice-tasks.update')
        ->name('practice-tasks.update-status');

    Route::post('practice-tasks/{practice_task}/messages', [PracticeTaskController::class, 'storeMessage'])
        ->middleware('permission:practice-tasks.update')
        ->name('practice-tasks.messages.store');

    Route::post('practice-tasks/{practice_task}/attachments', [PracticeTaskController::class, 'storeTaskAttachment'])
        ->middleware('permission:practice-tasks.update')
        ->name('practice-tasks.attachments.store');

    Route::delete('practice-tasks/{practice_task}/attachments/{practice_task_attachment}', [PracticeTaskController::class, 'destroyTaskAttachment'])
        ->middleware('permission:practice-tasks.update')
        ->name('practice-tasks.attachments.destroy');

    Route::delete('practice-tasks/{practice_task}', [PracticeTaskController::class, 'destroy'])
        ->middleware('permission:practice-tasks.delete')
        ->name('practice-tasks.destroy');


    // Rutas para el modulo de control horario:

    Route::get('control-horario', [TimeControlController::class, 'index'])
        ->middleware('permission:time-control.view')
        ->name('time-control.index');

    Route::post('control-horario/clock-in', [TimeControlController::class, 'clockIn'])
        ->middleware('permission:time-control.update')
        ->name('time-control.clock-in');

    Route::post('control-horario/start-break', [TimeControlController::class, 'startBreak'])
        ->middleware('permission:time-control.update')
        ->name('time-control.start-break');

    Route::post('control-horario/end-break', [TimeControlController::class, 'endBreak'])
        ->middleware('permission:time-control.update')
        ->name('time-control.end-break');

    Route::post('control-horario/clock-out', [TimeControlController::class, 'clockOut'])
        ->middleware('permission:time-control.update')
        ->name('time-control.clock-out');

    Route::post('control-horario/manual-entry', [TimeControlController::class, 'storeManualEntry'])
        ->middleware('permission:time-control.manual-entry')
        ->name('time-control.manual-entry');

    Route::post('control-horario/schedules', [TimeControlController::class, 'upsertSchedule'])
        ->middleware('permission:time-control.manage-schedules')
        ->name('time-control.schedules.upsert');

    Route::delete('control-horario/schedules/{schedule}', [TimeControlController::class, 'destroySchedule'])
        ->middleware('permission:time-control.manage-schedules')
        ->name('time-control.schedules.destroy');

    Route::post('control-horario/absences', [TimeControlController::class, 'storeAbsenceRequest'])
        ->middleware('permission:time-control.update')
        ->name('time-control.absences.store');

    Route::patch('control-horario/absences/{absence}/review', [TimeControlController::class, 'reviewAbsenceRequest'])
        ->middleware('permission:time-control.approve-absences')
        ->name('time-control.absences.review');

    Route::get('control-horario/export/pdf', [TimeControlController::class, 'exportPdf'])
        ->middleware('permission:time-control.export')
        ->name('time-control.export.pdf');

        // Rutas para el módulo Usuarios y permisos:

    Route::get('access-permissions', [UserManagementController::class, 'index'])
        ->middleware('role_or_permission:admin|users.manage')
        ->name('users.index');

    Route::patch('access-permissions/{user}/role', [UserManagementController::class, 'updateRole'])
        ->middleware('role_or_permission:admin|users.manage')
        ->name('users.update-role');

    Route::patch('access-permissions/roles/{role}/permissions', [UserManagementController::class, 'updateRolePermissions'])
        ->middleware('role_or_permission:admin|users.manage')
        ->name('users.update-role-permissions');

    Route::post('access-permissions/invitaciones', [UserManagementController::class, 'storeInvitation'])
        ->middleware('role_or_permission:admin|users.manage')
        ->name('users.invitations.store');

    Route::delete('access-permissions/invitaciones/{invitation}', [UserManagementController::class, 'destroyInvitation'])
        ->middleware('role_or_permission:admin|users.manage')
        ->name('users.invitations.destroy');

    Route::delete('access-permissions/{user}', [UserManagementController::class, 'destroyUser'])
        ->middleware('role_or_permission:admin|users.manage')
        ->name('users.destroy');

});

    Route::get('/invitaciones/{token}', [UserManagementController::class, 'showInvitation'])
    ->name('users.invitations.show');

    Route::post('/invitaciones/{token}', [UserManagementController::class, 'acceptInvitation'])
    ->name('users.invitations.accept');

require __DIR__.'/settings.php';
