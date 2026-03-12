export const UI_PRESETS = {
    summaryCardTitle: 'text-xs font-semibold uppercase tracking-wide',
    filterBar: 'rounded-xl border border-sidebar-border/70 bg-muted/20 p-3 dark:border-sidebar-border',
    filterInput: 'border-amber-200/70 bg-white/80 focus-visible:border-amber-400 focus-visible:ring-amber-200 dark:border-amber-700/40 dark:bg-slate-900/40 dark:focus-visible:ring-amber-900/40',
    selectTrigger: 'border-amber-200/70 bg-white/80 focus-visible:border-amber-400 focus-visible:ring-amber-200 dark:border-amber-700/40 dark:bg-slate-900/40 dark:focus-visible:ring-amber-900/40',
    selectItem: 'data-[highlighted]:bg-amber-50 data-[highlighted]:text-amber-900 dark:data-[highlighted]:bg-amber-900/30 dark:data-[highlighted]:text-amber-100',
    tableHead: 'bg-slate-100 text-left dark:bg-slate-800/70',
    sectionCard: 'space-y-4 rounded-xl border border-sidebar-border/70 bg-white/70 p-4 dark:border-sidebar-border dark:bg-slate-900/20',
} as const;

export const MODE_CARD_CLASSES: Record<'create' | 'edit' | 'show', string> = {
    create: 'from-indigo-600 to-indigo-500 text-white',
    edit: 'from-amber-500 to-orange-500 text-white',
    show: 'from-slate-700 to-slate-600 text-white',
};

export const SUMMARY_CARD_CLASSES = {
    neutral: 'rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 p-4 text-slate-50',
    success: 'rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 text-white',
    info: 'rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 p-4 text-white',
    warning: 'rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white',
    danger: 'rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 p-4 text-white',
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
