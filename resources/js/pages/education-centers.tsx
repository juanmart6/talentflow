import { Head, Link, router, usePage } from '@inertiajs/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SUMMARY_CARD_CLASSES, UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import educationCenters from '@/routes/education-centers';
import type { BreadcrumbItem } from '@/types';

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Agreement = {
    signed_at: string | null;
    expires_at: string | null;
    agreed_slots: number | null;
    pdf_path: string | null;
};

type CenterRow = {
    id: number;
    name: string;
    address: string;
    phone: string;
    institutional_email: string;
    contact_name: string;
    contact_position: string;
    collaboration_agreements_count: number;
    latest_agreement: Agreement | null;
    renewal_soon: boolean;
};

type CentersPagination = {
    data: CenterRow[];
    links: PaginationLink[];
    total: number;
    from: number | null;
    to: number | null;
};

type Props = {
    centers: CentersPagination;
    summaryCounts: {
        total: number;
        renewal_soon: number;
        without_agreement: number;
    };
    filters: {
        search: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Centros Educativos',
        href: educationCenters.index().url,
    },
];

function normalizePaginationLabel(label: string): string {
    return label
        .replace(/<[^>]*>/g, '')
        .replace(/&laquo;/g, '<<')
        .replace(/&raquo;/g, '>>')
        .trim();
}

export default function EducationCenters({ centers, filters, summaryCounts }: Props) {
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const [search, setSearch] = useState(filters.search ?? '');
    const [centerToDelete, setCenterToDelete] = useState<CenterRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const successMessage = page.props.flash?.success;
        const errorMessage = page.props.flash?.error;

        if (successMessage) {
            toast.success(successMessage);
        }

        if (errorMessage) {
            toast.error(errorMessage);
        }
    }, [page.props.flash?.success, page.props.flash?.error]);

    const hasRows = centers.data.length > 0;
    const paginationSummary = useMemo(() => {
        if (!hasRows || centers.from === null || centers.to === null) {
            return 'Sin resultados';
        }

        return `Mostrando ${centers.from} - ${centers.to} de ${centers.total} centros`;
    }, [centers.from, centers.to, centers.total, hasRows]);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        router.get(
            educationCenters.index().url,
            { search },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const clearSearch = () => {
        setSearch('');

        router.get(
            educationCenters.index().url,
            {},
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const confirmDelete = () => {
        if (!centerToDelete) {
            return;
        }

        setIsDeleting(true);

        router.delete(educationCenters.destroy(centerToDelete.id).url, {
            preserveScroll: true,
            onFinish: () => {
                setIsDeleting(false);
                setCenterToDelete(null);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Centros Educativos" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Centros Educativos</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona centros, contacto principal y estado de convenios.
                        </p>
                    </div>

                    <Button asChild>
                        <Link href={educationCenters.create().url}>Nuevo centro</Link>
                    </Button>
                </div>

                <section className="grid gap-3 md:grid-cols-3">
                    <div className={SUMMARY_CARD_CLASSES.neutral}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">Total centros</p>
                        <p className="mt-2 text-3xl font-semibold">{summaryCounts.total}</p>
                    </div>
                    <div className={SUMMARY_CARD_CLASSES.warning}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">Renovacion proxima</p>
                        <p className="mt-2 text-3xl font-semibold">{summaryCounts.renewal_soon}</p>
                    </div>
                </section>

                <form onSubmit={submitSearch} className={UI_PRESETS.filterBar}>
                    <div className="grid gap-3 md:grid-cols-[1.5fr_auto] md:items-center">
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nombre del centro"
                            className={UI_PRESETS.filterInput}
                        />

                        <div className="flex gap-2 md:justify-end">
                            <Button type="submit">Buscar</Button>
                            <Button type="button" variant="secondary" onClick={clearSearch}>
                                Limpiar
                            </Button>
                        </div>
                    </div>
                </form>

                <div className="overflow-x-auto rounded-lg border border-sidebar-border/70 dark:border-sidebar-border">
                <table className="w-full min-w-[980px] text-sm">
                    <thead className={UI_PRESETS.tableHead}>
                        <tr>
                            <th className="px-4 py-3 font-semibold">Centro</th>
                            <th className="px-4 py-3 font-semibold">Contacto</th>
                            <th className="px-4 py-3 font-semibold">Convenio</th>
                            <th className="px-4 py-3 font-semibold">Estado</th>
                            <th className="px-4 py-3 text-right font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hasRows ? (
                            centers.data.map((center, index) => (
                                <tr key={center.id} className={`border-t align-top ${stripedRowClass(index)} hover:bg-amber-50/70 dark:hover:bg-slate-800/60`}>
                                    <td className="px-4 py-3">
                                        <p className="font-semibold">{center.name}</p>
                                        <p className="text-sm font-medium text-muted-foreground">{center.institutional_email}</p>
                                        <p className="text-muted-foreground">{center.phone}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-semibold">{center.contact_name}</p>
                                        <p className="text-muted-foreground">{center.contact_position}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        {center.latest_agreement ? (
                                            <>
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    Firma: {center.latest_agreement.signed_at ?? '-'}
                                                </p>
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    Vence: {center.latest_agreement.expires_at ?? '-'}
                                                </p>
                                                <p className="mt-1 inline-flex rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                                                    Plazas: {center.latest_agreement.agreed_slots ?? '-'}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-muted-foreground">Sin convenio registrado</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {center.renewal_soon ? (
                                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-300">
                                                Renovacion proxima
                                            </span>
                                        ) : (
                                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-300">
                                                Vigente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="secondary" size="sm" asChild>
                                                <Link href={educationCenters.show(center.id).url}>Ver</Link>
                                            </Button>
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={educationCenters.edit(center.id).url}>Editar</Link>
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => setCenterToDelete(center)}
                                            >
                                                Eliminar
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                    No hay centros para mostrar con el filtro actual.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                </div>

                <div className="flex flex-col gap-3 border-t border-sidebar-border/70 px-1 pt-2 md:flex-row md:items-center md:justify-between dark:border-sidebar-border">
                    <p className="text-sm text-muted-foreground">{paginationSummary}</p>

                    <div className="flex flex-wrap items-center gap-2">
                        {centers.links.map((link, index) => (
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

            <Dialog open={centerToDelete !== null} onOpenChange={(open) => !open && setCenterToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar eliminacion</DialogTitle>
                        <DialogDescription>
                            Esta accion eliminara el centro educativo seleccionado.
                        </DialogDescription>
                    </DialogHeader>

                    <p className="text-sm">
                        Centro: <span className="font-medium">{centerToDelete?.name}</span>
                    </p>

                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setCenterToDelete(null)}>
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
