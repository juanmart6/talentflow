import { Head, Link, router, usePage } from '@inertiajs/react';
import { CirclePlus, FilterX, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UI_PRESETS } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import practiceTasks from '@/routes/practice-tasks';
import { toast } from 'sonner';
import type { BreadcrumbItem, InternOption } from '@/types';

type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed';

type TaskCard = {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assignmentMode: 'interns' | 'training_program';
    trainingProgramId: string | null;
    trainingProgramName: string | null;
    internIds: string[];
    internNames: string[];
    dueAt: string;
    latestStatusChangedAt: string | null;
    latestStatusChangedBy: string;
};

type DueStateFilter = 'all' | 'overdue' | 'next_7_days' | 'over_7_days';

type Props = {
    viewMode: 'tutor' | 'intern';
    interns: InternOption[];
    trainingPrograms: Array<{ id: string; name: string }>;
    tasks: TaskCard[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Prácticas y Tareas',
        href: '/practice-tasks',
    },
];

const STATUS_COLUMNS: Array<{ status: TaskStatus; label: string; className: string }> = [
    { status: 'pending', label: 'Pendiente', className: 'border-slate-200 bg-slate-50/35 dark:border-slate-700 dark:bg-slate-900/20' },
    { status: 'in_progress', label: 'En progreso', className: 'border-sky-200 bg-sky-50/20 dark:border-sky-900/60 dark:bg-sky-950/10' },
    { status: 'in_review', label: 'En revisión', className: 'border-amber-200 bg-amber-50/20 dark:border-amber-900/60 dark:bg-amber-950/10' },
    { status: 'completed', label: 'Completada', className: 'border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/60 dark:bg-emerald-950/10' },
];

const STATUS_ACCENT_BORDER_CLASS: Record<TaskStatus, string> = {
    pending: 'border-l-slate-400',
    in_progress: 'border-l-sky-500',
    in_review: 'border-l-amber-500',
    completed: 'border-l-emerald-500',
};

const STATUS_COLUMN_ACCENT_CLASS: Record<TaskStatus, string> = {
    pending: 'border-l-slate-400 text-slate-700 dark:text-slate-200',
    in_progress: 'border-l-sky-500 text-sky-700 dark:text-sky-200',
    in_review: 'border-l-amber-500 text-amber-700 dark:text-amber-200',
    completed: 'border-l-emerald-500 text-emerald-700 dark:text-emerald-200',
};

function parseDueDate(value: string): string | null {
    const [day, month, year] = value.split('/');

    if (!day || !month || !year) {
        return null;
    }

    return `${year}-${month}-${day}`;
}

function dueDaysFromToday(dueAt: string): number | null {
    const dueDate = parseDueDate(dueAt);
    if (!dueDate) {
        return null;
    }

    const now = new Date();
    const target = new Date(dueDate);
    const utcToday = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());

    return Math.floor((utcTarget - utcToday) / (1000 * 60 * 60 * 24));
}

function dueIndicatorMeta(dueAt: string): { dotClass: string; text: string } | null {
    const days = dueDaysFromToday(dueAt);

    if (days === null) {
        return null;
    }

    if (days < 0) {
        return {
            dotClass: 'bg-black dark:bg-white',
            text: `Venció hace ${Math.abs(days)} día(s)`,
        };
    }

    if (days <= 7) {
        return {
            dotClass: 'bg-red-500',
            text: days === 0 ? 'Vence hoy' : `Te quedan ${days} día(s)`,
        };
    }

    if (days <= 14) {
        return {
            dotClass: 'bg-yellow-400',
            text: `Te quedan ${days} día(s)`,
        };
    }

    return {
        dotClass: 'bg-emerald-500',
        text: `Te quedan ${days} día(s)`,
    };
}

