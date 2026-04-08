import { Link } from '@inertiajs/react';
import { CirclePlus, FilterX, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UI_PRESETS } from '@/lib/ui-presets';
import practiceTasks from '@/routes/practice-tasks';
import type { InternOption } from '@/types';
import type { DueStateFilter, TrainingProgramOption } from '@/types/practice-tasks';

type PracticeTasksFiltersBarProps = {
    viewMode: 'tutor' | 'intern';
    search: string;
    onSearchChange: (value: string) => void;
    internFilter: string;
    onInternFilterChange: (value: string) => void;
    trainingProgramFilter: string;
    onTrainingProgramFilterChange: (value: string) => void;
    dateFrom: string;
    onDateFromChange: (value: string) => void;
    dateTo: string;
    onDateToChange: (value: string) => void;
    dueStateFilter: DueStateFilter;
    onDueStateFilterChange: (value: DueStateFilter) => void;
    hasActiveFilters: boolean;
    onClearFilters: () => void;
    interns: InternOption[];
    trainingPrograms: TrainingProgramOption[];
};

export default function PracticeTasksFiltersBar(props: PracticeTasksFiltersBarProps) {
    const {
        viewMode,
        search,
        onSearchChange,
        internFilter,
        onInternFilterChange,
        trainingProgramFilter,
        onTrainingProgramFilterChange,
        dateFrom,
        onDateFromChange,
        dateTo,
        onDateToChange,
        dueStateFilter,
        onDueStateFilterChange,
        hasActiveFilters,
        onClearFilters,
        interns,
        trainingPrograms,
    } = props;

    return (
        <form className={`${UI_PRESETS.filterBar} mb-2`} onSubmit={(event) => event.preventDefault()}>
            <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Buscar tareas por título o descripción"
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
                            title="Eliminar filtros"
                            aria-label="Eliminar filtros"
                        >
                            <FilterX />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className={UI_PRESETS.iconActionButtonPrimary}
                            title="Nueva Tarea"
                            aria-label="Nueva Tarea"
                            asChild
                        >
                            <Link href={practiceTasks.create().url}>
                                <CirclePlus />
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className={`grid gap-2 ${viewMode === 'tutor' ? 'md:grid-cols-2 xl:grid-cols-5' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
                    {viewMode === 'tutor' ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-xs font-medium text-muted-foreground">Becario</span>
                            <Select value={internFilter} onValueChange={onInternFilterChange}>
                                <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                    <SelectValue placeholder="Becario" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem className={UI_PRESETS.selectItem} value="all">
                                        Todos los becarios
                                    </SelectItem>
                                    {interns.map((intern) => (
                                        <SelectItem className={UI_PRESETS.selectItem} key={intern.id} value={intern.id}>
                                            {intern.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : null}

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Grado formativo</span>
                        <Select value={trainingProgramFilter} onValueChange={onTrainingProgramFilterChange}>
                            <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                <SelectValue placeholder="Grado formativo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem className={UI_PRESETS.selectItem} value="all">
                                    Todos los grados
                                </SelectItem>
                                {trainingPrograms.map((program) => (
                                    <SelectItem className={UI_PRESETS.selectItem} key={program.id} value={program.id}>
                                        {program.name}
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
                            onChange={(event) => onDateFromChange(event.target.value)}
                            className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Hasta</span>
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(event) => onDateToChange(event.target.value)}
                            className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Vencimiento</span>
                        <Select value={dueStateFilter} onValueChange={(value) => onDueStateFilterChange(value as DueStateFilter)}>
                            <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                <SelectValue placeholder="Vencimiento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem className={UI_PRESETS.selectItem} value="all">
                                    Todas
                                </SelectItem>
                                <SelectItem className={UI_PRESETS.selectItem} value="overdue">
                                    Vencidas
                                </SelectItem>
                                <SelectItem className={UI_PRESETS.selectItem} value="next_7_days">
                                    Menos de 7 días
                                </SelectItem>
                                <SelectItem className={UI_PRESETS.selectItem} value="over_7_days">
                                    Más de 7 días
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </form>
    );
}