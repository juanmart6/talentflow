import { Columns3, List } from 'lucide-react';
import { UI_PRESETS } from '@/lib/ui-presets';
import { cn } from '@/lib/utils';

type PracticeTasksView = 'kanban' | 'list';

type PracticeTasksViewToggleProps = {
    view: PracticeTasksView;
    onViewChange: (view: PracticeTasksView) => void;
};

export default function PracticeTasksViewToggle({ view, onViewChange }: PracticeTasksViewToggleProps) {
    return (
        <div className="inline-flex items-center gap-2">
            <button
                type="button"
                onClick={() => onViewChange('kanban')}
                className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold',
                    view === 'kanban' ? UI_PRESETS.paginationButtonActive : UI_PRESETS.paginationButton,
                )}
                aria-pressed={view === 'kanban'}
                aria-label="Vista Kanban"
            >
                <Columns3 className="size-3.5" />
                Kanban
            </button>
            <button
                type="button"
                onClick={() => onViewChange('list')}
                className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold',
                    view === 'list' ? UI_PRESETS.paginationButtonActive : UI_PRESETS.paginationButton,
                )}
                aria-pressed={view === 'list'}
                aria-label="Vista Lista"
            >
                <List className="size-3.5" />
                Lista
            </button>
        </div>
    );
}
