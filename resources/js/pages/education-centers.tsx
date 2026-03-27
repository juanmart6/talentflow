import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CirclePlus, Copy, Eye, FileSpreadsheet, FilterX, Mail, MapPin, Pencil, Phone, Search, Trash2 } from 'lucide-react';
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
import { CENTER_STATUS_META, CENTER_STATUS_OPTIONS, type CenterStatus } from '@/lib/center-status';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import { normalizePaginationLabel } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import educationCenters from '@/routes/education-centers';
import { toast } from 'sonner';
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
    status: CenterStatus;
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

// Definición de breadcrumbs para la navegación:
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Centros Educativos',
        href: educationCenters.index().url,
    },
];

function formatSpanishDate(date: string | null): string {
    if (!date) {
        return '-';
    }

    const [year, month, day] = date.slice(0, 10).split('-');

    if (!year || !month || !day) {
        return date;
    }

    return `${day}/${month}/${year}`;
}

// Contiene toda la lógica de la vista:
function daysFromToday(date: string | null): number | null {
    if (!date) {
        return null;
    }

    const today = new Date();
    const target = new Date(date);
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());

    return Math.floor((utcTarget - utcToday) / (1000 * 60 * 60 * 24));
}

function centerStatusDetail(center: CenterRow): string {
    const expiresInDays = daysFromToday(center.latest_agreement?.expires_at ?? null);
    const startsInDays = daysFromToday(center.latest_agreement?.signed_at ?? null);

    if (center.status === 'not_started' && startsInDays !== null) {
        return startsInDays <= 0 ? 'Comienza hoy' : `Comienza en ${startsInDays} días`;
    }

    if (center.status === 'expired' && expiresInDays !== null) {
        const elapsed = Math.abs(expiresInDays);

        return elapsed === 0 ? 'Caducado hoy' : `Caducado hace ${elapsed} días`;
    }

    if ((center.status === 'renewal_soon' || center.status === 'valid') && expiresInDays !== null) {
        return expiresInDays <= 0 ? 'Vence hoy' : `Vence en ${expiresInDays} días`;
    }

    return '-';
}

