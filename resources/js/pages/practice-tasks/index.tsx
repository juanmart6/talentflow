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
import { parseDueDate, dueDaysFromToday, dueIndicatorMeta } from '@/lib/practice-tasks/practice-task-dates';
import { UI_PRESETS } from '@/lib/ui-presets';
import type { BreadcrumbItem } from '@/types';
import type { DueStateFilter, PracticeTasksProps, TaskCard } from '@/types/domains/practice-tasks';


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
    const [taskToDelete, setTaskToDelete] = useState<TaskCard | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [boardTasks, setBoardTasks] = useState<TaskCard[]>(tasks);
    const [tasksView, setTasksView] = useState<'kanban' | 'list'>(() => {
        if (typeof window === 'undefined') {
            return 'kanban';
        }

        const savedView = window.localStorage.getItem('practice-tasks:view');
        return savedView === 'list' ? 'list' : 'kanban';
    });

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
    const dueLegendItems: Array<{ dotClass: string; label: string }> = [
        { dotClass: 'bg-black dark:bg-white', label: 'Vencida' },
        { dotClass: 'bg-red-500', label: 'Vence hoy o en 7 días' },
        { dotClass: 'bg-yellow-400', label: 'Vence en 8-14 días' },
        { dotClass: 'bg-emerald-500', label: 'Vence en más de 14 días' },
    ];

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
                    <div className="mb-3 rounded-xl border border-sidebar-border/70 bg-white/80 px-3 py-2 dark:bg-slate-900/35">
                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Leyenda de vencimientos:</span>
                            {dueLegendItems.map((item) => (
                                <span key={item.label} className="inline-flex items-center gap-2">
                                    <span className={`inline-block size-3 rounded-full ${item.dotClass}`} />
                                    <span>{item.label}</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {tasksView === 'kanban' ? (
                        <PracticeTasksBoard
                            isTutorView={isTutorView}
                            filteredTasks={filteredTasks}
                            boardTasks={boardTasks}
                            setBoardTasks={setBoardTasks}
                            setTaskToDelete={setTaskToDelete}
                            dueIndicatorMeta={dueIndicatorMeta}
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
