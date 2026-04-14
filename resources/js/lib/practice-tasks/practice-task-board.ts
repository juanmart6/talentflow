import type { TaskCard, TaskStatus } from "@/types/domains/practice-tasks";

export function moveTaskInStatus(
    current: TaskCard[],
    status: TaskStatus,
    draggedTaskId: string,
    targetTaskId: string,
    position: 'before' | 'after',
): TaskCard[] {
    const statusTasks = current.filter((task) => task.status === status);
    const draggedTask = statusTasks.find((task) => task.id === draggedTaskId);

    if (!draggedTask || draggedTaskId === targetTaskId) {
        return current;
    }

    const reorderedStatusTasks = statusTasks.filter((task) => task.id !== draggedTaskId);
    const targetIndex = reorderedStatusTasks.findIndex((task) => task.id === targetTaskId);

    if (targetIndex < 0) {
        return current;
    }

    const insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;
    reorderedStatusTasks.splice(insertIndex, 0, draggedTask);

    let statusIndex = 0;

    return current.map((task) => {
        if (task.status !== status) {
            return task;
        }

        const nextTask = reorderedStatusTasks[statusIndex];
        statusIndex += 1;

        return nextTask ?? task;
    });
}

export function moveTaskToEndInStatus(current: TaskCard[], status: TaskStatus, taskId: string): TaskCard[] {
    const statusTasks = current.filter((task) => task.status === status);
    const movedTask = statusTasks.find((task) => task.id === taskId);

    if (!movedTask) {
        return current;
    }

    const reorderedStatusTasks = statusTasks.filter((task) => task.id !== taskId);
    reorderedStatusTasks.push(movedTask);

    let statusIndex = 0;

    return current.map((task) => {
        if (task.status !== status) {
            return task;
        }

        const nextTask = reorderedStatusTasks[statusIndex];
        statusIndex += 1;

        return nextTask ?? task;
    });
}