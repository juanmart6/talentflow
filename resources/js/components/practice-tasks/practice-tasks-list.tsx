import { Link } from '@inertiajs/react';
import { GraduationCap, Pencil, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UI_PRESETS } from '@/lib/ui-presets';
import practiceTasks from '@/routes/practice-tasks';
import type { TaskCard, TaskStatus } from '@/types/practice-tasks';

const STATUS_LABELS: Record<TaskStatus, string> = {
    pending: 'Pendiente',
    in_progress: 'En progreso',
    in_review: 'En revisión',
    completed: 'Completada',
};

const STATUS_BADGE_CLASS: Record<TaskStatus, string> = {
    pending: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
    in_progress: 'border-sky-300 bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
    in_review: 'border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
    completed: 'border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
};

type PracticeTasksListProps = {
    tasks: TaskCard[];
    dueIndicatorMeta: (dueAt: string) => { dotClass: string; text: string } | null;
    setTaskToDelete: (task: TaskCard) => void;
};

export default function PracticeTasksList({ tasks, dueIndicatorMeta, setTaskToDelete }: PracticeTasksListProps) {
    return (
        <div className={UI_PRESETS.sectionCard}>
            <div className={UI_PRESETS.tableContainer}>
                <table className="w-full table-fixed text-sm">
                    <thead className={UI_PRESETS.tableHead}>
                        <tr>
                            <th className={UI_PRESETS.tableCellCentered}>Tarea</th>
                            <th className={UI_PRESETS.tableCellCentered}>Estado</th>
                            <th className={UI_PRESETS.tableCellCentered}>Becario(s)</th>
                            <th className={UI_PRESETS.tableCellCentered}>Entrega</th>
                            <th className={UI_PRESETS.tableCellCentered}>Plazo</th>
                            <th className={UI_PRESETS.tableCellCentered}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.length > 0 ? (
                            tasks.map((task, index) => {
                                const dueMeta = task.dueAt !== '' ? dueIndicatorMeta(task.dueAt) : null;

                                return (
                                    <tr key={task.id} className={index % 2 === 0 ? 'bg-white/60 dark:bg-transparent' : 'bg-slate-50/60 dark:bg-slate-900/20'}>
                                        <td className={UI_PRESETS.tableCellCentered}>
                                            <Link
                                                href={practiceTasks.edit(task.id).url}
                                                className="mx-auto block line-clamp-1 max-w-[22ch] font-semibold text-slate-800 underline-offset-2 hover:underline dark:text-slate-100"
                                            >
                                                {task.title}
                                            </Link>
                                        </td>
                                        <td className={UI_PRESETS.tableCellCentered}>
                                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[task.status]}`}>
                                                {STATUS_LABELS[task.status]}
                                            </span>
                                        </td>
                                        <td className={UI_PRESETS.tableCellCentered}>
                                            <p className="mx-auto inline-flex max-w-[18ch] items-center gap-1.5 line-clamp-1 font-medium text-slate-700 dark:text-slate-200">
                                                <User className="size-3.5 shrink-0 text-muted-foreground" />
                                                <span className="truncate">{task.internNames[0] ?? 'Sin becario asignado'}</span>
                                            </p>
                                            {task.internNames.length > 1 ? (
                                                <p className="text-xs text-muted-foreground">
                                                    +{task.internNames.length - 1} adicional(es)
                                                </p>
                                            ) : null}
                                            {task.assignmentMode === 'training_program' && task.trainingProgramName ? (
                                                <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <GraduationCap className="size-3.5 shrink-0 text-muted-foreground" />
                                                    <span className="truncate">{task.trainingProgramName}</span>
                                                </p>
                                            ) : null}
                                        </td>
                                        <td className={UI_PRESETS.tableCellCentered}>
                                            <span className={task.dueAt !== '' ? 'font-medium text-slate-700 dark:text-slate-200' : 'text-muted-foreground'}>
                                                {task.dueAt || '-'}
                                            </span>
                                        </td>
                                        <td className={UI_PRESETS.tableCellCentered}>
                                            {dueMeta ? (
                                                <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className={`inline-block size-3 rounded-full ${dueMeta.dotClass}`} />
                                                    <span>{dueMeta.text}</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Sin fecha</span>
                                            )}
                                        </td>
                                        <td className={UI_PRESETS.tableCellCentered}>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Button type="button" variant="outline" size="icon" className={UI_PRESETS.iconActionButton} asChild>
                                                    <Link href={practiceTasks.edit(task.id).url} title="Editar tarea" aria-label="Editar tarea">
                                                        <Pencil />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className={UI_PRESETS.iconActionButtonDanger}
                                                    title="Eliminar tarea"
                                                    aria-label="Eliminar tarea"
                                                    onClick={() => setTaskToDelete(task)}
                                                >
                                                    <Trash2 />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td className={`${UI_PRESETS.tableCell} py-10 text-center text-sm text-muted-foreground`} colSpan={6}>
                                    No hay tareas que coincidan con los filtros actuales.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
