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
import type { Auth, NavItem } from '@/types';

const STAFF_ACCESS_HREF = '/autenticacion-usuarios';

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
            <SidebarHeader>
                <div className="relative overflow-hidden rounded-2xl border border-sidebar-border/70 bg-sidebar/90 px-3 py-4 shadow-sm backdrop-blur">
                    <div className="pointer-events-none absolute -top-10 right-0 h-24 w-24 rounded-full bg-sidebar-primary/20 blur-2xl" />
                    <div className="flex items-center justify-center">
                        <img
                            src={logo}
                            alt="TalentFlow Logo"
                            className="relative h-28 w-auto transition-all duration-200 group-data-[collapsible=icon]:h-10"
                        />
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={visibleNavItems} />
            </SidebarContent>

            <SidebarFooter>
                {!isIntern && (canManageUsers || isAdmin) ? (
                    <SidebarMenu className="mb-2 gap-1.5 border-b border-sidebar-border/70 px-2 pb-2 dark:border-sidebar-border">
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                asChild
                                isActive={isCurrentOrParentUrl(STAFF_ACCESS_HREF)}
                                tooltip={{ children: 'Accesos y Permisos' }}
                                className={cn(
                                    'h-10 rounded-xl border border-[#0f766e]/20 bg-gradient-to-r from-[#0f766e]/10 to-[#2563eb]/10 px-3 font-semibold text-slate-700 transition-all duration-200 hover:translate-x-0.5 hover:border-[#0f766e]/35 hover:from-[#0f766e]/14 hover:to-[#2563eb]/14 hover:text-[#0f3d68] hover:shadow-sm dark:border-[#14b8a6]/25 dark:from-[#0f766e]/20 dark:to-[#1e3a8a]/20 dark:text-slate-200 dark:hover:border-[#14b8a6]/40 dark:hover:from-[#0f766e]/30 dark:hover:to-[#1e40af]/30 dark:hover:text-sky-100 data-[active=true]:border-[#0f766e]/40 data-[active=true]:from-[#0f766e]/18 data-[active=true]:to-[#2563eb]/18 data-[active=true]:text-[#0f3d68] data-[active=true]:shadow-sm dark:data-[active=true]:border-[#14b8a6]/50 dark:data-[active=true]:from-[#0f766e]/35 dark:data-[active=true]:to-[#1e40af]/35 dark:data-[active=true]:text-sky-100 [&_svg]:text-[#0f766e] dark:[&_svg]:text-[#2dd4bf]',
                                )}
                            >
                                <Link href={STAFF_ACCESS_HREF} prefetch className="flex w-full items-center gap-2.5">
                                    <KeyRound />
                                    <span>Accesos y Permisos</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                ) : null}

                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
