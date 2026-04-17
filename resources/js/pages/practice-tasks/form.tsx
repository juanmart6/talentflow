import { Head, Link, router, useForm } from '@inertiajs/react';
import { FileText, History, MessageSquare, Paperclip, Trash2, Upload, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState  } from 'react';
import type {FormEvent} from 'react';
import { toast } from 'sonner';
import practiceTasks from '@/actions/App/Http/Controllers/PracticeTaskController';
import { FieldLabel, FormPageHeader, SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import DatePicker from '@/components/shared/date-picker';
import FileUploadField from '@/components/shared/file-upload-field';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { UI_PRESETS } from '@/lib/ui-presets';
import type { BreadcrumbItem, InternOption } from '@/types';

type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed';
type AssignmentMode = 'interns' | 'training_program';
type FormTab = 'resumen' | 'asignacion' | 'chat' | 'historial' | 'adjuntos' | 'entregas';

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
        uploader_role?: 'tutor' | 'intern' | string;
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
    readOnly?: boolean;
};

type ChatMessage = NonNullable<Props['messages']>[number];

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
        return '';
    }

    return TASK_STATUS_LABELS[status] ?? status.toUpperCase();
};

const formatStatusLogLine = (fromStatus: TaskStatus | null, toStatus: TaskStatus): string => {
    if (!fromStatus) {
        return `Creada en ${formatTaskStatus(toStatus)}`;
    }

    return `${formatTaskStatus(fromStatus)} -> ${formatTaskStatus(toStatus)}`;
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

const formatShortDate = (value: string): string => {
    if (!value) {
        return '-';
    }

    const [year, month, day] = value.split('-');
    if (year && month && day) {
        return `${day}/${month}/${year}`;
    }

    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('es-ES');
    }

    return value;
};

const getLatestCreatedAt = (attachments: Array<{ created_at: string | null }>): string | null => {
    return attachments.reduce<string | null>((latest, attachment) => {
        if (!attachment.created_at) {
            return latest;
        }

        if (!latest) {
            return attachment.created_at;
        }

        return new Date(attachment.created_at).getTime() > new Date(latest).getTime()
            ? attachment.created_at
            : latest;
    }, null);
};

const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return '?';
    }

    return parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
};

