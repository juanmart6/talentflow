import { Link, router } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem
                    asChild
                    className="rounded-md text-slate-700 data-[highlighted]:bg-[#2563eb]/8 data-[highlighted]:text-[#1d4ed8] dark:text-slate-200 dark:data-[highlighted]:bg-[#2563eb]/14 dark:data-[highlighted]:text-sky-100"
                >
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2" />
                        Configuración
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
                asChild
                className="rounded-md text-red-700 data-[highlighted]:bg-red-500/22 data-[highlighted]:text-red-900 dark:text-red-300 dark:data-[highlighted]:bg-red-500/35 dark:data-[highlighted]:text-red-50"
                >
                    <Link
                        className="block w-full cursor-pointer"
                        href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                    >
                    <LogOut className="mr-2 text-current" />
                    Cerrar sesión
                </Link>
            </DropdownMenuItem>
        </>
    );
}
