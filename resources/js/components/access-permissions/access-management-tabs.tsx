import { ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UI_PRESETS } from '@/lib/ui-presets';

export type AccessManagementTab = 'users-roles' | 'invitaciones' | 'permisos';

type AccessManagementTabsProps = {
    activeTab: AccessManagementTab;
    onTabChange: (tab: AccessManagementTab) => void;
};

export default function AccessManagementTabs({ activeTab, onTabChange }: AccessManagementTabsProps) {
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
                Staff
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
        </div>
    );
}
