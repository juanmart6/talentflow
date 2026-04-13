import { Head, router, usePage } from '@inertiajs/react';
import { GraduationCap, MailPlus, ShieldCheck, Trash2, UserCog, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SectionIntro } from '@/components/form-ui';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import UserManagementTabs from '@/components/users/user-management-tabs';
import type { UserManagementTab } from '@/components/users/user-management-tabs';
import AppLayout from '@/layouts/app-layout';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type RoleRow = {
    id: number;
    name: string;
};

type RolePermissionsMap = Record<string, string[]>;

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    roles: string[];
    created_at: string | null;
};

type InvitationRow = {
    id: number;
    email: string;
    role: string;
    expires_at: string | null;
    accepted_at: string | null;
    invited_by_name: string;
    created_at: string | null;
};

type Props = {
    users: UserRow[];
    roles: RoleRow[];
    availableRoles: string[];
    permissions: string[];
    rolePermissions: RolePermissionsMap;
    invitations: InvitationRow[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Autenticación y Usuarios',
        href: '/autenticacion-usuarios',
    },
];

type InvitationStatus = 'pending' | 'accepted' | 'expired';

const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    tutor: 'Tutor',
    intern: 'Becario',
};

const roleBadgeClasses: Record<string, string> = {
    admin: 'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200',
    tutor: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200',
    intern: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
};

const roleBadgeIconByRole: Record<string, typeof ShieldCheck> = {
    admin: ShieldCheck,
    tutor: UsersRound,
    intern: GraduationCap,
};

const permissionModuleLabels: Record<string, string> = {
    'education-centers': 'Centros Educativos',
    interns: 'Becarios',
    'practice-tasks': 'Prácticas y tareas',
    users: 'Usuarios y roles',
};

const permissionActionLabels: Record<string, string> = {
    view: 'Ver',
    create: 'Crear',
    update: 'Editar',
    delete: 'Eliminar',
    manage: 'Gestionar',
};

const invitationStatusLabels: Record<InvitationStatus, string> = {
    pending: 'Pendiente',
    accepted: 'Aceptada',
    expired: 'Expirada',
};

const invitationStatusBadgeClasses: Record<InvitationStatus, string> = {
    pending:
        'bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/40',
    accepted:
        'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700/40',
    expired:
        'bg-red-100 text-red-700 ring-1 ring-red-300 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-700/40',
};

const getInvitationStatus = (invitation: InvitationRow): InvitationStatus => {
    if (invitation.accepted_at) return 'accepted';
    if (!invitation.expires_at) return 'pending';

    const expiresAt = new Date(invitation.expires_at);
    if (Number.isNaN(expiresAt.getTime())) return 'pending';

    return expiresAt.getTime() < Date.now() ? 'expired' : 'pending';
};

