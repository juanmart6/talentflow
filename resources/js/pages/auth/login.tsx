import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    return (
        <AuthLayout containerClassName="max-w-5xl">
            <Head title="Iniciar sesion" />

            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#eff6ff] via-[#f8fafc] to-[#ecfdf5] dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" />
                <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#2563eb]/25 blur-3xl" />
                <div className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-[#10B981]/20 blur-3xl" />
                <div className="absolute top-1/3 left-1/3 h-72 w-72 rounded-full bg-[#2563eb]/12 blur-3xl" />
            </div>

            <div className="relative -mt-5 w-full md:-mt-8">
                <div className="relative z-10 overflow-hidden rounded-[2rem] border border-slate-200 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
                    <div className="absolute inset-0 hidden lg:block">
                        <div className="absolute -top-24 -left-12 h-72 w-72 rounded-full bg-[#2563eb]/20 blur-3xl" />
                        <div className="absolute -right-12 bottom-8 h-64 w-64 rounded-full bg-[#10B981]/15 blur-3xl" />
                    </div>

                    <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
                        <div className="relative overflow-hidden bg-gradient-to-br from-[#1d4ed8] via-[#2563eb] to-[#10B981] px-7 py-8 text-white md:px-10 md:py-10">
                            <div className="absolute inset-0">
                                <PlaceholderPattern className="h-full w-full stroke-white/20" />
                            </div>

                            <div className="relative z-10 flex h-full flex-col gap-6 text-justify">
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
                                            Todo tu flujo de prácticas, en orden.
                                        </h2>
                                        <p className="max-w-md text-sm text-sky-100/90 md:text-base">
                                            Organiza becarios, centros y convenios desde un único panel operativo.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-3 text-sm">
                                    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                                        Seguimiento diario de becarios.
                                    </div>
                                    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                                        Toda la documentación centralizada.
                                    </div>
                                    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
                                        Alertas claras para no perder plazos clave.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative flex flex-col justify-center bg-white px-7 py-8 dark:bg-slate-950 md:px-10 md:py-10">
                            <div className="mb-7 space-y-1">
                                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                                    Iniciar sesión
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Accede a tu panel de gestión de prácticas.
                                </p>
                            </div>

                            <Form
                                {...store.form()}
                                resetOnSuccess={['password']}
                                className="flex flex-col gap-6"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-6">
                                            <div className="grid gap-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    name="email"
                                                    className="focus-visible:ring-[#2563eb]/55 focus-visible:border-[#2563eb]"
                                                    required
                                                    autoFocus
                                                    tabIndex={1}
                                                    autoComplete="email"
                                                    placeholder="tu@empresa.com"
                                                />
                                                <InputError message={errors.email} />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="password">Contraseña</Label>
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    name="password"
                                                    className="focus-visible:ring-[#2563eb]/55 focus-visible:border-[#2563eb]"
                                                    required
                                                    tabIndex={2}
                                                    autoComplete="current-password"
                                                    placeholder="********"
                                                />
                                                <InputError message={errors.password} />
                                            </div>

                                            <div className="flex items-center space-x-3">
                                                <Checkbox
                                                    id="remember"
                                                    name="remember"
                                                    className="border-[#2563eb]/35 data-[state=checked]:border-[#2563eb] data-[state=checked]:bg-[#2563eb] focus-visible:border-[#2563eb] focus-visible:ring-[#10B981]/35"
                                                    tabIndex={3}
                                                />
                                                <Label htmlFor="remember">Recuérdame</Label>
                                            </div>

                                            <Button
                                                type="submit"
                                                className="h-12 w-full rounded-xl text-base font-semibold"
                                                tabIndex={4}
                                                disabled={processing}
                                                data-test="login-button"
                                            >
                                                {processing && <Spinner />}
                                                Entrar
                                            </Button>

                                            {canResetPassword && (
                                                <div className="text-center text-sm text-muted-foreground">
                                                    <TextLink href={request()} tabIndex={5}>
                                                        Olvidé mi contraseña
                                                    </TextLink>
                                                </div>
                                            )}
                                        </div>

                                        {canRegister && (
                                            <div className="text-center text-sm text-muted-foreground">
                                                ¿No tienes cuenta?{' '}
                                                <TextLink href={register()} tabIndex={5}>
                                                    Regístrate
                                                </TextLink>
                                            </div>
                                        )}
                                    </>
                                )}
                            </Form>

                            {status && (
                                <div className="mt-6 text-center text-sm font-medium text-green-600">
                                    {status}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthLayout>
    );
}
