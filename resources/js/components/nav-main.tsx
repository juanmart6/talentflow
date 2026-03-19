import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';

import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-2 py-1">
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold tracking-[0.14em] uppercase text-sidebar-foreground/55">
                Navegacion
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1.5">
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isCurrentOrParentUrl(item.href)}
                            tooltip={{ children: item.title }}
                            className="h-10 rounded-xl border border-transparent px-3 font-medium text-slate-700 transition-all duration-200 hover:translate-x-0.5 hover:border-[#2563eb]/20 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] hover:shadow-sm dark:text-slate-300 dark:hover:border-[#2563eb]/30 dark:hover:bg-[#2563eb]/14 dark:hover:text-sky-100 data-[active=true]:border-[#2563eb]/25 data-[active=true]:bg-[#2563eb]/12 data-[active=true]:text-[#1e40af] data-[active=true]:shadow-sm dark:data-[active=true]:border-[#2563eb]/35 dark:data-[active=true]:bg-[#2563eb]/20 dark:data-[active=true]:text-sky-100 [&_svg]:text-[#2563eb] dark:[&_svg]:text-sky-300"
                        >
                            <Link href={item.href} prefetch className="flex w-full items-center gap-2.5">
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
