import { Link, router } from '@inertiajs/react';
import { CirclePlus, GraduationCap, GripVertical, Trash2, User } from 'lucide-react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { Button } from '@/components/ui/button';
import { UI_PRESETS } from '@/lib/ui-presets';
import practiceTasks from '@/routes/practice-tasks';
import type { TaskCard, TaskStatus } from '@/types/practice-tasks';

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

const STATUS_CARD_HOVER_CLASS: Record<TaskStatus, string> = {
    pending: 'hover:border-slate-300 dark:hover:border-slate-600',
    in_progress: 'hover:border-sky-300 hover:bg-sky-50/60 dark:hover:border-sky-700 dark:hover:bg-sky-950/25',
    in_review: 'hover:border-amber-300 hover:bg-amber-50/60 dark:hover:border-amber-700 dark:hover:bg-amber-950/25',
    completed: 'hover:border-emerald-300 hover:bg-emerald-50/60 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/25',
};

const STATUS_COLUMN_ACCENT_CLASS: Record<TaskStatus, string> = {
    pending: 'border-l-slate-400 text-slate-700 dark:text-slate-200',
    in_progress: 'border-l-sky-500 text-sky-700 dark:text-sky-200',
    in_review: 'border-l-amber-500 text-amber-700 dark:text-amber-200',
    completed: 'border-l-emerald-500 text-emerald-700 dark:text-emerald-200',
};

type PracticeTasksBoardProps = {
    filteredTasks: TaskCard[];
    boardTasks: TaskCard[];
    draggedTask: TaskCard | null;
    dropColumn: TaskStatus | null;
    hoveredTaskId: string | null;
    hoveredPosition: 'before' | 'after' | null;
    hoveredEndStatus: TaskStatus | null;
    setDraggedTask: Dispatch<SetStateAction<TaskCard | null>>;
    setDropColumn: Dispatch<SetStateAction<TaskStatus | null>>;
    setHoveredTaskId: Dispatch<SetStateAction<string | null>>;
    setHoveredPosition: Dispatch<SetStateAction<'before' | 'after' | null>>;
    setHoveredEndStatus: Dispatch<SetStateAction<TaskStatus | null>>;
    setBoardTasks: Dispatch<SetStateAction<TaskCard[]>>;
    setTaskToDelete: Dispatch<SetStateAction<TaskCard | null>>;
    handleDropTask: (status: TaskStatus) => void;
    moveTaskInStatus: (
        current: TaskCard[],
        status: TaskStatus,
        draggedTaskId: string,
        targetTaskId: string,
        position: 'before' | 'after',
    ) => TaskCard[];
    moveTaskToEndInStatus: (current: TaskCard[], status: TaskStatus, taskId: string) => TaskCard[];
    dueIndicatorMeta: (dueAt: string) => { dotClass: string; text: string } | null;
    dragStartStatusRef: MutableRefObject<TaskStatus | null>;
    dragStartOrderRef: MutableRefObject<string[]>;
    reorderedInCurrentDragRef: MutableRefObject<boolean>;
};

