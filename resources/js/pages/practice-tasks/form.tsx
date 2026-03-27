import { Head, Link, router, useForm } from '@inertiajs/react';
import { useMemo, useState, type FormEvent } from 'react';
import { FileText, History, MessageSquare, Paperclip, Trash2, Users } from 'lucide-react';
import { FieldLabel, FormPageHeader, SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UI_PRESETS } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import practiceTasks from '@/routes/practice-tasks';
import type { BreadcrumbItem, InternOption } from '@/types';

type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed';
type AssignmentMode = 'interns' | 'training_program';
type FormTab = 'resumen' | 'asignacion' | 'chat' | 'historial' | 'adjuntos';

type TrainingProgramOption = {
    id: string;
    name: string;
};

type Props = {
    interns: InternOption[];
    trainingPrograms: TrainingProgramOption[];
    messages?: Array<{
        id: number;
        author_name: string;
        author_role: 'tutor' | 'intern' | string;
        body: string;
        created_at: string | null;
    }>;
    taskAttachments?: Array<{
        id: number;
        category: 'tutor_spec' | 'intern_deliverable' | string;
        original_name: string;
        url: string;
        mime: string | null;
        size: number;
        uploader_name: string;
        created_at: string | null;
    }>;
    statusLogs?: Array<{
        id: number;
        from_status: TaskStatus | null;
        to_status: TaskStatus;
        changed_by_name: string;
        changed_at: string | null;
        notes: string | null;
    }>;
    task?: {
        id: string;
        title: string;
        description: string;
        status: TaskStatus;
        assignment_mode: AssignmentMode;
        training_program_id: string;
        due_at: string;
        intern_ids: string[];
        created_by_name: string;
        created_at: string | null;
    };
};

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

const ASSIGNMENT_MODE_LABELS: Record<AssignmentMode, string> = {
    interns: 'Por becarios',
    training_program: 'Por grado formativo',
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
    pending: 'PENDIENTE',
    in_progress: 'EN PROGRESO',
    in_review: 'EN REVISION',
    completed: 'COMPLETADA',
};

const formatTaskStatus = (status: TaskStatus | null): string => {
    if (!status) {
        return 'SIN ESTADO';
    }

    return TASK_STATUS_LABELS[status] ?? status.toUpperCase();
};

