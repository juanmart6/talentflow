import {
    closestCorners,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    pointerWithin,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type {
    CollisionDetection,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link, router } from '@inertiajs/react';
import { CirclePlus, GraduationCap, GripVertical, Trash2, User } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import practiceTasks from '@/actions/App/Http/Controllers/PracticeTaskController';
import { Button } from '@/components/ui/button';
import { moveTaskToEndInStatus } from '@/lib/practice-tasks/practice-task-board';
import { UI_PRESETS } from '@/lib/ui-presets';
import type { TaskCard, TaskStatus } from '@/types/domains/practice-tasks';

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
    isTutorView: boolean;
    filteredTasks: TaskCard[];
    boardTasks: TaskCard[];
    setBoardTasks: Dispatch<SetStateAction<TaskCard[]>>;
    setTaskToDelete: Dispatch<SetStateAction<TaskCard | null>>;
    dueIndicatorMeta: (dueAt: string) => { dotClass: string; text: string } | null;
};

type DragAction =
    | {
          type: 'status-change';
          taskId: string;
          status: TaskStatus;
          nextTasks: TaskCard[];
      }
    | {
          type: 'reorder';
          status: TaskStatus;
          taskIds: string[];
          nextTasks: TaskCard[];
      };

const collisionDetectionStrategy: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
        return pointerCollisions;
    }

    return closestCorners(args);
};

const columnIdForStatus = (status: TaskStatus): string => `column:${status}`;

const statusFromColumnId = (columnId: string): TaskStatus | null => {
    if (!columnId.startsWith('column:')) {
        return null;
    }

    const [, rawStatus] = columnId.split(':');

    if (!rawStatus) {
        return null;
    }

    if (
        rawStatus !== 'pending'
        && rawStatus !== 'in_progress'
        && rawStatus !== 'in_review'
        && rawStatus !== 'completed'
    ) {
        return null;
    }

    return rawStatus;
};

const taskById = (tasks: TaskCard[], taskId: string): TaskCard | null =>
    tasks.find((task) => task.id === taskId) ?? null;

const statusFromOverId = (tasks: TaskCard[], overId: string): TaskStatus | null => {
    const columnStatus = statusFromColumnId(overId);
    if (columnStatus) {
        return columnStatus;
    }

    return taskById(tasks, overId)?.status ?? null;
};

const reorderTasksInStatus = (
    current: TaskCard[],
    status: TaskStatus,
    orderedIds: string[],
): TaskCard[] => {
    const statusTasks = current.filter((task) => task.status === status);
    if (statusTasks.length !== orderedIds.length) {
        return current;
    }

    const byId = new Map(statusTasks.map((task) => [task.id, task]));
    const reorderedStatusTasks = orderedIds
        .map((id) => byId.get(id))
        .filter((task): task is TaskCard => task !== undefined);

    if (reorderedStatusTasks.length !== statusTasks.length) {
        return current;
    }

    let statusCursor = 0;

    return current.map((task) => {
        if (task.status !== status) {
            return task;
        }

        const nextTask = reorderedStatusTasks[statusCursor];
        statusCursor += 1;
        return nextTask ?? task;
    });
};

const buildDragAction = (
    current: TaskCard[],
    activeTaskId: string,
    overId: string,
): DragAction | null => {
    const activeTask = taskById(current, activeTaskId);
    if (!activeTask) {
        return null;
    }

    const targetStatus = statusFromOverId(current, overId);
    if (!targetStatus) {
        return null;
    }

    if (targetStatus !== activeTask.status) {
        const nextByStatus = current.map((task) =>
            task.id === activeTaskId ? { ...task, status: targetStatus } : task,
        );

        return {
            type: 'status-change',
            taskId: activeTaskId,
            status: targetStatus,
            nextTasks: moveTaskToEndInStatus(nextByStatus, targetStatus, activeTaskId),
        };
    }

    if (overId.startsWith('column:')) {
        return null;
    }

    const statusIds = current
        .filter((task) => task.status === targetStatus)
        .map((task) => task.id);
    const oldIndex = statusIds.indexOf(activeTaskId);
    const newIndex = statusIds.indexOf(overId);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
        return null;
    }

    const reorderedIds = arrayMove(statusIds, oldIndex, newIndex);

    return {
        type: 'reorder',
        status: targetStatus,
        taskIds: reorderedIds,
        nextTasks: reorderTasksInStatus(current, targetStatus, reorderedIds),
    };
};

type SortableTaskCardProps = {
    task: TaskCard;
    isTutorView: boolean;
    isAnyDragActive: boolean;
    setTaskToDelete: Dispatch<SetStateAction<TaskCard | null>>;
    dueIndicatorMeta: (dueAt: string) => { dotClass: string; text: string } | null;
};