export default function PracticeTasksPage({ viewMode, interns, trainingPrograms, tasks }: Props) {
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const lastFlashRef = useRef<string | null>(null);
    const [search, setSearch] = useState('');
    const [internFilter, setInternFilter] = useState('all');
    const [trainingProgramFilter, setTrainingProgramFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dueStateFilter, setDueStateFilter] = useState<DueStateFilter>('all');
    const hasActiveFilters =
        search.trim() !== ''
        || internFilter !== 'all'
        || trainingProgramFilter !== 'all'
        || dateFrom !== ''
        || dateTo !== ''
        || dueStateFilter !== 'all';
    const [draggedTask, setDraggedTask] = useState<TaskCard | null>(null);
    const [dropColumn, setDropColumn] = useState<TaskStatus | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<TaskCard | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredTasks = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const isInvalidDateRange = dateFrom !== '' && dateTo !== '' && dateFrom > dateTo;

        return tasks.filter((task) => {
            const matchesSearch =
                normalizedSearch === '' ||
                task.title.toLowerCase().includes(normalizedSearch) ||
                task.description.toLowerCase().includes(normalizedSearch) ||
                task.internNames.some((name) => name.toLowerCase().includes(normalizedSearch));

            const matchesIntern = viewMode !== 'tutor' || internFilter === 'all' || task.internIds.includes(internFilter);
            const matchesTrainingProgram =
                trainingProgramFilter === 'all'
                || task.trainingProgramId === trainingProgramFilter;
            const taskDueDate = parseDueDate(task.dueAt);
            const matchesDateFrom = isInvalidDateRange || dateFrom === '' || (taskDueDate !== null && taskDueDate >= dateFrom);
            const matchesDateTo = isInvalidDateRange || dateTo === '' || (taskDueDate !== null && taskDueDate <= dateTo);
            const dueDays = task.dueAt !== '' ? dueDaysFromToday(task.dueAt) : null;
            const matchesDueState = (() => {
                if (dueStateFilter === 'all') return true;
                if (dueDays === null) return false;
                if (dueStateFilter === 'overdue') return dueDays < 0;
                if (dueStateFilter === 'next_7_days') return dueDays >= 0 && dueDays <= 7;
                return dueDays > 7;
            })();

            return matchesSearch && matchesIntern && matchesTrainingProgram && matchesDateFrom && matchesDateTo && matchesDueState;
        });
    }, [search, internFilter, trainingProgramFilter, dateFrom, dateTo, dueStateFilter, viewMode, tasks]);
    const hasInvalidDateRange = dateFrom !== '' && dateTo !== '' && dateFrom > dateTo;

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
    }, [page.props.flash?.success, page.props.flash?.error]);

    const handleDropTask = (status: TaskStatus) => {
        if (!draggedTask || draggedTask.status === status) {
            setDropColumn(null);
            return;
        }

        router.patch(practiceTasks.updateStatus(draggedTask.id).url, { status }, {
            preserveScroll: true,
            onFinish: () => {
                setDraggedTask(null);
                setDropColumn(null);
            },
        });
    };

    const confirmDeleteTask = () => {
        if (!taskToDelete) {
            return;
        }

        setIsDeleting(true);

        router.delete(practiceTasks.destroy(taskToDelete.id).url, {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setTaskToDelete(null);
            },
        });
    };

    const handleClearFilters = () => {
        setSearch('');
        setInternFilter('all');
        setTrainingProgramFilter('all');
        setDateFrom('');
        setDateTo('');
        setDueStateFilter('all');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Prácticas y Tareas" />

            <div className={UI_PRESETS.pageContent}>
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Prácticas y Tareas</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona tareas y su seguimiento operativo.
                        </p>
                    </div>
                </div>

                <div className={`${UI_PRESETS.pageSection} max-w-[1400px]`}>
                    <form className={`${UI_PRESETS.filterBar} mb-2`} onSubmit={(event) => event.preventDefault()}>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Buscar tareas por título o descripción"
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 pl-9 text-sm`}
                                    />
                                </div>

                                <div className="flex items-center gap-2 lg:ml-auto lg:shrink-0">
                                     <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className={UI_PRESETS.iconActionButton}
                                        onClick={handleClearFilters}
                                        disabled={!hasActiveFilters}
                                        title="Eliminar filtros"
                                        aria-label="Eliminar filtros"
                                    >
                                        <FilterX />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className={UI_PRESETS.iconActionButtonPrimary}
                                        title="Nueva Tarea"
                                        aria-label="Nueva Tarea"
                                        asChild
                                    >
                                        <Link href={practiceTasks.create().url}>
                                            <CirclePlus />
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            <div className={`grid gap-2 ${viewMode === 'tutor' ? 'md:grid-cols-2 xl:grid-cols-5' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
                                {viewMode === 'tutor' ? (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-muted-foreground">Becario</span>
                                        <Select value={internFilter} onValueChange={setInternFilter}>
                                            <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                                <SelectValue placeholder="Becario" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem className={UI_PRESETS.selectItem} value="all">
                                                    Todos los becarios
                                                </SelectItem>
                                                {interns.map((intern) => (
                                                    <SelectItem className={UI_PRESETS.selectItem} key={intern.id} value={intern.id}>
                                                        {intern.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : null}

                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Grado formativo</span>
                                    <Select value={trainingProgramFilter} onValueChange={setTrainingProgramFilter}>
                                        <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                            <SelectValue placeholder="Grado formativo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem className={UI_PRESETS.selectItem} value="all">
                                                Todos los grados
                                            </SelectItem>
                                            {trainingPrograms.map((program) => (
                                                <SelectItem className={UI_PRESETS.selectItem} key={program.id} value={program.id}>
                                                    {program.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Desde</span>
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(event) => setDateFrom(event.target.value)}
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Hasta</span>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(event) => setDateTo(event.target.value)}
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Vencimiento</span>
                                    <Select value={dueStateFilter} onValueChange={(value) => setDueStateFilter(value as DueStateFilter)}>
                                        <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                            <SelectValue placeholder="Vencimiento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem className={UI_PRESETS.selectItem} value="all">
                                                Todas
                                            </SelectItem>
                                            <SelectItem className={UI_PRESETS.selectItem} value="overdue">
                                                Vencidas
                                            </SelectItem>
                                            <SelectItem className={UI_PRESETS.selectItem} value="next_7_days">
                                                Menos de 7 días
                                            </SelectItem>
                                            <SelectItem className={UI_PRESETS.selectItem} value="over_7_days">
                                                Más de 7 días
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </form>
                    {hasInvalidDateRange ? (
                        <p className="mb-2 text-sm font-medium text-destructive">
                            La fecha "Desde" no puede ser posterior a la fecha "Hasta".
                        </p>
                    ) : null}

                    <div className={UI_PRESETS.sectionCard}>
                        <div className="overflow-x-auto pb-1 xl:overflow-visible">
                            <div className="mx-auto flex w-max min-w-max items-start gap-4 xl:grid xl:w-full xl:min-w-0 xl:grid-cols-4">
                                {STATUS_COLUMNS.map((column) => {
                                    const tasksInColumn = filteredTasks.filter((task) => task.status === column.status);

                                    return (
                                        <section
                                            key={column.status}
                                            className={`w-[300px] min-w-[300px] rounded-2xl border p-3 xl:w-full xl:min-w-0 ${column.className} ${dropColumn === column.status ? 'ring-2 ring-sky-300 dark:ring-sky-700' : ''}`}
                                            onDragOver={(event) => {
                                                event.preventDefault();
                                                setDropColumn(column.status);
                                            }}
                                            onDragLeave={() => setDropColumn((current) => (current === column.status ? null : current))}
                                            onDrop={(event) => {
                                                event.preventDefault();
                                                handleDropTask(column.status);
                                            }}
                                        >
                                            <div className={`mb-3 flex items-center justify-between border-b border-l-4 border-slate-200/70 pb-2 pl-2 dark:border-slate-700/70 ${STATUS_COLUMN_ACCENT_CLASS[column.status]}`}>
                                                <h2 className="text-sm font-semibold">{column.label}</h2>
                                                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                                    {tasksInColumn.length}
                                                </span>
                                            </div>

                                            <div className={`space-y-2.5 ${tasksInColumn.length > 4 ? 'max-h-[760px] overflow-y-auto pr-1' : ''}`}>
                                                {tasksInColumn.length > 0 ? (
                                                    tasksInColumn.map((task) => (
                                                        (() => {
                                                            const dueMeta = task.dueAt !== '' ? dueIndicatorMeta(task.dueAt) : null;

                                                            return (
                                                        <article
                                                            key={task.id}
                                                            className={`cursor-pointer space-y-3 rounded-xl border border-slate-200 border-l-4 bg-white p-3 text-sm shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-950 dark:hover:border-slate-600 ${STATUS_ACCENT_BORDER_CLASS[task.status]}`}
                                                            draggable
                                                            onClick={() => router.get(practiceTasks.edit(task.id).url)}
                                                            onDragStart={() => setDraggedTask(task)}
                                                            onDragEnd={() => {
                                                                setDraggedTask(null);
                                                                setDropColumn(null);
                                                            }}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800 dark:text-slate-100">{task.title}</h3>
                                                                <div className="flex items-start gap-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-slate-400 hover:text-destructive dark:text-slate-500"
                                                                        onClick={(event) => {
                                                                            event.stopPropagation();
                                                                            setTaskToDelete(task);
                                                                        }}
                                                                        aria-label="Eliminar tarea"
                                                                    >
                                                                        <Trash2 className="size-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-2 dark:border-slate-700 dark:bg-slate-900/40">
                                                                <p className="line-clamp-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                                    Becario: {task.internNames[0] ?? 'Sin becario asignado'}
                                                                </p>
                                                                {task.assignmentMode === 'training_program' && task.trainingProgramName ? (
                                                                    <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                                                        Grupo: {task.trainingProgramName}
                                                                    </p>
                                                                ) : null}
                                                                {task.internNames.length > 1 ? (
                                                                    <p className="line-clamp-1 text-[11px] text-muted-foreground">
                                                                        +{task.internNames.length - 1} becario(s) adicional(es)
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                            {task.dueAt !== '' ? (
                                                                <div className="rounded-lg border border-slate-200/80 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
                                                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Entrega: {task.dueAt}</p>
                                                                    {dueMeta ? (
                                                                        <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                            <span className={`inline-block size-2 rounded-full ${dueMeta.dotClass}`} />
                                                                            <span>{dueMeta.text}</span>
                                                                        </p>
                                                                    ) : null}
                                                                </div>
                                                            ) : null}
                                                        </article>
                                                            );
                                                        })()
                                                    ))
                                                ) : (
                                                    <div className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-muted-foreground dark:border-slate-700">
                                                        Sin tareas en esta columna.
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={taskToDelete !== null} onOpenChange={(open) => (!open ? setTaskToDelete(null) : undefined)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar tarea</DialogTitle>
                        <DialogDescription>
                            {taskToDelete
                                ? `Se eliminara "${taskToDelete.title}". Podras recuperarla desde BBDD al usar soft delete.`
                                : 'Confirma si quieres eliminar esta tarea.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setTaskToDelete(null)} disabled={isDeleting}>
                            Cancelar
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmDeleteTask} disabled={isDeleting}>
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}





