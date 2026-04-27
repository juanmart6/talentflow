import { SectionIntro } from '@/components/form-ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { permissionActionLabels, roleLabels } from '@/lib/access-permissions/access-permissions';
import { UI_PRESETS } from '@/lib/ui-presets';

type PermissionGroup = {
    module: string;
    label: string;
    permissions: string[];
};

type RoleOption = {
    id: number;
    name: string;
};

type PermissionsSectionProps = {
    roles: RoleOption[];
    selectedRoleId: string;
    groupedPermissions: PermissionGroup[];
    selectedPermissions: string[];
    isAdminRoleSelected: boolean;
    onRoleChange: (value: string) => void;
    onTogglePermission: (permission: string, checked: boolean) => void;
    onSave: () => void;
    saveDisabled: boolean;
};

export default function PermissionsSection({
    roles,
    selectedRoleId,
    groupedPermissions,
    selectedPermissions,
    isAdminRoleSelected,
    onRoleChange,
    onTogglePermission,
    onSave,
    saveDisabled,
}: PermissionsSectionProps) {
    return (
        <div className="space-y-4">
            <SectionIntro
                title="Permisos"
                description="Define los permisos del staff por rol y por funcionalidad."
            />

            <div className={UI_PRESETS.tableContainer}>
                <div className="space-y-4 px-4 py-4">
                    <div className="grid gap-2 md:max-w-xs">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rol</span>
                        <Select value={selectedRoleId} onValueChange={onRoleChange}>
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
                                                    onCheckedChange={(checked) => onTogglePermission(permission, checked === true)}
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
                            className={`inline-flex h-9 cursor-pointer items-center rounded-md px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${UI_PRESETS.saveButton}`}
                            onClick={onSave}
                            disabled={saveDisabled}
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
    );
}
