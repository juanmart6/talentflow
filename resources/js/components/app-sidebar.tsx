import { Award, Clock9, GraduationCap, LayoutGrid, NotebookPen, School, Users } from 'lucide-react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from '@/components/ui/sidebar';
import logo from '@/assets/TF_logo.svg';
import { dashboard } from '@/routes';
import educationCenters from '@/routes/education-centers';
import interns from '@/routes/interns';
import practiceTasks from '@/routes/practice-tasks';
import type { NavItem } from '@/types';

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
    {
        title: 'Autenticación y Usuarios',
        href: '/autenticacion-usuarios',
        icon: Users,
    },
];

export function AppSidebar() {
    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="group-data-[variant=inset]:p-3"
        >
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
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
