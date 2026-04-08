import { KeyRound, ShieldCheck, UserCog, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type UserManagementTab = 'users-roles' | 'invitaciones' | 'permisos' | 'seguridad';

type UserManagementTabsProps = {
    activeTab: UserManagementTab;
    onTabChange: (tab: UserManagementTab) => void;
};

const baseTabClass =
    'h-9 min-w-[130px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer';

const activeTabClass =
    'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950';

const inactiveTabClass =
    'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300';

export default function UserManagementTabs({ activeTab, onTabChange }: UserManagementTabsProps) {
    return (
        <div className="flex flex-wrap items-end gap-1.5">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${baseTabClass} ${activeTab === 'users-roles' ? activeTabClass : inactiveTabClass}`}
                onClick={() => onTabChange('users-roles')}
            >
                <UserCog className="mr-1.5 size-4 shrink-0" />
                Usuarios y roles
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${baseTabClass} ${activeTab === 'invitaciones' ? activeTabClass : inactiveTabClass}`}
                onClick={() => onTabChange('invitaciones')}
            >
                <UserPlus className="mr-1.5 size-4 shrink-0" />
                Invitaciones
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${baseTabClass} ${activeTab === 'permisos' ? activeTabClass : inactiveTabClass}`}
                onClick={() => onTabChange('permisos')}
            >
                <ShieldCheck className="mr-1.5 size-4 shrink-0" />
                Permisos
            </Button>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                className={`${baseTabClass} ${activeTab === 'seguridad' ? activeTabClass : inactiveTabClass}`}
                onClick={() => onTabChange('seguridad')}
            >
                <KeyRound className="mr-1.5 size-4 shrink-0" />
                Seguridad
            </Button>
        </div>
    );
}