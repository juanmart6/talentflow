import { Head, router, usePage } from '@inertiajs/react';
import { ShieldCheck, UserCog } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import UserManagementTabs, { type UserManagementTab } from '@/components/users/user-management-tabs';
import AppLayout from '@/layouts/app-layout';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import type { BreadcrumbItem } from '@/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    roles: string[];
    created_at: string | null;
};

type Props = {
    users: UserRow[];
    availableRoles: string[];
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

export default function UsersIndexPage({ users, availableRoles }: Props) {
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const lastFlashRef = useRef<string | null>(null);
    const [activeTab, setActiveTab] = useState<UserManagementTab>('users-roles');

    useEffect(() => {
        const successMessage = page.props.flash?.success;
        const errorMessage = page.props.flash?.error;
        const flashKey = successMessage ? `success:${successMessage}` : errorMessage ? `error:${errorMessage}` : null;

        if (!flashKey || lastFlashRef.current === flashKey) {
            return;
        }

        lastFlashRef.current = flashKey;

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
                                                            <Select
                                                                value={user.role ?? ''}
                                                                onValueChange={(value) => handleRoleChange(user.id, value)}
                                                            >
                                                                <SelectTrigger className={`${UI_PRESETS.selectTrigger} mx-auto w-[210px]`}>
                                                                    <SelectValue placeholder="Seleccionar rol" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {availableRoles.map((role) => (
                                                                        <SelectItem className={UI_PRESETS.selectItem} key={role} value={role}>
                                                                            {roleLabels[role] ?? role.toUpperCase()}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
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
                                    <div className="px-4 py-8 text-sm text-muted-foreground">
                                        Proximamente: alta de usuarios por invitacion mediante correo electronico.
                                    </div>
                                </div>
                            )}

                            {activeTab === 'permisos' && (
                                <div className={UI_PRESETS.tableContainer}>
                                    <div className="px-4 py-8 text-sm text-muted-foreground">
                                        Proximamente: matriz de permisos granulares por funcionalidad.
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
