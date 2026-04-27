import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import interns from '@/actions/App/Http/Controllers/InternController';
import InternsFiltersBar from '@/components/interns/interns-filters-bar';
import InternsTable from '@/components/interns/interns-table';
import ConfirmDeleteDialog from '@/components/shared/confirm-delete-dialog';
import TablePagination from '@/components/shared/table-pagination';
import AppLayout from '@/layouts/app-layout';
import { UI_PRESETS } from '@/lib/ui-presets';
import type { BreadcrumbItem } from '@/types';
import type {
    InternRow,
    InternsPagination,
    EducationCenterOption,
    TrainingProgramOption,
    InternFilters,
} from '@/types/domains/interns';

type Props = {
    interns: InternsPagination;
    educationCenters: EducationCenterOption[];
    trainingPrograms: TrainingProgramOption[];
    filters: InternFilters;
};

// Definición de breadcrumbs para la navegación:
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Becarios',
        href: interns.index().url,
    },
];

// Contiene toda la lógica de la vista:
export default function InternsPage({ interns: internPagination, filters, educationCenters, trainingPrograms }: Props) {
    const page = usePage<{ flash?: { success?: string; error?: string; info?: string } }>();
    const lastFlashRef = useRef<string | null>(null);
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status || 'all');
    const [educationCenterId, setEducationCenterId] = useState(
        filters.education_center_id ? String(filters.education_center_id) : 'all',
    );
    const [trainingProgramId, setTrainingProgramId] = useState(
        filters.training_program_id ? String(filters.training_program_id) : 'all',
    );
    
    const [startDateFrom, setStartDateFrom] = useState(filters.start_date_from ?? '');
    const [startDateTo, setStartDateTo] = useState(filters.start_date_to ?? '');
    const [endDateFrom, setEndDateFrom] = useState(filters.end_date_from ?? '');
    const [endDateTo, setEndDateTo] = useState(filters.end_date_to ?? '');
    const [internToDelete, setInternToDelete] = useState<InternRow | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const hasActiveFilters =
        search.trim() !== ''
        || status !== 'all'
        || educationCenterId !== 'all'
        || trainingProgramId !== 'all'
        || startDateFrom !== ''
        || startDateTo !== ''
        || endDateFrom !== ''
        || endDateTo !== '';

    const hasRows = internPagination.data.length > 0;

    const paginationSummary = useMemo(() => {
        if (!hasRows || internPagination.from === null || internPagination.to === null) {
            return 'Sin resultados';
        }

        return `Mostrando ${internPagination.from} - ${internPagination.to} de ${internPagination.total} becarios`;
    }, [internPagination.from, internPagination.to, internPagination.total, hasRows]);

    const hasInvalidStartDateRange = startDateFrom !== '' && startDateTo !== '' && startDateFrom > startDateTo;
    const hasInvalidEndDateRange = endDateFrom !== '' && endDateTo !== '' && endDateFrom > endDateTo;
    const hasInvalidDateRange = hasInvalidStartDateRange || hasInvalidEndDateRange;
    useEffect(() => {
        const successMessage = page.props.flash?.success;
        const errorMessage = page.props.flash?.error;
        const infoMessage = page.props.flash?.info;
        const flashKey = JSON.stringify({
            success: successMessage ?? null,
            error: errorMessage ?? null,
            info: infoMessage ?? null,
        });

        if (!successMessage && !errorMessage && !infoMessage) {
            return;
        }

        if (lastFlashRef.current === flashKey) {
            return;
        }

        lastFlashRef.current = flashKey;

        if (successMessage) {
            toast.success(successMessage);
        }

        if (errorMessage) {
            toast.error(errorMessage);
        }

        if (infoMessage) {
            toast.info(infoMessage);
        }
    }, [page.props.flash?.success, page.props.flash?.error, page.props.flash?.info]);

    // Efecto para manejar la búsqueda con debounce y sincronización de filtros:
    useEffect(() => {
        const normalizedSearch = search.trim();
        const normalizedFilter = (filters.search ?? '').trim();
        const currentStatus = filters.status || 'all';
        const currentEducationCenterId = filters.education_center_id ? String(filters.education_center_id) : 'all';
        const currentTrainingProgramId = filters.training_program_id ? String(filters.training_program_id) : 'all';
        const currentStartDateFrom = filters.start_date_from ?? '';
        const currentStartDateTo = filters.start_date_to ?? '';
        const currentEndDateFrom = filters.end_date_from ?? '';
        const currentEndDateTo = filters.end_date_to ?? '';
        if (
            normalizedSearch === normalizedFilter &&
            status === currentStatus &&
            educationCenterId === currentEducationCenterId &&
            trainingProgramId === currentTrainingProgramId &&
            startDateFrom === currentStartDateFrom &&
            startDateTo === currentStartDateTo &&
            endDateFrom === currentEndDateFrom &&
            endDateTo === currentEndDateTo
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
                    training_program_id: trainingProgramId === 'all' ? undefined : trainingProgramId,
                    start_date_from: startDateFrom || undefined,
                    start_date_to: startDateTo || undefined,
                    end_date_from: endDateFrom || undefined,
                    end_date_to: endDateTo || undefined,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 300);

        return () => window.clearTimeout(timeoutId);
    }, [
        search,
        status,
        educationCenterId,
        trainingProgramId,
        startDateFrom,
        startDateTo,
        endDateFrom,
        endDateTo,
        filters.search,
        filters.status,
        filters.education_center_id,
        filters.training_program_id,
        filters.start_date_from,
        filters.start_date_to,
        filters.end_date_from,
        filters.end_date_to,
        hasInvalidDateRange,
    ]);

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
        if (trainingProgramId !== 'all') params.training_program_id = trainingProgramId;
        if (startDateFrom) params.start_date_from = startDateFrom;
        if (startDateTo) params.start_date_to = startDateTo;
        if (endDateFrom) params.end_date_from = endDateFrom;
        if (endDateTo) params.end_date_to = endDateTo;

        window.location.href = interns.export({
            query: params,
        }).url;
    };

    const handleClearFilters = () => {
        setSearch('');
        setStatus('all');
        setEducationCenterId('all');
        setTrainingProgramId('all');
        setStartDateFrom('');
        setStartDateTo('');
        setEndDateFrom('');
        setEndDateTo('');

        router.get(interns.index().url, {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
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
                    <InternsFiltersBar
                        search={search}
                        onSearchChange={setSearch}
                        status={status}
                        onStatusChange={setStatus}
                        educationCenterId={educationCenterId}
                        onEducationCenterChange={setEducationCenterId}
                        trainingProgramId={trainingProgramId}
                        onTrainingProgramChange={setTrainingProgramId}
                        startDateFrom={startDateFrom}
                        onStartDateFromChange={setStartDateFrom}
                        startDateTo={startDateTo}
                        onStartDateToChange={setStartDateTo}
                        endDateFrom={endDateFrom}
                        onEndDateFromChange={setEndDateFrom}
                        endDateTo={endDateTo}
                        onEndDateToChange={setEndDateTo}
                        hasActiveFilters={hasActiveFilters}
                        hasInvalidDateRange={hasInvalidDateRange}
                        hasInvalidStartDateRange={hasInvalidStartDateRange}
                        hasInvalidEndDateRange={hasInvalidEndDateRange}
                        onClearFilters={handleClearFilters}
                        onExport={handleExport}
                        educationCenters={educationCenters}
                        trainingPrograms={trainingPrograms}
                    />
                    <InternsTable
                        interns={internPagination.data}
                        hasRows={hasRows}
                        onDelete={setInternToDelete}
                    />
                    <TablePagination summary={paginationSummary} links={internPagination.links} />
                </div>
            </div>
            <ConfirmDeleteDialog
                open={internToDelete !== null}
                title="Confirmar eliminación"
                description="Esta acción eliminará el becario seleccionado."
                entityLabel="Becario"
                entityName={internToDelete ? `${internToDelete.first_name} ${internToDelete.last_name}` : ''}
                isLoading={isDeleting}
                onCancel={() => setInternToDelete(null)}
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}

