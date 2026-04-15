import { MailPlus, ShieldCheck, Trash2 } from 'lucide-react';
import { SectionIntro } from '@/components/form-ui';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    getInvitationStatus,
    invitationStatusBadgeClasses,
    invitationStatusLabels,
    roleBadgeClasses,
    roleBadgeIconByRole,
    roleLabels,
} from '@/lib/access-permissions/access-permissions';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import { cn } from '@/lib/utils';
import type {
    InvitationRow,
    InvitationStatus,
    InvitationStatusCounts,
} from '@/types/domains/access-permissions';

type InvitationsSectionProps = {
    invitationEmail: string;
    invitationRole: string;
    invitationRoleOptions: string[];
    invitationFilter: 'all' | InvitationStatus;
    invitationStatusCounts: InvitationStatusCounts;
    invitations: InvitationRow[];
    onInvitationEmailChange: (value: string) => void;
    onInvitationRoleChange: (value: string) => void;
    onCreateInvitation: () => void;
    onFilterChange: (value: 'all' | InvitationStatus) => void;
    onDeleteInvitation: (invitation: InvitationRow) => void;
    formatDateTime: (value: string | null) => string;
};

export default function InvitationsSection({
    invitationEmail,
    invitationRole,
    invitationRoleOptions,
    invitationFilter,
    invitationStatusCounts,
    invitations,
    onInvitationEmailChange,
    onInvitationRoleChange,
    onCreateInvitation,
    onFilterChange,
    onDeleteInvitation,
    formatDateTime,
}: InvitationsSectionProps) {
    return (
        <div className="space-y-4">
            <SectionIntro
                title="Invitaciones"
                description="Invita por correo a nuevos miembros del equipo con su rol inicial."
            />

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                <Input
                    value={invitationEmail}
                    onChange={(event) => onInvitationEmailChange(event.target.value)}
                    placeholder="correo@dominio.com"
                    className={UI_PRESETS.simpleSearchInput}
                />
                <Select value={invitationRole} onValueChange={onInvitationRoleChange}>
                    <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full cursor-pointer`}>
                        <SelectValue placeholder="Seleccionar rol" />
                    </SelectTrigger>
                    <SelectContent>
                        {invitationRoleOptions.map((role) => (
                            <SelectItem className={UI_PRESETS.selectItem} key={role} value={role}>
                                {roleLabels[role] ?? role.toUpperCase()}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <button
                    type="button"
                    className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-[#2563eb] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1d4ed8]"
                    onClick={onCreateInvitation}
                >
                    <MailPlus className="size-4" />
                    Invitar
                </button>
            </div>

            <div className={UI_PRESETS.tableContainer}>
                <div className="border-b border-sidebar-border/70 px-4 py-3 dark:border-sidebar-border">
                    <div className="inline-flex items-center gap-2">
                        {[
                            { value: 'all', label: 'Todas' },
                            { value: 'pending', label: 'Pendientes' },
                            { value: 'accepted', label: 'Aceptadas' },
                            { value: 'expired', label: 'Expiradas' },
                        ].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={cn(
                                    'inline-flex h-8 cursor-pointer items-center rounded-md px-3 text-xs font-semibold',
                                    invitationFilter === option.value
                                        ? UI_PRESETS.paginationButtonActive
                                        : UI_PRESETS.paginationButton,
                                )}
                                onClick={() => onFilterChange(option.value as 'all' | InvitationStatus)}
                            >
                                {`${option.label} (${invitationStatusCounts[option.value as 'all' | InvitationStatus]})`}
                            </button>
                        ))}
                    </div>
                </div>

                <table className="w-full table-fixed text-sm">
                    <colgroup>
                        <col className="w-[22%]" />
                        <col className="w-[12%]" />
                        <col className="w-[17%]" />
                        <col className="w-[14%]" />
                        <col className="w-[14%]" />
                        <col className="w-[11%]" />
                        <col className="w-[10%]" />
                    </colgroup>
                    <thead className={UI_PRESETS.tableHead}>
                        <tr>
                            <th className="px-4 py-3 text-center font-semibold">Email</th>
                            <th className="px-4 py-3 text-center font-semibold">Rol</th>
                            <th className="px-4 py-3 text-center font-semibold">Invitado por</th>
                            <th className="px-4 py-3 text-center font-semibold">Creada</th>
                            <th className="px-4 py-3 text-center font-semibold">Expira</th>
                            <th className="px-4 py-3 text-center font-semibold">Estado</th>
                            <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invitations.length > 0 ? (
                            invitations.map((invitation, index) => {
                                const RoleIcon = roleBadgeIconByRole[invitation.role] ?? ShieldCheck;
                                const invitationStatus = getInvitationStatus(invitation);
                                const canCancel = invitationStatus === 'pending';

                                return (
                                    <tr key={invitation.id} className={`h-16 border-t align-middle ${stripedRowClass(index)}`}>
                                        <td className="px-4 py-3 text-center align-middle">
                                            <span className="inline-block max-w-[16rem] truncate" title={invitation.email}>
                                                {invitation.email}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center align-middle">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                                    roleBadgeClasses[invitation.role]
                                                    ?? 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                                                }`}
                                            >
                                                <RoleIcon className="size-3.5" />
                                                {roleLabels[invitation.role] ?? invitation.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center align-middle">
                                            <span className="inline-block max-w-[13rem] truncate" title={invitation.invited_by_name}>
                                                {invitation.invited_by_name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center align-middle text-muted-foreground">
                                            {formatDateTime(invitation.created_at)}
                                        </td>
                                        <td className="px-4 py-3 text-center align-middle text-muted-foreground">
                                            {formatDateTime(invitation.expires_at)}
                                        </td>
                                        <td className="px-4 py-3 text-center align-middle">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
                                                    invitationStatusBadgeClasses[invitationStatus]
                                                }`}
                                            >
                                                {invitationStatusLabels[invitationStatus]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center align-middle">
                                            <button
                                                type="button"
                                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-300/50 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/30"
                                                onClick={() => onDeleteInvitation(invitation)}
                                                disabled={!canCancel}
                                                title={canCancel ? 'Cancelar invitación' : 'Solo se pueden cancelar invitaciones pendientes'}
                                                aria-label="Cancelar invitación"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                    No hay invitaciones para el filtro seleccionado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