export default function PracticeTasksBoard(props: PracticeTasksBoardProps) {
    const {
        filteredTasks,
        boardTasks,
        draggedTask,
        dropColumn,
        hoveredTaskId,
        hoveredPosition,
        hoveredEndStatus,
        setDraggedTask,
        setDropColumn,
        setHoveredTaskId,
        setHoveredPosition,
        setHoveredEndStatus,
        setBoardTasks,
        setTaskToDelete,
        handleDropTask,
        moveTaskInStatus,
        moveTaskToEndInStatus,
        dueIndicatorMeta,
        dragStartStatusRef,
        dragStartOrderRef,
        reorderedInCurrentDragRef,
    } = props;

    return (
        <div className={`${UI_PRESETS.sectionCard} ${draggedTask ? '[&_*]:!cursor-grabbing' : ''}`}>
            <div className="overflow-x-auto pb-1 xl:overflow-visible">
                <div className="mx-auto flex w-max min-w-max items-start gap-4 xl:grid xl:w-full xl:min-w-0 xl:grid-cols-4">
                    {STATUS_COLUMNS.map((column) => {
                        const tasksInColumn = filteredTasks.filter((task) => task.status === column.status);

                        return (
                            <section
                                key={column.status}
                                className={`w-[300px] min-w-[300px] rounded-2xl border p-3.5 xl:w-full xl:min-w-0 ${column.className} ${dropColumn === column.status ? 'shadow-[inset_0_0_0_2px_rgba(56,189,248,0.55)] dark:shadow-[inset_0_0_0_2px_rgba(14,116,144,0.75)]' : ''}`}
                                onDragEnter={(event) => {
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = 'move';
                                    setDropColumn(column.status);
                                }}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    event.dataTransfer.dropEffect = 'move';
                                }}
                                onDragLeave={(event) => {
                                    const nextTarget = event.relatedTarget as Node | null;

                                    if (nextTarget && event.currentTarget.contains(nextTarget)) {
                                        return;
                                    }

                                    setDropColumn((current) => (current === column.status ? null : current));
                                }}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    setHoveredEndStatus(null);
                                    handleDropTask(column.status);
                                }}
                            >
                                <div className={`mb-3 flex items-center justify-between border-b border-l-4 border-slate-200/70 pb-2 pl-2 dark:border-slate-700/70 ${STATUS_COLUMN_ACCENT_CLASS[column.status]}`}>
                                    <h2 className="text-sm font-semibold tracking-tight">{column.label}</h2>
                                    <div className="flex items-center gap-1.5">
                                        {column.status === 'pending' ? (
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-6 w-6 rounded-full border-[#2563eb]/35 bg-white text-[#1d4ed8] shadow-none hover:border-[#2563eb]/60 hover:bg-[#2563eb]/10 dark:border-[#2563eb]/45 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-[#2563eb]/20"
                                                title="Nueva tarea"
                                                aria-label="Nueva tarea"
                                                asChild
                                            >
                                                <Link href={practiceTasks.create().url}>
                                                    <CirclePlus className="size-3.5" />
                                                </Link>
                                            </Button>
                                        ) : null}
                                        <span className="rounded-full border border-slate-300 bg-white/80 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                                            {tasksInColumn.length}
                                        </span>
                                    </div>
                                </div>

                                <div className={`space-y-2.5 ${tasksInColumn.length > 4 ? 'max-h-[760px] overflow-y-auto pr-1' : ''}`}>
                                    {tasksInColumn.length > 0 ? (
                                        tasksInColumn.map((task) => {
                                            const dueMeta = task.dueAt !== '' ? dueIndicatorMeta(task.dueAt) : null;

                                            return (
                                                <div key={task.id} className="space-y-1.5">
                                                    {hoveredTaskId === task.id && hoveredPosition === 'before' ? (
                                                        <div className="h-1 rounded-full bg-sky-400/80 dark:bg-sky-500/80" />
                                                    ) : null}

                                                    <article
                                                        className={`cursor-pointer space-y-2.5 rounded-xl border border-slate-200/90 border-l-4 bg-white p-3 text-sm shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-950 ${draggedTask ? 'hover:translate-y-0' : 'hover:-translate-y-0.5'} ${STATUS_ACCENT_BORDER_CLASS[task.status]} ${STATUS_CARD_HOVER_CLASS[task.status]} ${draggedTask?.id === task.id ? 'opacity-60' : ''}`}
                                                        draggable
                                                        onClick={() => router.get(practiceTasks.edit(task.id).url)}
                                                        onDragStart={(event) => {
                                                            event.dataTransfer.effectAllowed = 'move';
                                                            event.dataTransfer.setData('text/plain', task.id);
                                                            setDraggedTask(task);
                                                            dragStartStatusRef.current = task.status;
                                                            dragStartOrderRef.current = boardTasks
                                                                .filter((candidate) => candidate.status === task.status)
                                                                .map((candidate) => candidate.id);
                                                            reorderedInCurrentDragRef.current = false;
                                                            setHoveredEndStatus(null);
                                                        }}
                                                        onDragOver={(event) => {
                                                            if (!draggedTask) {
                                                                return;
                                                            }

                                                            event.preventDefault();
                                                            event.dataTransfer.dropEffect = 'move';

                                                            if (draggedTask.status !== task.status || draggedTask.id === task.id) {
                                                                return;
                                                            }

                                                            const rect = event.currentTarget.getBoundingClientRect();
                                                            const nextPosition: 'before' | 'after' = event.clientY < (rect.top + rect.height / 2) ? 'before' : 'after';

                                                            setHoveredTaskId(task.id);
                                                            setHoveredPosition(nextPosition);
                                                            setHoveredEndStatus(null);

                                                            setBoardTasks((current) => {
                                                                const next = moveTaskInStatus(current, task.status, draggedTask.id, task.id, nextPosition);

                                                                if (next !== current) {
                                                                    reorderedInCurrentDragRef.current = true;
                                                                }

                                                                return next;
                                                            });
                                                        }}
                                                        onDragEnd={() => {
                                                            const startStatus = dragStartStatusRef.current;
                                                            const wasReordered = reorderedInCurrentDragRef.current;

                                                            if (startStatus && wasReordered) {
                                                                const currentOrder = boardTasks
                                                                    .filter((candidate) => candidate.status === startStatus)
                                                                    .map((candidate) => candidate.id);
                                                                const initialOrder = dragStartOrderRef.current;

                                                                if (currentOrder.join('|') !== initialOrder.join('|')) {
                                                                    router.patch('/practice-tasks/reorder', {
                                                                        status: startStatus,
                                                                        task_ids: currentOrder,
                                                                    }, {
                                                                        preserveScroll: true,
                                                                        preserveState: true,
                                                                        replace: true,
                                                                    });
                                                                }
                                                            }

                                                            dragStartStatusRef.current = null;
                                                            dragStartOrderRef.current = [];
                                                            reorderedInCurrentDragRef.current = false;
                                                            setHoveredTaskId(null);
                                                            setHoveredPosition(null);
                                                            setHoveredEndStatus(null);
                                                            setDraggedTask(null);
                                                            setDropColumn(null);
                                                        }}
                                                        onDragEnter={(event) => {
                                                            if (!draggedTask) {
                                                                return;
                                                            }

                                                            event.preventDefault();
                                                            event.dataTransfer.dropEffect = 'move';
                                                            setDropColumn(task.status);
                                                        }}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex min-w-0 items-start gap-1.5">
                                                                <GripVertical className="mt-0.5 size-4 shrink-0 text-slate-400/90 dark:text-slate-500" />
                                                                <h3 className="line-clamp-2 text-sm font-semibold leading-[1.3] text-slate-800 dark:text-slate-100">{task.title}</h3>
                                                            </div>
                                                            <div className="flex items-start gap-1">
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 rounded-md text-slate-400 hover:bg-red-50 hover:text-destructive dark:text-slate-500 dark:hover:bg-red-950/30"
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
                                                        <div className="space-y-1.5">
                                                            <p className="inline-flex items-center gap-1.5 line-clamp-1 text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                                                                <User className="size-3.5 shrink-0 text-muted-foreground" />
                                                                <span className="truncate">
                                                                    {task.internNames[0] ?? 'Sin becario asignado'}
                                                                    {task.internNames.length > 1 ? ` · +${task.internNames.length - 1}` : ''}
                                                                </span>
                                                            </p>
                                                            {task.assignmentMode === 'training_program' && task.trainingProgramName ? (
                                                                <p className="inline-flex items-center gap-1.5 line-clamp-1 text-[11px] text-muted-foreground/90">
                                                                    <GraduationCap className="size-3.5 shrink-0 text-muted-foreground" />
                                                                    <span className="truncate">{task.trainingProgramName}</span>
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        {task.dueAt !== '' ? (
                                                            <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200/90 bg-slate-50/80 px-2.5 py-1.5 dark:border-slate-700 dark:bg-slate-900/50">
                                                                <p className="truncate text-xs font-medium text-slate-700 dark:text-slate-200">
                                                                    {task.dueAt}
                                                                </p>
                                                                {dueMeta ? (
                                                                    <p className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                                                        <span className={`inline-block size-3.5 rounded-full ${dueMeta.dotClass}`} />
                                                                        <span>{dueMeta.text}</span>
                                                                    </p>
                                                                ) : null}
                                                            </div>
                                                        ) : null}
                                                    </article>

                                                    {hoveredTaskId === task.id && hoveredPosition === 'after' ? (
                                                        <div className="h-1 rounded-full bg-sky-400/80 dark:bg-sky-500/80" />
                                                    ) : null}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-muted-foreground dark:border-slate-700">
                                            Sin tareas en esta columna.
                                        </div>
                                    )}
                                </div>

                                {tasksInColumn.length > 0 && draggedTask && draggedTask.status === column.status ? (
                                    <div
                                        className={`mt-1 rounded-md border border-dashed px-2 py-1.5 text-center text-[11px] font-medium transition-colors ${
                                            hoveredEndStatus === column.status
                                                ? 'border-sky-400 bg-sky-100/70 text-sky-700 dark:border-sky-600 dark:bg-sky-900/35 dark:text-sky-200'
                                                : 'border-sky-300/70 text-sky-600 dark:border-sky-700/70 dark:text-sky-300'
                                        }`}
                                        onDragOver={(event) => {
                                            if (!draggedTask || draggedTask.status !== column.status) {
                                                return;
                                            }

                                            event.preventDefault();
                                            event.dataTransfer.dropEffect = 'move';
                                            setHoveredTaskId(null);
                                            setHoveredPosition(null);
                                            setHoveredEndStatus(column.status);

                                            setBoardTasks((current) => {
                                                const next = moveTaskToEndInStatus(current, column.status, draggedTask.id);

                                                if (next !== current) {
                                                    reorderedInCurrentDragRef.current = true;
                                                }

                                                return next;
                                            });
                                        }}
                                        onDragEnter={(event) => {
                                            if (!draggedTask || draggedTask.status !== column.status) {
                                                return;
                                            }

                                            event.preventDefault();
                                            event.dataTransfer.dropEffect = 'move';
                                        }}
                                        onDragLeave={() => {
                                            setHoveredEndStatus((current) => (current === column.status ? null : current));
                                        }}
                                    >
                                        Soltar aquí para enviar al final
                                    </div>
                                ) : null}
                            </section>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
