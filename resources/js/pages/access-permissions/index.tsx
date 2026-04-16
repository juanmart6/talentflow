import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AccessManagementTabs from '@/components/access-permissions/access-management-tabs';
import type { AccessManagementTab } from '@/components/access-permissions/access-management-tabs';
import InvitationsSection from '@/components/access-permissions/invitations-section';
import PermissionsSection from '@/components/access-permissions/permissions-section';
import StaffRolesSection from '@/components/access-permissions/staff-roles-section';
import ConfirmDeleteDialog from '@/components/shared/confirm-delete-dialog';
import TablePagination from '@/components/shared/table-pagination';
import AppLayout from '@/layouts/app-layout';
import { permissionModuleLabels } from '@/lib/access-permissions/access-permissions';
import { UI_PRESETS } from '@/lib/ui-presets';
import usersRoutes from '@/routes/users';
import type { BreadcrumbItem } from '@/types';
import type { InvitationRow, UserRow, UsersPageProps } from '@/types/domains/access-permissions';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Accesos y Permisos',
        href: usersRoutes.index().url,
    },
];

export default function UsersIndexPage({
    users,
    roles,
    availableRoles,
    permissions,
    rolePermissions,
    invitations,
    invitationFilter,
    invitationStatusCounts,
}: UsersPageProps) {
    const page = usePage<{
        flash?: { success?: string; error?: string; info?: string };
        auth: { user: { id: number } | null };
    }>();
    const [activeTab, setActiveTab] = useState<AccessManagementTab>('users-roles');
    const [invitationEmail, setInvitationEmail] = useState('');
    const [invitationRole, setInvitationRole] = useState<string>(
        availableRoles.find((role) => role === 'tutor') ?? availableRoles[0] ?? '',
    );
    const [invitationToDelete, setInvitationToDelete] = useState<InvitationRow | null>(null);
    const [isDeletingInvitation, setIsDeletingInvitation] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserRow | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0] ? String(roles[0].id) : '');
    const [permissionDraft, setPermissionDraft] = useState<string[] | null>(null);
    const handlePermissionRoleChange = (value: string) => {
        setSelectedRoleId(value);
        setPermissionDraft(null);
    };

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

            if (key === 'interns') {
                continue;
            }

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

    const invitationRoleOptions = useMemo(() => availableRoles, [availableRoles]);
    const usersSummary = useMemo(() => {
        if (users.from === null || users.to === null || users.total === 0) {
            return 'Sin resultados';
        }

        return `Mostrando ${users.from} - ${users.to} de ${users.total} usuarios`;
    }, [users.from, users.to, users.total]);
    const invitationsSummary = useMemo(() => {
        if (invitations.from === null || invitations.to === null || invitations.total === 0) {
            return 'Sin resultados';
        }

        return `Mostrando ${invitations.from} - ${invitations.to} de ${invitations.total} invitaciones`;
    }, [invitations.from, invitations.to, invitations.total]);
    const flash = page.props.flash;

    useEffect(() => {
        const successMessage = flash?.success;
        const errorMessage = flash?.error;
        const infoMessage = flash?.info;

        if (successMessage) {
            toast.success(successMessage);
        }

        if (errorMessage) {
            toast.error(errorMessage);
        }

        if (infoMessage) {
            toast.info(infoMessage);
        }
    }, [flash]);

    const handleRoleChange = (userId: number, role: string) => {
        router.patch(
            usersRoutes.updateRole.url({ user: userId }),
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
            usersRoutes.updateRolePermissions.url({ role: selectedRole.id }),
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
            usersRoutes.invitations.store.url(),
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

    const handleDeleteInvitation = (invitation: InvitationRow) => {
        setInvitationToDelete(invitation);
    };

    const confirmDeleteInvitation = () => {
        if (!invitationToDelete) {
            return;
        }

        setIsDeletingInvitation(true);

        router.delete(usersRoutes.invitations.destroy.url({ invitation: invitationToDelete.id }), {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setIsDeletingInvitation(false);
                setInvitationToDelete(null);
            },
        });
    };

    const handleDeleteUser = (user: UserRow) => {
        setUserToDelete(user);
    };

    const confirmDeleteUser = () => {
        if (!userToDelete) {
            return;
        }

        setIsDeletingUser(true);

        router.delete(usersRoutes.destroy.url({ user: userToDelete.id }), {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setIsDeletingUser(false);
                setUserToDelete(null);
            },
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
            <Head title="Accesos y Permisos" />

            <div className={UI_PRESETS.pageContent}>
                <div>
                    <h1 className="text-2xl font-bold">Accesos y Permisos</h1>
                    <p className="text-sm text-muted-foreground">
                        Gestiona usuarios internos, invitaciones y permisos del staff.
                    </p>
                </div>

                <div className={UI_PRESETS.pageSection}>
                    <section className={UI_PRESETS.sectionCard}>
                        <div className={UI_PRESETS.tabsHeaderEmphasis}>
                            <AccessManagementTabs activeTab={activeTab} onTabChange={setActiveTab} />
                        </div>

                        <div className="pt-4">
                            {activeTab === 'users-roles' && (
                                <StaffRolesSection
                                    users={users.data}
                                    availableRoles={availableRoles}
                                    authUserId={page.props.auth.user?.id ?? null}
                                    onRoleChange={handleRoleChange}
                                    onDeleteUser={handleDeleteUser}
                                />
                            )}

                            {activeTab === 'invitaciones' && (
                                <InvitationsSection
                                    invitationEmail={invitationEmail}
                                    invitationRole={invitationRole}
                                    invitationRoleOptions={invitationRoleOptions}
                                    invitationFilter={invitationFilter}
                                    invitationStatusCounts={invitationStatusCounts}
                                    invitations={invitations.data}
                                    onInvitationEmailChange={setInvitationEmail}
                                    onInvitationRoleChange={setInvitationRole}
                                    onCreateInvitation={handleCreateInvitation}
                                    onFilterChange={(value) =>
                                        router.get(
                                            usersRoutes.index().url,
                                            { invitation_filter: value },
                                            { preserveScroll: true, preserveState: true, replace: true },
                                        )
                                    }
                                    onDeleteInvitation={handleDeleteInvitation}
                                    formatDateTime={formatDateTime}
                                />
                            )}

                            {activeTab === 'permisos' && (
                                <PermissionsSection
                                    roles={roles}
                                    selectedRoleId={selectedRoleId}
                                    groupedPermissions={groupedPermissions}
                                    selectedPermissions={selectedPermissions}
                                    isAdminRoleSelected={isAdminRoleSelected}
                                    onRoleChange={handlePermissionRoleChange}
                                    onTogglePermission={togglePermission}
                                    onSave={handleSaveRolePermissions}
                                    saveDisabled={!selectedRole || isAdminRoleSelected}
                                />
                            )}
                        </div>
                    </section>
                    {activeTab === 'users-roles' && users.total > 0 ? (
                        <TablePagination
                            summary={usersSummary}
                            links={users.links}
                            preserveState
                            preserveScroll
                        />
                    ) : null}
                    {activeTab === 'invitaciones' && invitations.total > 0 ? (
                        <TablePagination
                            summary={invitationsSummary}
                            links={invitations.links}
                            preserveState
                            preserveScroll
                        />
                    ) : null}
                </div>
            </div>
            <ConfirmDeleteDialog
                open={userToDelete !== null}
                title="Confirmar eliminación"
                description="Esta acción eliminará el usuario seleccionado."
                entityLabel="Usuario"
                entityName={userToDelete?.name}
                isLoading={isDeletingUser}
                onCancel={() => setUserToDelete(null)}
                onConfirm={confirmDeleteUser}
            />
            <ConfirmDeleteDialog
                open={invitationToDelete !== null}
                title="Confirmar cancelación"
                description="Esta acción cancelará la invitación seleccionada."
                entityLabel="Invitación"
                entityName={invitationToDelete?.email}
                isLoading={isDeletingInvitation}
                onCancel={() => setInvitationToDelete(null)}
                onConfirm={confirmDeleteInvitation}
            />
        </AppLayout>
    );
}
