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
import { cn } from '@/lib/utils';

export function NavUser({ className }: { className?: string }) {
    const { auth } = usePage().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    return (
        <SidebarMenu className={cn(className)}>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="group h-11 cursor-pointer rounded-xl border border-sidebar-border/70 bg-sidebar/70 text-sidebar-foreground shadow-sm transition-all duration-200 hover:border-[#2563eb]/25 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] hover:shadow-sm focus-visible:ring-2 focus-visible:ring-[#2563eb]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar dark:hover:border-[#2563eb]/35 dark:hover:bg-[#2563eb]/14 dark:hover:text-sky-100 dark:focus-visible:ring-[#2563eb]/45 dark:focus-visible:ring-offset-sidebar data-[state=open]:border-[#2563eb]/25 data-[state=open]:bg-[#2563eb]/10 data-[state=open]:text-[#1e40af] dark:data-[state=open]:border-[#2563eb]/35 dark:data-[state=open]:bg-[#2563eb]/18 dark:data-[state=open]:text-sky-100"
                            data-test="sidebar-menu-button"
                        >
                            <UserInfo user={auth.user} />
                            <ChevronsUpDown className="ml-auto my-auto size-4 shrink-0 text-slate-500 transition-colors group-hover:text-current dark:text-slate-400" />
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
