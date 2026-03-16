import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useMemo, useState } from 'react';
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
import { INTERN_STATUS_META, type InternStatus } from '@/lib/intern-status';
import { SUMMARY_CARD_CLASSES, UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import interns from '@/routes/interns';
import type { BreadcrumbItem } from '@/types';

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
}

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
}

type InternsPagination = {
    data: InternRow[];
    links: PaginationLink[];
    total: number;
    from: number | null;
    to: number | null;
}

type EducationCenterOption = {
    id: number;
    name: string;
}

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
}

const breadcrumbs: BreadcrumbItem[] = [
    { 
        title: 'Gestión de Becarios', 
        href: interns.index().url,
    },
    
];

function normalizePaginationLabel(label: string): string {
    return label
        .replace(/<[^>]*>/g, '')
        .replace(/&laquo;/g, '<<')
        .replace(/&raquo;/g, '>>')
        .trim();
}

function formatDate(date: string | null): string {
    if (!date) {
        return '-';
    }

    return date;
}

export default function InternsPage({ interns: internPagination, filters, educationCenters, statusCounts }: Props) {
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

    const submitFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(
            interns.index().url,
            {
                search,
                status: status === 'all' ? undefined : status,
                education_center_id: educationCenterId === 'all' ? undefined : educationCenterId,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        setEducationCenterId('all');

        router.get(
            interns.index().url,
            {},
            {
                preserveState: true,
                replace: true,
            },
        );
    };

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
            <Head title="Gestion de Becarios" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Gestion de Becarios</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona datos personales, estado y periodo de practicas.
                        </p>
                    </div>

                    <Button asChild>
                        <Link href={interns.create().url}>Nuevo becario</Link>
                    </Button>
                </div>

                <section className="grid gap-3 md:grid-cols-4">
                    <div className={SUMMARY_CARD_CLASSES.neutral}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Total filtrado</p>
                        <p className="mt-2 text-3xl font-semibold">{internPagination.total}</p>
                    </div>
                    <div className={SUMMARY_CARD_CLASSES.success}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Activos</p>
                        <p className="mt-2 text-3xl font-semibold">{statusCounts.active}</p>
                    </div>
                    <div className={SUMMARY_CARD_CLASSES.info}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">Finalizados</p>
                        <p className="mt-2 text-3xl font-semibold">{statusCounts.finished}</p>
                    </div>
                    <div className={SUMMARY_CARD_CLASSES.danger}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">Abandonados</p>
                        <p className="mt-2 text-3xl font-semibold">{statusCounts.abandoned}</p>
                    </div>
                </section>

                <form onSubmit={submitFilters} className={UI_PRESETS.filterBar}>
                    <div className="grid gap-3 md:grid-cols-[1.5fr_auto_auto] md:items-center">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nombre, DNI o email"
                            className={UI_PRESETS.filterInput}
                        />

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
                            <Button type="submit" variant="search">Buscar</Button>
                            <Button type="button" variant="secondary" onClick={clearFilters}>
                                Limpiar
                            </Button>
                        </div>
                    </div>
                </form>

                <div className="overflow-x-auto rounded-lg border border-sidebar-border/70 dark:border-sidebar-border">
                    <table className="w-full min-w-[1180px] text-sm">
                        <thead className={UI_PRESETS.tableHead}>
                            <tr>
                                <th className="px-4 py-3 font-semibold">Becario</th>
                                <th className="px-4 py-3 font-semibold">DNI/NIE</th>
                                <th className="px-4 py-3 font-semibold">Contacto</th>
                                <th className="px-4 py-3 font-semibold">Centro</th>
                                <th className="px-4 py-3 font-semibold">Practicas</th>
                                <th className="px-4 py-3 font-semibold">Estado</th>
                                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hasRows ? (
                                internPagination.data.map((intern, index) => (
                                    <tr key={intern.id} className={`border-t align-top ${stripedRowClass(index)} hover:bg-amber-50/70 dark:hover:bg-slate-800/60`}>
                                        <td className="px-4 py-3">
                                            <p className="font-semibold">
                                                {intern.first_name} {intern.last_name}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs font-semibold md:text-sm">{intern.dni_nie}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-sm font-medium">{intern.email}</p>
                                            <p className="text-xs text-muted-foreground">{intern.phone}</p>
                                        </td>
                                        <td className="px-4 py-3 font-medium">{intern.education_center?.name ?? '-'}</td>
                                        <td className="px-4 py-3">
                                            <p className="text-xs font-semibold text-muted-foreground">Inicio</p>
                                            <p className="font-medium">{formatDate(intern.internship_start_date)}</p>
                                            <p className="mt-2 text-xs font-semibold text-muted-foreground">Fin</p>
                                            <p className="font-medium">{formatDate(intern.internship_end_date)}</p>
                                            <p className="mt-2 inline-flex rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                                                {intern.required_hours}h
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${INTERN_STATUS_META[intern.status].badgeClass}`}>
                                                {INTERN_STATUS_META[intern.status].label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="secondary" size="sm" asChild>
                                                    <Link href={interns.show(intern.id).url}>Ver</Link>
                                                </Button>
                                                <Button variant="outline" size="sm" asChild>
                                                    <Link href={interns.edit(intern.id).url}>Editar</Link>
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => setInternToDelete(intern)}
                                                >
                                                    Eliminar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                        No hay becarios para mostrar con el filtro actual.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-sidebar-border/70 px-1 pt-2 md:flex-row md:items-center md:justify-between dark:border-sidebar-border">
                    <p className="text-sm text-muted-foreground">{paginationSummary}</p>

                    <div className="flex flex-wrap items-center gap-2">
                        {internPagination.links.map((link, index) => (
                            <Button
                                key={`${link.label}-${index}`}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
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

            <Dialog open={internToDelete !== null} onOpenChange={(open) => !open && setInternToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar eliminacion</DialogTitle>
                        <DialogDescription>
                            Esta accion eliminara el becario seleccionado.
                        </DialogDescription>
                    </DialogHeader>

                    <p className="text-sm">
                        Becario:{' '}
                        <span className="font-medium">
                            {internToDelete ? `${internToDelete.first_name} ${internToDelete.last_name}` : ''}
                        </span>
                    </p>

                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setInternToDelete(null)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}