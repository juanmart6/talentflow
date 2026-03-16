import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Search, Trash2 } from 'lucide-react'; // Todos estos iconos sí se usan en la tabla de acciones y el buscador
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
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
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
    status: 'vigente' | 'renewal_soon' | 'expired';
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
        agreement_status: string;
    };
};

const STATUS_OPTIONS = [
    { value: '', label: 'Todos' },
    { value: 'vigente', label: 'Convenio Vigente' },
    { value: 'renewal_soon', label: 'Renovación próxima' },
    { value: 'expired', label: 'Convenio caducado' },
];

function getStatusChipClass(isActive: boolean): string {
    const base = 'inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase transition-colors';
    if (isActive) return `${base} border-primary bg-primary text-primary-foreground`;
    return `${base} border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800`;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Centros Educativos',
        href: educationCenters.index().url,
    },
]; // breadcrumbs sí se usa en <AppLayout breadcrumbs={breadcrumbs}>

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
    const [agreementStatus, setAgreementStatus] = useState(filters.agreement_status ?? '');

    const handleStatusChange = (value: string) => {
        setAgreementStatus(value);
        const params: Record<string, string> = {};
        if (search.trim()) params.search = search.trim();
        if (value) params.agreement_status = value;
        router.get(educationCenters.index().url, params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

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
    const unifiedHoverClass = 'hover:bg-primary/90 hover:text-primary-foreground';
    const iconActionButtonClass = `cursor-pointer text-slate-600 dark:text-slate-300 ${unifiedHoverClass}`;
    const copyableCellClass = 'cursor-pointer transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/50';

    const copyToClipboard = async (value: string, label: string) => {
        try {
            if (!value.trim()) {
                toast.error(`No hay datos de ${label} para copiar.`);
                return;
            }

            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(value);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = value;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            toast.success(`${label} copiado al portapapeles.`);
        } catch {
            toast.error(`No se pudo copiar ${label}.`);
        }
    };

    const paginationSummary = useMemo(() => {
        if (!hasRows || centers.from === null || centers.to === null) {
            return 'Sin resultados';
        }

        return `Mostrando ${centers.from} - ${centers.to} de ${centers.total} centros`;
    }, [centers.from, centers.to, centers.total, hasRows]);
    useEffect(() => {
        const normalizedSearch = search.trim();
        const normalizedFilter = (filters.search ?? '').trim();

        if (normalizedSearch === normalizedFilter) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            const params: Record<string, string> = {};
            if (normalizedSearch) params.search = normalizedSearch;
            if (agreementStatus) params.agreement_status = agreementStatus;
            router.get(
                educationCenters.index().url,
                params,
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [search, filters.search, agreementStatus]);

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

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Centros Educativos</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona centros, contacto principal y estado de convenios.
                        </p>
                    </div>
                </div>

                <div className="w-full max-w-5xl mx-auto">

                {/* Buscador en una sola línea */}
                <div className="w-full mb-2">
                    <div className="relative" style={{ minWidth: '320px', maxWidth: '520px', flex: '0 1 420px' }}>
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nombre del centro"
                            className={`${UI_PRESETS.simpleSearchInput} pl-9 text-sm h-9`}
                        />
                    </div>
                </div>

                {/* Filtro de convenios y botón debajo, alineados */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between w-full gap-2 mb-2">
                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => handleStatusChange(value)}
                                className={getStatusChipClass(agreementStatus === value)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end mt-2 md:mt-0">
                        <Button asChild>
                            <Link href={educationCenters.create().url}>Nuevo centro</Link>
                        </Button>
                    </div>
                </div>

                <div className="relative w-full overflow-x-auto rounded-lg border border-sidebar-border/70 dark:border-sidebar-border">
                <table className="w-full min-w-[980px] text-sm">
                    <thead className={UI_PRESETS.tableHead}>
                        <tr>
                            <th className="px-4 py-3 text-center font-semibold w-40">Centro</th>
                            <th className="px-4 py-3 text-center font-semibold w-40">Contacto</th>
                            <th className="px-4 py-3 text-center font-semibold w-40">Convenio</th>
                            <th className="px-4 py-3 text-center font-semibold w-40">Estado</th>
                            <th className="px-4 py-3 text-center font-semibold w-40">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {hasRows ? (
                            centers.data.map((center, index) => (
                                <tr key={center.id} className={`border-t align-middle ${stripedRowClass(index)}`}>
                                    <td
                                        className={`px-4 py-3 text-center w-40 ${copyableCellClass}`}
                                        onClick={() =>
                                            copyToClipboard(
                                                [center.name, center.institutional_email, center.phone].filter(Boolean).join('\n'),
                                                'datos del centro',
                                            )
                                        }
                                        title="Haz clic para copiar los datos del centro"
                                    >
                                        <p className="font-semibold">{center.name}</p>
                                        <p className="text-sm font-medium text-muted-foreground">{center.institutional_email}</p>
                                        <p className="text-muted-foreground">{center.phone}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center w-40">
                                        <p className="font-semibold">{center.contact_name}</p>
                                        <p className="text-muted-foreground">{center.contact_position}</p>
                                    </td>
                                    <td className="px-4 py-3 text-center w-40">
                                        {center.latest_agreement ? (
                                            <>
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    Firma: {center.latest_agreement.signed_at ?? '-'}
                                                </p>
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    Vence: {center.latest_agreement.expires_at ?? '-'}
                                                </p>
                                                <p className="text-xs font-semibold text-muted-foreground">
                                                    Plazas: {center.latest_agreement.agreed_slots ?? '-'}
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-muted-foreground">Sin convenio registrado</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center w-40">
                                        {center.status === 'expired' ? (
                                            <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold uppercase text-red-700 ring-1 ring-red-300">
                                                Caducado
                                            </span>
                                        ) : center.status === 'renewal_soon' ? (
                                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold uppercase text-amber-700 ring-1 ring-amber-300">
                                                Renovación próxima
                                            </span>
                                        ) : (
                                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold uppercase text-emerald-700 ring-1 ring-emerald-300">
                                                Vigente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center w-40">
                                        <div className="flex justify-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className={iconActionButtonClass}
                                                asChild
                                            >
                                                <Link href={educationCenters.show(center.id).url} aria-label="Ver centro" title="Ver centro">
                                                    <Eye />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className={iconActionButtonClass}
                                                asChild
                                            >
                                                <Link href={educationCenters.edit(center.id).url} aria-label="Editar centro" title="Editar centro">
                                                    <Pencil />
                                                </Link>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className={iconActionButtonClass}
                                                aria-label="Eliminar centro"
                                                title="Eliminar centro"
                                                onClick={() => setCenterToDelete(center)}
                                            >
                                                <Trash2 />
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

                <div className="flex flex-col gap-4 border-t border-sidebar-border/70 px-4 pt-4 md:flex-row md:items-center md:justify-between dark:border-sidebar-border">
                    <p className="text-sm text-muted-foreground">{paginationSummary}</p>

                    <div className="flex flex-wrap items-center gap-2">
                        {centers.links.map((link, index) => (
                            <Button
                                key={`${link.label}-${index}`}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                className={unifiedHoverClass}
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
                        <Button variant="secondary" className={unifiedHoverClass} onClick={() => setCenterToDelete(null)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" className={unifiedHoverClass} onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
