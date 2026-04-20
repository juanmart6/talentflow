import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import practiceTasks from '@/actions/App/Http/Controllers/PracticeTaskController';
import PracticeTasksBoard from '@/components/practice-tasks/practice-tasks-board';
import PracticeTasksFiltersBar from '@/components/practice-tasks/practice-tasks-filters-bar';
import PracticeTasksList from '@/components/practice-tasks/practice-tasks-list';
import PracticeTasksViewToggle from '@/components/practice-tasks/practice-tasks-view-toggle';
import ConfirmDeleteDialog from '@/components/shared/confirm-delete-dialog';
import AppLayout from '@/layouts/app-layout';
import { moveTaskInStatus, moveTaskToEndInStatus } from '@/lib/practice-tasks/practice-task-board';
import { parseDueDate, dueDaysFromToday, dueIndicatorMeta } from '@/lib/practice-tasks/practice-task-dates';
import { UI_PRESETS } from '@/lib/ui-presets';
import type { BreadcrumbItem } from '@/types';
import type { DueStateFilter, PracticeTasksProps, TaskCard, TaskStatus } from '@/types/domains/practice-tasks';


const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Prácticas y Tareas',
        href: '/practice-tasks',
    },
];

export default function PracticeTasksPage({ viewMode, interns, trainingPrograms, tasks }: PracticeTasksProps) {
    const isTutorView = viewMode === 'tutor';
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const lastFlashRef = useRef<string | null>(null);
    const [search, setSearch] = useState('');
    const [selectedInternIds, setSelectedInternIds] = useState<string[]>([]);
    const [trainingProgramFilter, setTrainingProgramFilter] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [dueStateFilter, setDueStateFilter] = useState<DueStateFilter>('all');
    const hasActiveFilters =
        search.trim() !== ''
        || selectedInternIds.length > 0
        || trainingProgramFilter !== 'all'
        || dateFrom !== ''
        || dateTo !== ''
        || dueStateFilter !== 'all';
    const [draggedTask, setDraggedTask] = useState<TaskCard | null>(null);
    const [dropColumn, setDropColumn] = useState<TaskStatus | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<TaskCard | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [boardTasks, setBoardTasks] = useState<TaskCard[]>(tasks);
    const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
    const [hoveredPosition, setHoveredPosition] = useState<'before' | 'after' | null>(null);
    const [hoveredEndStatus, setHoveredEndStatus] = useState<TaskStatus | null>(null);
    const [tasksView, setTasksView] = useState<'kanban' | 'list'>(() => {
        if (typeof window === 'undefined') {
            return 'kanban';
        }

        const savedView = window.localStorage.getItem('practice-tasks:view');
        return savedView === 'list' ? 'list' : 'kanban';
    });
    const dragStartStatusRef = useRef<TaskStatus | null>(null);
    const dragStartOrderRef = useRef<string[]>([]);
    const reorderedInCurrentDragRef = useRef(false);

    useEffect(() => {
        setBoardTasks(tasks);
    }, [tasks]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem('practice-tasks:view', tasksView);
    }, [tasksView]);

    const filteredTasks = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const isInvalidDateRange = dateFrom !== '' && dateTo !== '' && dateFrom > dateTo;

        return boardTasks.filter((task) => {
            const matchesSearch =
                normalizedSearch === '' ||
                task.title.toLowerCase().includes(normalizedSearch) ||
                task.description.toLowerCase().includes(normalizedSearch) ||
                task.internNames.some((name) => name.toLowerCase().includes(normalizedSearch));

            const matchesIntern =
                viewMode !== 'tutor'
                || selectedInternIds.length === 0
                || task.internIds.some((internId) => selectedInternIds.includes(internId));
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
    }, [search, selectedInternIds, trainingProgramFilter, dateFrom, dateTo, dueStateFilter, viewMode, boardTasks]);
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
            toast.success(successMessage, { id: flashKey });
        }

        if (errorMessage) {
            toast.error(errorMessage, { id: flashKey });
        }
    }, [page.props.flash?.success, page.props.flash?.error]);

    const handleDropTask = (status: TaskStatus) => {
        if (!draggedTask || draggedTask.status === status) {
            setDropColumn(null);
            setHoveredTaskId(null);
            setHoveredPosition(null);
            setHoveredEndStatus(null);
            return;
        }

        setBoardTasks((current) => {
            const movedTask = current.find((task) => task.id === draggedTask.id);

            if (!movedTask) {
                return current;
            }

            const updated = current.map((task) => (
                task.id === draggedTask.id
                    ? { ...task, status }
                    : task
            ));

            // Keep moved tasks at the end of the target column until server sync.
            const targetTasks = updated.filter((task) => task.status === status);
            const targetIds = targetTasks.map((task) => task.id);
            const movedIndex = targetIds.indexOf(draggedTask.id);

            if (movedIndex < 0) {
                return updated;
            }

            targetIds.splice(movedIndex, 1);
            targetIds.push(draggedTask.id);

            let targetCursor = 0;

            return updated.map((task) => {
                if (task.status !== status) {
                    return task;
                }

                const nextId = targetIds[targetCursor];
                targetCursor += 1;

                return updated.find((candidate) => candidate.id === nextId) ?? task;
            });
        });

        router.patch(practiceTasks.updateStatus(draggedTask.id).url, { status }, {
            preserveScroll: true,
            onError: () => {
                toast.error('No se pudo actualizar el estado de la tarea.');
            },
            onFinish: () => {
                setDraggedTask(null);
                setDropColumn(null);
                setHoveredTaskId(null);
                setHoveredPosition(null);
                setHoveredEndStatus(null);
            },
        });
    };

    const confirmDeleteTask = () => {
        if (!isTutorView) {
            return;
        }

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
        setSelectedInternIds([]);
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Prácticas y Tareas</h1>
                            <p className="text-sm text-muted-foreground">
                                {isTutorView
                                    ? 'Gestiona tareas y su seguimiento operativo.'
                                    : 'Consulta tus tareas asignadas y su seguimiento.'}
                            </p>
                        </div>
                        <PracticeTasksViewToggle view={tasksView} onViewChange={setTasksView} />
                    </div>
                </div>

                <div className="mx-auto w-full max-w-[1360px]">
                    <PracticeTasksFiltersBar
                        viewMode={viewMode}
                        search={search}
                        onSearchChange={setSearch}
                        selectedInternIds={selectedInternIds}
                        onSelectedInternIdsChange={setSelectedInternIds}
                        trainingProgramFilter={trainingProgramFilter}
                        onTrainingProgramFilterChange={setTrainingProgramFilter}
                        dateFrom={dateFrom}
                        onDateFromChange={setDateFrom}
                        dateTo={dateTo}
                        onDateToChange={setDateTo}
                        dueStateFilter={dueStateFilter}
                        onDueStateFilterChange={setDueStateFilter}
                        hasActiveFilters={hasActiveFilters}
                        onClearFilters={handleClearFilters}
                        interns={interns}
                        trainingPrograms={trainingPrograms}
                    />
                    {hasInvalidDateRange ? (
                        <p className="mb-2 text-sm font-medium text-destructive">
                            La fecha "Desde" no puede ser posterior a la fecha "Hasta".
                        </p>
                    ) : null}

                    {tasksView === 'kanban' ? (
                        <PracticeTasksBoard
                            isTutorView={isTutorView}
                            filteredTasks={filteredTasks}
                            boardTasks={boardTasks}
                            draggedTask={draggedTask}
                            dropColumn={dropColumn}
                            hoveredTaskId={hoveredTaskId}
                            hoveredPosition={hoveredPosition}
                            hoveredEndStatus={hoveredEndStatus}
                            setDraggedTask={setDraggedTask}
                            setDropColumn={setDropColumn}
                            setHoveredTaskId={setHoveredTaskId}
                            setHoveredPosition={setHoveredPosition}
                            setHoveredEndStatus={setHoveredEndStatus}
                            setBoardTasks={setBoardTasks}
                            setTaskToDelete={setTaskToDelete}
                            handleDropTask={handleDropTask}
                            moveTaskInStatus={moveTaskInStatus}
                            moveTaskToEndInStatus={moveTaskToEndInStatus}
                            dueIndicatorMeta={dueIndicatorMeta}
                            dragStartStatusRef={dragStartStatusRef}
                            dragStartOrderRef={dragStartOrderRef}
                            reorderedInCurrentDragRef={reorderedInCurrentDragRef}
                        />
                    ) : (
                        <PracticeTasksList
                            viewMode={viewMode}
                            tasks={filteredTasks}
                            dueIndicatorMeta={dueIndicatorMeta}
                            setTaskToDelete={setTaskToDelete}
                        />
                    )}
                </div>
            </div>

            {isTutorView ? (
                <ConfirmDeleteDialog
                    open={taskToDelete !== null}
                    title="Eliminar tarea"
                    description="Confirma si quieres eliminar esta tarea."
                    entityLabel="Tarea"
                    entityName={taskToDelete?.title ?? null}
                    isLoading={isDeleting}
                    onCancel={() => setTaskToDelete(null)}
                    onConfirm={confirmDeleteTask}
                />
            ) : null}
        </AppLayout>
    );
}
