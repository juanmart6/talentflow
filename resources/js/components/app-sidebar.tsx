import { Link } from '@inertiajs/react';
import { Award, Clock9, GraduationCap, LayoutGrid, NotebookPen, School, Users } from 'lucide-react';
import AppLogo from '@/components/app-logo';
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
import { dashboard, centros } from '@/routes';
import type { NavItem } from '@/types';
import logo from '@/assets/TF_logo.svg'

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Centros Educativos',
        href: centros(),
        icon: School,
    },
    {
        title: 'Gestión de Becarios',
        href: '/gestion-becarios',
        icon: GraduationCap,
    },
    {
        title: 'Prácticas y tareas',
        href: '/practicas-tareas',
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
    }
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <div className="flex items-center justify-center py-4">
                    <img src={logo} alt="TalentFlow Logo" className="h-30 w-auto" />
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
