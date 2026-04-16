import { Link, usePage } from '@inertiajs/react';
import { Award, Clock9, GraduationCap, KeyRound, LayoutGrid, NotebookPen, School } from 'lucide-react';
import logo from '@/assets/TF_logo.svg';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import educationCenters from '@/routes/education-centers';
import interns from '@/routes/interns';
import practiceTasks from '@/routes/practice-tasks';
import users from '@/routes/users';
import type { Auth, NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
        icon: LayoutGrid,
    },
    {
        title: 'Centros Educativos',
        href: educationCenters.index().url,
        icon: School,
    },
    {
        title: 'Gestión de Becarios',
        href: interns.index().url,
        icon: GraduationCap,
    },
    {
        title: 'Prácticas y Tareas',
        href: practiceTasks.index().url,
        icon: NotebookPen,
    },
    {
        title: 'Control Horario',
        href: '/control-horario',
        icon: Clock9,
    },
    {
        title: 'Evaluación y Notas',
        href: '/evaluacion-notas',
        icon: Award,
    },
];

export function AppSidebar() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const isIntern = auth.user?.role === 'intern';
    const canManageUsers = auth.user?.can_manage_users === true;
    const isAdmin = auth.user?.role === 'admin';

    const visibleNavItems = isIntern
        ? mainNavItems.filter((item) =>
              ['Prácticas y Tareas', 'Control Horario', 'Evaluación y Notas'].includes(item.title),
          )
        : mainNavItems;

    return (
        <Sidebar collapsible="icon" variant="inset" className="group-data-[variant=inset]:p-3">
            <SidebarHeader className="pb-1">
                <div className="relative overflow-hidden rounded-xl border border-sidebar-border/70 bg-white/80 px-3 py-3 shadow-sm backdrop-blur dark:bg-slate-900/40">
                    <div className="pointer-events-none absolute -top-8 right-0 h-16 w-16 rounded-full bg-sidebar-primary/20 blur-xl" />
                    <div className="flex items-center justify-center">
                        <img
                            src={logo}
                            alt="TalentFlow Logo"
                            className="relative h-16 w-auto transition-all duration-200 group-data-[collapsible=icon]:h-8"
                        />
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent className="pt-1">
                <NavMain items={visibleNavItems} />
            </SidebarContent>

            <SidebarFooter className="mt-auto gap-1.5 border-t border-sidebar-border/70 bg-sidebar/55 pt-2 pb-2 backdrop-blur group-data-[collapsible=icon]:border-t-0 group-data-[collapsible=icon]:bg-transparent">
                <div className="flex items-center gap-1.5 px-1.5">
                    <NavUser className="min-w-0 flex-1" />

                    {!isIntern && (canManageUsers || isAdmin) ? (
                        <SidebarMenu className="w-auto shrink-0 gap-0 group-data-[collapsible=icon]:hidden">
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    asChild
                                    size="lg"
                                    isActive={isCurrentOrParentUrl(users.index().url)}
                                    tooltip={{ children: 'Accesos y Permisos' }}
                                    className={cn(
                                        '!h-11 !w-11 justify-center !rounded-xl border border-sidebar-border/70 bg-sidebar/70 !p-0 text-[#0f766e] shadow-sm transition-all duration-200 hover:border-[#0f766e]/45 hover:bg-[#0f766e]/10 hover:text-[#0f766e] focus-visible:ring-2 focus-visible:ring-[#0f766e]/35 focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar dark:text-emerald-300 dark:hover:border-emerald-400/45 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-200 dark:focus-visible:ring-emerald-400/45 dark:focus-visible:ring-offset-sidebar data-[active=true]:border-[#0f766e]/50 data-[active=true]:bg-[#0f766e]/14 data-[active=true]:text-[#0f766e] dark:data-[active=true]:border-emerald-400/55 dark:data-[active=true]:bg-emerald-500/20 dark:data-[active=true]:text-emerald-100',
                                    )}
                                >
                                    <Link href={users.index().url} prefetch className="flex h-full w-full items-center justify-center">
                                        <KeyRound className="size-4" />
                                        <span className="sr-only">Accesos y Permisos</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    ) : null}
                </div>
            </SidebarFooter>
        </Sidebar>
    );
}
