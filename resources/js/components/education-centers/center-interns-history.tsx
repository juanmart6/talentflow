import { Link } from '@inertiajs/react';
import { formatSpanishDate, internStatusBadgeClass, internStatusLabel } from '@/lib/education-centers';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import interns from '@/routes/interns';

type InternHistoryItem = {
    id: number;
    first_name: string;
    last_name: string;
    dni_nie: string;
    email: string;
    training_program_name?: string | null;
    status: 'active' | 'upcoming_active' | 'finished' | 'abandoned' | string;
    internship_start_date: string | null;
    internship_end_date: string | null;
    deleted_at: string | null;
};

type CenterInternsHistoryProps = {
    internsHistory: InternHistoryItem[];
};

export default function CenterInternsHistory({ internsHistory }: CenterInternsHistoryProps) {
    return (
        <section className={UI_PRESETS.sectionCard}>
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">Histórico de becarios por centro</h2>
                <p className="text-sm text-muted-foreground">Total: {internsHistory.length}</p>
            </div>

            {internsHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay becarios registrados para este centro.</p>
            ) : (
                <div className="relative w-full overflow-x-auto rounded-lg border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full min-w-[920px] table-fixed text-sm">
                        <colgroup>
                            <col className="w-1/4" />
                            <col className="w-1/4" />
                            <col className="w-1/4" />
                            <col className="w-1/4" />
                        </colgroup>
                        <thead className={UI_PRESETS.tableHead}>
                            <tr>
                                <th className="px-4 py-3 text-center font-semibold">Becario</th>
                                <th className="px-4 py-3 text-center font-semibold">Ciclo formativo</th>
                                <th className="px-4 py-3 text-center font-semibold">Período</th>
                                <th className="px-4 py-3 text-center font-semibold">Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {internsHistory.map((intern, index) => (
                                <tr key={intern.id} className={`h-20 border-t align-middle ${stripedRowClass(index)}`}>
                                    <td className="px-4 py-3 text-center align-middle">
                                        <Link
                                            href={interns.show(intern.id).url}
                                            className="font-semibold leading-tight text-primary underline-offset-2 hover:underline"
                                        >
                                            {intern.first_name} {intern.last_name}
                                        </Link>
                                        <p className="mt-1 text-xs text-muted-foreground">{intern.dni_nie}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center align-middle">
                                        <p className="font-medium leading-tight">{intern.training_program_name ?? '-'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center align-middle">
                                        <p className="text-xs font-semibold text-muted-foreground">
                                            Inicio: {formatSpanishDate(intern.internship_start_date)}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                                            Fin: {formatSpanishDate(intern.internship_end_date)}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3 text-center align-middle">
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${internStatusBadgeClass(intern.status)}`}>
                                            {internStatusLabel(intern.status)}
                                        </span>
                                        {intern.deleted_at && (
                                            <p className="mt-1 text-xs text-muted-foreground">Eliminado del sistema</p>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
