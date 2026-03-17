export type CenterStatus = 'valid' | 'renewal_soon' | 'expired';

type CenterStatusMeta = {
    label: string;
    filterLabel: string;
    badgeClass: string;
};

export const CENTER_STATUS_META: Record<CenterStatus, CenterStatusMeta> = {
    valid: {
        label: 'Vigente',
        filterLabel: 'Convenio Vigente',
        badgeClass: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300',
    },
    renewal_soon: {
        label: 'Renovacion proxima',
        filterLabel: 'Renovacion proxima',
        badgeClass: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300',
    },
    expired: {
        label: 'Caducado',
        filterLabel: 'Convenio caducado',
        badgeClass: 'bg-red-100 text-red-700 ring-1 ring-red-300',
    },
};
