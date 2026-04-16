import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { FormPageHeader } from '@/components/form-ui';
import { Button } from '@/components/ui/button';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { UI_PRESETS } from '@/lib/ui-presets';
import { cn, toUrl } from '@/lib/utils';
import { edit } from '@/routes/profile';
import { show } from '@/routes/two-factor';
import { edit as editPassword } from '@/routes/user-password';
import type { NavItem } from '@/types';

const settingsTabs: NavItem[] = [
    {
        title: 'Perfil',
        href: edit(),
        icon: null,
    },
    {
        title: 'Contraseña',
        href: editPassword(),
        icon: null,
    },
    {
        title: 'Autenticación 2FA',
        href: show(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    if (typeof window === 'undefined') {
        return null;
    }

    return (
        <div className={UI_PRESETS.pageContent}>
            <div className={cn(UI_PRESETS.pageSection, 'space-y-4')}>
                <FormPageHeader
                    title="Configuración"
                    description="Gestiona tu perfil y los ajustes de tu cuenta."
                />

                <section className={UI_PRESETS.sectionCard}>
                    <div className={UI_PRESETS.tabsHeaderEmphasis}>
                        <div className="flex flex-wrap items-end gap-1.5">
                            {settingsTabs.map((item, index) => (
                                <Button
                                    key={`${toUrl(item.href)}-${index}`}
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                    className={cn(
                                        UI_PRESETS.tabBase,
                                        isCurrentOrParentUrl(item.href)
                                            ? UI_PRESETS.tabActive
                                            : UI_PRESETS.tabInactive,
                                    )}
                                >
                                    <Link href={item.href}>{item.title}</Link>
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6 pt-4">{children}</div>
                </section>
            </div>
        </div>
    );
}
