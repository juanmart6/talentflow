import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Centros Educativos',
        href: educationCenters.index().url,
    },
];

export default function EducationCenters({ centers, filters }: Props) {
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const lastFlashRef = useRef<string | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const [centerToDelete, setCenterToDelete] = useState<CenterRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [agreementStatus, setAgreementStatus] = useState(filters.agreement_status || 'all');

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
            if (agreementStatus !== 'all') params.agreement_status = agreementStatus;

            router.get(educationCenters.index().url, params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
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

                            <div className="flex justify-end">
                                <Button asChild>
                                    <Link href={educationCenters.create().url}>Nuevo centro</Link>
                                </Button>
                            </div>
                        </div>
                    </form>

                    <div className={UI_PRESETS.tableContainer}>
                        <table className="w-full min-w-[980px] text-sm">
                            <thead className={UI_PRESETS.tableHead}>
                                <tr>
                                    <th className="w-40 px-4 py-3 text-center font-semibold">Centro</th>
                                    <th className="w-40 px-4 py-3 text-center font-semibold">Contacto</th>
                                    <th className="w-40 px-4 py-3 text-center font-semibold">Convenio</th>
                                    <th className="w-40 px-4 py-3 text-center font-semibold">Estado</th>
                                    <th className="w-40 px-4 py-3 text-center font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hasRows ? (
                                    centers.data.map((center, index) => (
                                        <tr key={center.id} className={`border-t align-middle ${stripedRowClass(index)}`}>
                                            <td
                                                className={`${UI_PRESETS.tableCellCentered} w-40 ${UI_PRESETS.copyableCell}`}
                                                onClick={() =>
                                                    copyToClipboard(
                                                        [center.name, center.institutional_email, center.phone].filter(Boolean).join('\n'),
                                                        'Datos del centro',
                                                    )
                                                }
                                                title="Haz clic para copiar los datos del centro"
                                            >
                                                <p className="font-semibold">{center.name}</p>
                                                <p className="text-sm font-medium text-muted-foreground">{center.institutional_email}</p>
                                                <p className="text-muted-foreground">{center.phone}</p>
                                            </td>
                                            <td className={`${UI_PRESETS.tableCellCentered} w-40`}>
                                                <p className="font-semibold">{center.contact_name}</p>
                                                <p className="text-muted-foreground">{center.contact_position}</p>
                                            </td>
                                            <td className={`${UI_PRESETS.tableCellCentered} w-40`}>
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
                                            <td className={`${UI_PRESETS.tableCellCentered} w-40`}>
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase ${CENTER_STATUS_META[center.status].badgeClass}`}>
                                                    {CENTER_STATUS_META[center.status].label}
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
                                                        <Link href={educationCenters.show(center.id).url} aria-label="Ver centro" title="Ver centro">
                                                            <Eye />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className={UI_PRESETS.iconActionButton}
                                                        asChild
                                                    >
                                                        <Link href={educationCenters.edit(center.id).url} aria-label="Editar centro" title="Editar centro">
                                                            <Pencil />
                                                        </Link>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className={UI_PRESETS.iconActionButton}
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

                    <div className={UI_PRESETS.tablePagination}>
                        <p className="text-sm text-muted-foreground">{paginationSummary}</p>

                        <div className="flex flex-wrap items-center gap-2">
                            {centers.links.map((link, index) => (
                                <Button
                                    key={`${link.label}-${index}`}
                                    variant={link.active ? 'default' : 'outline'}
                                    size="sm"
                                    className={UI_PRESETS.interactiveHover}
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
