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

export default function EducationCenters({ centers, filters }: Props) {
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
    const renewalSoonCount = centers.data.filter((center) => center.renewal_soon).length;
    const withoutAgreementCount = centers.data.filter((center) => !center.latest_agreement).length;

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
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">Total centros</p>
                        <p className="mt-2 text-2xl font-semibold">{centers.total}</p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">Renovacion proxima</p>
                        <p className="mt-2 text-2xl font-semibold">{renewalSoonCount}</p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">Sin convenio</p>
                        <p className="mt-2 text-2xl font-semibold">{withoutAgreementCount}</p>
                    </div>
                </div>

                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <div className="flex flex-col gap-4 p-4">
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

                        <form onSubmit={submitSearch} className="flex flex-col gap-3 md:flex-row md:items-center">
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Buscar por nombre del centro"
                                className="md:max-w-sm"
                            />

                            <div className="flex gap-2">
                                <Button type="submit">Buscar</Button>
                                <Button type="button" variant="secondary" onClick={clearSearch}>
                                    Limpiar
                                </Button>
                            </div>
                        </form>

                        <div className="overflow-x-auto rounded-lg border border-sidebar-border/70 dark:border-sidebar-border">
                        <table className="w-full min-w-[900px] text-sm">
                            <thead className="bg-muted/50 text-left">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Centro</th>
                                    <th className="px-4 py-3 font-medium">Contacto</th>
                                    <th className="px-4 py-3 font-medium">Convenio</th>
                                    <th className="px-4 py-3 font-medium">Estado</th>
                                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hasRows ? (
                                    centers.data.map((center) => (
                                        <tr key={center.id} className="border-t align-top">
                                            <td className="px-4 py-3">
                                                <p className="font-medium">{center.name}</p>
                                                <p className="text-muted-foreground">{center.institutional_email}</p>
                                                <p className="text-muted-foreground">{center.phone}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium">{center.contact_name}</p>
                                                <p className="text-muted-foreground">{center.contact_position}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {center.latest_agreement ? (
                                                    <>
                                                        <p>
                                                            Firma: {center.latest_agreement.signed_at ?? '-'}
                                                        </p>
                                                        <p>
                                                            Vence: {center.latest_agreement.expires_at ?? '-'}
                                                        </p>
                                                        <p>
                                                            Plazas: {center.latest_agreement.agreed_slots ?? '-'}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-muted-foreground">Sin convenio registrado</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {center.renewal_soon ? (
                                                    <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                                                        Renovacion proxima
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
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
