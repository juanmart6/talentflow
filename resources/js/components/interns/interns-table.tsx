import { Link } from '@inertiajs/react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { INTERN_STATUS_META } from '@/lib/intern-status';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import educationCentersRoutes from '@/routes/education-centers';
import internsRoutes from '@/routes/interns';
import type { InternRow } from '@/types/interns';

type InternsTableProps = {
    interns: InternRow[];
    hasRows: boolean;
    onDelete: (intern: InternRow) => void;
};

function formatDate(date: string | null): string {
    if (!date) {
        return '-';
    }

    const [year, month, day] = date.slice(0, 10).split('-');

    if (!year || !month || !day) {
        return date;
    }

    return `${day}/${month}/${year}`;
}

function getInitials(intern: InternRow): string {
    const firstInitial = intern.first_name?.trim()[0] ?? '';
    const lastInitial = intern.last_name?.trim()[0] ?? '';

    return (firstInitial + lastInitial).toUpperCase() || '?';
}

export default function InternsTable({ interns, hasRows, onDelete }: InternsTableProps) {
    return (
        <div className={UI_PRESETS.tableContainer}>
            <table className="w-full min-w-[980px] text-sm">
                <thead className={UI_PRESETS.tableHead}>
                    <tr>
                        <th className="w-40 px-4 py-3 text-center font-semibold">Becario</th>
                        <th className="w-40 px-4 py-3 text-center font-semibold">Centro</th>
                        <th className="w-40 px-4 py-3 text-center font-semibold">Ciclo formativo</th>
                        <th className="w-40 px-4 py-3 text-center font-semibold">Prácticas</th>
                        <th className="w-40 px-4 py-3 text-center font-semibold">Estado</th>
                        <th className="w-40 px-4 py-3 text-center font-semibold">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {hasRows ? (
                        interns.map((intern, index) => (
                            <tr key={intern.id} className={`border-t align-middle ${stripedRowClass(index)}`}>
                                <td className={`${UI_PRESETS.tableCellCentered} w-40`}>
                                    <div className="flex items-center justify-center gap-3">
                                        <Avatar className="bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50">
                                            <AvatarFallback className="text-xs font-semibold">
                                                {getInitials(intern)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 text-left">
                                            <Link
                                                href={internsRoutes.show(intern.id).url}
                                                className="block max-w-[8.5rem] truncate font-semibold text-primary underline-offset-2 hover:underline"
                                                title={`${intern.first_name} ${intern.last_name}`}
                                            >
                                                {intern.first_name} {intern.last_name}
                                            </Link>
                                        </div>
                                    </div>
                                </td>
                                <td className={`${UI_PRESETS.tableCellCentered} w-40 font-medium`}>
                                    {intern.education_center ? (
                                        <Link
                                            href={educationCentersRoutes.show(intern.education_center.id).url}
                                            className="text-primary underline-offset-2 hover:underline"
                                        >
                                            {intern.education_center.name}
                                        </Link>
                                    ) : '-'}
                                </td>
                                <td className={`${UI_PRESETS.tableCellCentered} w-40 font-medium`}>
                                    {intern.training_program?.name ?? '-'}
                                </td>
                                <td className={`${UI_PRESETS.tableCellCentered} w-40`}>
                                    <p className="text-xs font-semibold text-muted-foreground">Inicio</p>
                                    <p className="font-medium">{formatDate(intern.internship_start_date)}</p>
                                    <p className="mt-2 text-xs font-semibold text-muted-foreground">Fin</p>
                                    <p className="font-medium">{formatDate(intern.internship_end_date)}</p>
                                </td>
                                <td className={`${UI_PRESETS.tableCellCentered} w-40`}>
                                    <span
                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase ${INTERN_STATUS_META[intern.status].badgeClass}`}
                                    >
                                        {INTERN_STATUS_META[intern.status].label}
                                    </span>
                                </td>
                                <td className={`${UI_PRESETS.tableCellCentered} w-40`}>
                                    <div className="flex justify-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className={UI_PRESETS.iconActionButton}
                                            asChild
                                        >
                                            <Link
                                                href={internsRoutes.show(intern.id).url}
                                                aria-label="Ver Becario"
                                                title="Ver Becario"
                                            >
                                                <Eye />
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className={UI_PRESETS.iconActionButton}
                                            asChild
                                        >
                                            <Link
                                                href={internsRoutes.edit(intern.id).url}
                                                aria-label="Editar Becario"
                                                title="Editar Becario"
                                            >
                                                <Pencil />
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className={UI_PRESETS.iconActionButtonDanger}
                                            aria-label="Eliminar Becario"
                                            title="Eliminar Becario"
                                            onClick={() => onDelete(intern)}
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                No hay becarios para mostrar con el filtro actual.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
