export type CenterStatus = 'valid' | 'not_started' | 'renewal_soon' | 'expired';

type CenterStatusMeta = {
    label: string;
    filterLabel: string;
    badgeClass: string;
};

export const CENTER_STATUS_META: Record<CenterStatus, CenterStatusMeta> = {
    valid: {
        label: 'Vigente',
        filterLabel: 'Convenio vigente',
        badgeClass: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300',
    },
    not_started: {
        label: 'Aún no vigente',
        filterLabel: 'Aún no vigente',
        badgeClass: 'bg-violet-100 text-violet-700 ring-1 ring-violet-300',
    },
    renewal_soon: {
        label: 'Renovación próxima',
        filterLabel: 'Renovación próxima',
        badgeClass: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300',
    },
    expired: {
        label: 'Caducado',
        filterLabel: 'Convenio caducado',
        badgeClass: 'bg-red-100 text-red-700 ring-1 ring-red-300',
    },
};

export const CENTER_STATUS_OPTIONS = [
    { value: 'all', label: 'Todos los centros' },
    { value: 'valid', label: CENTER_STATUS_META.valid.filterLabel },
    { value: 'not_started', label: CENTER_STATUS_META.not_started.filterLabel },
    { value: 'renewal_soon', label: CENTER_STATUS_META.renewal_soon.filterLabel },
    { value: 'expired', label: CENTER_STATUS_META.expired.filterLabel },
] as const;
