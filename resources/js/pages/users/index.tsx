import { Head, router, usePage } from '@inertiajs/react';
import { MailPlus, ShieldCheck, Trash2, UserCog } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
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
import type {UserManagementTab} from '@/components/users/user-management-tabs';
import AppLayout from '@/layouts/app-layout';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
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
        title: 'Autenticacion y Usuarios',
        href: '/autenticacion-usuarios',
    },
];

const roleLabels: Record<string, string> = {
    admin: 'ADMIN',
    tutor: 'TUTOR',
    intern: 'BECARIO',
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

export default function UsersIndexPage({ users, roles, availableRoles, permissions, rolePermissions, invitations }: Props) {
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const [activeTab, setActiveTab] = useState<UserManagementTab>('users-roles');
    const [invitationEmail, setInvitationEmail] = useState('');
    const [invitationRole, setInvitationRole] = useState<string>(
        availableRoles.find((role) => role !== 'admin') ?? 'tutor',
    );
    const [deletingInvitationId, setDeletingInvitationId] = useState<number | null>(null);
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

    useEffect(() => {
        const successMessage = page.props.flash?.success;
        const errorMessage = page.props.flash?.error;

        if (successMessage) {
            toast.success(successMessage);
        }

        if (errorMessage) {
            toast.error(errorMessage);
        }
    }, [page.props.flash?.success, page.props.flash?.error]);

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
            <Head title="Autenticacion y Usuarios" />

            <div className={UI_PRESETS.pageContent}>
                <div>
                    <h1 className="text-2xl font-bold">Autenticacion y Usuarios</h1>
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
                                                users.map((user, index) => (
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
                                                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900">
                                                                <ShieldCheck className="size-3.5 text-primary" />
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
                                                                        className={`${UI_PRESETS.selectTrigger} mx-auto w-[210px] disabled:cursor-not-allowed disabled:opacity-60`}
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
                                                ))
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
                            )}

                            {activeTab === 'invitaciones' && (
                                <div className={UI_PRESETS.tableContainer}>
                                    <div className="space-y-4 px-4 py-4">
                                        <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-700/80 dark:bg-slate-900/30">
                                            <p className="mb-3 text-sm font-semibold">Crear invitación</p>
                                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                                                <Input
                                                    value={invitationEmail}
                                                    onChange={(event) => setInvitationEmail(event.target.value)}
                                                    placeholder="correo@dominio.com"
                                                    className={UI_PRESETS.simpleSearchInput}
                                                />
                                                <Select value={invitationRole} onValueChange={setInvitationRole}>
                                                    <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
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
                                                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-[#2563eb] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1d4ed8]"
                                                    onClick={handleCreateInvitation}
                                                >
                                                    <MailPlus className="size-4" />
                                                    Invitar
                                                </button>
                                            </div>
                                        </div>

                                        <div className={UI_PRESETS.tableContainer}>
                                            <table className="w-full table-fixed text-sm">
                                                <colgroup>
                                                    <col className="w-1/4" />
                                                    <col className="w-1/6" />
                                                    <col className="w-1/6" />
                                                    <col className="w-1/6" />
                                                    <col className="w-1/6" />
                                                    <col className="w-1/12" />
                                                </colgroup>
                                                <thead className={UI_PRESETS.tableHead}>
                                                    <tr>
                                                        <th className="px-4 py-3 text-center font-semibold">Email</th>
                                                        <th className="px-4 py-3 text-center font-semibold">Rol</th>
                                                        <th className="px-4 py-3 text-center font-semibold">Invitado por</th>
                                                        <th className="px-4 py-3 text-center font-semibold">Creada</th>
                                                        <th className="px-4 py-3 text-center font-semibold">Expira</th>
                                                        <th className="px-4 py-3 text-center font-semibold">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {invitations.length > 0 ? (
                                                        invitations.map((invitation, index) => (
                                                            <tr key={invitation.id} className={`h-16 border-t align-middle ${stripedRowClass(index)}`}>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className="inline-block max-w-[16rem] truncate" title={invitation.email}>
                                                                        {invitation.email}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900">
                                                                        {roleLabels[invitation.role] ?? invitation.role.toUpperCase()}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 text-center">{invitation.invited_by_name}</td>
                                                                <td className="px-4 py-3 text-center text-xs text-muted-foreground">{formatDateTime(invitation.created_at)}</td>
                                                                <td className="px-4 py-3 text-center text-xs text-muted-foreground">{formatDateTime(invitation.expires_at)}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button
                                                                        type="button"
                                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-300/50 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-950/30"
                                                                        onClick={() => handleDeleteInvitation(invitation.id)}
                                                                        disabled={deletingInvitationId === invitation.id}
                                                                        title="Cancelar invitación"
                                                                        aria-label="Cancelar invitación"
                                                                    >
                                                                        <Trash2 className="size-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                                                No hay invitaciones pendientes.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'permisos' && (
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
                                                <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
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
                                                className="inline-flex h-9 items-center rounded-md bg-[#2563eb] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
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
                            )}

                            {activeTab === 'seguridad' && (
                                <div className={UI_PRESETS.tableContainer}>
                                    <div className="px-4 py-8 text-sm text-muted-foreground">
                                        Proximamente: politicas de seguridad y control de acceso.
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
