import { Head, router } from '@inertiajs/react';
import { ShieldCheck, UserCog } from 'lucide-react';
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
                    <div className={UI_PRESETS.tableContainer}>
                        <table className="w-full min-w-[860px] text-sm">
                            <thead className={UI_PRESETS.tableHead}>
                                <tr>
                                    <th className={UI_PRESETS.tableCell}>Usuario</th>
                                    <th className={UI_PRESETS.tableCell}>Email</th>
                                    <th className={UI_PRESETS.tableCell}>Rol actual</th>
                                    <th className={UI_PRESETS.tableCell}>Cambiar rol</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length > 0 ? (
                                    users.map((user, index) => (
                                        <tr key={user.id} className={`border-t align-middle ${stripedRowClass(index)}`}>
                                            <td className={UI_PRESETS.tableCell}>
                                                <div className="flex items-center gap-2 font-medium">
                                                    <UserCog className="size-4 text-muted-foreground" />
                                                    <span>{user.name}</span>
                                                </div>
                                            </td>
                                            <td className={UI_PRESETS.tableCell}>{user.email}</td>
                                            <td className={UI_PRESETS.tableCell}>
                                                <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900">
                                                    <ShieldCheck className="size-3.5 text-primary" />
                                                    {roleLabels[user.role ?? ''] ?? 'SIN ROL'}
                                                </span>
                                            </td>
                                            <td className={UI_PRESETS.tableCell}>
                                                <Select
                                                    value={user.role ?? ''}
                                                    onValueChange={(value) => handleRoleChange(user.id, value)}
                                                >
                                                    <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-[210px]`}>
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
                </div>
            </div>
        </AppLayout>
    );
}

