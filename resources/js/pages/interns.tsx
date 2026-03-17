import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { INTERN_STATUS_META } from '@/lib/intern-status';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import { normalizePaginationLabel } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import interns from '@/routes/interns';
import type { BreadcrumbItem } from '@/types';

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type InternRow = {
    id: number;
    first_name: string;
    last_name: string;
    dni_nie: string;
    email: string;
    phone: string;
    status: 'active' | 'finished' | 'abandoned';
    internship_start_date: string | null;
    internship_end_date: string | null;
    required_hours: number;
    education_center: {
        id: number;
        name: string;
    } | null;
};

type InternsPagination = {
    data: InternRow[];
    links: PaginationLink[];
    total: number;
    from: number | null;
    to: number | null;
};

type EducationCenterOption = {
    id: number;
    name: string;
};

type Props = {
    interns: InternsPagination;
    educationCenters: EducationCenterOption[];
    statusCounts: {
        active: number;
        finished: number;
        abandoned: number;
    };
    filters: {
        search: string;
        status: string;
        education_center_id: number | null;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Becarios',
        href: interns.index().url,
    },
];

const INTERACTIVE_HOVER_CLASS = 'hover:bg-primary/90 hover:text-primary-foreground';

function formatDate(date: string | null): string {
    if (!date) {
        return '-';
    }

    return date;
}

