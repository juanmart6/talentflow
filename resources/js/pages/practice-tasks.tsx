import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from 'react';
import { CalendarClock, MessageSquare, Paperclip, Plus } from 'lucide-react';
import InputError from '@/components/input-error';
import { FieldLabel, SectionIntro } from '@/components/form-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { UI_PRESETS } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import practiceTasks from '@/routes/practice-tasks';
import { toast } from 'sonner';
import type { BreadcrumbItem } from '@/types';

type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed' | 'rejected';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type AttachmentKind = 'specification' | 'deliverable';

type TaskTypeOption = { id: number; name: string; description: string | null; is_active: boolean };
type InternOption = { id: number; first_name: string; last_name: string };
type TaskComment = { id: number; body: string; is_feedback: boolean; author: string; created_at: string | null };
type TaskAttachment = { id: number; kind: AttachmentKind; file_name: string; url: string; uploaded_at: string | null };
type TaskHistory = { id: number; from_status: TaskStatus | null; to_status: TaskStatus; changed_by: string; created_at: string | null };

type TaskItem = {
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_at: string | null;
    type: { id: number; name: string } | null;
    interns: Array<{ id: number; name: string }>;
    comments: TaskComment[];
    attachments: TaskAttachment[];
    status_history: TaskHistory[];
};

