import { Link } from '@inertiajs/react';
import { CirclePlus, FileSpreadsheet, FilterX, Search } from 'lucide-react';
import DatePicker from '@/components/shared/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { UI_PRESETS } from '@/lib/ui-presets';
import internsRoutes from '@/routes/interns';
import type { EducationCenterOption, TrainingProgramOption } from '@/types/domains/interns';

type InternsFiltersBarProps = {
    search: string;
    onSearchChange: (value: string) => void;
    status: string;
    onStatusChange: (value: string) => void;
    educationCenterId: string;
    onEducationCenterChange: (value: string) => void;
    trainingProgramId: string;
    onTrainingProgramChange: (value: string) => void;
    startDateFrom: string;
    onStartDateFromChange: (value: string) => void;
    startDateTo: string;
    onStartDateToChange: (value: string) => void;
    endDateFrom: string;
    onEndDateFromChange: (value: string) => void;
    endDateTo: string;
    onEndDateToChange: (value: string) => void;
    hasActiveFilters: boolean;
    hasInvalidDateRange: boolean;
    hasInvalidStartDateRange: boolean;
    hasInvalidEndDateRange: boolean;
    onClearFilters: () => void;
    onExport: () => void;
    educationCenters: EducationCenterOption[];
    trainingPrograms: TrainingProgramOption[];
};

export default function InternsFiltersBar({
    search,
    onSearchChange,
    status,
    onStatusChange,
    educationCenterId,
    onEducationCenterChange,
    trainingProgramId,
    onTrainingProgramChange,
    startDateFrom,
    onStartDateFromChange,
    startDateTo,
    onStartDateToChange,
    endDateFrom,
    onEndDateFromChange,
    endDateTo,
    onEndDateToChange,
    hasActiveFilters,
    hasInvalidDateRange,
    hasInvalidStartDateRange,
    hasInvalidEndDateRange,
    onClearFilters,
    onExport,
    educationCenters,
    trainingPrograms,
}: InternsFiltersBarProps) {
    return (
        <form onSubmit={(event) => event.preventDefault()} className={`${UI_PRESETS.filterBarEmphasis} mb-2`}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Buscar por nombre, DNI o email"
                            className={`${UI_PRESETS.simpleSearchInput} h-9 pl-9 text-sm`}
                        />
                    </div>

                    <div className="flex items-center gap-2 lg:ml-auto lg:shrink-0">
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={UI_PRESETS.iconActionButton}
                            onClick={onClearFilters}
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
                            onClick={onExport}
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
                            title="Nuevo Becario"
                            aria-label="Nuevo Becario"
                        >
                            <Link href={internsRoutes.create().url}>
                                <CirclePlus />
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Centro educativo</span>
                        <Select value={educationCenterId} onValueChange={onEducationCenterChange}>
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
                        <span className="text-xs font-medium text-muted-foreground">Ciclo formativo</span>
                        <Select value={trainingProgramId} onValueChange={onTrainingProgramChange}>
                            <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                <SelectValue placeholder="Ciclo formativo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem className={UI_PRESETS.selectItem} value="all">Todos los ciclos</SelectItem>
                                {trainingPrograms.map((program) => (
                                    <SelectItem className={UI_PRESETS.selectItem} key={program.id} value={String(program.id)}>
                                        {program.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Estado</span>
                        <Select value={status} onValueChange={onStatusChange}>
                            <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem className={UI_PRESETS.selectItem} value="all">Todos los estados</SelectItem>
                                <SelectItem className={UI_PRESETS.selectItem} value="upcoming_active">Activo proximamente</SelectItem>
                                <SelectItem className={UI_PRESETS.selectItem} value="active">Activo</SelectItem>
                                <SelectItem className={UI_PRESETS.selectItem} value="finished">Finalizado</SelectItem>
                                <SelectItem className={UI_PRESETS.selectItem} value="abandoned">Abandonado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Inicio desde</span>
                        <DatePicker
                            id="interns-start-date-from"
                            value={startDateFrom}
                            onChange={onStartDateFromChange}
                            placeholder="Seleccionar fecha"
                            className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Inicio hasta</span>
                        <DatePicker
                            id="interns-start-date-to"
                            value={startDateTo}
                            onChange={onStartDateToChange}
                            placeholder="Seleccionar fecha"
                            className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Fin desde</span>
                        <DatePicker
                            id="interns-end-date-from"
                            value={endDateFrom}
                            onChange={onEndDateFromChange}
                            placeholder="Seleccionar fecha"
                            className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Fin hasta</span>
                        <DatePicker
                            id="interns-end-date-to"
                            value={endDateTo}
                            onChange={onEndDateToChange}
                            placeholder="Seleccionar fecha"
                            className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                        />
                    </div>
                </div>

                {hasInvalidStartDateRange ? (
                    <p className="text-sm font-medium text-destructive">
                        En fechas de inicio: &quot;Inicio desde&quot; no puede ser posterior a &quot;Inicio hasta&quot;.
                    </p>
                ) : null}
                {hasInvalidEndDateRange ? (
                    <p className="text-sm font-medium text-destructive">
                        En fechas de fin: &quot;Fin desde&quot; no puede ser posterior a &quot;Fin hasta&quot;.
                    </p>
                ) : null}
            </div>
        </form>
    );
}
