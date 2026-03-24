import { Head, Link, useForm } from '@inertiajs/react';
import { useMemo, useState, type FormEvent } from 'react';
import { FieldLabel, FormPageHeader, SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UI_PRESETS } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import practiceTasks from '@/routes/practice-tasks';
import type { BreadcrumbItem, InternOption } from '@/types';

type PracticeType = 'development' | 'test' | 'live_activity';
type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed';
type AssignmentMode = 'interns' | 'training_program';

type TrainingProgramOption = {
    id: string;
    name: string;
};

type Props = {
    interns: InternOption[];
    trainingPrograms: TrainingProgramOption[];
    task?: {
        id: string;
        title: string;
        description: string;
        practice_type: PracticeType;
        status: TaskStatus;
        assignment_mode: AssignmentMode;
        training_program_id: string;
        due_at: string;
        intern_ids: string[];
    };
};

type MultiFileUploadFieldProps = {
    id: string;
    label: string;
    accept: string;
    selectedFileNames: string[];
    error?: string;
    onChange: (files: File[]) => void;
};

const PRACTICE_TYPE_OPTIONS: Array<{ value: PracticeType; label: string }> = [
    { value: 'development', label: 'Tarea de desarrollo' },
    { value: 'test', label: 'Test' },
    { value: 'live_activity', label: 'Actividad en vivo' },
];

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_progress', label: 'En progreso' },
    { value: 'in_review', label: 'En revisión' },
    { value: 'completed', label: 'Completada' },
];

const ASSIGNMENT_MODE_OPTIONS: Array<{ value: AssignmentMode; label: string }> = [
    { value: 'interns', label: 'Por becarios' },
    { value: 'training_program', label: 'Por grado formativo' },
];