const formatDateTime = (value: string | null): string => {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

export default function PracticeTasksFormPage({ interns, trainingPrograms, messages = [], taskAttachments = [], statusLogs = [], task }: Props) {
    const isEditing = Boolean(task);
    const [activeTab, setActiveTab] = useState<FormTab>('resumen');
    const [internToAdd, setInternToAdd] = useState<string>('');
    const [messageBody, setMessageBody] = useState('');
    const [tutorSpecFile, setTutorSpecFile] = useState<File | null>(null);
    const [deliverableFile, setDeliverableFile] = useState<File | null>(null);
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [uploadingCategory, setUploadingCategory] = useState<'tutor_spec' | 'intern_deliverable' | null>(null);
    const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Prácticas y Tareas',
            href: practiceTasks.index().url,
        },
        {
            title: isEditing ? 'Editar Tarea' : 'Nueva Tarea',
            href: isEditing && task ? practiceTasks.edit(task.id).url : practiceTasks.create().url,
        },
    ];

    const { data, setData, post, processing, errors, transform } = useForm({
        title: task?.title ?? '',
        description: task?.description ?? '',
        status: (task?.status ?? 'pending') as TaskStatus,
        assignment_mode: (task?.assignment_mode ?? 'interns') as AssignmentMode,
        training_program_id: task?.training_program_id ?? '',
        due_at: task?.due_at ?? '',
        intern_ids: task?.intern_ids ?? [],
        tutor_spec_file: null as File | null,
        intern_deliverable_file: null as File | null,
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
    const tutorSpecifications = useMemo(
        () => taskAttachments.filter((attachment) => attachment.category === 'tutor_spec'),
        [taskAttachments],
    );
    const internDeliverables = useMemo(
        () => taskAttachments.filter((attachment) => attachment.category === 'intern_deliverable'),
        [taskAttachments],
    );
    const selectedTrainingProgramName = useMemo(
        () => trainingPrograms.find((program) => program.id === data.training_program_id)?.name ?? null,
        [trainingPrograms, data.training_program_id],
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

    const handleSendMessage = () => {
        if (!task?.id || messageBody.trim() === '') {
            return;
        }

        setIsSendingMessage(true);

        router.post(`/practice-tasks/${task.id}/messages`, { body: messageBody.trim() }, {
            preserveScroll: true,
            onSuccess: () => setMessageBody(''),
            onFinish: () => setIsSendingMessage(false),
        });
    };

    const handleUploadByCategory = (category: 'tutor_spec' | 'intern_deliverable', file: File | null) => {
        if (!task?.id || !file) {
            return;
        }

        setUploadingCategory(category);

        router.post(`/practice-tasks/${task.id}/attachments`, { category, file }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                if (category === 'tutor_spec') {
                    setTutorSpecFile(null);
                } else {
                    setDeliverableFile(null);
                }
            },
            onFinish: () => setUploadingCategory(null),
        });
    };

    const handleDeleteAttachment = (attachmentId: number) => {
        if (!task?.id) {
            return;
        }

        if (!window.confirm('¿Seguro que quieres eliminar este adjunto?')) {
            return;
        }

        setDeletingAttachmentId(attachmentId);

        router.delete(`/practice-tasks/${task.id}/attachments/${attachmentId}`, {
            preserveScroll: true,
            onFinish: () => setDeletingAttachmentId(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isEditing ? 'Editar Tarea' : 'Nueva Tarea'} />

            <div className={UI_PRESETS.pageContent}>
                <div className={UI_PRESETS.pageSection}>
                    <FormPageHeader
                        title={isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
                        description={
                            isEditing
                                ? 'Actualiza la información de la tarea y sus becarios asignados.'
                                : 'Completa la información de la tarea y asigna uno o varios becarios.'
                        }
                        backHref={practiceTasks.index().url}
                    />

                    <form onSubmit={handleSubmit} className="space-y-4">
                            <section className={UI_PRESETS.sectionCard}>
                                <div className="-mx-4 -mt-4 border-b border-sidebar-border/70 px-4 pt-4 dark:border-sidebar-border">
                                <div className="flex flex-wrap items-end gap-1.5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                                            activeTab === 'resumen'
                                                ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                                                : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                                        }`}
                                        onClick={() => setActiveTab('resumen')}
                                    >
                                        <FileText className="mr-1.5 size-4 shrink-0" />
                                        Resumen
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                                            activeTab === 'asignacion'
                                                ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                                                : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                                        }`}
                                        onClick={() => setActiveTab('asignacion')}
                                    >
                                        <Users className="mr-1.5 size-4 shrink-0" />
                                        Asignación
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                                            activeTab === 'adjuntos'
                                                ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                                                : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                                        }`}
                                        onClick={() => setActiveTab('adjuntos')}
                                    >
                                        <Paperclip className="mr-1.5 size-4 shrink-0" />
                                        Adjuntos
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                                            activeTab === 'chat'
                                                ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                                                : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                                        }`}
                                        onClick={() => setActiveTab('chat')}
                                    >
                                        <MessageSquare className="mr-1.5 size-4 shrink-0" />
                                        Chat
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                                            activeTab === 'historial'
                                                ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                                                : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                                        }`}
                                        onClick={() => setActiveTab('historial')}
                                    >
                                        <History className="mr-1.5 size-4 shrink-0" />
                                        Historial
                                    </Button>
                                </div>
                                </div>

                            {activeTab === 'resumen' ? (
                            <section className="space-y-5 pt-4">
                                <SectionIntro
                                    title="Datos de la tarea"
                                    description="Define el contenido principal, estado y fecha de entrega."
                                />

                                {isEditing && task ? (
                                    <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground">CONTEXTO DE LA TAREA</p>
                                        <div className="grid gap-1 text-sm">
                                            <p>
                                                <span className="font-semibold">Becario:</span>{' '}
                                                {selectedInterns[0]?.name ?? 'No definido'}
                                            </p>
                                            {data.assignment_mode === 'interns' && selectedInterns.length > 1 ? (
                                                <p className="text-muted-foreground">
                                                    +{selectedInterns.length - 1} becario(s) adicional(es)
                                                </p>
                                            ) : null}
                                            <p><span className="font-semibold">Creada por:</span> {task.created_by_name}</p>
                                            <p><span className="font-semibold">Fecha creación:</span> {formatDateTime(task.created_at)}</p>
                                            <p><span className="font-semibold">ID:</span> #{task.id}</p>
                                        </div>
                                    </div>
                                ) : null}

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

                                    <div className="grid gap-4 md:col-span-3 md:grid-cols-2">
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
                                </div>
                            </section>
                            ) : null}

                            {activeTab === 'asignacion' ? (
                            <section className="space-y-5 pt-4">
                                <SectionIntro
                                    title={data.assignment_mode === 'interns' ? 'Becarios asignados' : 'Asignación por grado'}
                                    description={
                                        data.assignment_mode === 'interns'
                                            ? 'Selecciona uno o varios becarios. Se creará una tarea individual por cada seleccionado.'
                                            : 'Se creará una tarea individual para cada becario disponible del grado seleccionado.'
                                    }
                                />

                                <div className="grid gap-4">
                                    {isEditing ? (
                                        <>
                                            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                                                <div className="grid gap-1">
                                                    <p className="text-xs font-semibold tracking-wide text-muted-foreground">MODO DE ASIGNACIÓN</p>
                                                    <p className="text-sm font-semibold">{ASSIGNMENT_MODE_LABELS[data.assignment_mode]}</p>
                                                </div>

                                                {data.assignment_mode === 'interns' ? (
                                                    <div className="grid gap-2">
                                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground">BECARIO(S) ASIGNADO(S)</p>
                                                        {selectedInterns.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {selectedInterns.map((intern) => (
                                                                    <span
                                                                        key={intern.id}
                                                                        className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                                                                    >
                                                                        {intern.name}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground">Sin becarios asignados.</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-1">
                                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground">GRADO FORMATIVO</p>
                                                        <p className="text-sm font-semibold">{selectedTrainingProgramName ?? 'No definido'}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
                                                <p className="text-sm text-muted-foreground">
                                                    La asignación se define al crear la tarea y no se puede modificar en edición.
                                                </p>
                                                <div className="mt-3">
                                                    <Button type="button" variant="outline" asChild>
                                                        <Link href={practiceTasks.create().url}>Crear nueva tarea con otra asignación</Link>
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="grid gap-2">
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
                                                <div className="grid gap-2">
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
                                                                Se crearán {internsInSelectedTrainingProgram.length} tarea(s), una por cada becario disponible.
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
                                        </>
                                    )}
                                </div>
                            </section>
                            ) : null}

                            {activeTab === 'chat' ? (
                            <section className="space-y-5 pt-4">
                                <SectionIntro
                                    title="Chat"
                                    description="Canal de mensajes entre tutor y becario, ligado a esta tarea."
                                />

                                {!isEditing || !task ? (
                                    <p className="text-sm text-muted-foreground">
                                        Guarda la tarea para habilitar la comunicación.
                                    </p>
                                ) : (
                                    <div className="grid gap-3">
                                        <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                            {messages.length > 0 ? (
                                                messages.map((message) => (
                                                    <article
                                                        key={message.id}
                                                        className={`flex ${message.author_role === 'tutor' ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div
                                                            className={`max-w-[85%] rounded-2xl border px-3 py-2 text-sm shadow-xs ${
                                                                message.author_role === 'tutor'
                                                                    ? 'border-[#2563eb]/35 bg-[#2563eb]/10 text-[#1e3a8a] dark:border-[#2563eb]/45 dark:bg-[#2563eb]/20 dark:text-sky-100'
                                                                    : 'border-slate-200 bg-white text-foreground dark:border-slate-700 dark:bg-slate-950'
                                                            }`}
                                                        >
                                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                                <p className="text-xs font-semibold">{message.author_name}</p>
                                                                <span className="text-[10px] uppercase text-muted-foreground">{message.author_role}</span>
                                                            </div>
                                                            <p className="whitespace-pre-line text-sm">{message.body}</p>
                                                            {message.created_at && (
                                                                <p className="mt-1 text-[10px] text-muted-foreground">{message.created_at}</p>
                                                            )}
                                                        </div>
                                                    </article>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Aún no hay mensajes para esta tarea.</p>
                                            )}
                                        </div>

                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="task_message_body">Nuevo mensaje</FieldLabel>
                                            <textarea
                                                id="task_message_body"
                                                value={messageBody}
                                                onChange={(event) => setMessageBody(event.target.value)}
                                                className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-950"
                                                placeholder="Escribe un mensaje para el seguimiento de esta tarea..."
                                            />
                                            <div className="flex justify-end">
                                                <Button type="button" onClick={handleSendMessage} disabled={isSendingMessage || messageBody.trim() === ''}>
                                                    {isSendingMessage ? 'Enviando...' : 'Enviar mensaje'}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                            ) : null}

                            {activeTab === 'historial' ? (
                            <section className="space-y-5 pt-4">
                                <SectionIntro
                                    title="Histórico de estados"
                                    description="Registro automático de cada cambio de estado con fecha y hora."
                                />

                                {!isEditing || !task ? (
                                    <p className="text-sm text-muted-foreground">
                                        Guarda la tarea para habilitar el histórico de estados.
                                    </p>
                                ) : (
                                    <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                        {statusLogs.length > 0 ? (
                                            statusLogs.map((log) => (
                                                <article key={log.id} className="rounded-lg border border-slate-200 bg-white p-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="font-semibold">{log.changed_by_name}</p>
                                                        <span className="text-[11px] text-muted-foreground">{formatDateTime(log.changed_at)}</span>
                                                    </div>
                                                    <p className="mt-1 text-sm">
                                                        <span className="font-semibold">{formatTaskStatus(log.from_status)}</span>
                                                        {' -> '}
                                                        <span className="font-semibold">{formatTaskStatus(log.to_status)}</span>
                                                    </p>
                                                    {log.notes ? (
                                                        <p className="mt-1 text-xs text-muted-foreground">{log.notes}</p>
                                                    ) : null}
                                                </article>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">
                                                Aún no hay cambios de estado registrados para esta tarea.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </section>
                            ) : null}

                            {activeTab === 'adjuntos' ? (
                            <section className="space-y-5 pt-4">
                                <SectionIntro
                                    title="Adjuntos"
                                    description="Gestiona aquí los archivos del tutor y los entregables del becario."
                                />

                                {!isEditing ? (
                                    <div className="grid gap-4">
                                        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                            <p className="text-sm font-semibold">Tutor: especificaciones</p>
                                            <div className="flex min-h-9 min-w-0 items-center gap-3 text-sm">
                                                <label
                                                    htmlFor="tutor_spec_file"
                                                    className="inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border border-[#2563eb]/35 bg-white px-4 text-sm font-medium text-[#1d4ed8] shadow-xs transition-colors hover:border-[#2563eb]/60 hover:bg-[#2563eb]/10 dark:border-[#2563eb]/45 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-[#2563eb]/20"
                                                >
                                                    Seleccionar archivo
                                                </label>
                                                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                                    {tutorSpecFile?.name ?? 'Ningún archivo seleccionado'}
                                                </span>
                                                <Input
                                                    id="tutor_spec_file"
                                                    type="file"
                                                    className="sr-only"
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0] ?? null;
                                                        setTutorSpecFile(file);
                                                        setData('tutor_spec_file', file);
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                            <p className="text-sm font-semibold">Becario: entregables</p>
                                            <div className="flex min-h-9 min-w-0 items-center gap-3 text-sm">
                                                <label
                                                    htmlFor="intern_deliverable_file"
                                                    className="inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border border-[#2563eb]/35 bg-white px-4 text-sm font-medium text-[#1d4ed8] shadow-xs transition-colors hover:border-[#2563eb]/60 hover:bg-[#2563eb]/10 dark:border-[#2563eb]/45 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-[#2563eb]/20"
                                                >
                                                    Seleccionar archivo
                                                </label>
                                                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                                    {deliverableFile?.name ?? 'Ningún archivo seleccionado'}
                                                </span>
                                                <Input
                                                    id="intern_deliverable_file"
                                                    type="file"
                                                    className="sr-only"
                                                    onChange={(event) => {
                                                        const file = event.target.files?.[0] ?? null;
                                                        setDeliverableFile(file);
                                                        setData('intern_deliverable_file', file);
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <p className="text-sm text-muted-foreground">
                                            Los archivos seleccionados se adjuntarán automáticamente al guardar la tarea, también cuando se cree una tarea por cada becario del grupo.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                            <p className="text-sm font-semibold">Tutor: especificaciones</p>
                                            <div className="flex min-h-9 min-w-0 items-center gap-3 text-sm">
                                                <label
                                                    htmlFor="tutor_spec_file"
                                                    className="inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border border-[#2563eb]/35 bg-white px-4 text-sm font-medium text-[#1d4ed8] shadow-xs transition-colors hover:border-[#2563eb]/60 hover:bg-[#2563eb]/10 dark:border-[#2563eb]/45 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-[#2563eb]/20"
                                                >
                                                    Seleccionar archivo
                                                </label>
                                                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                                    {tutorSpecFile?.name ?? 'Ningún archivo seleccionado'}
                                                </span>
                                                <Input
                                                    id="tutor_spec_file"
                                                    type="file"
                                                    className="sr-only"
                                                    onChange={(event) => setTutorSpecFile(event.target.files?.[0] ?? null)}
                                                />
                                                <Button type="button" onClick={() => handleUploadByCategory('tutor_spec', tutorSpecFile)} disabled={!tutorSpecFile || uploadingCategory === 'tutor_spec'}>
                                                    {uploadingCategory === 'tutor_spec' ? 'Subiendo...' : 'Subir'}
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                {tutorSpecifications.length > 0 ? (
                                                    tutorSpecifications.map((attachment) => (
                                                        <div key={attachment.id} className="rounded-md border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <a href={attachment.url} target="_blank" rel="noreferrer" className="font-medium text-primary underline">
                                                                        {attachment.original_name}
                                                                    </a>
                                                                    <p className="text-xs text-muted-foreground">{attachment.uploader_name} · {attachment.created_at ?? '-'}</p>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className={`${UI_PRESETS.iconActionButtonDanger} disabled:cursor-not-allowed`}
                                                                    disabled={deletingAttachmentId === attachment.id}
                                                                    onClick={() => handleDeleteAttachment(attachment.id)}
                                                                    aria-label="Eliminar adjunto"
                                                                    title="Eliminar adjunto"
                                                                >
                                                                    {deletingAttachmentId === attachment.id ? '...' : <Trash2 />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Sin especificaciones subidas.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                            <p className="text-sm font-semibold">Becario: entregables</p>
                                            <div className="flex min-h-9 min-w-0 items-center gap-3 text-sm">
                                                <label
                                                    htmlFor="intern_deliverable_file"
                                                    className="inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border border-[#2563eb]/35 bg-white px-4 text-sm font-medium text-[#1d4ed8] shadow-xs transition-colors hover:border-[#2563eb]/60 hover:bg-[#2563eb]/10 dark:border-[#2563eb]/45 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-[#2563eb]/20"
                                                >
                                                    Seleccionar archivo
                                                </label>
                                                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                                    {deliverableFile?.name ?? 'Ningún archivo seleccionado'}
                                                </span>
                                                <Input
                                                    id="intern_deliverable_file"
                                                    type="file"
                                                    className="sr-only"
                                                    onChange={(event) => setDeliverableFile(event.target.files?.[0] ?? null)}
                                                />
                                                <Button type="button" onClick={() => handleUploadByCategory('intern_deliverable', deliverableFile)} disabled={!deliverableFile || uploadingCategory === 'intern_deliverable'}>
                                                    {uploadingCategory === 'intern_deliverable' ? 'Subiendo...' : 'Subir'}
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                {internDeliverables.length > 0 ? (
                                                    internDeliverables.map((attachment) => (
                                                        <div key={attachment.id} className="rounded-md border border-slate-200 bg-white p-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="min-w-0">
                                                                    <a href={attachment.url} target="_blank" rel="noreferrer" className="font-medium text-primary underline">
                                                                        {attachment.original_name}
                                                                    </a>
                                                                    <p className="text-xs text-muted-foreground">{attachment.uploader_name} · {attachment.created_at ?? '-'}</p>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="icon"
                                                                    className={`${UI_PRESETS.iconActionButtonDanger} disabled:cursor-not-allowed`}
                                                                    disabled={deletingAttachmentId === attachment.id}
                                                                    onClick={() => handleDeleteAttachment(attachment.id)}
                                                                    aria-label="Eliminar adjunto"
                                                                    title="Eliminar adjunto"
                                                                >
                                                                    {deletingAttachmentId === attachment.id ? '...' : <Trash2 />}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Sin entregables subidos.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>
                            ) : null}
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