export default function UsersIndexPage({ users, roles, availableRoles, permissions, rolePermissions, invitations }: Props) {
    const PAGE_SIZE = 8;
    const page = usePage<{ flash?: { success?: string; error?: string; info?: string } }>();
    const [activeTab, setActiveTab] = useState<UserManagementTab>('users-roles');
    const [invitationEmail, setInvitationEmail] = useState('');
    const [invitationRole, setInvitationRole] = useState<string>(
        availableRoles.find((role) => role !== 'admin') ?? 'tutor',
    );
    const [deletingInvitationId, setDeletingInvitationId] = useState<number | null>(null);
    const [invitationFilter, setInvitationFilter] = useState<'all' | InvitationStatus>('all');
    const [usersPage, setUsersPage] = useState(1);
    const [invitationsPage, setInvitationsPage] = useState(1);
    const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0] ? String(roles[0].id) : '');
    const [permissionDraft, setPermissionDraft] = useState<string[] | null>(null);

    const selectedRole = useMemo(
        () => roles.find((role) => String(role.id) === selectedRoleId) ?? null,
        [roles, selectedRoleId],
    );

    const selectedRoleName = selectedRole?.name ?? '';
    const isAdminRoleSelected = selectedRoleName === 'admin';
    const rolePermissionsBase = useMemo(
        () => rolePermissions[selectedRoleName] ?? [],
        [selectedRoleName, rolePermissions],
    );
    const selectedPermissions = permissionDraft ?? rolePermissionsBase;

    const groupedPermissions = useMemo(() => {
        const groups: Record<string, string[]> = {};

        for (const permission of permissions) {
            const [module] = permission.split('.');
            const key = module ?? 'general';

            if (!groups[key]) {
                groups[key] = [];
            }

            groups[key].push(permission);
        }

        return Object.entries(groups)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([module, modulePermissions]) => ({
                module,
                label: permissionModuleLabels[module] ?? module,
                permissions: modulePermissions.sort((a, b) => a.localeCompare(b)),
            }));
    }, [permissions]);

    const invitationRoleOptions = useMemo(
        () => availableRoles.filter((role) => role !== 'admin'),
        [availableRoles],
    );
    const filteredInvitations = useMemo(() => {
        if (invitationFilter === 'all') {
            return invitations;
        }

        return invitations.filter((invitation) => getInvitationStatus(invitation) === invitationFilter);
    }, [invitations, invitationFilter]);
    const sortedFilteredInvitations = useMemo(() => {
        return [...filteredInvitations].sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;

            return dateB - dateA;
        });
    }, [filteredInvitations]);
    const invitationStatusCounts = useMemo(() => {
        const counts: Record<'all' | InvitationStatus, number> = {
            all: invitations.length,
            pending: 0,
            accepted: 0,
            expired: 0,
        };

        for (const invitation of invitations) {
            const status = getInvitationStatus(invitation);
            counts[status] += 1;
        }

        return counts;
    }, [invitations]);
    const totalUsersPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
    const safeUsersPage = Math.min(usersPage, totalUsersPages);
    const paginatedUsers = useMemo(() => {
        const start = (safeUsersPage - 1) * PAGE_SIZE;

        return users.slice(start, start + PAGE_SIZE);
    }, [users, safeUsersPage, PAGE_SIZE]);
    const totalInvitationsPages = Math.max(1, Math.ceil(sortedFilteredInvitations.length / PAGE_SIZE));
    const safeInvitationsPage = Math.min(invitationsPage, totalInvitationsPages);
    const paginatedInvitations = useMemo(() => {
        const start = (safeInvitationsPage - 1) * PAGE_SIZE;

        return sortedFilteredInvitations.slice(start, start + PAGE_SIZE);
    }, [sortedFilteredInvitations, safeInvitationsPage, PAGE_SIZE]);
    const usersFrom = users.length > 0 ? (safeUsersPage - 1) * PAGE_SIZE + 1 : 0;
    const usersTo = users.length > 0 ? Math.min(safeUsersPage * PAGE_SIZE, users.length) : 0;
    const invitationsFrom = sortedFilteredInvitations.length > 0 ? (safeInvitationsPage - 1) * PAGE_SIZE + 1 : 0;
    const invitationsTo = sortedFilteredInvitations.length > 0
        ? Math.min(safeInvitationsPage * PAGE_SIZE, sortedFilteredInvitations.length)
        : 0;

    const buildPageItems = (totalPages: number, currentPage: number): Array<number | 'ellipsis'> => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        const items: Array<number | 'ellipsis'> = [1];

        if (currentPage > 3) {
            items.push('ellipsis');
        }

        const start = Math.max(2, currentPage - 1);
        const end = Math.min(totalPages - 1, currentPage + 1);

        for (let page = start; page <= end; page += 1) {
            items.push(page);
        }

        if (currentPage < totalPages - 2) {
            items.push('ellipsis');
        }

        items.push(totalPages);

        return items;
    };

    useEffect(() => {
        const successMessage = page.props.flash?.success;
        const errorMessage = page.props.flash?.error;
        const infoMessage = page.props.flash?.info;

        if (successMessage) {
            toast.success(successMessage);
        }

        if (errorMessage) {
            toast.error(errorMessage);
        }

        if (infoMessage) {
            toast.info(infoMessage);
        }
    }, [page.props.flash?.success, page.props.flash?.error, page.props.flash?.info]);

    const handleRoleChange = (userId: number, role: string) => {
        router.patch(
            `/autenticacion-usuarios/${userId}/role`,
            { role },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const togglePermission = (permission: string, checked: boolean) => {
        setPermissionDraft((currentDraft) => {
            const current = currentDraft ?? rolePermissionsBase;

            if (checked) {
                if (current.includes(permission)) {
                    return current;
                }

                return [...current, permission];
            }

            return current.filter((item) => item !== permission);
        });
    };

    const handleSaveRolePermissions = () => {
        if (!selectedRole) {
            toast.error('Selecciona un rol para editar sus permisos.');
            return;
        }

        router.patch(
            `/autenticacion-usuarios/roles/${selectedRole.id}/permissions`,
            { permissions: selectedPermissions },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setPermissionDraft(null),
            },
        );
    };

    const handleCreateInvitation = () => {
        if (invitationEmail.trim() === '') {
            toast.error('Introduce un correo para invitar.');
            return;
        }

        router.post(
            '/autenticacion-usuarios/invitaciones',
            {
                email: invitationEmail.trim(),
                role: invitationRole,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setInvitationEmail(''),
            },
        );
    };

    const handleDeleteInvitation = (invitationId: number) => {
        setDeletingInvitationId(invitationId);

        router.delete(`/autenticacion-usuarios/invitaciones/${invitationId}`, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setDeletingInvitationId(null),
        });
    };

    const formatDateTime = (value: string | null): string => {
        if (!value) {
            return '-';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Autenticación y Usuarios" />

            <div className={UI_PRESETS.pageContent}>
                <div>
                    <h1 className="text-2xl font-bold">Autenticación y Usuarios</h1>
                    <p className="text-sm text-muted-foreground">
                        Gestiona los roles de acceso: admin, tutor y becario.
                    </p>
                </div>

                <div className={UI_PRESETS.pageSection}>
                    <section className={UI_PRESETS.sectionCard}>
                        <div className="-mx-4 -mt-4 border-b border-sidebar-border/70 px-4 pt-4 dark:border-sidebar-border">
                            <UserManagementTabs activeTab={activeTab} onTabChange={setActiveTab} />
                        </div>

                        <div className="pt-4">
                            {activeTab === 'users-roles' && (
                                <div className="space-y-4">
                                    <SectionIntro
                                        title="Usuarios y roles"
                                        description="Administra los roles de acceso de cada usuario del sistema."
                                    />
                                    <div className={UI_PRESETS.tableContainer}>
                                        <table className="w-full table-fixed text-sm">
                                        <colgroup>
                                            <col className="w-1/4" />
                                            <col className="w-1/4" />
                                            <col className="w-1/4" />
                                            <col className="w-1/4" />
                                        </colgroup>
                                        <thead className={UI_PRESETS.tableHead}>
                                            <tr>
                                                <th className="px-4 py-3 text-center font-semibold">Usuario</th>
                                                <th className="px-4 py-3 text-center font-semibold">Email</th>
                                                <th className="px-4 py-3 text-center font-semibold">Rol actual</th>
                                                <th className="px-4 py-3 text-center font-semibold">Cambiar rol</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.length > 0 ? (
                                                paginatedUsers.map((user, index) => {
                                                    const RoleIcon = roleBadgeIconByRole[user.role ?? ''] ?? ShieldCheck;

                                                    return (
                                                    <tr key={user.id} className={`h-20 border-t align-middle ${stripedRowClass(index)}`}>
                                                        <td className="px-4 py-3 text-center align-middle">
                                                            <div className="flex items-center justify-center gap-2 font-medium">
                                                                <UserCog className="size-4 text-muted-foreground" />
                                                                <span className="inline-block max-w-[14rem] truncate leading-tight" title={user.name}>
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
                                                                    disabled={user.role === 'admin'}
                                                                    onValueChange={(value) => handleRoleChange(user.id, value)}
                                                                >
                                                                    <SelectTrigger
                                                                        className={`${UI_PRESETS.selectTrigger} mx-auto w-[210px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
                                                                    >
                                                                        <SelectValue placeholder="Seleccionar rol" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {availableRoles
                                                                            .filter((role) => user.role === 'admin' || role !== 'admin')
                                                                            .map((role) => (
                                                                            <SelectItem className={UI_PRESETS.selectItem} key={role} value={role}>
                                                                                {roleLabels[role] ?? role.toUpperCase()}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                {user.role === 'admin' ? (
                                                                    <span className="text-[11px] text-muted-foreground">Rol protegido</span>
                                                                ) : null}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                                        No hay usuarios disponibles.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'invitaciones' && (
                                <div className="space-y-4">
                                    <SectionIntro
                                        title="Invitaciones"
                                        description="Invita nuevos usuarios por correo electrónico con un rol inicial."
                                    />

                                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                                        <Input
                                            value={invitationEmail}
                                            onChange={(event) => setInvitationEmail(event.target.value)}
                                            placeholder="correo@dominio.com"
                                            className={UI_PRESETS.simpleSearchInput}
                                        />
                                        <Select value={invitationRole} onValueChange={setInvitationRole}>
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
                                                onClick={handleCreateInvitation}
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
                                                        onClick={() => {
                                                            setInvitationFilter(option.value as 'all' | InvitationStatus);
                                                            setInvitationsPage(1);
                                                        }}
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
                                                {sortedFilteredInvitations.length > 0 ? (
                                                    paginatedInvitations.map((invitation, index) => {
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
                                                                    <td className="px-4 py-3 text-center align-middle text-muted-foreground">{formatDateTime(invitation.created_at)}</td>
                                                                    <td className="px-4 py-3 text-center align-middle text-muted-foreground">{formatDateTime(invitation.expires_at)}</td>
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
                                                                        onClick={() => handleDeleteInvitation(invitation.id)}
                                                                        disabled={deletingInvitationId === invitation.id || !canCancel}
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
                            )}
                            {activeTab === 'permisos' && (
                                <div className="space-y-4">
                                    <SectionIntro
                                        title="Permisos"
                                        description="Define los permisos por rol para cada módulo y funcionalidad."
                                    />
                                    <div className={UI_PRESETS.tableContainer}>
                                        <div className="space-y-4 px-4 py-4">
                                        <div className="grid gap-2 md:max-w-xs">
                                            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                Rol
                                            </span>
                                            <Select
                                                value={selectedRoleId}
                                                onValueChange={(value) => {
                                                    setSelectedRoleId(value);
                                                    setPermissionDraft(null);
                                                }}
                                            >
                                                <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full cursor-pointer`}>
                                                    <SelectValue placeholder="Seleccionar rol" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {roles.map((role) => (
                                                        <SelectItem className={UI_PRESETS.selectItem} key={role.id} value={String(role.id)}>
                                                            {roleLabels[role.name] ?? role.name.toUpperCase()}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid gap-3">
                                            {groupedPermissions.map((group) => (
                                                <div
                                                    key={group.module}
                                                    className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-700/80 dark:bg-slate-900/30"
                                                >
                                                    <p className="mb-3 text-sm font-semibold">{group.label}</p>
                                                    <div className="grid gap-2 md:grid-cols-2">
                                                        {group.permissions.map((permission) => {
                                                            const [, action = permission] = permission.split('.');
                                                            const actionLabel = permissionActionLabels[action] ?? action;

                                                            return (
                                                                <label
                                                                    key={permission}
                                                                    className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
                                                                >
                                                                    <Checkbox
                                                                        checked={selectedPermissions.includes(permission)}
                                                                        disabled={isAdminRoleSelected}
                                                                        onCheckedChange={(checked) => togglePermission(permission, checked === true)}
                                                                    />
                                                                    <span className="font-medium">{actionLabel}</span>
                                                                    <span className="text-xs text-muted-foreground">({permission})</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-end pt-1">
                                            <button
                                                type="button"
                                                className="inline-flex h-9 cursor-pointer items-center rounded-md bg-[#2563eb] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
                                                onClick={handleSaveRolePermissions}
                                                disabled={!selectedRole || isAdminRoleSelected}
                                            >
                                                Guardar permisos
                                            </button>
                                        </div>
                                        {isAdminRoleSelected ? (
                                            <p className="text-right text-xs text-muted-foreground">
                                                El rol admin está protegido y no se puede editar.
                                            </p>
                                        ) : null}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'seguridad' && (
                                <div className="space-y-4">
                                    <SectionIntro
                                        title="Seguridad"
                                        description="Configura políticas de seguridad, acceso y protección de cuentas."
                                    />
                                    <div className={UI_PRESETS.tableContainer}>
                                        <div className="px-4 py-8 text-sm text-muted-foreground">
                                            Próximamente: políticas de seguridad y control de acceso.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                    {activeTab === 'users-roles' && users.length > 0 ? (
                        <div className={UI_PRESETS.tablePagination}>
                            <p className="text-sm text-muted-foreground">
                                Mostrando {usersFrom} - {usersTo} de {users.length} usuarios
                            </p>

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={UI_PRESETS.paginationButton}
                                    onClick={() => setUsersPage((current) => Math.max(1, current - 1))}
                                    disabled={safeUsersPage === 1}
                                >
                                    Anterior
                                </Button>

                                {buildPageItems(totalUsersPages, safeUsersPage).map((item, index) => (
                                    item === 'ellipsis' ? (
                                        <span key={`users-ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                                            ...
                                        </span>
                                    ) : (
                                        <Button
                                            key={`users-page-${item}`}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className={`${UI_PRESETS.paginationButton} ${item === safeUsersPage ? UI_PRESETS.paginationButtonActive : ''}`}
                                            onClick={() => setUsersPage(item)}
                                        >
                                            {item}
                                        </Button>
                                    )
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={UI_PRESETS.paginationButton}
                                    onClick={() => setUsersPage((current) => Math.min(totalUsersPages, current + 1))}
                                    disabled={safeUsersPage === totalUsersPages}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    ) : null}
                    {activeTab === 'invitaciones' && sortedFilteredInvitations.length > 0 ? (
                        <div className={UI_PRESETS.tablePagination}>
                            <p className="text-sm text-muted-foreground">
                                Mostrando {invitationsFrom} - {invitationsTo} de {sortedFilteredInvitations.length} invitaciones
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={UI_PRESETS.paginationButton}
                                    onClick={() => setInvitationsPage((current) => Math.max(1, current - 1))}
                                    disabled={safeInvitationsPage === 1}
                                >
                                    Anterior
                                </Button>

                                {buildPageItems(totalInvitationsPages, safeInvitationsPage).map((item, index) => (
                                    item === 'ellipsis' ? (
                                        <span key={`inv-ellipsis-${index}`} className="px-1 text-sm text-muted-foreground">
                                            ...
                                        </span>
                                    ) : (
                                        <Button
                                            key={`inv-page-${item}`}
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className={`${UI_PRESETS.paginationButton} ${item === safeInvitationsPage ? UI_PRESETS.paginationButtonActive : ''}`}
                                            onClick={() => setInvitationsPage(item)}
                                        >
                                            {item}
                                        </Button>
                                    )
                                ))}

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className={UI_PRESETS.paginationButton}
                                    onClick={() => setInvitationsPage((current) => Math.min(totalInvitationsPages, current + 1))}
                                    disabled={safeInvitationsPage === totalInvitationsPages}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </AppLayout>
    );
}
