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
    const { isCurrentUrl } = useCurrentUrl();

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
                            isActive={isCurrentUrl(item.href)}
                            tooltip={{ children: item.title }}
                            className="h-10 rounded-xl border border-transparent px-3 font-medium transition-all duration-200 hover:translate-x-0.5 hover:border-sidebar-border/80 hover:bg-sidebar-accent/90 hover:shadow-sm data-[active=true]:border-sidebar-primary/35 data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-lg"
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
