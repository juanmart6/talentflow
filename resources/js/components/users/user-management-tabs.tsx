import { KeyRound, ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UI_PRESETS } from '@/lib/ui-presets';

export type UserManagementTab = 'users-roles' | 'invitaciones' | 'permisos' | 'seguridad';

type UserManagementTabsProps = {
    activeTab: UserManagementTab;
    onTabChange: (tab: UserManagementTab) => void;
};

export default function UserManagementTabs({ activeTab, onTabChange }: UserManagementTabsProps) {
    return (
        <div className="flex flex-wrap items-end gap-1.5">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`cursor-pointer ${UI_PRESETS.tabBase} ${activeTab === 'users-roles' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                onClick={() => onTabChange('users-roles')}
            >
                <UserCog className="mr-1.5 size-4 shrink-0" />
                Usuarios y roles
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`cursor-pointer ${UI_PRESETS.tabBase} ${activeTab === 'invitaciones' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                onClick={() => onTabChange('invitaciones')}
            >
                <UserPlus className="mr-1.5 size-4 shrink-0" />
                Invitaciones
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`cursor-pointer ${UI_PRESETS.tabBase} ${activeTab === 'permisos' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                onClick={() => onTabChange('permisos')}
            >
                <ShieldCheck className="mr-1.5 size-4 shrink-0" />
                Permisos
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`cursor-pointer ${UI_PRESETS.tabBase} ${activeTab === 'seguridad' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                onClick={() => onTabChange('seguridad')}
            >
                <KeyRound className="mr-1.5 size-4 shrink-0" />
                Seguridad
            </Button>
        </div>
    );
}
