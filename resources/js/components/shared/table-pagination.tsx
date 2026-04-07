import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { UI_PRESETS } from '@/lib/ui-presets';
import { normalizePaginationLabel } from '@/lib/utils';
import type { PaginationLink } from '@/types/pagination';

type TablePaginationProps = {
    summary: string;
    links: PaginationLink[];
};

export default function TablePagination({ summary, links }: TablePaginationProps) {
    return (
        <div className={UI_PRESETS.tablePagination}>
            <p className="text-sm text-muted-foreground">{summary}</p>

            <div className="flex flex-wrap items-center gap-2">
                {links.map((link, index) => (
                    <Button
                        key={`${link.label}-${index}`}
                        variant="outline"
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
    );
}