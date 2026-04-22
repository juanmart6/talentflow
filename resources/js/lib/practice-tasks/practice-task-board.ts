import type { TaskCard, TaskStatus } from "@/types/domains/practice-tasks";

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
