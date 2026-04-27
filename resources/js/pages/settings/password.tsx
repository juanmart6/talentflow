import { Transition } from '@headlessui/react';
import { Form, Head } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { useRef } from 'react';
import PasswordController from '@/actions/App/Http/Controllers/Settings/PasswordController';
import { SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { UI_PRESETS } from '@/lib/ui-presets';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configuración de contraseña',
        href: PasswordController.edit().url,
    },
];

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuración de contraseña" />

            <h1 className="sr-only">Configuración de contraseña</h1>

            <SettingsLayout>
                <SectionIntro
                    title="Actualizar contraseña"
                    description="Usa una contraseña robusta para reforzar la seguridad de tu cuenta."
                />

                <Form
                    {...PasswordController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    resetOnError={[
                        'password',
                        'password_confirmation',
                        'current_password',
                    ]}
                    resetOnSuccess
                    onError={(errors) => {
                        if (errors.password) {
                            passwordInput.current?.focus();
                        }

                        if (errors.current_password) {
                            currentPasswordInput.current?.focus();
                        }
                    }}
                    className={`${UI_PRESETS.sectionCard} space-y-5`}
                >
                    {({ errors, processing, recentlySuccessful }) => (
                        <>
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                                <div className="grid gap-2">
                                    <Label htmlFor="current_password">
                                        Contraseña actual
                                    </Label>
                                    <Input
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        type="password"
                                        className={UI_PRESETS.simpleSearchInput}
                                        autoComplete="current-password"
                                        placeholder="Contraseña actual"
                                    />
                                    <InputError
                                        message={errors.current_password}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password">
                                        Nueva contraseña
                                    </Label>
                                    <Input
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        type="password"
                                        className={UI_PRESETS.simpleSearchInput}
                                        autoComplete="new-password"
                                        placeholder="Nueva contraseña"
                                    />
                                    <InputError message={errors.password} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password_confirmation">
                                        Confirmar contraseña
                                    </Label>
                                    <Input
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        type="password"
                                        className={UI_PRESETS.simpleSearchInput}
                                        autoComplete="new-password"
                                        placeholder="Confirmar contraseña"
                                    />
                                    <InputError
                                        message={errors.password_confirmation}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 lg:self-end">
                                    <Button
                                        disabled={processing}
                                        size="icon"
                                        className={`${UI_PRESETS.saveButton} cursor-pointer`}
                                        data-test="update-password-button"
                                        aria-label="Guardar contraseña"
                                        title="Guardar contraseña"
                                    >
                                        <Save className="size-4" />
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-neutral-600">
                                            Guardada
                                        </p>
                                    </Transition>
                                </div>
                            </div>
                        </>
                    )}
                </Form>
            </SettingsLayout>
        </AppLayout>
    );
}

