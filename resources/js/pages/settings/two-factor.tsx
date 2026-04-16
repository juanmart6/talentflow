import { Form, Head } from '@inertiajs/react';
import { KeyRound, Shield, ShieldBan, ShieldCheck, Smartphone } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SectionIntro } from '@/components/form-ui';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
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
    const previousTwoFactorEnabledRef = useRef<boolean | null>(null);

    useEffect(() => {
        if (previousTwoFactorEnabledRef.current === null) {
            previousTwoFactorEnabledRef.current = twoFactorEnabled;
            return;
        }

        if (previousTwoFactorEnabledRef.current === false && twoFactorEnabled === true) {
            toast.success('Autenticación 2FA activada correctamente.');
        }

        if (previousTwoFactorEnabledRef.current === true && twoFactorEnabled === false) {
            toast.success('Autenticación 2FA desactivada correctamente.');
        }

        previousTwoFactorEnabledRef.current = twoFactorEnabled;
    }, [twoFactorEnabled]);

    const settingsStepCardClass =
        'space-y-2 rounded-xl border border-sidebar-border/70 bg-white/70 p-3 sm:p-4 dark:border-sidebar-border dark:bg-slate-900/20';

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
                    <div className="space-y-2.5">
                        <section className={settingsStepCardClass}>
                            <h3 className="flex items-center gap-2 text-sm font-semibold">
                                <Shield className="size-4 text-muted-foreground" />
                                Paso 1 - Estado del servicio
                            </h3>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="default">Activo</Badge>
                                    <span className="text-sm text-muted-foreground">
                                        La verificación adicional está activa.
                                    </span>
                                </div>
                                <Form {...disable.form()}>
                                    {({ processing }) => (
                                        <Button
                                            variant="destructive"
                                            type="submit"
                                            className="h-6 cursor-pointer rounded-full px-2.5 text-xs font-semibold"
                                            disabled={processing}
                                        >
                                            <ShieldBan className="size-3.5" />
                                            Desactivar 2FA
                                        </Button>
                                    )}
                                </Form>
                            </div>
                        </section>

                        <section className={settingsStepCardClass}>
                            <h3 className="flex items-center gap-2 text-sm font-semibold">
                                <Smartphone className="size-4 text-muted-foreground" />
                                Paso 2 - App autenticadora
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                La app autenticadora ya está vinculada y lista para generar códigos TOTP.
                            </p>
                        </section>

                        <section className={settingsStepCardClass}>
                            <h3 className="flex items-center gap-2 text-sm font-semibold">
                                <KeyRound className="size-4 text-muted-foreground" />
                                Paso 3 - Códigos de recuperación
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Revisa y guarda tus códigos de recuperación en un lugar seguro.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Los códigos de recuperación te permiten recuperar el acceso si pierdes tu dispositivo 2FA.
                            </p>
                            <TwoFactorRecoveryCodes
                                recoveryCodesList={recoveryCodesList}
                                fetchRecoveryCodes={fetchRecoveryCodes}
                                errors={errors}
                            />
                        </section>
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        <section className={settingsStepCardClass}>
                            <h3 className="flex items-center gap-2 text-sm font-semibold">
                                <Shield className="size-4 text-muted-foreground" />
                                Paso 1 - Estado del servicio.
                            </h3>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="destructive">Inactivo</Badge>
                                    <span className="text-sm text-muted-foreground">
                                        Aún no se solicita verificación 2FA al iniciar sesión.
                                    </span>
                                </div>
                            </div>
                        </section>

                        <section className={settingsStepCardClass}>
                            <h3 className="flex items-center gap-2 text-sm font-semibold">
                                <Smartphone className="size-4 text-muted-foreground" />
                                Paso 2 - Configurar app autenticadora.
                            </h3>
                            <div className="flex flex-wrap items-center gap-2">
                                {hasSetupData ? (
                                    <Button
                                        className="h-6 cursor-pointer rounded-full px-2.5 text-xs font-semibold"
                                        onClick={() => setShowSetupModal(true)}
                                    >
                                        <ShieldCheck className="size-3.5" />
                                        Continuar
                                    </Button>
                                ) : (
                                    <Form
                                        {...enable.form()}
                                        onSuccess={() => setShowSetupModal(true)}
                                    >
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                className="h-6 cursor-pointer rounded-full px-2.5 text-xs font-semibold"
                                                disabled={processing}
                                            >
                                                <ShieldCheck className="size-3.5" />
                                                Activar 2FA
                                            </Button>
                                        )}
                                    </Form>
                                )}
                                <span className="text-sm text-muted-foreground">
                                    Escanea el QR para completar la vinculación de la app autenticadora.
                                </span>
                            </div>
                        </section>

                        <section className={`${settingsStepCardClass} opacity-80`}>
                            <h3 className="flex items-center gap-2 text-sm font-semibold">
                                <KeyRound className="size-4 text-muted-foreground" />
                                Paso 3 - Guardar códigos de recuperación.
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Este paso se habilitará automáticamente cuando completes la activación de 2FA.
                            </p>
                        </section>
                    </div>
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
