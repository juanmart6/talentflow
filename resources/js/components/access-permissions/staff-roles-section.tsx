import { ShieldCheck, Trash2 } from 'lucide-react';
import { SectionIntro } from '@/components/form-ui';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useInitials } from '@/hooks/use-initials';
import {
    roleBadgeClasses,
    roleBadgeIconByRole,
    roleLabels,
} from '@/lib/access-permissions/access-permissions';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import type { UserRow } from '@/types/domains/access-permissions';

type StaffRolesSectionProps = {
    users: UserRow[];
    availableRoles: string[];
    authUserId: number | null;
    onRoleChange: (userId: number, role: string) => void;
    onDeleteUser: (user: UserRow) => void;
};

export default function StaffRolesSection({
    users,
    availableRoles,
    authUserId,
    onRoleChange,
    onDeleteUser,
}: StaffRolesSectionProps) {
    const getInitials = useInitials();
    const protectedAdminEmail = 'admin@talentflow.es';
    const roleOptions = availableRoles.filter((role) => role === 'admin' || role === 'tutor');

    return (
        <div className="space-y-4">
            <SectionIntro
                title="Staff"
                description="Administra el acceso y los roles del personal interno."
            />
            <div className={UI_PRESETS.tableContainer}>
                <table className="w-full table-fixed text-sm">
                    <colgroup>
                        <col className="w-[22%]" />
                        <col className="w-[24%]" />
                        <col className="w-[18%]" />
                        <col className="w-[24%]" />
                        <col className="w-[12%]" />
                    </colgroup>
                    <thead className={UI_PRESETS.tableHead}>
                        <tr>
                            <th className="px-4 py-3 text-center font-semibold">Usuario</th>
                            <th className="px-4 py-3 text-center font-semibold">Email</th>
                            <th className="px-4 py-3 text-center font-semibold">Rol actual</th>
                            <th className="px-4 py-3 text-center font-semibold">Cambiar rol</th>
                            <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length > 0 ? (
                            users.map((user, index) => {
                                const RoleIcon = roleBadgeIconByRole[user.role ?? ''] ?? ShieldCheck;
                                const isSelfUser = authUserId === user.id;
                                const isProtectedAdminEmail =
                                    user.email.trim().toLowerCase() === protectedAdminEmail;
                                const canDeleteUser = user.role !== 'admin' && !isSelfUser && !isProtectedAdminEmail;

                                return (
                                    <tr key={user.id} className={`h-20 border-t align-middle ${stripedRowClass(index)}`}>
                                        <td className="px-4 py-3 text-center align-middle">
                                            <div className="flex items-center justify-center gap-2 font-medium">
                                                <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                                                    <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                                                    <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                                        {getInitials(user.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="inline-block max-w-[12rem] truncate leading-tight" title={user.name}>
                                                    {user.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center align-middle">
                                            <span className="inline-block max-w-[15rem] truncate leading-tight" title={user.email}>
                                                {user.email}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center align-middle">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                                    roleBadgeClasses[user.role ?? '']
                                                    ?? 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                                                }`}
                                            >
                                                <RoleIcon className="size-3.5" />
                                                {roleLabels[user.role ?? ''] ?? 'SIN ROL'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center align-middle">
                                            <div className="grid place-items-center gap-1">
                                                <Select
                                                    value={user.role ?? ''}
                                                    disabled={isProtectedAdminEmail}
                                                    onValueChange={(value) => onRoleChange(user.id, value)}
                                                >
                                                    <SelectTrigger
                                                        className={`${UI_PRESETS.selectTrigger} mx-auto w-[210px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
                                                    >
                                                        <SelectValue placeholder="Seleccionar rol" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {roleOptions.map((role) => (
                                                            <SelectItem className={UI_PRESETS.selectItem} key={role} value={role}>
                                                                {roleLabels[role] ?? role.toUpperCase()}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                {isProtectedAdminEmail ? (
                                                    <span className="text-[11px] text-muted-foreground">Rol protegido</span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center align-middle">
                                            <button
                                                type="button"
                                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-300/50 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/30"
                                                onClick={() => onDeleteUser(user)}
                                                disabled={!canDeleteUser}
                                                title={
                                                    isProtectedAdminEmail
                                                        ? 'La cuenta admin@talentflow.es está protegida'
                                                        : user.role === 'admin'
                                                        ? 'No se puede eliminar un usuario admin'
                                                        : isSelfUser
                                                            ? 'No puedes eliminar tu propio usuario'
                                                            : 'Eliminar usuario'
                                                }
                                                aria-label="Eliminar usuario"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                                    No hay usuarios disponibles.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
