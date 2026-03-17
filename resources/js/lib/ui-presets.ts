export const UI_PRESETS = {
    pageContent: 'flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6',
    pageSection: 'w-full max-w-5xl mx-auto',
    summaryCardTitle: 'text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400',
    summaryCardValue: 'mt-1 text-xl font-semibold',
    simpleSearchBar: 'rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900',
    simpleSearchInput: 'border-slate-300 bg-white focus-visible:border-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-slate-600 dark:bg-slate-950',
    simpleSearchClearButton: 'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    filterBar: 'rounded-xl border border-sidebar-border/70 bg-muted/20 p-3 dark:border-sidebar-border',
    filterChipsRow: 'flex flex-wrap gap-2',
    filterChip: 'inline-flex cursor-pointer items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase transition-colors',
    filterChipActive: 'border-primary bg-primary text-primary-foreground',
    filterChipInactive: 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800',
    filterInput: 'border-slate-300 bg-white focus-visible:border-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-slate-600 dark:bg-slate-950',
    selectTrigger: 'border-slate-300 bg-white focus-visible:border-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-slate-600 dark:bg-slate-950',
    selectItem: 'cursor-pointer focus:bg-slate-100 focus:text-slate-900 data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 dark:focus:bg-slate-800 dark:focus:text-slate-100 dark:data-[highlighted]:bg-slate-800 dark:data-[highlighted]:text-slate-100',
    tableContainer: 'relative w-full overflow-x-auto rounded-lg border border-sidebar-border/70 dark:border-sidebar-border',
    tableHead: 'bg-slate-100 text-left dark:bg-slate-800/70',
    tableCell: 'px-4 py-3',
    tableCellCentered: 'px-4 py-3 text-center',
    tablePagination: 'flex flex-col gap-4 border-t border-sidebar-border/70 px-4 pt-4 md:flex-row md:items-center md:justify-between dark:border-sidebar-border',
    iconActionButton: 'cursor-pointer text-slate-600 hover:bg-primary/90 hover:text-primary-foreground dark:text-slate-300',
    copyableCell: 'cursor-pointer transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-800/50',
    sectionCard: 'space-y-4 rounded-xl border border-sidebar-border/70 bg-white/70 p-4 dark:border-sidebar-border dark:bg-slate-900/20',
} as const;

export const MODE_CARD_CLASSES: Record<'create' | 'edit' | 'show', string> = {
    create: 'from-indigo-600 to-indigo-500 text-white',
    edit: 'from-amber-500 to-orange-500 text-white',
    show: 'from-slate-700 to-slate-600 text-white',
};

export const SUMMARY_CARD_CLASSES = {
    neutral: 'rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
    success: 'rounded-xl border border-emerald-200 bg-white p-2 text-slate-900 shadow-sm ring-1 ring-inset ring-emerald-100/80 dark:border-emerald-800/70 dark:bg-slate-900 dark:text-slate-100 dark:ring-emerald-900/40',
    info: 'rounded-xl border border-sky-200 bg-white p-2 text-slate-900 shadow-sm ring-1 ring-inset ring-sky-100/80 dark:border-sky-800/70 dark:bg-slate-900 dark:text-slate-100 dark:ring-sky-900/40',
    warning: 'rounded-xl border border-amber-200 bg-white p-2 text-slate-900 shadow-sm ring-1 ring-inset ring-amber-100/80 dark:border-amber-800/70 dark:bg-slate-900 dark:text-slate-100 dark:ring-amber-900/40',
    danger: 'rounded-xl border border-rose-200 bg-white p-2 text-slate-900 shadow-sm ring-1 ring-inset ring-rose-100/80 dark:border-rose-800/70 dark:bg-slate-900 dark:text-slate-100 dark:ring-rose-900/40',
};

export function agreementCardClasses(hasAgreement: boolean): string {
    return hasAgreement
        ? 'rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-4 text-white'
        : 'rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 p-4 text-white';
}

export function agreementCardSubtextClasses(hasAgreement: boolean): string {
    return hasAgreement ? 'text-emerald-100' : 'text-rose-100';
}

export function stripedRowClass(index: number): string {
    return index % 2 === 0
        ? 'bg-white/60 dark:bg-transparent'
        : 'bg-slate-50/60 dark:bg-slate-900/20';
}