export default function PracticeTasksFormPage({ interns, trainingPrograms, messages = [], taskAttachments = [], statusLogs = [], task, readOnly = false }: Props) {
    const isEditing = Boolean(task);
    const isReadOnly = readOnly === true;
    const viewerRole: 'tutor' | 'intern' = isReadOnly ? 'intern' : 'tutor';
    const [activeTab, setActiveTab] = useState<FormTab>('resumen');
    const [internQuery, setInternQuery] = useState('');
    const [isInternDropdownOpen, setIsInternDropdownOpen] = useState(false);
    const [messageBody, setMessageBody] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(messages);
    const [tutorSpecFile, setTutorSpecFile] = useState<File | null>(null);
    const [deliverableFile, setDeliverableFile] = useState<File | null>(null);
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [isRefreshingMessages, setIsRefreshingMessages] = useState(false);
    const [uploadingCategory, setUploadingCategory] = useState<'tutor_spec' | 'intern_deliverable' | null>(null);
    const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
    const internComboboxRef = useRef<HTMLDivElement | null>(null);
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Prácticas y Tareas',
            href: practiceTasks.index().url,
        },
        {
            title: isReadOnly ? 'Ver Tarea' : isEditing ? 'Editar Tarea' : 'Nueva Tarea',
            href: isEditing && task
                ? (isReadOnly ? practiceTasks.show(task.id).url : practiceTasks.edit(task.id).url)
                : practiceTasks.create().url,
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
        () => {
            const normalizedQuery = internQuery.trim().toLowerCase();

            return interns.filter((intern) => {
                if (data.intern_ids.includes(intern.id)) {
                    return false;
                }

                if (normalizedQuery === '') {
                    return true;
                }

                return intern.name.toLowerCase().includes(normalizedQuery);
            });
        },
        [interns, data.intern_ids, internQuery],
    );
    const internsInSelectedTrainingProgram = useMemo(
        () => interns.filter((intern) => intern.trainingProgramId === data.training_program_id),
        [interns, data.training_program_id],
    );
    const tutorSpecifications = useMemo(
        () => taskAttachments.filter((attachment) => attachment.category === 'tutor_spec'),
        [taskAttachments],
    );
    const visibleTutorSpecifications = useMemo(
        () => (isReadOnly ? tutorSpecifications.filter((attachment) => attachment.uploader_role !== 'intern') : tutorSpecifications),
        [isReadOnly, tutorSpecifications],
    );
    const internDeliverables = useMemo(
        () => taskAttachments.filter((attachment) => attachment.category === 'intern_deliverable'),
        [taskAttachments],
    );
    const selectedTrainingProgramName = useMemo(
        () => trainingPrograms.find((program) => program.id === data.training_program_id)?.name ?? null,
        [trainingPrograms, data.training_program_id],
    );
    const visibleInternDeliverables = useMemo(
        () => (isReadOnly ? internDeliverables.filter((attachment) => attachment.uploader_role !== 'tutor') : internDeliverables),
        [isReadOnly, internDeliverables],
    );
    const latestInternDeliverableCreatedAt = useMemo(
        () => getLatestCreatedAt(visibleInternDeliverables),
        [visibleInternDeliverables],
    );
    const summaryBlockClass = 'rounded-xl border border-slate-300 bg-slate-100/90 p-4 dark:border-slate-700 dark:bg-slate-900/60';
    const summaryControlClass = 'border-slate-300 bg-slate-100/90 text-slate-800 focus-visible:border-slate-300 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-100 disabled:bg-slate-100/90 disabled:text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-100';
    const summaryTextareaClass = 'min-h-28 w-full rounded-xl border border-slate-300 bg-slate-100/90 px-3 py-2 text-sm text-slate-800 shadow-xs outline-none transition focus:border-slate-300 disabled:opacity-100 disabled:bg-slate-100/90 disabled:text-slate-800 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:disabled:bg-slate-900/60 dark:disabled:text-slate-100';
    const summaryReadOnlyRowClass = 'grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3';
    const summaryStatusLabel = STATUS_OPTIONS.find((option) => option.value === data.status)?.label ?? '-';
    const summaryAssignmentLabel = data.assignment_mode === 'training_program' ? 'Grado formativo' : 'Becario';
    const summaryAssignmentValue = data.assignment_mode === 'training_program'
        ? (selectedTrainingProgramName ?? '-')
        : selectedInterns.length > 0
            ? `${selectedInterns[0].name}${selectedInterns.length > 1 ? ` (+${selectedInterns.length - 1} más)` : ''}`
            : '-';
    const attachmentsCardClass = 'grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50';
    const disableCurrentTabFields = isReadOnly && activeTab !== 'adjuntos' && activeTab !== 'entregas' && activeTab !== 'chat';

    const addIntern = (internId: string) => {
        toggleIntern(internId, true);
        setInternQuery('');
    };

    const removeIntern = (internId: string) => {
        toggleIntern(internId, false);
    };

    const clearSelectedInterns = () => {
        setData('intern_ids', []);
        setInternQuery('');
    };

    const refreshMessages = useCallback(async (showLoader = false) => {
        if (!task?.id || !isEditing) {
            return;
        }

        if (showLoader) {
            setIsRefreshingMessages(true);
        }

        try {
            const response = await fetch(`/practice-tasks/${task.id}/messages`, {
                method: 'GET',
                cache: 'no-store',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const payload = (await response.json()) as { messages?: ChatMessage[] };
            setChatMessages(Array.isArray(payload.messages) ? payload.messages : []);
        } catch {
            if (showLoader) {
                toast.error('No se pudo actualizar el chat.');
            }
        } finally {
            if (showLoader) {
                setIsRefreshingMessages(false);
            }
        }
    }, [isEditing, task?.id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!internComboboxRef.current) {
                return;
            }

            if (!internComboboxRef.current.contains(event.target as Node)) {
                setIsInternDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        setChatMessages(messages);
    }, [messages, task?.id]);

    useEffect(() => {
        if (!isEditing || !task?.id || activeTab !== 'chat') {
            return;
        }

        const interval = window.setInterval(() => {
            refreshMessages(false);
        }, 8000);

        return () => {
            window.clearInterval(interval);
        };
    }, [activeTab, isEditing, task?.id, refreshMessages]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isReadOnly) {
            return;
        }

        if (data.assignment_mode === 'interns' && data.intern_ids.length === 0) {
            setActiveTab('asignacion');
            toast.error('Añade al menos un becario antes de guardar la tarea.');
            return;
        }

        if (data.assignment_mode === 'training_program' && data.training_program_id === '') {
            setActiveTab('asignacion');
            toast.error('Selecciona un grado formativo antes de guardar la tarea.');
            return;
        }

        if (
            data.assignment_mode === 'training_program'
            && data.training_program_id !== ''
            && internsInSelectedTrainingProgram.length === 0
        ) {
            setActiveTab('asignacion');
            toast.error('El grado formativo seleccionado no tiene becarios disponibles.');
            return;
        }

        transform((values) => (isEditing ? { ...values, _method: 'patch' } : values));

        post(isEditing && task ? practiceTasks.update(task.id).url : practiceTasks.store().url, {
            preserveScroll: true,
            forceFormData: true,
            onError: (formErrors) => {
                const firstError = Object.values(formErrors).find(
                    (value): value is string => typeof value === 'string' && value.trim() !== '',
                );

                toast.error(firstError ?? 'No se pudo guardar la tarea. Revisa los campos obligatorios.');

                if (
                    formErrors.assignment_mode
                    || formErrors.training_program_id
                    || formErrors.intern_ids
                ) {
                    setActiveTab('asignacion');
                }
            },
        });
    };

    const handleSendMessage = () => {
        if (!task?.id || messageBody.trim() === '') {
            return;
        }

        setIsSendingMessage(true);

        router.post(`/practice-tasks/${task.id}/messages`, { body: messageBody.trim() }, {
            preserveScroll: true,
            onSuccess: () => {
                setMessageBody('');
                refreshMessages(false);
            },
            onError: () => {
                toast.error('No se pudo enviar el mensaje. Revisa permisos o inténtalo de nuevo.');
            },
            onFinish: () => setIsSendingMessage(false),
        });
    };

    const handleUploadByCategory = (category: 'tutor_spec' | 'intern_deliverable', file: File | null) => {
        if (!task?.id || !file) {
            return;
        }

        if (isReadOnly && category !== 'intern_deliverable') {
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
        if (isReadOnly || !task?.id) {
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
            <Head title={isReadOnly ? 'Ver Tarea' : isEditing ? 'Editar Tarea' : 'Nueva Tarea'} />

            <div className={UI_PRESETS.pageContent}>
                <div className={UI_PRESETS.pageSection}>
                    <FormPageHeader
                        title={isReadOnly ? 'Ver Tarea' : isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
                        description={
                            isReadOnly
                                ? 'Consulta el detalle de la tarea.'
                                : isEditing
                                ? 'Actualiza la información de la tarea y sus becarios asignados.'
                                : 'Completa la información de la tarea y asigna uno o varios becarios.'
                        }
                        backHref={practiceTasks.index().url}
                    />

                    <form onSubmit={handleSubmit} className="space-y-4">
                            <section className={UI_PRESETS.sectionCard}>
                                <div className={UI_PRESETS.tabsHeaderEmphasis}>
                                <div className="flex flex-wrap items-end gap-1.5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`${UI_PRESETS.tabBase} ${activeTab === 'resumen' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                        onClick={() => setActiveTab('resumen')}
                                    >
                                        <FileText className="mr-1.5 size-4 shrink-0" />
                                        Resumen
                                    </Button>
                                    {!isReadOnly ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={`${UI_PRESETS.tabBase} ${activeTab === 'asignacion' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                            onClick={() => setActiveTab('asignacion')}
                                        >
                                            <Users className="mr-1.5 size-4 shrink-0" />
                                            Asignación
                                        </Button>
                                    ) : null}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`${UI_PRESETS.tabBase} ${activeTab === 'adjuntos' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                        onClick={() => setActiveTab('adjuntos')}
                                    >
                                        <Paperclip className="mr-1.5 size-4 shrink-0" />
                                        Adjuntos
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`${UI_PRESETS.tabBase} ${activeTab === 'entregas' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                        onClick={() => setActiveTab('entregas')}
                                    >
                                        <Upload className="mr-1.5 size-4 shrink-0" />
                                        Entregas
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className={`${UI_PRESETS.tabBase} ${activeTab === 'chat' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                        onClick={() => setActiveTab('chat')}
                                    >
                                        <MessageSquare className="mr-1.5 size-4 shrink-0" />
                                        Chat
                                    </Button>
                                    {!isReadOnly ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={`${UI_PRESETS.tabBase} ${activeTab === 'historial' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                            onClick={() => setActiveTab('historial')}
                                        >
                                            <History className="mr-1.5 size-4 shrink-0" />
                                            Historial
                                        </Button>
                                    ) : null}
                                </div>
                                </div>

                            <fieldset disabled={disableCurrentTabFields} className={disableCurrentTabFields ? UI_PRESETS.readOnlyFieldset : ''}>
                            {activeTab === 'resumen' ? (
                            <section className="space-y-5 pt-4">
                                <SectionIntro
                                    title="Datos de la tarea"
                                    description={isReadOnly ? 'Información principal y contexto de la tarea asignada.' : 'Define el contenido principal, estado y fecha de entrega.'}
                                />

                                {isEditing && task && !isReadOnly ? (
                                    <div className={`${summaryBlockClass} grid gap-3`}>
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

                                {isReadOnly ? (
                                    <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                        <dl className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                                            <div className={summaryReadOnlyRowClass}>
                                                <dt className={UI_PRESETS.readOnlyFieldLabel}>Contexto de la tarea</dt>
                                                <dd className={`${UI_PRESETS.readOnlyFieldValue} space-y-1`}>
                                                    <p><span className="font-semibold">{summaryAssignmentLabel}:</span> {summaryAssignmentValue}</p>
                                                    {task ? <p><span className="font-semibold">Creada por:</span> {task.created_by_name}</p> : null}
                                                    {task ? <p><span className="font-semibold">Fecha creación:</span> {formatDateTime(task.created_at)}</p> : null}
                                                    {task ? <p><span className="font-semibold">ID:</span> #{task.id}</p> : null}
                                                </dd>
                                            </div>
                                            <div className={summaryReadOnlyRowClass}>
                                                <dt className={UI_PRESETS.readOnlyFieldLabel}>Título</dt>
                                                <dd className={UI_PRESETS.readOnlyFieldValue}>{data.title || '-'}</dd>
                                            </div>
                                            <div className={summaryReadOnlyRowClass}>
                                                <dt className={UI_PRESETS.readOnlyFieldLabel}>Descripción</dt>
                                                <dd className={`${UI_PRESETS.readOnlyFieldValue} whitespace-pre-line`}>{data.description || '-'}</dd>
                                            </div>
                                            <div className={summaryReadOnlyRowClass}>
                                                <dt className={UI_PRESETS.readOnlyFieldLabel}>Estado</dt>
                                                <dd className={UI_PRESETS.readOnlyFieldValue}>{summaryStatusLabel}</dd>
                                            </div>
                                            <div className={summaryReadOnlyRowClass}>
                                                <dt className={UI_PRESETS.readOnlyFieldLabel}>Fecha de entrega</dt>
                                                <dd className={UI_PRESETS.readOnlyFieldValue}>{formatShortDate(data.due_at)}</dd>
                                            </div>
                                        </dl>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className={`${summaryBlockClass} grid gap-2 md:col-span-3`}>
                                            <FieldLabel htmlFor="title">Título</FieldLabel>
                                            <Input
                                                id="title"
                                                value={data.title}
                                                onChange={(event) => setData('title', event.target.value)}
                                                className={summaryControlClass}
                                                required
                                            />
                                            <InputError message={errors.title} />
                                        </div>

                                        <div className={`${summaryBlockClass} grid gap-2 md:col-span-3`}>
                                            <FieldLabel htmlFor="description">Descripción</FieldLabel>
                                            <textarea
                                                id="description"
                                                value={data.description}
                                                onChange={(event) => setData('description', event.target.value)}
                                                className={summaryTextareaClass}
                                            />
                                            <InputError message={errors.description} />
                                        </div>

                                        <div className="grid gap-4 md:col-span-3 md:grid-cols-2">
                                            <div className={`${summaryBlockClass} grid gap-2`}>
                                                <FieldLabel htmlFor="status">Estado</FieldLabel>
                                                <Select value={data.status} onValueChange={(value) => setData('status', value as TaskStatus)}>
                                                    <SelectTrigger id="status" className={`${summaryControlClass} w-full`}>
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

                                            <div className={`${summaryBlockClass} grid gap-2`}>
                                                <FieldLabel htmlFor="due_at">Fecha de entrega</FieldLabel>
                                                <DatePicker
                                                    id="due_at"
                                                    value={data.due_at}
                                                    onChange={(value) => setData('due_at', value)}
                                                    placeholder="Seleccionar fecha"
                                                    className={`${summaryControlClass} w-full`}
                                                />
                                                <InputError message={errors.due_at} />
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                                            setInternQuery('');
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
                                                    <div className="grid gap-2" ref={internComboboxRef}>
                                                        <div className="relative">
                                                            <div className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-xs transition-colors focus-within:border-slate-400 dark:border-slate-600 dark:bg-slate-950">
                                                                {selectedInterns.map((intern) => (
                                                                    <span
                                                                        key={intern.id}
                                                                        className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                                                                    >
                                                                        <span className="max-w-[9rem] truncate">{intern.name}</span>
                                                                        <button
                                                                            type="button"
                                                                            className="text-muted-foreground transition-colors hover:text-destructive"
                                                                            onClick={() => removeIntern(intern.id)}
                                                                            aria-label={`Quitar ${intern.name}`}
                                                                        >
                                                                            <X className="size-3" />
                                                                        </button>
                                                                    </span>
                                                                ))}
                                                                <Input
                                                                    value={internQuery}
                                                                    onChange={(event) => setInternQuery(event.target.value)}
                                                                    onFocus={() => setIsInternDropdownOpen(true)}
                                                                    className="h-7 min-w-[140px] flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                                                                    placeholder={selectedInterns.length > 0 ? 'Añadir más becarios...' : 'Buscar becarios...'}
                                                                />
                                                                {selectedInterns.length > 0 ? (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-7 px-2 text-xs"
                                                                        onClick={clearSelectedInterns}
                                                                    >
                                                                        Limpiar
                                                                    </Button>
                                                                ) : null}
                                                            </div>

                                                            {isInternDropdownOpen ? (
                                                                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-md dark:border-slate-700 dark:bg-slate-900">
                                                                    {availableInterns.length > 0 ? (
                                                                        availableInterns.map((intern) => (
                                                                            <button
                                                                                key={intern.id}
                                                                                type="button"
                                                                                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                                onClick={() => addIntern(intern.id)}
                                                                            >
                                                                                {intern.name}
                                                                            </button>
                                                                        ))
                                                                    ) : (
                                                                        <p className="px-2 py-1.5 text-sm text-muted-foreground">
                                                                            No hay becarios disponibles.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                        </div>

                                                        <p className="text-xs text-muted-foreground">
                                                            Selecciona uno o varios becarios. Se creará una tarea por cada seleccionado.
                                                        </p>
                                                    </div>
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
                                    description="Conversación entre tutor y becario vinculada a esta tarea."
                                />

                                {!isEditing || !task ? (
                                    <p className="text-sm text-muted-foreground">
                                        Guarda la tarea para habilitar la comunicación.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                                                Tarea #{task.id}
                                            </Badge>
                                            <Badge variant="outline" className="text-[11px]">
                                                {summaryAssignmentLabel}: {summaryAssignmentValue}
                                            </Badge>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2.5 text-xs"
                                                onClick={() => refreshMessages(true)}
                                                disabled={isRefreshingMessages}
                                            >
                                                {isRefreshingMessages ? 'Actualizando...' : 'Actualizar'}
                                            </Button>
                                        </div>

                                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                                        {chatMessages.length > 0 ? (
                                            <div className="max-h-[420px] space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-900/45">
                                                {chatMessages.map((message) => {
                                                    const isOwnMessage = message.author_role === viewerRole;
                                                    const roleLabel = message.author_role === 'tutor' ? 'Tutor' : 'Becario';

                                                    return (
                                                        <article key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                                            <div className={`flex max-w-[90%] items-end gap-2 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                                                                <Avatar className="size-8 border border-slate-200 dark:border-slate-700">
                                                                    <AvatarFallback className={`text-[11px] font-semibold ${
                                                                        isOwnMessage
                                                                            ? 'bg-[#2563eb]/10 text-[#1d4ed8] dark:bg-[#2563eb]/25 dark:text-sky-100'
                                                                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'
                                                                    }`}>
                                                                        {getInitials(message.author_name)}
                                                                    </AvatarFallback>
                                                                </Avatar>

                                                                <div className={`rounded-2xl border px-3 py-2 text-sm shadow-xs ${
                                                                    isOwnMessage
                                                                        ? 'border-[#2563eb]/35 bg-[#2563eb]/10 text-[#1e3a8a] dark:border-[#2563eb]/45 dark:bg-[#2563eb]/20 dark:text-sky-100'
                                                                        : 'border-slate-200 bg-white text-foreground dark:border-slate-700 dark:bg-slate-950'
                                                                }`}>
                                                                    <div className={`mb-1 flex items-center gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                                                        <p className="text-xs font-semibold">{message.author_name}</p>
                                                                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] uppercase tracking-wide">
                                                                            {roleLabel}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="whitespace-pre-wrap text-sm">{message.body}</p>
                                                                    {message.created_at && (
                                                                        <p className={`mt-1 text-[11px] text-muted-foreground ${isOwnMessage ? 'text-right' : ''}`}>
                                                                            {formatDateTime(message.created_at)}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </article>
                                                    );
                                                })}
                                            </div>
                                        ) : null}

                                        <div className={`${chatMessages.length > 0 ? 'border-t border-slate-200/80 dark:border-slate-700/80' : ''} bg-white p-4 dark:bg-slate-950`}>
                                            <div className="grid gap-2">
                                                <FieldLabel htmlFor="task_message_body">Nuevo mensaje</FieldLabel>
                                                <textarea
                                                    id="task_message_body"
                                                    value={messageBody}
                                                    onChange={(event) => setMessageBody(event.target.value)}
                                                    className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-950"
                                                    placeholder="Escribe un mensaje para el seguimiento de esta tarea..."
                                                />
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs text-muted-foreground">Tu mensaje quedará registrado en esta tarea.</p>
                                                    <Button type="button" onClick={handleSendMessage} disabled={isSendingMessage || messageBody.trim() === ''}>
                                                        {isSendingMessage ? 'Enviando...' : 'Enviar mensaje'}
                                                    </Button>
                                                </div>
                                            </div>
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
                                                        <span className="font-semibold">{formatStatusLogLine(log.from_status, log.to_status)}</span>
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
                                    description="Consulta aquí la documentación del tutor."
                                />

                                {!isEditing ? (
                                    <div className="grid gap-4">
                                        <div className={attachmentsCardClass}>
                                            <p className="text-sm font-semibold">Tutor: especificaciones</p>
                                            <FileUploadField
                                                id="tutor_spec_file"
                                                name="tutor_spec_file"
                                                label="Seleccionar especificación"
                                                selectedFileName={tutorSpecFile?.name ?? null}
                                                onChange={(file) => {
                                                    setTutorSpecFile(file);
                                                    setData('tutor_spec_file', file);
                                                }}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground">La especificación seleccionada se adjuntará al guardar la tarea.</p>
                                    </div>
                                ) : isReadOnly ? (
                                    <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                        <dl className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                                            <div className={summaryReadOnlyRowClass}>
                                                <dt className={UI_PRESETS.readOnlyFieldLabel}>Documentación del tutor</dt>
                                                <dd className={UI_PRESETS.readOnlyFieldValue}>
                                                    {visibleTutorSpecifications.length > 0
                                                        ? `${visibleTutorSpecifications.length} archivo(s) disponible(s)`
                                                        : 'Sin documentación disponible'}
                                                </dd>
                                            </div>

                                            {visibleTutorSpecifications.length > 0 ? (
                                                visibleTutorSpecifications.map((attachment, index) => (
                                                    <div key={attachment.id} className={summaryReadOnlyRowClass}>
                                                        <dt className={UI_PRESETS.readOnlyFieldLabel}>Archivo {index + 1}</dt>
                                                        <dd className={`${UI_PRESETS.readOnlyFieldValue} space-y-1`}>
                                                            <a href={attachment.url} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-primary underline">
                                                                {attachment.original_name}
                                                            </a>
                                                            <p className="text-sm font-normal text-muted-foreground">
                                                                Subido por: {attachment.uploader_name}
                                                            </p>
                                                            <p className="text-sm font-normal text-muted-foreground">
                                                                Fecha: {formatDateTime(attachment.created_at)}
                                                            </p>
                                                        </dd>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className={summaryReadOnlyRowClass}>
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Archivos</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>El tutor aún no ha subido documentación.</dd>
                                                </div>
                                            )}
                                        </dl>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        <div className={attachmentsCardClass}>
                                            <p className="text-sm font-semibold">Tutor: especificaciones</p>
                                            <div className="grid gap-3">
                                                <FileUploadField
                                                    id="tutor_spec_file"
                                                    name="tutor_spec_file"
                                                    label="Seleccionar especificación"
                                                    selectedFileName={tutorSpecFile?.name ?? null}
                                                    onChange={setTutorSpecFile}
                                                />
                                                <Button type="button" onClick={() => handleUploadByCategory('tutor_spec', tutorSpecFile)} disabled={!tutorSpecFile || uploadingCategory === 'tutor_spec'}>
                                                    {uploadingCategory === 'tutor_spec' ? 'Subiendo...' : 'Subir'}
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                {visibleTutorSpecifications.length > 0 ? (
                                                    visibleTutorSpecifications.map((attachment) => (
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

                                    </div>
                                )}
                            </section>
                            ) : null}

                            {activeTab === 'entregas' ? (
                            <section className="space-y-5 pt-4">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-semibold">Tu entrega</h3>
                                </div>

                                {!isEditing ? (
                                    <div className="grid gap-4">
                                        <div className={attachmentsCardClass}>
                                            <p className="text-sm font-semibold">Becario: entregables</p>
                                            <FileUploadField
                                                id="intern_deliverable_file"
                                                name="intern_deliverable_file"
                                                label="Seleccionar entregable"
                                                selectedFileName={deliverableFile?.name ?? null}
                                                onChange={(file) => {
                                                    setDeliverableFile(file);
                                                    setData('intern_deliverable_file', file);
                                                }}
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground">El entregable seleccionado se adjuntará al guardar la tarea.</p>
                                    </div>
                                ) : isReadOnly ? (
                                    <div className="space-y-5">
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <p className="text-sm text-muted-foreground">
                                                    Sube tu archivo de entrega y consulta su historial.
                                                </p>
                                            </div>

                                            <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                                <dl className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                                                    <div className={summaryReadOnlyRowClass}>
                                                        <dt className={UI_PRESETS.readOnlyFieldLabel}>Estado</dt>
                                                        <dd className={UI_PRESETS.readOnlyFieldValue}>
                                                            {visibleInternDeliverables.length > 0 ? 'Con entregas registradas' : 'Sin entregas'}
                                                        </dd>
                                                    </div>
                                                    <div className={summaryReadOnlyRowClass}>
                                                        <dt className={UI_PRESETS.readOnlyFieldLabel}>Archivos entregados</dt>
                                                        <dd className={UI_PRESETS.readOnlyFieldValue}>{visibleInternDeliverables.length}</dd>
                                                    </div>
                                                    <div className={summaryReadOnlyRowClass}>
                                                        <dt className={UI_PRESETS.readOnlyFieldLabel}>Última entrega</dt>
                                                        <dd className={UI_PRESETS.readOnlyFieldValue}>
                                                            {latestInternDeliverableCreatedAt ? formatDateTime(latestInternDeliverableCreatedAt) : '-'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>

                                            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                                <FileUploadField
                                                    id="intern_deliverable_file"
                                                    name="intern_deliverable_file"
                                                    label="Archivo de entrega"
                                                    buttonText="Adjuntar archivo"
                                                    selectedFileName={deliverableFile?.name ?? null}
                                                    onChange={setDeliverableFile}
                                                />
                                                <Button
                                                    type="button"
                                                    className="w-full md:w-auto"
                                                    onClick={() => handleUploadByCategory('intern_deliverable', deliverableFile)}
                                                    disabled={!deliverableFile || uploadingCategory === 'intern_deliverable'}
                                                >
                                                    {uploadingCategory === 'intern_deliverable' ? 'Subiendo...' : 'Entregar archivo'}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-semibold">Historial de entregas</p>
                                                <span className="text-sm text-muted-foreground">Total: {visibleInternDeliverables.length}</span>
                                            </div>
                                            {visibleInternDeliverables.length > 0 ? (
                                                visibleInternDeliverables.map((attachment) => (
                                                    <article key={attachment.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                                                        <p className="truncate text-sm font-semibold">{attachment.original_name}</p>
                                                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                                                            <p>Subido por: {attachment.uploader_name}</p>
                                                            <p>Fecha: {formatDateTime(attachment.created_at)}</p>
                                                        </div>
                                                        <a href={attachment.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-medium text-primary underline">
                                                            Ver archivo
                                                        </a>
                                                    </article>
                                                ))
                                            ) : (
                                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-muted-foreground dark:border-slate-700 dark:bg-slate-900/60">
                                                    Aún no has subido entregables.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        <div className={attachmentsCardClass}>
                                            <p className="text-sm font-semibold">Becario: entregables</p>
                                            <div className="grid gap-3">
                                                <FileUploadField
                                                    id="intern_deliverable_file"
                                                    name="intern_deliverable_file"
                                                    label="Seleccionar entregable"
                                                    selectedFileName={deliverableFile?.name ?? null}
                                                    onChange={setDeliverableFile}
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
                            </fieldset>
                            </section>

                            <div className="flex flex-col gap-2 border-t border-sidebar-border/70 pt-4 md:flex-row md:items-center md:justify-end dark:border-sidebar-border">
                                {isReadOnly ? (
                                    <Button type="button" variant="secondary" asChild>
                                        <Link href={practiceTasks.index().url}>Volver</Link>
                                    </Button>
                                ) : (
                                    <>
                                        <Button className={UI_PRESETS.saveButton} disabled={processing}>{processing ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Guardar')}</Button>
                                        <Button type="button" variant="secondary" asChild>
                                            <Link href={practiceTasks.index().url}>Cancelar</Link>
                                        </Button>
                                    </>
                                )}
                            </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