function MultiFileUploadField({ id, label, accept, selectedFileNames, error, onChange }: MultiFileUploadFieldProps) {
    return (
        <div className="grid gap-2">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <div className="flex min-h-9 min-w-0 items-center gap-3 text-sm">
                <label
                    htmlFor={id}
                    className="inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border border-[#2563eb]/35 bg-white px-4 text-sm font-medium text-[#1d4ed8] shadow-xs transition-colors hover:border-[#2563eb]/60 hover:bg-[#2563eb]/10 dark:border-[#2563eb]/45 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-[#2563eb]/20"
                >
                    Seleccionar archivo
                </label>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {selectedFileNames.length > 0 ? `${selectedFileNames.length} archivo(s) seleccionado(s)` : 'Ningún archivo seleccionado'}
                </span>
                <Input
                    id={id}
                    type="file"
                    multiple
                    accept={accept}
                    className="sr-only"
                    onChange={(event) => onChange(event.target.files ? Array.from(event.target.files) : [])}
                />
            </div>
            <InputError message={error} />
            {selectedFileNames.length > 0 ? (
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {selectedFileNames.map((name) => (
                        <li key={name}>{name}</li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

export default function PracticeTasksFormPage({ interns, trainingPrograms, task }: Props) {
    const isEditing = Boolean(task);
    const [internToAdd, setInternToAdd] = useState<string>('');
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Prácticas y tareas',
            href: practiceTasks.index().url,
        },
        {
            title: isEditing ? 'Editar tarea' : 'Nueva tarea',
            href: isEditing && task ? practiceTasks.edit(task.id).url : practiceTasks.create().url,
        },
    ];

    const { data, setData, post, processing, errors, transform } = useForm({
        title: task?.title ?? '',
        description: task?.description ?? '',
        practice_type: (task?.practice_type ?? 'development') as PracticeType,
        status: (task?.status ?? 'pending') as TaskStatus,
        assignment_mode: (task?.assignment_mode ?? 'interns') as AssignmentMode,
        training_program_id: task?.training_program_id ?? '',
        due_at: task?.due_at ?? '',
        intern_ids: task?.intern_ids ?? [],
        attachments: [] as File[],
    });

    const toggleIntern = (internId: string, checked: boolean) => {
        setData(
            'intern_ids',
            checked
                ? Array.from(new Set([...data.intern_ids, internId]))
                : data.intern_ids.filter((id) => id !== internId),
        );
    };

    const selectedInterns = useMemo(
        () => interns.filter((intern) => data.intern_ids.includes(intern.id)),
        [interns, data.intern_ids],
    );

    const availableInterns = useMemo(
        () => interns.filter((intern) => !data.intern_ids.includes(intern.id)),
        [interns, data.intern_ids],
    );
    const internsInSelectedTrainingProgram = useMemo(
        () => interns.filter((intern) => intern.trainingProgramId === data.training_program_id),
        [interns, data.training_program_id],
    );

    const handleAddIntern = () => {
        if (internToAdd === '') return;
        toggleIntern(internToAdd, true);
        setInternToAdd('');
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        transform((values) => (isEditing ? { ...values, _method: 'patch' } : values));

        post(isEditing && task ? practiceTasks.update(task.id).url : practiceTasks.store().url, {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEditing ? 'Editar tarea' : 'Nueva tarea'} />

            <div className={UI_PRESETS.pageContent}>
                <div className={UI_PRESETS.pageSection}>
                    <FormPageHeader
                        title={isEditing ? 'Editar tarea' : 'Nueva tarea'}
                        description={
                            isEditing
                                ? 'Actualiza la información de la tarea y sus becarios asignados.'
                                : 'Completa la información de la tarea y asigna uno o varios becarios.'
                        }
                        action={(
                            <Button variant="secondary" asChild>
                                <Link href={practiceTasks.index().url}>Volver al listado</Link>
                            </Button>
                        )}
                    />

                    <form onSubmit={handleSubmit} className="space-y-2">
                            <section className={UI_PRESETS.sectionCard}>
                                <SectionIntro
                                    title="Datos de la tarea"
                                    description="Define el contenido principal, tipo de práctica, estado y fecha de entrega."
                                />

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="grid gap-2 md:col-span-3">
                                        <FieldLabel htmlFor="title">Título</FieldLabel>
                                        <Input
                                            id="title"
                                            value={data.title}
                                            onChange={(event) => setData('title', event.target.value)}
                                            className={UI_PRESETS.simpleSearchInput}
                                            required
                                        />
                                        <InputError message={errors.title} />
                                    </div>

                                    <div className="grid gap-2 md:col-span-3">
                                        <FieldLabel htmlFor="description">Descripción</FieldLabel>
                                        <textarea
                                            id="description"
                                            value={data.description}
                                            onChange={(event) => setData('description', event.target.value)}
                                            className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-950"
                                        />
                                        <InputError message={errors.description} />
                                    </div>

                                    <div className="grid gap-2 md:col-span-3">
                                        <FieldLabel htmlFor="assignment_mode">Modo de asignación</FieldLabel>
                                        <Select
                                            value={data.assignment_mode}
                                            onValueChange={(value) => {
                                                const assignmentMode = value as AssignmentMode;
                                                setData('assignment_mode', assignmentMode);

                                                if (assignmentMode === 'interns') {
                                                    setData('training_program_id', '');
                                                } else {
                                                    setData('intern_ids', []);
                                                    setInternToAdd('');
                                                }
                                            }}
                                        >
                                            <SelectTrigger id="assignment_mode" className={`${UI_PRESETS.selectTrigger} w-full`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ASSIGNMENT_MODE_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value} className={UI_PRESETS.selectItem}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.assignment_mode} />
                                    </div>

                                    {data.assignment_mode === 'training_program' ? (
                                        <div className="grid gap-2 md:col-span-3">
                                            <FieldLabel htmlFor="training_program_id">Grado formativo</FieldLabel>
                                            <Select
                                                value={data.training_program_id}
                                                onValueChange={(value) => setData('training_program_id', value)}
                                            >
                                                <SelectTrigger id="training_program_id" className={`${UI_PRESETS.selectTrigger} w-full`}>
                                                    <SelectValue placeholder="Selecciona un grado formativo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {trainingPrograms.map((program) => (
                                                        <SelectItem key={program.id} value={program.id} className={UI_PRESETS.selectItem}>
                                                            {program.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.training_program_id} />
                                        </div>
                                    ) : null}

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="practice_type">Tipo de práctica</FieldLabel>
                                        <Select
                                            value={data.practice_type}
                                            onValueChange={(value) => setData('practice_type', value as PracticeType)}
                                        >
                                            <SelectTrigger id="practice_type" className={`${UI_PRESETS.selectTrigger} w-full`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {PRACTICE_TYPE_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value} className={UI_PRESETS.selectItem}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.practice_type} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="status">Estado</FieldLabel>
                                        <Select value={data.status} onValueChange={(value) => setData('status', value as TaskStatus)}>
                                            <SelectTrigger id="status" className={`${UI_PRESETS.selectTrigger} w-full`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {STATUS_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value} className={UI_PRESETS.selectItem}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.status} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="due_at">Fecha de entrega</FieldLabel>
                                        <Input
                                            id="due_at"
                                            type="date"
                                            value={data.due_at}
                                            onChange={(event) => setData('due_at', event.target.value)}
                                            className={`${UI_PRESETS.simpleSearchInput} w-full`}
                                        />
                                        <InputError message={errors.due_at} />
                                    </div>
                                </div>
                            </section>

                            <section className={UI_PRESETS.sectionCard}>
                                <SectionIntro
                                    title={data.assignment_mode === 'interns' ? 'Becarios asignados' : 'Asignación por grado'}
                                    description={
                                        data.assignment_mode === 'interns'
                                            ? 'Selecciona al menos un becario para asociarlo a la tarea.'
                                            : 'La tarea se asignará automáticamente a los becarios disponibles del grado seleccionado.'
                                    }
                                />

                                <div className="grid gap-4">
                                    {data.assignment_mode === 'interns' ? (
                                        <>
                                            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                                <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
                                                    <Select value={internToAdd} onValueChange={setInternToAdd} disabled={availableInterns.length === 0}>
                                                        <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                                            <SelectValue placeholder={availableInterns.length > 0 ? 'Selecciona un becario' : 'No hay más becarios'} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {availableInterns.map((intern) => (
                                                                <SelectItem key={intern.id} value={intern.id} className={UI_PRESETS.selectItem}>
                                                                    {intern.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button type="button" onClick={handleAddIntern} disabled={internToAdd === ''}>
                                                        Añadir becario
                                                    </Button>
                                                </div>

                                                {selectedInterns.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {selectedInterns.map((intern) => (
                                                            <div
                                                                key={intern.id}
                                                                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                                                            >
                                                                <span>{intern.name}</span>
                                                                <button
                                                                    type="button"
                                                                    className="text-xs font-semibold text-muted-foreground hover:text-destructive"
                                                                    onClick={() => toggleIntern(intern.id, false)}
                                                                >
                                                                    Quitar
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">
                                                        Todavía no hay becarios asignados.
                                                    </p>
                                                )}
                                            </div>
                                            <InputError message={errors.intern_ids} />
                                        </>
                                    ) : (
                                        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                            {data.training_program_id === '' ? (
                                                <p className="text-sm text-muted-foreground">
                                                    Selecciona un grado formativo para ver qué becarios se incluirán.
                                                </p>
                                            ) : internsInSelectedTrainingProgram.length > 0 ? (
                                                <>
                                                    <p className="text-sm text-muted-foreground">
                                                        Se asignará a {internsInSelectedTrainingProgram.length} becario(s) disponible(s).
                                                    </p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {internsInSelectedTrainingProgram.map((intern) => (
                                                            <span
                                                                key={intern.id}
                                                                className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                                                            >
                                                                {intern.name}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-sm text-destructive">
                                                    No hay becarios disponibles asociados a este grado formativo.
                                                </p>
                                            )}
                                            <InputError message={errors.training_program_id} />
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className={UI_PRESETS.sectionCard}>
                                <SectionIntro
                                    title="Documentación adjunta"
                                    description="Puedes subir varios archivos de apoyo para la tarea."
                                />

                                <MultiFileUploadField
                                    id="attachments"
                                    label="Archivos"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                                    selectedFileNames={data.attachments.map((file) => file.name)}
                                    error={errors.attachments ?? errors['attachments.0']}
                                    onChange={(files) => setData('attachments', files)}
                                />
                            </section>

                            <div className="flex flex-col gap-2 border-t border-sidebar-border/70 pt-4 md:flex-row md:items-center md:justify-end dark:border-sidebar-border">
                                <Button disabled={processing}>{processing ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Guardar')}</Button>
                                <Button type="button" variant="secondary" asChild>
                                    <Link href={practiceTasks.index().url}>Cancelar</Link>
                                </Button>
                            </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}