type Props = {
    tasks: TaskItem[];
    practiceTypes: TaskTypeOption[];
    interns: InternOption[];
    filters: { search: string; intern_id: number | null; practice_task_type_id: number | null; due_filter: string };
    statusOptions: TaskStatus[];
    priorityOptions: TaskPriority[];
    attachmentKindOptions: AttachmentKind[];
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Prácticas y tareas', href: practiceTasks.index().url }];

const STATUS_META: Record<TaskStatus, { label: string; columnClass: string; badgeClass: string }> = {
    pending: {
        label: 'Pendiente',
        columnClass: 'border-slate-200 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40',
        badgeClass: 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200',
    },
    in_progress: {
        label: 'En progreso',
        columnClass: 'border-sky-200 bg-sky-50/70 dark:border-sky-900/70 dark:bg-sky-950/20',
        badgeClass: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200',
    },
    in_review: {
        label: 'En revisión',
        columnClass: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/70 dark:bg-amber-950/20',
        badgeClass: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
    },
    completed: {
        label: 'Completada',
        columnClass: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20',
        badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
    },
    rejected: {
        label: 'Rechazada',
        columnClass: 'border-rose-200 bg-rose-50/70 dark:border-rose-900/70 dark:bg-rose-950/20',
        badgeClass: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200',
    },
};

const PRIORITY_META: Record<TaskPriority, { label: string; badgeClass: string }> = {
    low: {
        label: 'Baja',
        badgeClass: 'border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200',
    },
    medium: {
        label: 'Media',
        badgeClass: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200',
    },
    high: {
        label: 'Alta',
        badgeClass: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
    },
    urgent: {
        label: 'Urgente',
        badgeClass: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-200',
    },
};

const ATTACHMENT_KIND_LABELS: Record<AttachmentKind, string> = {
    specification: 'Especificación',
    deliverable: 'Entregable',
};

function formatDateTime(value: string | null): string {
    if (!value) {
        return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function getDueState(task: TaskItem): 'overdue' | 'upcoming' | 'normal' {
    if (!task.due_at || task.status === 'completed' || task.status === 'rejected') {
        return 'normal';
    }

    const diff = new Date(task.due_at).getTime() - Date.now();

    if (diff < 0) {
        return 'overdue';
    }

    if (diff <= 1000 * 60 * 60 * 24 * 3) {
        return 'upcoming';
    }

    return 'normal';
}

export default function PracticeTasksPage({
    tasks,
    practiceTypes,
    interns,
    filters,
    statusOptions,
    priorityOptions,
    attachmentKindOptions,
}: Props) {
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const lastFlashRef = useRef<string | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const [internFilter, setInternFilter] = useState(filters.intern_id ? String(filters.intern_id) : 'all');
    const [practiceTypeFilter, setPracticeTypeFilter] = useState(filters.practice_task_type_id ? String(filters.practice_task_type_id) : 'all');
    const [dueFilter, setDueFilter] = useState(filters.due_filter || 'all');
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(tasks[0]?.id ?? null);
    const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
    const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

    const taskForm = useForm({
        practice_task_type_id: 'none',
        title: '',
        description: '',
        status: 'pending' as TaskStatus,
        priority: 'medium' as TaskPriority,
        due_at: '',
        intern_ids: [] as string[],
    });

    const typeForm = useForm({
        name: '',
        description: '',
        is_active: true,
    });

    const commentForm = useForm({
        body: '',
        is_feedback: false,
    });

    const attachmentForm = useForm({
        attachment_kind: 'specification' as AttachmentKind,
        file: null as File | null,
    });

    const selectedTask = useMemo(() => tasks.find((task) => task.id === selectedTaskId) ?? null, [selectedTaskId, tasks]);
    const groupedTasks = useMemo(
        () => statusOptions.map((status) => ({ status, tasks: tasks.filter((task) => task.status === status) })),
        [statusOptions, tasks],
    );
    const summary = useMemo(
        () => ({
            total: tasks.length,
            overdue: tasks.filter((task) => getDueState(task) === 'overdue').length,
            upcoming: tasks.filter((task) => getDueState(task) === 'upcoming').length,
        }),
        [tasks],
    );

    useEffect(() => {
        const successMessage = page.props.flash?.success;
        const errorMessage = page.props.flash?.error;
        const flashKey = successMessage ? `success:${successMessage}` : errorMessage ? `error:${errorMessage}` : null;

        if (!flashKey || lastFlashRef.current === flashKey) {
            return;
        }

        lastFlashRef.current = flashKey;

        if (successMessage) {
            toast.success(successMessage);
        }

        if (errorMessage) {
            toast.error(errorMessage);
        }
    }, [page.props.flash?.error, page.props.flash?.success]);

    useEffect(() => {
        if (selectedTaskId && tasks.some((task) => task.id === selectedTaskId)) {
            return;
        }

        setSelectedTaskId(tasks[0]?.id ?? null);
    }, [selectedTaskId, tasks]);

    useEffect(() => {
        const normalizedSearch = search.trim();
        const currentSearch = (filters.search ?? '').trim();
        const currentIntern = filters.intern_id ? String(filters.intern_id) : 'all';
        const currentType = filters.practice_task_type_id ? String(filters.practice_task_type_id) : 'all';
        const currentDue = filters.due_filter || 'all';

        if (
            normalizedSearch === currentSearch &&
            internFilter === currentIntern &&
            practiceTypeFilter === currentType &&
            dueFilter === currentDue
        ) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            router.get(
                practiceTasks.index().url,
                {
                    search: normalizedSearch || undefined,
                    intern_id: internFilter === 'all' ? undefined : internFilter,
                    practice_task_type_id: practiceTypeFilter === 'all' ? undefined : practiceTypeFilter,
                    due_filter: dueFilter === 'all' ? undefined : dueFilter,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [search, internFilter, practiceTypeFilter, dueFilter, filters]);

    const resetTaskForm = () => {
        taskForm.clearErrors();
        taskForm.setData({
            practice_task_type_id: 'none',
            title: '',
            description: '',
            status: 'pending',
            priority: 'medium',
            due_at: '',
            intern_ids: [],
        });
    };

    const openCreateTaskDialog = () => {
        setEditingTaskId(null);
        resetTaskForm();
        setIsTaskDialogOpen(true);
    };

    const openEditTaskDialog = (task: TaskItem) => {
        setEditingTaskId(task.id);
        taskForm.clearErrors();
        taskForm.setData({
            practice_task_type_id: task.type ? String(task.type.id) : 'none',
            title: task.title,
            description: task.description ?? '',
            status: task.status,
            priority: task.priority,
            due_at: task.due_at ? task.due_at.slice(0, 16) : '',
            intern_ids: task.interns.map((intern) => String(intern.id)),
        });
        setIsTaskDialogOpen(true);
    };

    const submitTask = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        taskForm.transform((data) => ({
            ...data,
            practice_task_type_id: data.practice_task_type_id === 'none' ? null : data.practice_task_type_id,
            due_at: data.due_at || null,
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => setIsTaskDialogOpen(false),
            onFinish: () => taskForm.transform((data) => data),
        };

        if (editingTaskId) {
            taskForm.put(practiceTasks.update(editingTaskId).url, options);
            return;
        }

        taskForm.post(practiceTasks.store().url, options);
    };

    const submitType = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        typeForm.post('/practice-task-types', {
            preserveScroll: true,
            onSuccess: () => {
                setIsTypeDialogOpen(false);
                typeForm.reset();
                typeForm.setData({
                    name: '',
                    description: '',
                    is_active: true,
                });
            },
        });
    };

    const submitComment = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedTask) {
            return;
        }

        commentForm.post(practiceTasks.comments.store(selectedTask.id).url, {
            preserveScroll: true,
            onSuccess: () => {
                commentForm.reset();
                commentForm.setData({
                    body: '',
                    is_feedback: false,
                });
            },
        });
    };

    const submitAttachment = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!selectedTask) {
            return;
        }

        attachmentForm.post(practiceTasks.attachments.store(selectedTask.id).url, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                attachmentForm.reset();
                attachmentForm.setData({
                    attachment_kind: 'specification',
                    file: null,
                });
            },
        });
    };

    const updateTaskStatus = (taskId: number, nextStatus: TaskStatus) => {
        const task = tasks.find((item) => item.id === taskId);

        if (!task || task.status === nextStatus) {
            return;
        }

        router.patch(practiceTasks.status(taskId).url, { status: nextStatus }, { preserveScroll: true });
    };

    const onTaskDrop = (event: DragEvent<HTMLDivElement>, status: TaskStatus) => {
        event.preventDefault();

        if (!draggedTaskId) {
            return;
        }

        updateTaskStatus(draggedTaskId, status);
        setDraggedTaskId(null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Prácticas y tareas" />

            <div className={UI_PRESETS.pageContent}>
                <div className="mx-auto flex w-full max-w-[1480px] flex-col gap-6">
                    <div>
                        <h1 className="text-2xl font-bold">Prácticas y tareas</h1>
                        <p className="text-sm text-muted-foreground">
                            Catálogo de prácticas, asignación, Kanban, comentarios y archivos adjuntos.
                        </p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                            <p className={UI_PRESETS.summaryCardTitle}>Tareas</p>
                            <p className={UI_PRESETS.summaryCardValue}>{summary.total}</p>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm dark:border-amber-800/70 dark:bg-slate-900">
                            <p className={UI_PRESETS.summaryCardTitle}>Próximas</p>
                            <p className={UI_PRESETS.summaryCardValue}>{summary.upcoming}</p>
                        </div>
                        <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-sm dark:border-rose-800/70 dark:bg-slate-900">
                            <p className={UI_PRESETS.summaryCardTitle}>Retrasadas</p>
                            <p className={UI_PRESETS.summaryCardValue}>{summary.overdue}</p>
                        </div>
                    </div>

                    <div className={cn(UI_PRESETS.filterBar, 'space-y-3')}>
                        <div className="grid gap-3 xl:grid-cols-[minmax(280px,1.3fr)_220px_240px_220px_auto_auto] xl:items-center">
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar por título o descripción"
                                className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                            />

                            <Select value={internFilter} onValueChange={setInternFilter}>
                                <SelectTrigger className={UI_PRESETS.selectTrigger}>
                                    <SelectValue placeholder="Becario" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem className={UI_PRESETS.selectItem} value="all">
                                        Todos los becarios
                                    </SelectItem>
                                    {interns.map((intern) => (
                                        <SelectItem className={UI_PRESETS.selectItem} key={intern.id} value={String(intern.id)}>
                                            {intern.first_name} {intern.last_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={practiceTypeFilter} onValueChange={setPracticeTypeFilter}>
                                <SelectTrigger className={UI_PRESETS.selectTrigger}>
                                    <SelectValue placeholder="Tipo de práctica" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem className={UI_PRESETS.selectItem} value="all">
                                        Todos los tipos
                                    </SelectItem>
                                    {practiceTypes.map((type) => (
                                        <SelectItem className={UI_PRESETS.selectItem} key={type.id} value={String(type.id)}>
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={dueFilter} onValueChange={setDueFilter}>
                                <SelectTrigger className={UI_PRESETS.selectTrigger}>
                                    <SelectValue placeholder="Entrega" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem className={UI_PRESETS.selectItem} value="all">
                                        Todas las fechas
                                    </SelectItem>
                                    <SelectItem className={UI_PRESETS.selectItem} value="upcoming">
                                        Próximas a vencer
                                    </SelectItem>
                                    <SelectItem className={UI_PRESETS.selectItem} value="overdue">
                                        Retrasadas
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Button type="button" variant="outline" onClick={() => setIsTypeDialogOpen(true)}>
                                <Plus className="mr-2 size-4" />
                                Nuevo tipo
                            </Button>

                            <Button type="button" onClick={openCreateTaskDialog}>
                                <Plus className="mr-2 size-4" />
                                Nueva tarea
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-5">
                            {groupedTasks.map((column) => (
                                <section
                                    key={column.status}
                                    className={cn('flex min-h-[520px] flex-col rounded-2xl border p-3', STATUS_META[column.status].columnClass)}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => onTaskDrop(event, column.status)}
                                >
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-sm font-semibold">{STATUS_META[column.status].label}</h2>
                                            <p className="text-xs text-muted-foreground">{column.tasks.length} tareas</p>
                                        </div>
                                        <Badge variant="outline" className={STATUS_META[column.status].badgeClass}>
                                            {column.tasks.length}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-1 flex-col gap-3">
                                        {column.tasks.length > 0 ? (
                                            column.tasks.map((task) => {
                                                const dueState = getDueState(task);

                                                return (
                                                    <button
                                                        key={task.id}
                                                        type="button"
                                                        draggable
                                                        onDragStart={() => setDraggedTaskId(task.id)}
                                                        onDragEnd={() => setDraggedTaskId(null)}
                                                        onClick={() => setSelectedTaskId(task.id)}
                                                        className={cn(
                                                            'rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md dark:bg-slate-950',
                                                            selectedTaskId === task.id && 'ring-2 ring-primary/40',
                                                            dueState === 'overdue' && 'border-rose-300 ring-1 ring-rose-200 dark:border-rose-800 dark:ring-rose-900/60',
                                                            dueState === 'upcoming' && 'border-amber-300 ring-1 ring-amber-200 dark:border-amber-800 dark:ring-amber-900/60',
                                                        )}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="font-semibold">{task.title}</p>
                                                                {task.description ? (
                                                                    <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                                                                ) : null}
                                                            </div>
                                                            <Badge variant="outline" className={PRIORITY_META[task.priority].badgeClass}>
                                                                {PRIORITY_META[task.priority].label}
                                                            </Badge>
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {task.type ? (
                                                                <span className="rounded-full border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                                                    {task.type.name}
                                                                </span>
                                                            ) : null}
                                                            {task.interns.map((intern) => (
                                                                <span
                                                                    key={intern.id}
                                                                    className="rounded-full border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
                                                                >
                                                                    {intern.name}
                                                                </span>
                                                            ))}
                                                        </div>

                                                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                                            <span className="inline-flex items-center gap-1">
                                                                <CalendarClock className="size-3.5" />
                                                                {formatDateTime(task.due_at)}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1">
                                                                <MessageSquare className="size-3.5" />
                                                                {task.comments.length}
                                                            </span>
                                                            <span className="inline-flex items-center gap-1">
                                                                <Paperclip className="size-3.5" />
                                                                {task.attachments.length}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })
                                        ) : (
                                            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-sm text-muted-foreground dark:border-slate-700">
                                                Suelta tareas aquí o crea una nueva.
                                            </div>
                                        )}
                                    </div>
                                </section>
                            ))}
                        </div>

                        <aside className="rounded-2xl border border-sidebar-border/70 bg-white/80 p-4 shadow-sm dark:border-sidebar-border dark:bg-slate-900/40">
                            {selectedTask ? (
                                <div className="space-y-6">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap gap-2">
                                                <Badge variant="outline" className={STATUS_META[selectedTask.status].badgeClass}>
                                                    {STATUS_META[selectedTask.status].label}
                                                </Badge>
                                                <Badge variant="outline" className={PRIORITY_META[selectedTask.priority].badgeClass}>
                                                    {PRIORITY_META[selectedTask.priority].label}
                                                </Badge>
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold">{selectedTask.title}</h2>
                                                <p className="text-sm text-muted-foreground">
                                                    {selectedTask.type?.name ?? 'Sin tipo de práctica'}
                                                </p>
                                            </div>
                                        </div>

                                        <Button type="button" variant="outline" onClick={() => openEditTaskDialog(selectedTask)}>
                                            Editar
                                        </Button>
                                    </div>

                                    <section className="space-y-3">
                                        <SectionIntro title="Resumen" description="Becarios, fecha de entrega y descripción." />

                                        <div className="space-y-3">
                                            <div className="rounded-xl border border-sidebar-border/70 bg-muted/20 p-3 dark:border-sidebar-border">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    Becarios asignados
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {selectedTask.interns.map((intern) => (
                                                        <span
                                                            key={intern.id}
                                                            className="rounded-full border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
                                                        >
                                                            {intern.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-sidebar-border/70 bg-muted/20 p-3 dark:border-sidebar-border">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entrega</p>
                                                <p className="mt-2 text-sm font-medium">{formatDateTime(selectedTask.due_at)}</p>
                                            </div>

                                            <div className="rounded-xl border border-sidebar-border/70 bg-muted/20 p-3 dark:border-sidebar-border">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descripción</p>
                                                <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">
                                                    {selectedTask.description || 'Sin descripción ampliada.'}
                                                </p>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <SectionIntro title="Comentarios y feedback" description="Comunicación contextual por tarea." />

                                        <form onSubmit={submitComment} className="space-y-3">
                                            <textarea
                                                value={commentForm.data.body}
                                                onChange={(event) => commentForm.setData('body', event.target.value)}
                                                placeholder="Añade una observación o feedback"
                                                className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-950"
                                            />
                                            <div className="flex items-center justify-between gap-3">
                                                <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Checkbox
                                                        checked={commentForm.data.is_feedback}
                                                        onCheckedChange={(checked) => commentForm.setData('is_feedback', checked === true)}
                                                    />
                                                    Marcar como feedback
                                                </label>
                                                <Button type="submit" disabled={commentForm.processing}>
                                                    {commentForm.processing ? 'Guardando...' : 'Añadir comentario'}
                                                </Button>
                                            </div>
                                            <InputError message={commentForm.errors.body} />
                                        </form>

                                        <div className="space-y-2">
                                            {selectedTask.comments.length > 0 ? (
                                                selectedTask.comments.map((comment) => (
                                                    <article
                                                        key={comment.id}
                                                        className="rounded-xl border border-sidebar-border/70 bg-muted/20 p-3 dark:border-sidebar-border"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-medium">{comment.author}</p>
                                                                {comment.is_feedback ? (
                                                                    <Badge variant="outline" className="border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-700 dark:bg-sky-950/40 dark:text-sky-200">
                                                                        Feedback
                                                                    </Badge>
                                                                ) : null}
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">{formatDateTime(comment.created_at)}</span>
                                                        </div>
                                                        <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{comment.body}</p>
                                                    </article>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Todavía no hay comentarios.</p>
                                            )}
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <SectionIntro title="Archivos adjuntos" description="Especificaciones del tutor y entregables del becario." />

                                        <form onSubmit={submitAttachment} className="space-y-3">
                                            <div className="grid gap-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                                                <Select
                                                    value={attachmentForm.data.attachment_kind}
                                                    onValueChange={(value) => attachmentForm.setData('attachment_kind', value as AttachmentKind)}
                                                >
                                                    <SelectTrigger className={UI_PRESETS.selectTrigger}>
                                                        <SelectValue placeholder="Tipo de archivo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {attachmentKindOptions.map((kind) => (
                                                            <SelectItem className={UI_PRESETS.selectItem} key={kind} value={kind}>
                                                                {ATTACHMENT_KIND_LABELS[kind]}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <div className="flex min-h-9 min-w-0 items-center gap-3 text-sm">
                                                    <label
                                                        htmlFor="task-attachment-file"
                                                        className="inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-xs transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-900/40"
                                                    >
                                                        Seleccionar archivo
                                                    </label>
                                                    <span className={attachmentForm.data.file ? 'min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200' : 'min-w-0 flex-1 truncate text-muted-foreground'}>
                                                        {attachmentForm.data.file?.name ?? 'Ningún archivo seleccionado'}
                                                    </span>
                                                    <Input
                                                        id="task-attachment-file"
                                                        type="file"
                                                        className="sr-only"
                                                        onChange={(event) => attachmentForm.setData('file', event.target.files?.[0] ?? null)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-end">
                                                <Button type="submit" disabled={attachmentForm.processing}>
                                                    {attachmentForm.processing ? 'Subiendo...' : 'Subir archivo'}
                                                </Button>
                                            </div>
                                            <InputError message={attachmentForm.errors.file} />
                                        </form>

                                        <div className="space-y-2">
                                            {selectedTask.attachments.length > 0 ? (
                                                selectedTask.attachments.map((attachment) => (
                                                    <article
                                                        key={attachment.id}
                                                        className="rounded-xl border border-sidebar-border/70 bg-muted/20 p-3 dark:border-sidebar-border"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium" title={attachment.file_name}>
                                                                    {attachment.file_name}
                                                                </p>
                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    {ATTACHMENT_KIND_LABELS[attachment.kind]} · {formatDateTime(attachment.uploaded_at)}
                                                                </p>
                                                            </div>
                                                            <a href={attachment.url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary underline">
                                                                Abrir
                                                            </a>
                                                        </div>
                                                    </article>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted-foreground">No hay archivos adjuntos.</p>
                                            )}
                                        </div>
                                    </section>

                                    <section className="space-y-3">
                                        <SectionIntro title="Historial de estados" description="Registro de cambios con fecha y hora." />

                                        <div className="space-y-2">
                                            {selectedTask.status_history.length > 0 ? (
                                                selectedTask.status_history.map((item) => (
                                                    <article
                                                        key={item.id}
                                                        className="rounded-xl border border-sidebar-border/70 bg-muted/20 p-3 dark:border-sidebar-border"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="text-sm font-medium">
                                                                    {item.from_status ? STATUS_META[item.from_status].label : 'Creación'} → {STATUS_META[item.to_status].label}
                                                                </p>
                                                                <p className="mt-1 text-xs text-muted-foreground">{item.changed_by}</p>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">{formatDateTime(item.created_at)}</span>
                                                        </div>
                                                    </article>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                <div className="flex h-full min-h-[420px] items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 text-center text-sm text-muted-foreground dark:border-slate-700">
                                    Selecciona una tarea para ver comentarios, adjuntos y el historial.
                                </div>
                            )}
                        </aside>
                    </div>
                </div>
            </div>

            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editingTaskId ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
                        <DialogDescription>Asigna la tarea a uno o varios becarios y define su seguimiento.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitTask} className="space-y-5">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2 md:col-span-2">
                                <FieldLabel htmlFor="task-title">Título</FieldLabel>
                                <Input id="task-title" value={taskForm.data.title} onChange={(event) => taskForm.setData('title', event.target.value)} required />
                                <InputError message={taskForm.errors.title} />
                            </div>

                            <div className="grid gap-2 md:col-span-2">
                                <FieldLabel htmlFor="task-description">Descripción</FieldLabel>
                                <textarea
                                    id="task-description"
                                    value={taskForm.data.description}
                                    onChange={(event) => taskForm.setData('description', event.target.value)}
                                    className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-950"
                                />
                                <InputError message={taskForm.errors.description} />
                            </div>

                            <div className="grid gap-2">
                                <FieldLabel htmlFor="task-type">Tipo de práctica</FieldLabel>
                                <Select value={taskForm.data.practice_task_type_id} onValueChange={(value) => taskForm.setData('practice_task_type_id', value)}>
                                    <SelectTrigger id="task-type" className={UI_PRESETS.selectTrigger}>
                                        <SelectValue placeholder="Selecciona un tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem className={UI_PRESETS.selectItem} value="none">Sin tipo asignado</SelectItem>
                                        {practiceTypes.map((type) => (
                                            <SelectItem className={UI_PRESETS.selectItem} key={type.id} value={String(type.id)}>
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={taskForm.errors.practice_task_type_id} />
                            </div>

                            <div className="grid gap-2">
                                <FieldLabel htmlFor="task-priority">Prioridad</FieldLabel>
                                <Select value={taskForm.data.priority} onValueChange={(value) => taskForm.setData('priority', value as TaskPriority)}>
                                    <SelectTrigger id="task-priority" className={UI_PRESETS.selectTrigger}>
                                        <SelectValue placeholder="Prioridad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priorityOptions.map((priority) => (
                                            <SelectItem className={UI_PRESETS.selectItem} key={priority} value={priority}>
                                                {PRIORITY_META[priority].label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={taskForm.errors.priority} />
                            </div>

                            <div className="grid gap-2">
                                <FieldLabel htmlFor="task-status">Estado</FieldLabel>
                                <Select value={taskForm.data.status} onValueChange={(value) => taskForm.setData('status', value as TaskStatus)}>
                                    <SelectTrigger id="task-status" className={UI_PRESETS.selectTrigger}>
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statusOptions.map((status) => (
                                            <SelectItem className={UI_PRESETS.selectItem} key={status} value={status}>
                                                {STATUS_META[status].label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={taskForm.errors.status} />
                            </div>

                            <div className="grid gap-2">
                                <FieldLabel htmlFor="task-due-at">Fecha y hora de entrega</FieldLabel>
                                <Input id="task-due-at" type="datetime-local" value={taskForm.data.due_at} onChange={(event) => taskForm.setData('due_at', event.target.value)} />
                                <InputError message={taskForm.errors.due_at} />
                            </div>

                            <div className="grid gap-2 md:col-span-2">
                                <FieldLabel htmlFor="task-interns">Becarios asignados</FieldLabel>
                                <div className="grid gap-2 rounded-xl border border-sidebar-border/70 p-3 dark:border-sidebar-border md:grid-cols-2">
                                    {interns.map((intern) => {
                                        const value = String(intern.id);
                                        const checked = taskForm.data.intern_ids.includes(value);

                                        return (
                                            <label key={intern.id} htmlFor={`task-intern-${intern.id}`} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900/40">
                                                <Checkbox
                                                    id={`task-intern-${intern.id}`}
                                                    checked={checked}
                                                    onCheckedChange={(state) =>
                                                        taskForm.setData(
                                                            'intern_ids',
                                                            state === true
                                                                ? [...taskForm.data.intern_ids, value]
                                                                : taskForm.data.intern_ids.filter((item) => item !== value),
                                                        )
                                                    }
                                                />
                                                <span>{intern.first_name} {intern.last_name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <InputError message={taskForm.errors.intern_ids} />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsTaskDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={taskForm.processing}>
                                {taskForm.processing ? 'Guardando...' : editingTaskId ? 'Actualizar tarea' : 'Crear tarea'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Nuevo tipo de práctica</DialogTitle>
                        <DialogDescription>Crea categorías reutilizables para clasificar tareas.</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={submitType} className="space-y-5">
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <FieldLabel htmlFor="practice-type-name">Nombre</FieldLabel>
                                <Input id="practice-type-name" value={typeForm.data.name} onChange={(event) => typeForm.setData('name', event.target.value)} required />
                                <InputError message={typeForm.errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <FieldLabel htmlFor="practice-type-description">Descripción</FieldLabel>
                                <textarea
                                    id="practice-type-description"
                                    value={typeForm.data.description}
                                    onChange={(event) => typeForm.setData('description', event.target.value)}
                                    className="min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-950"
                                />
                                <InputError message={typeForm.errors.description} />
                            </div>

                            <label className="inline-flex items-center gap-3 text-sm">
                                <Checkbox checked={typeForm.data.is_active} onCheckedChange={(checked) => typeForm.setData('is_active', checked === true)} />
                                Tipo activo
                            </label>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsTypeDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={typeForm.processing}>
                                {typeForm.processing ? 'Guardando...' : 'Crear tipo'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
