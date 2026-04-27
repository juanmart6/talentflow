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

export function daysFromToday(date: string | null): number | null {
    if (!date) {
        return null;
    }

    const today = new Date();
    const target = new Date(date);
    const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
    const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());

    return Math.floor((utcTarget - utcToday) / (1000 * 60 * 60 * 24));
}

type CenterForStatusDetail = {
    status: 'valid' | 'not_started' | 'renewal_soon' | 'expired' | string;
    latest_agreement: {
        signed_at: string | null;
        expires_at: string | null;
    } | null;
};

export function centerStatusDetail(center: CenterForStatusDetail): string {
    const expiresInDays = daysFromToday(center.latest_agreement?.expires_at ?? null);
    const startsInDays = daysFromToday(center.latest_agreement?.signed_at ?? null);

    if (center.status === 'not_started' && startsInDays !== null) {
        return startsInDays <= 0 ? 'Comienza hoy' : `Comienza en ${startsInDays} dias`;
    }

    if (center.status === 'expired' && expiresInDays !== null) {
        const elapsed = Math.abs(expiresInDays);

        return elapsed === 0 ? 'Caducado hoy' : `Caducado hace ${elapsed} dias`;
    }

    if ((center.status === 'renewal_soon' || center.status === 'valid') && expiresInDays !== null) {
        return expiresInDays <= 0 ? 'Vence hoy' : `Vence en ${expiresInDays} dias`;
    }

    return '-';
}
