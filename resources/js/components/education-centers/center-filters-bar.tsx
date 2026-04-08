import { Link } from '@inertiajs/react';
import { CirclePlus, FileSpreadsheet, FilterX, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CENTER_STATUS_OPTIONS } from '@/lib/education-centers/center-status';
import { UI_PRESETS } from '@/lib/ui-presets';
import educationCenters from '@/routes/education-centers';

type CenterFiltersBarProps = {
    search: string;
    onSearchChange: (value: string) => void;
    agreementStatus: string;
    onStatusChange: (value: string) => void;
    onClearFilters: () => void;
    onExport: () => void;
    hasActiveFilters: boolean;
};

export default function CenterFiltersBar({
    search,
    onSearchChange,
    agreementStatus,
    onStatusChange,
    onClearFilters,
    onExport,
    hasActiveFilters,
}: CenterFiltersBarProps) {
    return (
        <form className={`${UI_PRESETS.filterBar} mb-2`} onSubmit={(event) => event.preventDefault()}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Buscar por nombre del centro"
                        className={`${UI_PRESETS.simpleSearchInput} h-9 pl-9 text-sm`}
                    />
                </div>

                <Select value={agreementStatus} onValueChange={onStatusChange}>
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
    );
}
