import { Form, usePage } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { useRef } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UI_PRESETS } from '@/lib/ui-presets';

export default function DeleteUser() {
    const { auth } = usePage<{
        auth: { user: { email: string } };
    }>().props;

    const passwordInput = useRef<HTMLInputElement>(null);
    const isProtectedAdminAccount =
        auth.user.email.trim().toLowerCase() === 'admin@talentflow.es';

    return (
        <section className={`${UI_PRESETS.sectionCard} space-y-4`}>
            <SectionIntro
                title="Desactivar cuenta"
                description="Bloquea tu acceso a la plataforma. Los datos se conservan para trazabilidad interna."
            />

            <div className="rounded-lg border border-red-200/80 bg-red-50/80 p-4 dark:border-red-500/30 dark:bg-red-950/20">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-full bg-red-100 p-1.5 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                            <AlertTriangle className="size-4" />
                        </div>
                        <div className="space-y-1 text-red-700 dark:text-red-100">
                            <p className="text-sm font-semibold">Acción sensible</p>
                            <p className="text-sm">
                                No podras iniciar sesion de nuevo hasta que un administrador reactive tu acceso.
                            </p>
                        </div>
                    </div>

                    {isProtectedAdminAccount ? (
                        <p className="text-sm font-semibold text-red-700 dark:text-red-200">
                            Esta cuenta esta protegida y no se puede desactivar.
                        </p>
                    ) : (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button
                                    variant="destructive"
                                    className="cursor-pointer whitespace-nowrap"
                                    data-test="delete-user-button"
                                >
                                    Desactivar cuenta
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogTitle>¿Quieres desactivar tu cuenta?</DialogTitle>
                                <DialogDescription>
                                    Esta accion cerrara tu sesión y bloqueará futuros inicios de sesión. Introduce tu
                                    contraseña para confirmar.
                                </DialogDescription>

                                <Form
                                    {...ProfileController.destroy.form()}
                                    options={{
                                        preserveScroll: true,
                                    }}
                                    onError={() => passwordInput.current?.focus()}
                                    resetOnSuccess
                                    className="space-y-6"
                                >
                                    {({ resetAndClearErrors, processing, errors }) => (
                                        <>
                                            <div className="grid gap-2">
                                                <Label htmlFor="password" className="sr-only">
                                                    Contraseña actual
                                                </Label>

                                                <Input
                                                    id="password"
                                                    type="password"
                                                    name="password"
                                                    ref={passwordInput}
                                                    placeholder="Contraseña actual"
                                                    autoComplete="current-password"
                                                    className={UI_PRESETS.simpleSearchInput}
                                                />

                                                <InputError message={errors.password} />
                                            </div>

                                            <DialogFooter className="gap-2">
                                                <DialogClose asChild>
                                                    <Button
                                                        variant="secondary"
                                                        className="cursor-pointer"
                                                        onClick={() => resetAndClearErrors()}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                </DialogClose>

                                                <Button
                                                    variant="destructive"
                                                    className="cursor-pointer"
                                                    disabled={processing}
                                                    asChild
                                                >
                                                    <button type="submit" data-test="confirm-delete-user-button">
                                                        Confirmar desactivación
                                                    </button>
                                                </Button>
                                            </DialogFooter>
                                        </>
                                    )}
                                </Form>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>
        </section>
    );
}
