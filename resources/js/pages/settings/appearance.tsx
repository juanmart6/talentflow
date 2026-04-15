import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import { SectionIntro } from '@/components/form-ui';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { UI_PRESETS } from '@/lib/ui-presets';
import { edit as editAppearance } from '@/routes/appearance';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configuración de apariencia',
        href: editAppearance(),
    },
];

export default function Appearance() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración de apariencia" />

            <h1 className="sr-only">Configuración de apariencia</h1>

            <SettingsLayout>
                <SectionIntro
                    title="Apariencia"
                    description="Elige el modo visual que mejor encaje con tu forma de trabajo."
                />

                <section className={UI_PRESETS.sectionCard}>
                    <AppearanceTabs />
                </section>
            </SettingsLayout>
        </AppLayout>
    );
}
