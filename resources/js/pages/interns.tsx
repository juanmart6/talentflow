import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { CirclePlus, Eye, FileSpreadsheet, Pencil, Search, Trash2 } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
        date_from: string;
        date_to: string;
    };
};

// Definición de breadcrumbs para la navegación:
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Becarios',
        href: interns.index().url,
    },
];

// Función para formatear fechas, mostrando un guion si no hay fecha disponible:
function formatDate(date: string | null): string {
    if (!date) {
        return '-';
    }

    return date;
}

// Función para obtener las iniciales del becario, utilizando la primera letra del nombre y apellido, o un signo de interrogación si no hay información disponible:
function getInitials(intern: InternRow): string {
    const firstInitial = intern.first_name?.trim()[0] ?? '';
    const lastInitial = intern.last_name?.trim()[0] ?? '';

    return (firstInitial + lastInitial).toUpperCase() || '?';
}

// Contiene toda la lógica de la vista:
export default function InternsPage({ interns: internPagination, filters, educationCenters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [educationCenterId, setEducationCenterId] = useState(
        filters.education_center_id ? String(filters.education_center_id) : 'all',
    );
    
    const [dateFrom, setDateFrom] = useState(filters.date_from ?? '');
    const [dateTo, setDateTo] = useState(filters.date_to ?? '');
    const [internToDelete, setInternToDelete] = useState<InternRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const hasRows = internPagination.data.length > 0;

    const paginationSummary = useMemo(() => {
        if (!hasRows || internPagination.from === null || internPagination.to === null) {
            return 'Sin resultados';
        }

        return `Mostrando ${internPagination.from} - ${internPagination.to} de ${internPagination.total} becarios`;
    }, [internPagination.from, internPagination.to, internPagination.total, hasRows]);

    const hasInvalidDateRange = dateFrom !== '' && dateTo !== '' && dateFrom > dateTo;

    // Efecto para manejar la búsqueda con debounce y sincronización de filtros:
    useEffect(() => {
        const normalizedSearch = search.trim();
        const normalizedFilter = (filters.search ?? '').trim();
        const currentStatus = filters.status || 'all';
        const currentEducationCenterId = filters.education_center_id ? String(filters.education_center_id) : 'all';
        const currentDateFrom = filters.date_from ?? '';
        const currentDateTo = filters.date_to ?? '';
        if (
            normalizedSearch === normalizedFilter &&
            status === currentStatus &&
            educationCenterId === currentEducationCenterId &&
            dateFrom === currentDateFrom &&
            dateTo === currentDateTo
        ) {
            return;
        }

        if (hasInvalidDateRange) {
            return;
        }

        // Utilizamos un timeout para implementar debounce, evitando hacer una petición en cada pulsación del usuario. Si el usuario sigue escribiendo o cambiando filtros, el timeout se reiniciará.
        const timeoutId = window.setTimeout(() => {
            router.get(
                interns.index().url,
                {
                    search: normalizedSearch || undefined,
                    status: status === 'all' ? undefined : status,
                    education_center_id: educationCenterId === 'all' ? undefined : educationCenterId,
                    date_from: dateFrom || undefined,
                    date_to: dateTo || undefined,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [search, status, educationCenterId, dateFrom, dateTo, filters.search, filters.status, filters.education_center_id, filters.date_from, filters.date_to, hasInvalidDateRange]);

    // Función para confirmar eliminación de un becario, mostrando un diálogo de confirmación y manejando la petición de eliminación a través de Inertia.js. Si la eliminación es exitosa, se cierra el diálogo y se muestra un mensaje flash.
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

    // Función para manejar exportación de becarios, generando un archivo Excel con los filtros aplicados.
    const handleExport = () => {
        if (hasInvalidDateRange) {
            return;
        }

        const params: Record<string, string> = {};
        const normalizedSearch = search.trim();

        if (normalizedSearch) params.search = normalizedSearch;
        if (status !== 'all') params.status = status;
        if (educationCenterId !== 'all') params.education_center_id = educationCenterId;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;

        window.location.href = interns.export({
            query: params,
        }).url;
    };

    // Renderizado de la vista:
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
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Buscar por nombre, DNI o email"
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 pl-9 text-sm`}
                                    />
                                </div>

                                <div className="flex items-center gap-2 lg:ml-auto lg:shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className={UI_PRESETS.iconActionButtonSuccess}
                                        onClick={handleExport}
                                        disabled={hasInvalidDateRange}
                                        title="Exportar Excel"
                                        aria-label="Exportar Excel"
                                    >
                                        <FileSpreadsheet />
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="icon"
                                        className={UI_PRESETS.iconActionButtonPrimary}
                                        title="Nuevo becario"
                                        aria-label="Nuevo becario"
                                    >
                                        <Link href={interns.create().url}>
                                            <CirclePlus />
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Estado</span>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem className={UI_PRESETS.selectItem} value="all">Todos los estados</SelectItem>
                                            <SelectItem className={UI_PRESETS.selectItem} value="active">Activo</SelectItem>
                                            <SelectItem className={UI_PRESETS.selectItem} value="finished">Finalizado</SelectItem>
                                            <SelectItem className={UI_PRESETS.selectItem} value="abandoned">Abandonado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Centro educativo</span>
                                    <Select value={educationCenterId} onValueChange={setEducationCenterId}>
                                        <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
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

                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Desde</span>
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(event) => setDateFrom(event.target.value)}
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Hasta</span>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(event) => setDateTo(event.target.value)}
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                                    />
                                </div>
                            </div>

                            {hasInvalidDateRange ? (
                                <p className="text-sm font-medium text-destructive">
                                    La fecha &quot;Desde&quot; no puede ser posterior a la fecha &quot;Hasta&quot;.
                                </p>
                            ) : null}
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
                                                <div className="flex items-center justify-center gap-3">
                                                    <Avatar className="bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50">
                                                        <AvatarFallback className="text-xs font-semibold">
                                                            {getInitials(intern)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="text-left">
                                                        <p className="font-semibold">
                                                            {intern.first_name} {intern.last_name}
                                                        </p>
                                                    </div>
                                                </div>
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
                                                        className={UI_PRESETS.iconActionButtonDanger}
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
                                    variant='outline'
                                    size="sm"
                                    className={`${UI_PRESETS.paginationButton} ${link.active ? UI_PRESETS.paginationButtonActive : ''}`}
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
                        <Button variant="secondary" className={UI_PRESETS.interactiveHover} onClick={() => setInternToDelete(null)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" className={UI_PRESETS.interactiveHover} onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

