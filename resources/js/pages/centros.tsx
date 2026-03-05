import { Head } from '@inertiajs/react';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

export default function Centros() {
    return (
        <AppLayout>
            <Head title="Centros Educativos" />
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">Centros Educativos</h1>
                <p>Aquí puedes gestionar los centros educativos.</p>
            </div>
        </AppLayout>
    );
}