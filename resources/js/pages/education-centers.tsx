import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmDeleteDialog from '@/components/shared/confirm-delete-dialog';
import { centerStatusDetail, formatSpanishDate } from '@/lib/education-centers';
import { UI_PRESETS } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import educationCenters from '@/routes/education-centers';
import { toast } from 'sonner';
import CenterFiltersBar from '@/components/education-centers/center-filters-bar';
import TablePagination from '@/components/shared/table-pagination';
import CenterTable from '@/components/education-centers/center-table';
import type { CenterRow, CentersPagination } from '@/types/education-centers';
import type { BreadcrumbItem } from '@/types';

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

// DefiniciÃ³n de breadcrumbs para la navegaciÃ³n:
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

    // FunciÃ³n para copiar al portapapeles:
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

    // Resumen de paginaciÃ³n:
    const paginationSummary = useMemo(() => {
        if (!hasRows || centers.from === null || centers.to === null) {
            return 'Sin resultados';
        }

        return `Mostrando ${centers.from} - ${centers.to} de ${centers.total} centros`;
    }, [centers.from, centers.to, centers.total, hasRows]);

    // Efecto para manejar la bÃºsqueda con debounce:
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

    // FunciÃ³n para confirmar eliminaciÃ³n:
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

    // FunciÃ³n para manejar exportaciÃ³n:
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
                            Gestiona todos los centros, contacto principal y estado de convenios.
                        </p>
                    </div>
                </div>

                <div className={UI_PRESETS.pageSection}>
                    <CenterFiltersBar
                        search={search}
                        setSearch={setSearch}
                        agreementStatus={agreementStatus}
                        onStatusChange={handleStatusChange}
                        onClearFilters={handleClearFilters}
                        onExport={handleExport}
                        hasActiveFilters={hasActiveFilters}
                    />
                    <CenterTable
                        centers={centers}
                        hasRows={hasRows}
                        onCopyCenterData={(center) =>
                            copyToClipboard(
                                [center.name, center.institutional_email, center.phone].filter(Boolean).join('\n'),
                                'Datos del centro',
                            )
                        }
                        onDeleteCenter={setCenterToDelete}
                        formatSpanishDate={formatSpanishDate}
                        centerStatusDetail={centerStatusDetail}
                    />

                    <TablePagination summary={paginationSummary} links={centers.links} />
                </div>
            </div>
            <ConfirmDeleteDialog
                open={centerToDelete !== null}
                title="Confirmar eliminación"
                description="Esta acción eliminará el centro educativo seleccionado."
                entityLabel="Centro"
                entityName={centerToDelete?.name}
                isLoading={isDeleting}
                onCancel={() => setCenterToDelete(null)}
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}