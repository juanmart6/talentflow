import { Head, useForm } from '@inertiajs/react';
import { Building2, CalendarClock, GraduationCap, IdCard, Mail, ShieldCheck, UserCircle2 } from 'lucide-react';
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
    display_name: string;
    intern_summary: {
        dni_nie: string | null;
        education_center_name: string | null;
        training_program_name: string | null;
    } | null;
};

const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    tutor: 'Tutor',
    intern: 'Becario',
};

const roleBadgeClasses: Record<string, string> = {
    admin: 'bg-violet-100 text-violet-700 ring-1 ring-violet-300 dark:bg-violet-900/30 dark:text-violet-200 dark:ring-violet-700/40',
    tutor: 'bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-700/40',
    intern: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700/40',
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

export default function AcceptInvitation({ token, email, role, expires_at, display_name, intern_summary }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        password: '',
        password_confirmation: '',
    });

    const roleLabel = roleLabels[role] ?? role.toUpperCase();
    const roleBadgeClass = roleBadgeClasses[role] ?? 'bg-slate-100 text-slate-700 ring-1 ring-slate-300 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-700/60';

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        post(`/invitaciones/${token}`);
    };

    return (
        <AuthLayout
            title="Aceptar invitación"
            description="Configura tu contraseña para activar tu cuenta."
        >
            <Head title="Aceptar invitación" />

            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Resumen de invitación</p>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${roleBadgeClass}`}>
                        {roleLabel}
                    </span>
                </div>

                <div className="grid gap-2 text-sm">
                    <p className="flex items-center gap-2">
                        <UserCircle2 className="size-4 text-muted-foreground" />
                        <span className="font-semibold">Nombre:</span> {display_name}
                    </p>
                    <p className="flex items-center gap-2">
                        <Mail className="size-4 text-muted-foreground" />
                        <span className="font-semibold">Email:</span> {email}
                    </p>
                    <p className="flex items-center gap-2">
                        <ShieldCheck className="size-4 text-muted-foreground" />
                        <span className="font-semibold">Rol asignado:</span> {roleLabel}
                    </p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                        <CalendarClock className="size-4" />
                        <span className="font-semibold text-foreground">Caduca:</span> {formatDateTime(expires_at)}
                    </p>
                    {intern_summary?.dni_nie ? (
                        <p className="flex items-center gap-2 text-muted-foreground">
                            <IdCard className="size-4" />
                            <span className="font-semibold text-foreground">DNI/NIE:</span> {intern_summary.dni_nie}
                        </p>
                    ) : null}
                    {intern_summary?.education_center_name ? (
                        <p className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="size-4" />
                            <span className="font-semibold text-foreground">Centro:</span> {intern_summary.education_center_name}
                        </p>
                    ) : null}
                    {intern_summary?.training_program_name ? (
                        <p className="flex items-center gap-2 text-muted-foreground">
                            <GraduationCap className="size-4" />
                            <span className="font-semibold text-foreground">Ciclo:</span> {intern_summary.training_program_name}
                        </p>
                    ) : null}
                </div>
            </div>

            <form onSubmit={submit} className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                        id="password"
                        type="password"
                        value={data.password}
                        onChange={(event) => setData('password', event.target.value)}
                        required
                        autoFocus
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