function SortableTaskCard({
    task,
    isTutorView,
    isAnyDragActive,
    setTaskToDelete,
    dueIndicatorMeta,
}: SortableTaskCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        disabled: !isTutorView,
    });
    const dueMeta = task.dueAt !== '' ? dueIndicatorMeta(task.dueAt) : null;
    const detailHref = isTutorView
        ? practiceTasks.edit(task.id).url
        : practiceTasks.show(task.id).url;
    const dragBindings = isTutorView
        ? { ...attributes, ...listeners }
        : {};

    return (
        <article
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={`${isTutorView ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} space-y-2.5 rounded-xl border border-slate-200/90 border-l-4 bg-white p-3 text-sm shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-950 ${isAnyDragActive ? 'hover:translate-y-0' : 'hover:-translate-y-0.5'} ${STATUS_ACCENT_BORDER_CLASS[task.status]} ${STATUS_CARD_HOVER_CLASS[task.status]} ${isDragging ? 'opacity-65 shadow-lg ring-1 ring-sky-300/70 dark:ring-sky-700/70' : ''}`}
            onClick={() => {
                if (isDragging || isAnyDragActive) {
                    return;
                }

                router.get(detailHref);
            }}
            {...dragBindings}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-1.5">
                    {isTutorView ? (
                        <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded text-slate-400/90 dark:text-slate-500">
                            <GripVertical className="size-4" />
                        </span>
                    ) : (
                        <GripVertical className="mt-0.5 size-4 shrink-0 text-slate-400/90 dark:text-slate-500" />
                    )}
                    <h3 className="line-clamp-2 text-sm font-semibold leading-[1.3] text-slate-800 dark:text-slate-100">
                        {task.title}
                    </h3>
                </div>
                {isTutorView ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md text-slate-400 hover:bg-red-50 hover:text-destructive dark:text-slate-500 dark:hover:bg-red-950/30"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                            event.stopPropagation();
                            setTaskToDelete(task);
                        }}
                        aria-label="Eliminar tarea"
                    >
                        <Trash2 className="size-3.5" />
                    </Button>
                ) : null}
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
    );
}

type KanbanColumnProps = {
    column: { status: TaskStatus; label: string; className: string };
    tasksInColumn: TaskCard[];
    isTutorView: boolean;
    dropColumn: TaskStatus | null;
    activeTaskId: string | null;
    setTaskToDelete: Dispatch<SetStateAction<TaskCard | null>>;
    dueIndicatorMeta: (dueAt: string) => { dotClass: string; text: string } | null;
};

