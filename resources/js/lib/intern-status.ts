export type InternStatus = 'active' | 'upcoming_active' | 'finished' | 'abandoned';

type InternStatusMeta = {
    label: string;
    badgeClass: string;
    cardClass: string;
    cardSubtextClass: string;
};

export const INTERN_STATUS_META: Record<InternStatus, InternStatusMeta> = {
    upcoming_active: {
        label: 'Activo proximamente',
        badgeClass: 'bg-violet-100 text-violet-700 ring-1 ring-violet-300',
        cardClass: 'from-violet-600 to-violet-500 text-white',
        cardSubtextClass: 'text-violet-100',
    },
    active: {
        label: 'Activo',
        badgeClass: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300',
        cardClass: 'from-emerald-600 to-emerald-500 text-white',
        cardSubtextClass: 'text-emerald-100',
    },
    finished: {
        label: 'Finalizado',
        badgeClass: 'bg-sky-100 text-sky-700 ring-1 ring-sky-300',
        cardClass: 'from-sky-600 to-sky-500 text-white',
        cardSubtextClass: 'text-sky-100',
    },
    abandoned: {
        label: 'Abandonado',
        badgeClass: 'bg-rose-100 text-rose-700 ring-1 ring-rose-300',
        cardClass: 'from-rose-600 to-rose-500 text-white',
        cardSubtextClass: 'text-rose-100',
    },
};
