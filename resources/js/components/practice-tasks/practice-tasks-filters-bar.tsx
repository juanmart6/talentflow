import { Link } from '@inertiajs/react';
import { CirclePlus, FilterX, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import DatePicker from '@/components/shared/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UI_PRESETS } from '@/lib/ui-presets';
import practiceTasks from '@/routes/practice-tasks';
import type { InternOption } from '@/types';
import type { DueStateFilter, TrainingProgramOption } from '@/types/domains/practice-tasks';

type PracticeTasksFiltersBarProps = {
    viewMode: 'tutor' | 'intern';
    search: string;
    onSearchChange: (value: string) => void;
    selectedInternIds: string[];
    onSelectedInternIdsChange: (ids: string[]) => void;
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
        selectedInternIds,
        onSelectedInternIdsChange,
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
    const [internQuery, setInternQuery] = useState('');
    const [isInternDropdownOpen, setIsInternDropdownOpen] = useState(false);
    const internComboboxRef = useRef<HTMLDivElement | null>(null);

    const selectedInterns = useMemo(
        () => interns.filter((intern) => selectedInternIds.includes(intern.id)),
        [interns, selectedInternIds],
    );

    const availableInterns = useMemo(() => {
        const normalizedQuery = internQuery.trim().toLowerCase();

        return interns.filter((intern) => {
            if (selectedInternIds.includes(intern.id)) {
                return false;
            }

            if (normalizedQuery === '') {
                return true;
            }

            return intern.name.toLowerCase().includes(normalizedQuery);
        });
    }, [interns, selectedInternIds, internQuery]);

    const addIntern = (internId: string) => {
        if (selectedInternIds.includes(internId)) {
            return;
        }

        onSelectedInternIdsChange([...selectedInternIds, internId]);
        setInternQuery('');
    };

    const removeIntern = (internId: string) => {
        onSelectedInternIdsChange(selectedInternIds.filter((id) => id !== internId));
    };

    const clearSelectedInterns = () => {
        onSelectedInternIdsChange([]);
        setInternQuery('');
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!internComboboxRef.current) {
                return;
            }

            if (!internComboboxRef.current.contains(event.target as Node)) {
                setIsInternDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <form className={`${UI_PRESETS.filterBarEmphasis} mb-2`} onSubmit={(event) => event.preventDefault()}>
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

                {viewMode === 'tutor' ? (
                    <div className="flex flex-col gap-1" ref={internComboboxRef}>
                        <span className="text-xs font-medium text-muted-foreground">Becarios</span>
                        <div className="relative">
                            <div className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm shadow-xs transition-colors focus-within:border-slate-400 dark:border-slate-600 dark:bg-slate-950">
                                {selectedInterns.map((intern) => (
                                    <span
                                        key={intern.id}
                                        className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
                                    >
                                        <span className="max-w-[9rem] truncate">{intern.name}</span>
                                        <button
                                            type="button"
                                            className="text-muted-foreground transition-colors hover:text-destructive"
                                            onClick={() => removeIntern(intern.id)}
                                            aria-label={`Quitar ${intern.name}`}
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                ))}
                                <Input
                                    value={internQuery}
                                    onChange={(event) => setInternQuery(event.target.value)}
                                    onFocus={() => setIsInternDropdownOpen(true)}
                                    className="h-7 min-w-[140px] flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                                    placeholder={selectedInternIds.length > 0 ? 'Añadir más becarios...' : 'Buscar becarios...'}
                                />
                                {selectedInternIds.length > 0 ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={clearSelectedInterns}
                                    >
                                        Limpiar
                                    </Button>
                                ) : null}
                            </div>

                            {isInternDropdownOpen ? (
                                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-md dark:border-slate-700 dark:bg-slate-900">
                                    {availableInterns.length > 0 ? (
                                        availableInterns.map((intern) => (
                                            <button
                                                key={intern.id}
                                                type="button"
                                                className="flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                                                onClick={() => addIntern(intern.id)}
                                            >
                                                {intern.name}
                                            </button>
                                        ))
                                    ) : (
                                        <p className="px-2 py-1.5 text-sm text-muted-foreground">
                                            No hay becarios disponibles.
                                        </p>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">

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
                        <DatePicker
                            id="practice-tasks-date-from"
                            value={dateFrom}
                            onChange={onDateFromChange}
                            placeholder="Seleccionar fecha"
                            className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Hasta</span>
                        <DatePicker
                            id="practice-tasks-date-to"
                            value={dateTo}
                            onChange={onDateToChange}
                            placeholder="Seleccionar fecha"
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

