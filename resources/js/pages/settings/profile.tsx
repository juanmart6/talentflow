import { Form, Head, router, usePage } from '@inertiajs/react';
import { Camera, Save, Trash2, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import { SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { UI_PRESETS } from '@/lib/ui-presets';
import { edit } from '@/routes/profile';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configuración del perfil',
        href: edit(),
    },
];

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<{
        auth: {
            user: {
                name: string;
                email: string;
                avatar?: string | null;
                email_verified_at: string | null;
            };
        };
    }>().props;

    const getInitials = useInitials();
    const avatarInputRef = useRef<HTMLInputElement | null>(null);
    const profileHasChangesRef = useRef(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const [isAvatarRemoving, setIsAvatarRemoving] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);

    const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setAvatarFile(file);
        setAvatarError(null);
    };

    const handleAvatarUpload = () => {
        if (!avatarFile) {
            setAvatarError('Selecciona una imagen antes de subirla.');
            return;
        }

        setIsAvatarUploading(true);
        setAvatarError(null);

        router.post(
            '/settings/profile/avatar',
            { avatar: avatarFile },
            {
                preserveScroll: true,
                forceFormData: true,
                onError: (errors) => {
                    const message =
                        typeof errors.avatar === 'string'
                            ? errors.avatar
                            : 'No se pudo actualizar la foto de perfil.';
                    setAvatarError(message);
                    toast.error(message);
                },
                onSuccess: () => {
                    setAvatarFile(null);
                    if (avatarInputRef.current) {
                        avatarInputRef.current.value = '';
                    }
                    toast.success('Foto de perfil actualizada correctamente.');
                },
                onFinish: () => setIsAvatarUploading(false),
            },
        );
    };

    const handleAvatarDelete = () => {
        setIsAvatarRemoving(true);
        setAvatarError(null);

        router.delete('/settings/profile/avatar', {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Foto de perfil eliminada correctamente.');
            },
            onError: () => {
                toast.error('No se pudo eliminar la foto de perfil.');
            },
            onFinish: () => {
                setAvatarFile(null);
                if (avatarInputRef.current) {
                    avatarInputRef.current.value = '';
                }
                setIsAvatarRemoving(false);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Información del perfil" />

            <h1 className="sr-only">Información del perfil</h1>

            <SettingsLayout>
                <SectionIntro
                    title="Información del perfil"
                    description="Ajusta tu foto, nombre y correo manteniendo la misma estructura visual del resto de módulos."
                />

                <section className={UI_PRESETS.sectionCard}>
                    <div>
                        <h3 className="text-lg font-bold tracking-tight">
                            Foto de perfil
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Esta imagen se mostrará en sidebar, becarios y
                            accesos.
                        </p>
                    </div>

                    <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-center">
                        <Avatar className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-slate-200 dark:ring-slate-700">
                            <AvatarImage
                                src={auth.user.avatar ?? undefined}
                                alt={auth.user.name}
                            />
                            <AvatarFallback className="rounded-full bg-neutral-200 text-sm font-semibold text-black dark:bg-neutral-700 dark:text-white">
                                {getInitials(auth.user.name)}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-3">
                            <input
                                ref={avatarInputRef}
                                id="avatar"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="hidden"
                                onChange={handleAvatarFileChange}
                            />

                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className={
                                        UI_PRESETS.iconActionButtonPrimary
                                    }
                                    onClick={() =>
                                        avatarInputRef.current?.click()
                                    }
                                    aria-label="Seleccionar imagen"
                                    title="Seleccionar imagen"
                                >
                                    <Camera className="size-4" />
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className={UI_PRESETS.iconActionButtonSuccess}
                                    onClick={handleAvatarUpload}
                                    disabled={isAvatarUploading || !avatarFile}
                                    aria-label={
                                        isAvatarUploading
                                            ? 'Subiendo foto'
                                            : 'Guardar foto'
                                    }
                                    title={
                                        isAvatarUploading
                                            ? 'Subiendo foto'
                                            : 'Guardar foto'
                                    }
                                >
                                    {isAvatarUploading ? (
                                        <Upload className="size-4 animate-pulse" />
                                    ) : (
                                        <Save className="size-4" />
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className={UI_PRESETS.iconActionButtonDanger}
                                    onClick={handleAvatarDelete}
                                    disabled={
                                        isAvatarRemoving || !auth.user.avatar
                                    }
                                    aria-label="Quitar foto"
                                    title="Quitar foto"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>

                            {avatarFile ? (
                                <p className="text-sm text-muted-foreground">
                                    Imagen seleccionada: {avatarFile.name}
                                </p>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Formatos: PNG, JPG o WEBP (max. 2 MB).
                                </p>
                            )}

                            <InputError
                                className="mt-1"
                                message={avatarError ?? undefined}
                            />
                        </div>
                    </div>
                </section>

                <Form
                    {...ProfileController.update.form()}
                    options={{
                        preserveScroll: true,
                    }}
                    onSubmit={(event) => {
                        const formData = new FormData(event.currentTarget);
                        const incomingName = String(formData.get('name') ?? '').trim();
                        const incomingEmail = String(formData.get('email') ?? '').trim().toLowerCase();
                        const currentName = auth.user.name.trim();
                        const currentEmail = auth.user.email.trim().toLowerCase();

                        profileHasChangesRef.current =
                            incomingName !== currentName || incomingEmail !== currentEmail;
                    }}
                    onSuccess={() => {
                        if (profileHasChangesRef.current) {
                            toast.success('Información actualizada correctamente.');
                        }

                        profileHasChangesRef.current = false;
                    }}
                    onError={() => {
                        profileHasChangesRef.current = false;
                    }}
                    className={`${UI_PRESETS.sectionCard} space-y-5`}
                >
                    {({ processing, errors }) => (
                        <>
                            <SectionIntro
                                title="Datos de acceso"
                                description="Mantener estos datos actualizados mejora la consistencia del sistema."
                            />

                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre</Label>
                                    <Input
                                        id="name"
                                        className={UI_PRESETS.simpleSearchInput}
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Nombre completo"
                                    />
                                    <InputError
                                        className="mt-1"
                                        message={errors.name}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email">
                                        Correo electrónico
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        className={UI_PRESETS.simpleSearchInput}
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Correo electrónico"
                                    />
                                    <InputError
                                        className="mt-1"
                                        message={errors.email}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 lg:self-end">
                                    <Button
                                        disabled={processing}
                                        size="icon"
                                        className={`${UI_PRESETS.saveButton} cursor-pointer`}
                                        data-test="update-profile-button"
                                        aria-label="Guardar cambios de perfil"
                                        title="Guardar cambios de perfil"
                                    >
                                        <Save className="size-4" />
                                    </Button>
                                </div>
                            </div>

                            {mustVerifyEmail &&
                            auth.user.email_verified_at === null ? (
                                <p className="text-sm text-muted-foreground">
                                    La verificación de correo está desactivada
                                    en este entorno.
                                </p>
                            ) : null}

                            {status === 'verification-link-sent' ? (
                                <div className="text-sm font-medium text-green-600">
                                    Se ha enviado un nuevo enlace de
                                    verificación a tu correo electrónico.
                                </div>
                            ) : null}
                        </>
                    )}
                </Form>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
