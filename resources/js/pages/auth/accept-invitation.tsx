import { Head, useForm } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';

type Props = {
    token: string;
    email: string;
    role: string;
    expires_at: string | null;
};

const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    tutor: 'Tutor',
    intern: 'Becario',
};

function formatDateTime(value: string | null): string {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function AcceptInvitation({ token, email, role, expires_at }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        password: '',
        password_confirmation: '',
    });

    const roleLabel = roleLabels[role] ?? role.toUpperCase();

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(`/invitaciones/${token}`);
    };

    return (
        <AuthLayout
            title="Aceptar invitación"
            description="Completa tus datos para activar tu cuenta."
        >
            <Head title="Aceptar invitación" />

            <div className="mb-5 space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/40">
                <p>
                    <span className="font-semibold">Email:</span> {email}
                </p>
                <p>
                    <span className="font-semibold">Rol asignado:</span> {roleLabel}
                </p>
                <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">Caduca:</span> {formatDateTime(expires_at)}
                </p>
            </div>

            <form onSubmit={submit} className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                        id="name"
                        type="text"
                        value={data.name}
                        onChange={(event) => setData('name', event.target.value)}
                        autoFocus
                        required
                        placeholder="Nombre y apellidos"
                    />
                    <InputError message={errors.name} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                        id="password"
                        type="password"
                        value={data.password}
                        onChange={(event) => setData('password', event.target.value)}
                        required
                        autoComplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                    />
                    <InputError message={errors.password} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
                    <Input
                        id="password_confirmation"
                        type="password"
                        value={data.password_confirmation}
                        onChange={(event) => setData('password_confirmation', event.target.value)}
                        required
                        autoComplete="new-password"
                        placeholder="Repite la contraseña"
                    />
                    <InputError message={errors.password_confirmation} />
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                    {processing && <Spinner />}
                    Crear cuenta
                </Button>
            </form>

            <div className="mt-5 text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <TextLink href={login()}>Iniciar sesión</TextLink>
            </div>
        </AuthLayout>
    );
}

