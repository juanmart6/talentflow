export function internStatusLabel(status: string): string {
    if (status === 'active') return 'Activo';
    if (status === 'upcoming_active') return 'Activo proximamente';
    if (status === 'finished') return 'Finalizado';
    if (status === 'abandoned') return 'Abandonado';

    return status;
}

export function internStatusBadgeClass(status: string): string {
    if (status === 'active') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200';
    if (status === 'upcoming_active') return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200';
    if (status === 'finished') return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    if (status === 'abandoned') return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200';

    return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

export function formatSpanishDate(date: string | null): string {
    if (!date) {
        return '-';
    }

    const [year, month, day] = date.slice(0, 10).split('-');

    if (!year || !month || !day) {
        return date;
    }

    return `${day}/${month}/${year}`;
}