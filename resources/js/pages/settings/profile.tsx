import { Form, Head, router, usePage } from '@inertiajs/react';
import { Camera, Save, Trash2, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { toast } from 'sonner';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import { SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { UI_PRESETS } from '@/lib/ui-presets';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Configuración del perfil',
        href: ProfileController.edit().url,
    },
];

const AVATAR_ALLOWED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
] as const;
const AVATAR_MAX_FILE_SIZE = 2 * 1024 * 1024;

const isAvatarMimeType = (
    value: string,
): value is (typeof AVATAR_ALLOWED_MIME_TYPES)[number] =>
    AVATAR_ALLOWED_MIME_TYPES.includes(
        value as (typeof AVATAR_ALLOWED_MIME_TYPES)[number],
    );

const avatarExtensionByMime: Record<
    (typeof AVATAR_ALLOWED_MIME_TYPES)[number],
    string
> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
};

const loadImage = (imageUrl: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', () =>
            reject(new Error('No se pudo cargar la imagen seleccionada.')),
        );
        image.src = imageUrl;
    });

const getCroppedAvatarBlob = async (
    imageUrl: string,
    area: Area,
    mimeType: (typeof AVATAR_ALLOWED_MIME_TYPES)[number],
): Promise<Blob> => {
    const image = await loadImage(imageUrl);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(area.width));
    canvas.height = Math.max(1, Math.round(area.height));

    const context = canvas.getContext('2d');
    if (!context) {
        throw new Error('No se pudo preparar el recorte de la imagen.');
    }

    context.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        canvas.width,
        canvas.height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
        if (mimeType === 'image/jpeg' || mimeType === 'image/webp') {
            canvas.toBlob(resolve, mimeType, 0.92);
            return;
        }

        canvas.toBlob(resolve, mimeType);
    });

    if (!blob) {
        throw new Error('No se pudo generar la imagen recortada.');
    }

    return blob;
};

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
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const [isAvatarRemoving, setIsAvatarRemoving] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
    const [isPreparingCrop, setIsPreparingCrop] = useState(false);
    const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);
    const [cropMimeType, setCropMimeType] = useState<
        (typeof AVATAR_ALLOWED_MIME_TYPES)[number]
    >('image/jpeg');
    const [cropOriginalName, setCropOriginalName] = useState<string>('avatar');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(
        null,
    );
    const avatarDisplaySrc = avatarPreviewUrl ?? auth.user.avatar ?? null;

    useEffect(
        () => () => {
            if (cropSourceUrl) {
                URL.revokeObjectURL(cropSourceUrl);
            }
            if (avatarPreviewUrl) {
                URL.revokeObjectURL(avatarPreviewUrl);
            }
        },
        [cropSourceUrl, avatarPreviewUrl],
    );

    const clearAvatarSelection = () => {
        setAvatarFile(null);
        setAvatarPreviewUrl((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }
            return null;
        });

        if (avatarInputRef.current) {
            avatarInputRef.current.value = '';
        }
    };

    const closeCropDialog = () => {
        setIsCropDialogOpen(false);
        setIsPreparingCrop(false);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setCropOriginalName('avatar');
        setCropSourceUrl((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }
            return null;
        });

        if (avatarInputRef.current) {
            avatarInputRef.current.value = '';
        }
    };

    const handleAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        if (!file) {
            return;
        }

        if (!isAvatarMimeType(file.type)) {
            setAvatarError('Formato no válido. Usa PNG, JPG o WEBP.');
            event.target.value = '';
            return;
        }

        if (file.size > AVATAR_MAX_FILE_SIZE) {
            setAvatarError('El archivo supera el límite de 2 MB.');
            event.target.value = '';
            return;
        }

        setAvatarError(null);
        setIsPreparingCrop(false);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setCropMimeType(file.type);
        setCropOriginalName(file.name);
        setCropSourceUrl((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }
            return URL.createObjectURL(file);
        });
        setIsCropDialogOpen(true);
    };

    const handleApplyCrop = async () => {
        if (!cropSourceUrl || !croppedAreaPixels) {
            setAvatarError('Ajusta el recorte antes de continuar.');
            return;
        }

        setIsPreparingCrop(true);
        setAvatarError(null);

        try {
            const blob = await getCroppedAvatarBlob(
                cropSourceUrl,
                croppedAreaPixels,
                cropMimeType,
            );

            const extension = avatarExtensionByMime[cropMimeType];
            const sanitizedName = cropOriginalName
                .replace(/\.[^.]+$/, '')
                .replace(/[^\w-]+/g, '-')
                .slice(0, 40);
            const fileName = `${sanitizedName || 'avatar-recortado'}.${extension}`;
            const croppedFile = new File([blob], fileName, {
                type: cropMimeType,
                lastModified: Date.now(),
            });

            setAvatarPreviewUrl((current) => {
                if (current) {
                    URL.revokeObjectURL(current);
                }
                return URL.createObjectURL(croppedFile);
            });
            setAvatarFile(croppedFile);
            closeCropDialog();
        } catch (error) {
            setAvatarError(
                error instanceof Error
                    ? error.message
                    : 'No se pudo preparar el recorte.',
            );
        } finally {
            setIsPreparingCrop(false);
        }
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
                    clearAvatarSelection();
                    toast.success('Foto de perfil actualizada correctamente.');
                },
                onFinish: () => setIsAvatarUploading(false),
            },
        );
    };

    const handleAvatarDelete = () => {
        if (avatarFile || avatarPreviewUrl) {
            clearAvatarSelection();
            setAvatarError(null);
            return;
        }

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
                clearAvatarSelection();
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
                        {avatarDisplaySrc ? (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <button
                                        type="button"
                                        className="cursor-zoom-in rounded-full"
                                        aria-label="Ver foto de perfil en grande"
                                        title="Ver foto en grande"
                                    >
                                        <Avatar className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-slate-200 dark:ring-slate-700">
                                            <AvatarImage
                                                src={avatarDisplaySrc}
                                                alt={auth.user.name}
                                            />
                                            <AvatarFallback className="rounded-full bg-neutral-200 text-sm font-semibold text-black dark:bg-neutral-700 dark:text-white">
                                                {getInitials(auth.user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-xl">
                                    <DialogHeader>
                                        <DialogTitle>Foto de perfil</DialogTitle>
                                        <DialogDescription>
                                            Vista ampliada de la imagen seleccionada.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="flex justify-center">
                                        <img
                                            src={avatarDisplaySrc}
                                            alt="Foto de perfil ampliada"
                                            className="max-h-[70vh] w-auto rounded-xl border border-sidebar-border/70 object-contain"
                                        />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        ) : (
                            <Avatar className="h-20 w-20 overflow-hidden rounded-full ring-2 ring-slate-200 dark:ring-slate-700">
                                <AvatarImage
                                    src={undefined}
                                    alt={auth.user.name}
                                />
                                <AvatarFallback className="rounded-full bg-neutral-200 text-sm font-semibold text-black dark:bg-neutral-700 dark:text-white">
                                    {getInitials(auth.user.name)}
                                </AvatarFallback>
                            </Avatar>
                        )}

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
                                        isAvatarRemoving
                                        || (!auth.user.avatar && !avatarFile)
                                    }
                                    aria-label="Quitar foto"
                                    title="Quitar foto"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>

                            {avatarFile ? (
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        Imagen lista para guardar: {avatarFile.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Haz clic en la foto para verla en grande.
                                    </p>
                                </div>
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

                <Dialog open={isCropDialogOpen} onOpenChange={(open) => !open && closeCropDialog()}>
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Recortar foto de perfil</DialogTitle>
                            <DialogDescription>
                                Ajusta la imagen para usar un recorte cuadrado antes de guardarla.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3">
                            <div className="relative h-72 overflow-hidden rounded-lg border border-sidebar-border/70 bg-slate-950">
                                {cropSourceUrl ? (
                                    <Cropper
                                        image={cropSourceUrl}
                                        crop={crop}
                                        zoom={zoom}
                                        aspect={1}
                                        cropShape="round"
                                        showGrid={false}
                                        onCropChange={setCrop}
                                        onZoomChange={setZoom}
                                        onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
                                    />
                                ) : null}
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="crop-zoom">Zoom</Label>
                                <Input
                                    id="crop-zoom"
                                    type="range"
                                    min={1}
                                    max={3}
                                    step={0.05}
                                    value={zoom}
                                    onChange={(event) =>
                                        setZoom(Number(event.currentTarget.value))
                                    }
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setCrop({ x: 0, y: 0 });
                                    setZoom(1);
                                }}
                            >
                                Restablecer
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeCropDialog}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="button"
                                className={UI_PRESETS.saveButton}
                                disabled={isPreparingCrop}
                                onClick={handleApplyCrop}
                            >
                                {isPreparingCrop ? 'Procesando...' : 'Aplicar recorte'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

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