function KanbanColumn({
    column,
    tasksInColumn,
    isTutorView,
    dropColumn,
    activeTaskId,
    setTaskToDelete,
    dueIndicatorMeta,
}: KanbanColumnProps) {
    const { setNodeRef } = useDroppable({
        id: columnIdForStatus(column.status),
    });

    return (
        <section
            ref={setNodeRef}
            className={`w-[300px] min-w-[300px] rounded-2xl border p-3.5 xl:w-full xl:min-w-0 ${column.className} ${dropColumn === column.status ? 'shadow-[inset_0_0_0_2px_rgba(56,189,248,0.55)] dark:shadow-[inset_0_0_0_2px_rgba(14,116,144,0.75)]' : ''}`}
        >
            <div
                className={`mb-3 flex items-center justify-between border-b border-l-4 border-slate-200/70 pb-2 pl-2 dark:border-slate-700/70 ${STATUS_COLUMN_ACCENT_CLASS[column.status]}`}
            >
                <h2 className="text-sm font-semibold tracking-tight">
                    {column.label}
                </h2>
                <div className="flex items-center gap-1.5">
                    {column.status === 'pending' && isTutorView ? (
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

            <SortableContext
                items={tasksInColumn.map((task) => task.id)}
                strategy={verticalListSortingStrategy}
            >
                <div
                    className={`space-y-2.5 ${tasksInColumn.length > 4 ? 'max-h-[760px] overflow-y-auto pr-1' : ''}`}
                >
                    {tasksInColumn.length > 0 ? (
                        tasksInColumn.map((task) => (
                            <SortableTaskCard
                                key={task.id}
                                task={task}
                                isTutorView={isTutorView}
                                isAnyDragActive={activeTaskId !== null}
                                setTaskToDelete={setTaskToDelete}
                                dueIndicatorMeta={dueIndicatorMeta}
                            />
                        ))
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-muted-foreground dark:border-slate-700">
                            Sin tareas en esta columna.
                        </div>
                    )}
                </div>
            </SortableContext>
        </section>
    );
}

export default function PracticeTasksBoard({
    isTutorView,
    filteredTasks,
    boardTasks,
    setBoardTasks,
    setTaskToDelete,
    dueIndicatorMeta,
}: PracticeTasksBoardProps) {
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [dropColumn, setDropColumn] = useState<TaskStatus | null>(null);
    const dragStartStatusRef = useRef<TaskStatus | null>(null);
    const dragStartTasksRef = useRef<TaskCard[] | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const activeTask = useMemo(
        () => (activeTaskId ? taskById(boardTasks, activeTaskId) : null),
        [activeTaskId, boardTasks],
    );

    const resetDragState = () => {
        setActiveTaskId(null);
        setDropColumn(null);
        dragStartStatusRef.current = null;
        dragStartTasksRef.current = null;
    };

    const handleDragStart = (event: DragStartEvent) => {
        if (!isTutorView) {
            return;
        }

        const id = String(event.active.id);
        const task = taskById(boardTasks, id);
        if (!task) {
            return;
        }

        setActiveTaskId(task.id);
        setDropColumn(task.status);
        dragStartStatusRef.current = task.status;
        dragStartTasksRef.current = boardTasks;
    };

    const handleDragOver = (event: DragOverEvent) => {
        if (!isTutorView) {
            return;
        }

        if (!event.over) {
            setDropColumn(null);
            return;
        }

        const overId = String(event.over.id);
        const targetStatus = statusFromOverId(boardTasks, overId);
        setDropColumn(targetStatus);

        if (!targetStatus) {
            return;
        }

        setBoardTasks((current) => {
            const activeTask = taskById(current, String(event.active.id));
            if (!activeTask || activeTask.status === targetStatus) {
                return current;
            }

            const movedToStatus = current.map((task) =>
                task.id === activeTask.id
                    ? { ...task, status: targetStatus }
                    : task,
            );

            return moveTaskToEndInStatus(movedToStatus, targetStatus, activeTask.id);
        });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        if (!isTutorView) {
            resetDragState();
            return;
        }

        const overId = event.over ? String(event.over.id) : null;
        const activeId = String(event.active.id);

        if (!overId) {
            resetDragState();
            return;
        }

        const rollbackTasks = dragStartTasksRef.current ?? boardTasks;
        const startStatus = dragStartStatusRef.current;
        const previousTasks = boardTasks;
        const activeTask = taskById(previousTasks, activeId);

        if (activeTask && startStatus && activeTask.status !== startStatus) {
            router.patch(
                practiceTasks.updateStatus(activeTask.id).url,
                { status: activeTask.status },
                {
                    preserveScroll: true,
                    preserveState: true,
                    replace: true,
                    onError: () => {
                        setBoardTasks(rollbackTasks);
                    },
                },
            );

            resetDragState();
            return;
        }

        const action = buildDragAction(previousTasks, activeId, overId);
        if (!action) {
            resetDragState();
            return;
        }

        setBoardTasks(action.nextTasks);

        if (action.type === 'status-change') {
            router.patch(
                practiceTasks.updateStatus(action.taskId).url,
                { status: action.status },
                {
                    preserveScroll: true,
                    preserveState: true,
                    replace: true,
                    onError: () => {
                        setBoardTasks(rollbackTasks);
                    },
                },
            );
        }

        if (action.type === 'reorder') {
            router.patch(
                '/practice-tasks/reorder',
                {
                    status: action.status,
                    task_ids: action.taskIds,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    replace: true,
                    onError: () => {
                        setBoardTasks(rollbackTasks);
                    },
                },
            );
        }

        resetDragState();
    };

    return (
        <div className={`${UI_PRESETS.sectionCard} ${activeTaskId ? '[&_*]:!cursor-grabbing' : ''}`}>
            <DndContext
                sensors={sensors}
                collisionDetection={collisionDetectionStrategy}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDragCancel={resetDragState}
            >
                <div className="overflow-x-auto pb-1 xl:overflow-visible">
                    <div className="mx-auto flex w-max min-w-max items-start gap-4 xl:grid xl:w-full xl:min-w-0 xl:grid-cols-4">
                        {STATUS_COLUMNS.map((column) => {
                            const tasksInColumn = filteredTasks.filter(
                                (task) => task.status === column.status,
                            );

                            return (
                                <KanbanColumn
                                    key={column.status}
                                    column={column}
                                    tasksInColumn={tasksInColumn}
                                    isTutorView={isTutorView}
                                    dropColumn={dropColumn}
                                    activeTaskId={activeTaskId}
                                    setTaskToDelete={setTaskToDelete}
                                    dueIndicatorMeta={dueIndicatorMeta}
                                />
                            );
                        })}
                    </div>
                </div>

                <DragOverlay>
                    {activeTask ? (
                        <div
                            className={`w-[300px] rounded-xl border border-slate-200/90 border-l-4 bg-white p-3 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-950 ${STATUS_ACCENT_BORDER_CLASS[activeTask.status]}`}
                        >
                            <p className="line-clamp-2 text-sm font-semibold leading-[1.3] text-slate-800 dark:text-slate-100">
                                {activeTask.title}
                            </p>
                            <p className="mt-1.5 inline-flex items-center gap-1.5 line-clamp-1 text-xs font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                                <User className="size-3.5 shrink-0 text-muted-foreground" />
                                <span className="truncate">
                                    {activeTask.internNames[0] ?? 'Sin becario asignado'}
                                </span>
                            </p>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
