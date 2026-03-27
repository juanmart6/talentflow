import { usePage } from '@inertiajs/react';
import { ChevronsUpDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';

export function NavUser() {
    const { auth } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="group h-11 rounded-xl border border-sidebar-border/70 bg-sidebar/70 text-sidebar-foreground shadow-sm transition-all duration-200 hover:border-[#2563eb]/25 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] hover:shadow-sm dark:hover:border-[#2563eb]/35 dark:hover:bg-[#2563eb]/14 dark:hover:text-sky-100 data-[state=open]:border-[#2563eb]/25 data-[state=open]:bg-[#2563eb]/10 data-[state=open]:text-[#1e40af] dark:data-[state=open]:border-[#2563eb]/35 dark:data-[state=open]:bg-[#2563eb]/18 dark:data-[state=open]:text-sky-100"
                            data-test="sidebar-menu-button"
                        >
                            <UserInfo user={auth.user} />
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl border border-[#2563eb]/20 bg-white/95 p-1 shadow-md dark:border-[#2563eb]/30 dark:bg-slate-950/95"
                        align="end"
                        side={
                            isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'left'
                                  : 'bottom'
                        }
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