export default function EducationCenters({ centers, filters }: Props) {
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const lastFlashRef = useRef<string | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const [centerToDelete, setCenterToDelete] = useState<CenterRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [agreementStatus, setAgreementStatus] = useState(filters.agreement_status || 'all');
    const hasActiveFilters = search.trim() !== '' || agreementStatus !== 'all';

    const hasRows = centers.data.length > 0;

    const handleStatusChange = (value: string) => {
        setAgreementStatus(value);

        const params: Record<string, string> = {};
        if (search.trim()) params.search = search.trim();
        if (value !== 'all') params.agreement_status = value;

        router.get(educationCenters.index().url, params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Función para copiar al portapapeles:
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

    // Efecto para mostrar mensajes flash:
    useEffect(() => {
        const successMessage = page.props.flash?.success;
        const errorMessage = page.props.flash?.error;
        const flashKey = successMessage ? `success:${successMessage}` : errorMessage ? `error:${errorMessage}` : null;

        if (!flashKey || lastFlashRef.current === flashKey) {
            return;
        }

        lastFlashRef.current = flashKey;

        if (successMessage) {
            toast.success(successMessage);
        }

        if (errorMessage) {
            toast.error(errorMessage);
        }
    }, [page.props.flash?.success, page.props.flash?.error]);

    // Resumen de paginación:
    const paginationSummary = useMemo(() => {
        if (!hasRows || centers.from === null || centers.to === null) {
            return 'Sin resultados';
        }

        return `Mostrando ${centers.from} - ${centers.to} de ${centers.total} centros`;
    }, [centers.from, centers.to, centers.total, hasRows]);

    // Efecto para manejar la búsqueda con debounce:
    useEffect(() => {
        const normalizedSearch = search.trim();
        const normalizedFilter = (filters.search ?? '').trim();

        if (normalizedSearch === normalizedFilter) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            const params: Record<string, string> = {};
            if (normalizedSearch) params.search = normalizedSearch;
            if (agreementStatus !== 'all') params.agreement_status = agreementStatus;

            router.get(educationCenters.index().url, params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [search, filters.search, agreementStatus]);

    // Función para confirmar eliminación:
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

    // Función para manejar exportación:
    const handleExport = () => {
        const params = new URLSearchParams();
        const normalizedSearch = search.trim();

        if (normalizedSearch) params.set('search', normalizedSearch);
        if (agreementStatus !== 'all') params.set('agreement_status', agreementStatus);

        const queryString = params.toString();
        const exportUrl = `${educationCenters.index().url}/export${queryString ? `?${queryString}` : ''}`;

        window.location.href = exportUrl;
    };

    const handleClearFilters = () => {
        setSearch('');
        setAgreementStatus('all');

        router.get(educationCenters.index().url, {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Renderizado de la vista:
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Centros Educativos" />

            <div className={UI_PRESETS.pageContent}>
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Centros Educativos</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona centros, contacto principal y estado de convenios.
                        </p>
                    </div>
                </div>

                <div className={UI_PRESETS.pageSection}>
                    <form className={`${UI_PRESETS.filterBar} mb-2`} onSubmit={(event) => event.preventDefault()}>
                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Buscar por nombre del centro"
                                    className={`${UI_PRESETS.simpleSearchInput} h-9 pl-9 text-sm`}
                                />
                            </div>

                            <Select value={agreementStatus} onValueChange={handleStatusChange}>
                                <SelectTrigger className={`${UI_PRESETS.selectTrigger} min-w-[220px]`}>
                                    <SelectValue placeholder="Estado del convenio" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CENTER_STATUS_OPTIONS.map((option) => (
                                        <SelectItem className={UI_PRESETS.selectItem} key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="flex items-center gap-2 md:ml-auto md:shrink-0">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className={UI_PRESETS.iconActionButton}
                                    onClick={handleClearFilters}
                                    disabled={!hasActiveFilters}
                                    title="Limpiar filtros"
                                    aria-label="Limpiar filtros"
                                >
                                    <FilterX />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className={UI_PRESETS.iconActionButtonSuccess}
                                    onClick={handleExport}
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
                                    title="Nuevo Centro"
                                    aria-label="Nuevo Centro"
                                >
                                    <Link href={educationCenters.create().url}>
                                        <CirclePlus />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </form>

                    <div className={UI_PRESETS.tableContainer}>
                        <table className="w-full min-w-[920px] table-fixed text-sm">
                            <colgroup>
                                <col className="w-[30%]" />
                                <col className="w-[25%]" />
                                <col className="w-[20%]" />
                                <col className="w-[25%]" />
                            </colgroup>
                            <thead className={UI_PRESETS.tableHead}>
                                <tr>
                                    <th className="px-4 py-3 text-center font-semibold">Centro</th>
                                    <th className="px-4 py-3 text-center font-semibold">Convenio</th>
                                    <th className="px-4 py-3 text-center font-semibold">Estado</th>
                                    <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hasRows ? (
                                    centers.data.map((center, index) => (
                                        <tr key={center.id} className={`h-24 border-t align-middle ${stripedRowClass(index)}`}>
                                            <td className={`${UI_PRESETS.tableCellCentered} align-middle`}>
                                                <button
                                                    type="button"
                                                    className="inline-flex cursor-pointer items-center gap-1.5 font-semibold"
                                                    onClick={() =>
                                                        copyToClipboard(
                                                            [center.name, center.institutional_email, center.phone].filter(Boolean).join('\n'),
                                                            'Datos del centro',
                                                        )
                                                    }
                                                    title="Copiar datos del centro"
                                                    aria-label="Copiar datos del centro"
                                                >
                                                    <span>{center.name}</span>
                                                    <Copy className="size-3 text-muted-foreground" />
                                                </button>
                                                <p className="mt-1 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                    <Mail className="size-3" aria-hidden="true" />
                                                    <span>{center.institutional_email}</span>
                                                </p>
                                                <p className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <Phone className="size-3" aria-hidden="true" />
                                                    <span>{center.phone}</span>
                                                </p>
                                            </td>
                                            <td className={`${UI_PRESETS.tableCellCentered} align-middle`}>
                                                {center.latest_agreement ? (
                                                    <>
                                                        <p className="text-sm font-semibold">
                                                            Vence {formatSpanishDate(center.latest_agreement.expires_at)}
                                                        </p>
                                                        <p className="text-xs font-semibold text-muted-foreground">
                                                            Plazas: {center.latest_agreement.agreed_slots ?? '-'}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <p className="text-muted-foreground">Sin convenio registrado</p>
                                                )}
                                            </td>
                                            <td className={`${UI_PRESETS.tableCellCentered} align-middle`}>
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase ${CENTER_STATUS_META[center.status].badgeClass}`}>
                                                    {CENTER_STATUS_META[center.status].label}
                                                </span>
                                                <p className="mt-1 text-[11px] text-muted-foreground">
                                                    {centerStatusDetail(center)}
                                                </p>
                                            </td>
                                            <td className={`${UI_PRESETS.tableCellCentered} align-middle`}>
                                                <div className="flex justify-center gap-2">
                                                    {center.address && (
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className={UI_PRESETS.iconActionButton}
                                                            asChild
                                                            title="Ver en Google Maps"
                                                            aria-label="Ver en Google Maps"
                                                        >
                                                            <a
                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                                                    center.address,
                                                                )}`}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                <MapPin className="h-4 w-4" aria-hidden="true" />
                                                                <span className="sr-only">Ver en Google Maps</span>
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className={UI_PRESETS.iconActionButton}
                                                        asChild
                                                    >
                                                        <Link href={educationCenters.show(center.id).url} aria-label="Ver Centro" title="Ver Centro">
                                                            <Eye />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className={UI_PRESETS.iconActionButton}
                                                        asChild
                                                    >
                                                        <Link href={educationCenters.edit(center.id).url} aria-label="Editar Centro" title="Editar Centro">
                                                            <Pencil />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className={UI_PRESETS.iconActionButtonDanger}
                                                        aria-label="Eliminar Centro"
                                                        title="Eliminar Centro"
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
                                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                            No hay centros para mostrar con el filtro actual.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className={UI_PRESETS.tablePagination}>
                        <p className="text-sm text-muted-foreground">{paginationSummary}</p>

                        <div className="flex flex-wrap items-center gap-2">
                            {centers.links.map((link, index) => (
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

            <Dialog open={centerToDelete !== null} onOpenChange={(open) => !open && setCenterToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar eliminación</DialogTitle>
                        <DialogDescription>
                            Esta acción eliminará el centro educativo seleccionado.
                        </DialogDescription>
                    </DialogHeader>

                    <p className="text-sm">
                        Centro: <span className="font-medium">{centerToDelete?.name}</span>
                    </p>

                    <DialogFooter>
                        <Button variant="secondary" className={UI_PRESETS.interactiveHover} onClick={() => setCenterToDelete(null)}>
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