export default function InternsPage({ interns: internPagination, filters, educationCenters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [educationCenterId, setEducationCenterId] = useState(
        filters.education_center_id ? String(filters.education_center_id) : 'all',
    );
    const [internToDelete, setInternToDelete] = useState<InternRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const hasRows = internPagination.data.length > 0;

    const paginationSummary = useMemo(() => {
        if (!hasRows || internPagination.from === null || internPagination.to === null) {
            return 'Sin resultados';
        }

        return `Mostrando ${internPagination.from} - ${internPagination.to} de ${internPagination.total} becarios`;
    }, [internPagination.from, internPagination.to, internPagination.total, hasRows]);

    useEffect(() => {
        const normalizedSearch = search.trim();
        const normalizedFilter = (filters.search ?? '').trim();
        const currentStatus = filters.status || 'all';
        const currentEducationCenterId = filters.education_center_id ? String(filters.education_center_id) : 'all';

        if (
            normalizedSearch === normalizedFilter &&
            status === currentStatus &&
            educationCenterId === currentEducationCenterId
        ) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            router.get(
                interns.index().url,
                {
                    search: normalizedSearch || undefined,
                    status: status === 'all' ? undefined : status,
                    education_center_id: educationCenterId === 'all' ? undefined : educationCenterId,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [search, status, educationCenterId, filters.search, filters.status, filters.education_center_id]);

    const confirmDelete = () => {
        if (!internToDelete) {
            return;
        }

        setIsDeleting(true);

        router.delete(interns.destroy(internToDelete.id).url, {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setInternToDelete(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Becarios" />

            <div className={UI_PRESETS.pageContent}>
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Gestión de Becarios</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona datos personales, estado y período de prácticas.
                        </p>
                    </div>
                </div>

                <div className={UI_PRESETS.pageSection}>
                    <form onSubmit={(event) => event.preventDefault()} className={`${UI_PRESETS.filterBar} mb-2`}>
                        <div className="grid gap-3 md:grid-cols-[1.5fr_auto_auto] md:items-center">
                            <div className="relative" style={{ minWidth: '320px', maxWidth: '520px', flex: '0 1 420px' }}>
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Buscar por nombre, DNI o email"
                                    className={`${UI_PRESETS.simpleSearchInput} h-9 pl-9 text-sm`}
                                />
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className={`${UI_PRESETS.selectTrigger} min-w-[180px]`}>
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem className={UI_PRESETS.selectItem} value="all">Todos los estados</SelectItem>
                                        <SelectItem className={UI_PRESETS.selectItem} value="active">Activo</SelectItem>
                                        <SelectItem className={UI_PRESETS.selectItem} value="finished">Finalizado</SelectItem>
                                        <SelectItem className={UI_PRESETS.selectItem} value="abandoned">Abandonado</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={educationCenterId} onValueChange={setEducationCenterId}>
                                    <SelectTrigger className={`${UI_PRESETS.selectTrigger} min-w-[220px]`}>
                                        <SelectValue placeholder="Centro educativo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem className={UI_PRESETS.selectItem} value="all">Todos los centros</SelectItem>
                                        {educationCenters.map((center) => (
                                            <SelectItem className={UI_PRESETS.selectItem} key={center.id} value={String(center.id)}>
                                                {center.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex gap-2 md:justify-end">
                                <Button asChild>
                                    <Link href={interns.create().url}>Nuevo becario</Link>
                                </Button>
                            </div>
                        </div>
                    </form>

                    <div className={UI_PRESETS.tableContainer}>
                        <table className="w-full min-w-[980px] text-sm">
                            <thead className={UI_PRESETS.tableHead}>
                                <tr>
                                    <th className="w-40 px-4 py-3 text-center font-semibold">Becario</th>
                                    <th className="w-40 px-4 py-3 text-center font-semibold">DNI/NIE</th>
                                    <th className="w-40 px-4 py-3 text-center font-semibold">Centro</th>
                                    <th className="w-40 px-4 py-3 text-center font-semibold">Prácticas</th>
                                    <th className="w-40 px-4 py-3 text-center font-semibold">Estado</th>
                                    <th className="w-40 px-4 py-3 text-center font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hasRows ? (
                                    internPagination.data.map((intern, index) => (
                                        <tr key={intern.id} className={`border-t align-middle ${stripedRowClass(index)}`}>
                                            <td className={`${UI_PRESETS.tableCellCentered} w-40`}>
                                                <p className="font-semibold">
                                                    {intern.first_name} {intern.last_name}
                                                </p>
                                            </td>
                                            <td className={`${UI_PRESETS.tableCellCentered} w-40 font-mono text-xs font-semibold md:text-sm`}>
                                                {intern.dni_nie}
                                            </td>
                                            <td className={`${UI_PRESETS.tableCellCentered} w-40 font-medium`}>
                                                {intern.education_center?.name ?? '-'}
                                            </td>
                                            <td className={`${UI_PRESETS.tableCellCentered} w-40`}>
                                                <p className="text-xs font-semibold text-muted-foreground">Inicio</p>
                                                <p className="font-medium">{formatDate(intern.internship_start_date)}</p>
                                                <p className="mt-2 text-xs font-semibold text-muted-foreground">Fin</p>
                                                <p className="font-medium">{formatDate(intern.internship_end_date)}</p>
                                            </td>
                                            <td className={`${UI_PRESETS.tableCellCentered} w-40`}>
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase ${INTERN_STATUS_META[intern.status].badgeClass}`}>
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
                                                        <Link href={interns.show(intern.id).url} aria-label="Ver becario" title="Ver becario">
                                                            <Eye />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className={UI_PRESETS.iconActionButton}
                                                        asChild
                                                    >
                                                        <Link href={interns.edit(intern.id).url} aria-label="Editar becario" title="Editar becario">
                                                            <Pencil />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className={UI_PRESETS.iconActionButton}
                                                        aria-label="Eliminar becario"
                                                        title="Eliminar becario"
                                                        onClick={() => setInternToDelete(intern)}
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

                    <div className={UI_PRESETS.tablePagination}>
                        <p className="text-sm text-muted-foreground">{paginationSummary}</p>

                        <div className="flex flex-wrap items-center gap-2">
                            {internPagination.links.map((link, index) => (
                                <Button
                                    key={`${link.label}-${index}`}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    className={INTERACTIVE_HOVER_CLASS}
                                    disabled={!link.url}
                                    asChild={Boolean(link.url)}
                                >
                                    {link.url ? (
                                        <Link href={link.url}>{normalizePaginationLabel(link.label)}</Link>
                                    ) : (
                                        <span>{normalizePaginationLabel(link.label)}</span>
                                    )}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={internToDelete !== null} onOpenChange={(open) => !open && setInternToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar eliminación</DialogTitle>
                        <DialogDescription>
                            Esta acción eliminará el becario seleccionado.
                        </DialogDescription>
                    </DialogHeader>

                    <p className="text-sm">
                        Becario:{' '}
                        <span className="font-medium">
                            {internToDelete ? `${internToDelete.first_name} ${internToDelete.last_name}` : ''}
                        </span>
                    </p>

                    <DialogFooter>
                        <Button variant="secondary" className={INTERACTIVE_HOVER_CLASS} onClick={() => setInternToDelete(null)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" className={INTERACTIVE_HOVER_CLASS} onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
