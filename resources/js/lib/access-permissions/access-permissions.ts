import { ShieldCheck, UsersRound } from 'lucide-react';
import type { InvitationRow, InvitationStatus } from '@/types/domains/access-permissions';

export const roleLabels: Record<string, string> = {
    admin: 'ADMIN',
    tutor: 'TUTOR',
};

export const roleBadgeClasses: Record<string, string> = {
    admin: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200',
    tutor: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
};

export const roleBadgeIconByRole: Record<string, typeof ShieldCheck> = {
    admin: ShieldCheck,
    tutor: UsersRound,
};

export const permissionActionLabels: Record<string, string> = {
    view: 'Ver',
    create: 'Crear',
    update: 'Editar',
    delete: 'Eliminar',
    manage: 'Gestionar',
};

export const invitationStatusLabels: Record<InvitationStatus, string> = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    expired: 'Expirada',
};

export const permissionModuleLabels: Record<string, string> = {
    'education-centers': 'Centros Educativos',
    'practice-tasks': 'Prácticas y tareas',
    users: 'Accesos y permisos',
};

export const invitationStatusBadgeClasses: Record<InvitationStatus, string> = {
    pending:
        'bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/40',
    accepted:
        'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700/40',
    expired:
        'bg-red-100 text-red-700 ring-1 ring-red-300 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-700/40',
};

export const getInvitationStatus = (invitation: InvitationRow): InvitationStatus => {
    if (invitation.accepted_at) return 'accepted';
    if (!invitation.expires_at) return 'pending';

    const expiresAt = new Date(invitation.expires_at);
    if (Number.isNaN(expiresAt.getTime())) return 'pending';

    return expiresAt.getTime() < Date.now() ? 'expired' : 'pending';
};
