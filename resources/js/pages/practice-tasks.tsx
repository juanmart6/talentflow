import { Head, Link, router } from '@inertiajs/react';
import { CirclePlus, FilterX, Pencil, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UI_PRESETS } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import practiceTasks from '@/routes/practice-tasks';
import type { BreadcrumbItem, InternOption } from '@/types';

type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed';

type TaskCard = {
    id: string;
    title: string;
    description: string;
    practiceType: PracticeType;
    status: TaskStatus;
    assignmentMode: 'interns' | 'training_program';
    trainingProgramId: string | null;
    trainingProgramName: string | null;
    internIds: string[];
    internNames: string[];
    dueAt: string;
};

type Props = {
    viewMode: 'tutor' | 'intern';
    interns: InternOption[];
    trainingPrograms: Array<{ id: string; name: string }>;
    tasks: TaskCard[];
};

type PracticeType = 'development' | 'test' | 'live_activity';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Prácticas y tareas',
        href: '/practice-tasks',
    },
];

const STATUS_COLUMNS: Array<{ status: TaskStatus; label: string; className: string }> = [
    { status: 'pending', label: 'Pendiente', className: 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/30' },
    { status: 'in_progress', label: 'En progreso', className: 'border-sky-200 bg-sky-50/40 dark:border-sky-900/70 dark:bg-sky-950/15' },
    { status: 'in_review', label: 'En revisión', className: 'border-amber-200 bg-amber-50/40 dark:border-amber-900/70 dark:bg-amber-950/15' },
    { status: 'completed', label: 'Completada', className: 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/70 dark:bg-emerald-950/15' },
];

const PRACTICE_TYPE_OPTIONS: Array<{ value: PracticeType; label: string }> = [
    { value: 'development', label: 'Tarea de Desarrollo' },
    { value: 'test', label: 'Test' },
    { value: 'live_activity', label: 'Actividad en vivo' },
];

function parseDueDate(value: string): string | null {
    const [day, month, year] = value.split('/');

    if (!day || !month || !year) {
        return null;
    }

    return `${year}-${month}-${day}`;
}

export default function PracticeTasksPage({ viewMode, interns, trainingPrograms, tasks }: Props) {
    const [search, setSearch] = useState('');
    const [internFilter, setInternFilter] = useState('all');
    const [practiceTypeFilter, setPracticeTypeFilter] = useState<'all' | PracticeType>('all');
    const [trainingProgramFilter, setTrainingProgramFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const hasActiveFilters =
        search.trim() !== ''
        || internFilter !== 'all'
        || practiceTypeFilter !== 'all'
        || trainingProgramFilter !== 'all'
        || dateFrom !== ''
        || dateTo !== '';
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
                task.description.toLowerCase().includes(normalizedSearch);

            const matchesIntern = viewMode !== 'tutor' || internFilter === 'all' || task.internIds.includes(internFilter);
            const matchesPracticeType = practiceTypeFilter === 'all' || task.practiceType === practiceTypeFilter;
            const matchesTrainingProgram =
                trainingProgramFilter === 'all'
                || task.trainingProgramId === trainingProgramFilter;
            const taskDueDate = parseDueDate(task.dueAt);
            const matchesDateFrom = isInvalidDateRange || dateFrom === '' || (taskDueDate !== null && taskDueDate >= dateFrom);
            const matchesDateTo = isInvalidDateRange || dateTo === '' || (taskDueDate !== null && taskDueDate <= dateTo);

            return matchesSearch && matchesIntern && matchesPracticeType && matchesTrainingProgram && matchesDateFrom && matchesDateTo;
        });
    }, [search, internFilter, practiceTypeFilter, trainingProgramFilter, dateFrom, dateTo, viewMode, tasks]);
    const hasInvalidDateRange = dateFrom !== '' && dateTo !== '' && dateFrom > dateTo;

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
        setPracticeTypeFilter('all');
        setTrainingProgramFilter('all');
        setDateFrom('');
        setDateTo('');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Prácticas y tareas" />

            <div className={UI_PRESETS.pageContent}>
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Prácticas y tareas</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona tareas y su seguimiento operativo.
                        </p>
                    </div>
                </div>

                <div className={UI_PRESETS.pageSection}>
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
                                        title="Nueva tarea"
                                        aria-label="Nueva tarea"
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
                                    <span className="text-xs font-medium text-muted-foreground">Tipo de práctica</span>
                                    <Select value={practiceTypeFilter} onValueChange={(value) => setPracticeTypeFilter(value as 'all' | PracticeType)}>
                                        <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                            <SelectValue placeholder="Tipo de práctica" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem className={UI_PRESETS.selectItem} value="all">
                                                Todos los tipos
                                            </SelectItem>
                                            {PRACTICE_TYPE_OPTIONS.map((option) => (
                                                <SelectItem className={UI_PRESETS.selectItem} key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

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
                            </div>
                        </div>
                    </form>
                    {hasInvalidDateRange ? (
                        <p className="mb-2 text-sm font-medium text-destructive">
                            La fecha "Desde" no puede ser posterior a la fecha "Hasta".
                        </p>
                    ) : null}

                    <div className={UI_PRESETS.sectionCard}>
                        <div className="overflow-x-auto pb-1">
                            <div className="mx-auto flex w-max min-w-max items-start gap-4">
                                {STATUS_COLUMNS.map((column) => {
                                    const tasksInColumn = filteredTasks.filter((task) => task.status === column.status);

                                    return (
                                        <section
                                            key={column.status}
                                            className={`w-[300px] min-w-[300px] rounded-2xl border p-3 ${column.className} ${dropColumn === column.status ? 'ring-2 ring-sky-300 dark:ring-sky-700' : ''}`}
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
                                            <div className="mb-3 flex items-center justify-between border-b border-slate-200/70 pb-2 dark:border-slate-700/70">
                                                <h2 className="text-sm font-semibold">{column.label}</h2>
                                                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                                    {tasksInColumn.length}
                                                </span>
                                            </div>

                                            <div className="space-y-2.5">
                                                {tasksInColumn.length > 0 ? (
                                                    tasksInColumn.map((task) => (
                                                        <article
                                                            key={task.id}
                                                            className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-xs dark:border-slate-700 dark:bg-slate-950"
                                                            draggable
                                                            onDragStart={() => setDraggedTask(task)}
                                                            onDragEnd={() => {
                                                                setDraggedTask(null);
                                                                setDropColumn(null);
                                                            }}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <h3 className="text-sm font-semibold leading-5">{task.title}</h3>
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                                                        asChild
                                                                    >
                                                                        <Link href={practiceTasks.edit(task.id).url} aria-label="Editar tarea">
                                                                            <Pencil className="size-3.5" />
                                                                        </Link>
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                        onClick={() => setTaskToDelete(task)}
                                                                        aria-label="Eliminar tarea"
                                                                    >
                                                                        <Trash2 className="size-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            {task.description !== '' ? (
                                                                <p className="line-clamp-3 text-xs text-muted-foreground">{task.description}</p>
                                                            ) : null}
                                                            <div className="space-y-1 text-xs text-muted-foreground">
                                                                {task.assignmentMode === 'training_program' && task.trainingProgramName ? (
                                                                    <p className="line-clamp-1">Grupo: {task.trainingProgramName}</p>
                                                                ) : null}
                                                                <p className="line-clamp-1">
                                                                    {task.internNames.length > 0 ? task.internNames.join(', ') : 'Sin becarios asignados'}
                                                                </p>
                                                                {task.dueAt !== '' ? <p>Entrega: {task.dueAt}</p> : null}
                                                            </div>
                                                        </article>
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

