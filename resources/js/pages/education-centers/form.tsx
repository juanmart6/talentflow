import { Form, Head, Link } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import educationCenters from '@/routes/education-centers';
import type { BreadcrumbItem } from '@/types';

type CenterFormData = {
    id?: number;
    name?: string;
    address?: string;
    phone?: string;
    institutional_email?: string;
    website?: string | null;
    contact_name?: string;
    contact_position?: string;
    contact_phone?: string;
    contact_email?: string;
    agreement_signed_at?: string | null;
    agreement_expires_at?: string | null;
    agreement_agreed_slots?: number | null;
    agreement_pdf_path?: string | null;
};

type Props = {
    mode: 'create' | 'edit' | 'show';
    center: CenterFormData | null;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Centros Educativos',
        href: educationCenters.index().url,
    },
];

export default function EducationCenterForm({ mode, center }: Props) {
    const isCreate = mode === 'create';
    const isReadOnly = mode === 'show';
    const formRoute = isCreate
        ? educationCenters.store.form()
        : educationCenters.update.form(center?.id ?? 0);

    const hasAgreement = Boolean(center?.agreement_pdf_path);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreate ? 'Nuevo Centro Educativo' : isReadOnly ? 'Ver Centro Educativo' : 'Editar Centro Educativo'} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">Modo</p>
                        <p className="mt-2 text-2xl font-semibold">{isCreate ? 'Alta' : isReadOnly ? 'Consulta' : 'Edicion'}</p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">Convenio actual</p>
                        <p className="mt-2 text-2xl font-semibold">{hasAgreement ? 'Si' : 'No'}</p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">Campos obligatorios</p>
                        <p className="mt-2 text-2xl font-semibold">13</p>
                    </div>
                </div>

                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <div className="flex flex-col gap-4 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">
                                    {isCreate ? 'Nuevo Centro Educativo' : isReadOnly ? 'Ver Centro Educativo' : 'Editar Centro Educativo'}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {isReadOnly
                                        ? 'Consulta la informacion del centro, contacto y convenio principal.'
                                        : 'Completa la informacion del centro, contacto y convenio principal.'}
                                </p>
                            </div>

                            <Button variant="secondary" asChild>
                                <Link href={educationCenters.index().url}>Volver al listado</Link>
                            </Button>
                        </div>

                        <Form
                            {...formRoute}
                            options={{ preserveScroll: true }}
                            className="space-y-6"
                            encType="multipart/form-data"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <fieldset disabled={isReadOnly} className="space-y-6">
                                    <section className="space-y-4 rounded-lg border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                                        <h2 className="text-lg font-semibold">Datos del centro</h2>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="grid gap-2 md:col-span-2">
                                                <Label htmlFor="name">Nombre</Label>
                                                <Input id="name" name="name" defaultValue={center?.name ?? ''} required />
                                                <InputError message={errors.name} />
                                            </div>

                                    <div className="grid gap-2 md:col-span-2">
                                        <Label htmlFor="address">Direccion</Label>
                                        <Input id="address" name="address" defaultValue={center?.address ?? ''} required />
                                        <InputError message={errors.address} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Telefono</Label>
                                        <Input id="phone" name="phone" defaultValue={center?.phone ?? ''} required />
                                        <InputError message={errors.phone} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="institutional_email">Email institucional</Label>
                                        <Input
                                            id="institutional_email"
                                            type="email"
                                            name="institutional_email"
                                            defaultValue={center?.institutional_email ?? ''}
                                            required
                                        />
                                        <InputError message={errors.institutional_email} />
                                    </div>

                                    <div className="grid gap-2 md:col-span-2">
                                        <Label htmlFor="website">Web (opcional)</Label>
                                        <Input id="website" name="website" defaultValue={center?.website ?? ''} />
                                        <InputError message={errors.website} />
                                    </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4 rounded-lg border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                                        <h2 className="text-lg font-semibold">Persona de contacto</h2>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="contact_name">Nombre</Label>
                                        <Input
                                            id="contact_name"
                                            name="contact_name"
                                            defaultValue={center?.contact_name ?? ''}
                                            required
                                        />
                                        <InputError message={errors.contact_name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="contact_position">Cargo</Label>
                                        <Input
                                            id="contact_position"
                                            name="contact_position"
                                            defaultValue={center?.contact_position ?? ''}
                                            required
                                        />
                                        <InputError message={errors.contact_position} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="contact_phone">Telefono</Label>
                                        <Input
                                            id="contact_phone"
                                            name="contact_phone"
                                            defaultValue={center?.contact_phone ?? ''}
                                            required
                                        />
                                        <InputError message={errors.contact_phone} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="contact_email">Email</Label>
                                        <Input
                                            id="contact_email"
                                            type="email"
                                            name="contact_email"
                                            defaultValue={center?.contact_email ?? ''}
                                            required
                                        />
                                        <InputError message={errors.contact_email} />
                                    </div>
                                        </div>
                                    </section>

                                    <section className="space-y-4 rounded-lg border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                                        <h2 className="text-lg font-semibold">Convenio de colaboracion</h2>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="agreement_signed_at">Fecha de firma</Label>
                                        <Input
                                            id="agreement_signed_at"
                                            type="date"
                                            name="agreement_signed_at"
                                            defaultValue={center?.agreement_signed_at ?? ''}
                                            required
                                        />
                                        <InputError message={errors.agreement_signed_at} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="agreement_expires_at">Fecha de vencimiento</Label>
                                        <Input
                                            id="agreement_expires_at"
                                            type="date"
                                            name="agreement_expires_at"
                                            defaultValue={center?.agreement_expires_at ?? ''}
                                            required
                                        />
                                        <InputError message={errors.agreement_expires_at} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="agreement_agreed_slots">Plazas acordadas</Label>
                                        <Input
                                            id="agreement_agreed_slots"
                                            type="number"
                                            min={1}
                                            name="agreement_agreed_slots"
                                            defaultValue={center?.agreement_agreed_slots ?? 1}
                                            required
                                        />
                                        <InputError message={errors.agreement_agreed_slots} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="agreement_pdf">Documento PDF</Label>
                                        <Input
                                            id="agreement_pdf"
                                            type="file"
                                            name="agreement_pdf"
                                            accept="application/pdf"
                                            required={isCreate}
                                        />
                                        <InputError message={errors.agreement_pdf} />
                                    </div>
                                        </div>

                                        {!isCreate && center?.agreement_pdf_path && (
                                            <p className="text-sm text-muted-foreground">
                                                PDF actual: {center.agreement_pdf_path}
                                            </p>
                                        )}
                                    </section>
                                    </fieldset>

                                    <div className="flex gap-2 border-t border-sidebar-border/70 pt-2 dark:border-sidebar-border">
                                        {isReadOnly ? (
                                            <>
                                                <Button asChild>
                                                    <Link href={educationCenters.edit(center?.id ?? 0).url}>Editar</Link>
                                                </Button>
                                                <Button type="button" variant="secondary" asChild>
                                                    <Link href={educationCenters.index().url}>Volver al listado</Link>
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button disabled={processing}>
                                                    {processing ? 'Guardando...' : 'Guardar'}
                                                </Button>
                                                <Button type="button" variant="secondary" asChild>
                                                    <Link href={educationCenters.index().url}>Cancelar</Link>
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
