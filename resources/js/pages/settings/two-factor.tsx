import { Form, Head } from '@inertiajs/react';
import { ShieldBan, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { SectionIntro } from '@/components/form-ui';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { UI_PRESETS } from '@/lib/ui-presets';
import { disable, enable, show } from '@/routes/two-factor';
import type { BreadcrumbItem } from '@/types';

type Props = {
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Autenticación 2FA',
        href: show(),
    },
];

export default function TwoFactor({
    requiresConfirmation = false,
    twoFactorEnabled = false,
}: Props) {
    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
        errors,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Autenticación 2FA" />

            <h1 className="sr-only">Configuración de autenticación 2FA</h1>

            <SettingsLayout>
                <SectionIntro
                    title="Autenticación de dos factores"
                    description="Añade una capa extra de seguridad en cada inicio de sesión."
                />

                {twoFactorEnabled ? (
                    <section className={UI_PRESETS.sectionCard}>
                        <div className="space-y-4 rounded-lg border border-emerald-200/80 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-950/20">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <Badge variant="default">Habilitado</Badge>
                                <Form {...disable.form()}>
                                    {({ processing }) => (
                                        <Button variant="destructive" type="submit" className="cursor-pointer" disabled={processing}>
                                            <ShieldBan className="size-4" />
                                            Desactivar 2FA
                                        </Button>
                                    )}
                                </Form>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                En cada inicio de sesión se solicitará un código temporal generado por tu app TOTP.
                            </p>

                            <TwoFactorRecoveryCodes
                                recoveryCodesList={recoveryCodesList}
                                fetchRecoveryCodes={fetchRecoveryCodes}
                                errors={errors}
                            />
                        </div>
                    </section>
                ) : (
                    <section className={UI_PRESETS.sectionCard}>
                        <div className="space-y-4 rounded-lg border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <Badge variant="destructive">Desactivado</Badge>

                                {hasSetupData ? (
                                    <Button className="cursor-pointer" onClick={() => setShowSetupModal(true)}>
                                        <ShieldCheck className="size-4" />
                                        Continuar configuración
                                    </Button>
                                ) : (
                                    <Form
                                        {...enable.form()}
                                        onSuccess={() => setShowSetupModal(true)}
                                    >
                                        {({ processing }) => (
                                            <Button type="submit" className="cursor-pointer" disabled={processing}>
                                                <ShieldCheck className="size-4" />
                                                Activar 2FA
                                            </Button>
                                        )}
                                    </Form>
                                )}
                            </div>

                            <p className="text-sm text-muted-foreground">
                                Al activarla, se pedirá un código de verificación en cada acceso a la plataforma.
                            </p>
                        </div>
                    </section>
                )}

                <TwoFactorSetupModal
                    isOpen={showSetupModal}
                    onClose={() => setShowSetupModal(false)}
                    requiresConfirmation={requiresConfirmation}
                    twoFactorEnabled={twoFactorEnabled}
                    qrCodeSvg={qrCodeSvg}
                    manualSetupKey={manualSetupKey}
                    clearSetupData={clearSetupData}
                    fetchSetupData={fetchSetupData}
                    errors={errors}
                />
            </SettingsLayout>
        </AppLayout>
    );
}
