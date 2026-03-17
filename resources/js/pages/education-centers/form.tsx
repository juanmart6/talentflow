import { Form, Head, Link } from '@inertiajs/react';
import { FieldLabel, SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
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

type InternHistoryItem = {
    id: number;
    first_name: string;
    last_name: string;
    dni_nie: string;
    email: string;
    phone: string;
    status: 'active' | 'finished' | 'abandoned' | string;
    internship_start_date: string | null;
    internship_end_date: string | null;
    deleted_at: string | null;
};

type Props = {
    mode: 'create' | 'edit' | 'show';
    center: CenterFormData | null;
    internsHistory?: InternHistoryItem[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Centros Educativos',
        href: educationCenters.index().url,
    },
];

function internStatusLabel(status: string): string {
    if (status === 'active') return 'Activo';
    if (status === 'finished') return 'Finalizado';
    if (status === 'abandoned') return 'Abandonado';

    return status;
}

export default function EducationCenterForm({ mode, center, internsHistory = [] }: Props) {
    const isCreate = mode === 'create';
    const isReadOnly = mode === 'show';
    const unifiedHoverClass = 'hover:bg-primary/90 hover:text-primary-foreground';
    const formRoute = isCreate
        ? educationCenters.store.form()
        : educationCenters.update.form(center?.id ?? 0);

    const hasAgreement = Boolean(center?.agreement_pdf_path);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreate ? 'Nuevo Centro Educativo' : isReadOnly ? 'Ver Centro Educativo' : 'Editar Centro Educativo'} />

            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                <div className="w-full max-w-5xl mx-auto">
                    <div className="flex flex-col gap-6">
                        {isCreate && (
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex flex-col gap-3">
                                    <h1 className="text-2xl font-bold">Nuevo Centro Educativo</h1>
                                    <p className="text-sm text-muted-foreground">
                                        Completa la información del centro, contacto y convenio principal.
                                    </p>
                                </div>

                                <Button variant="secondary" className={unifiedHoverClass} asChild>
                                    <Link href={educationCenters.index().url}>Volver al listado</Link>
                                </Button>
                            </div>
                        )}

                        <Form
                            {...formRoute}
                            options={{ preserveScroll: true }}
                            className="space-y-6"
                            encType="multipart/form-data"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <fieldset disabled={isReadOnly} className="space-y-6">
                                        <section className={UI_PRESETS.sectionCard}>
                                            <SectionIntro
                                                title="Datos del centro"
                                                description="Información principal del centro educativo y sus canales de contacto."
                                            />

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="grid gap-2 md:col-span-2">
                                                    <FieldLabel htmlFor="name">Nombre</FieldLabel>
                                                    <Input id="name" name="name" defaultValue={center?.name ?? ''} required />
                                                    <InputError message={errors.name} />
                                                </div>

                                                <div className="grid gap-2 md:col-span-2">
                                                    <FieldLabel htmlFor="address">Dirección</FieldLabel>
                                                    <Input id="address" name="address" defaultValue={center?.address ?? ''} required />
                                                    <InputError message={errors.address} />
                                                </div>

                                                <div className="grid gap-2">
                                                    <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                                                    <Input id="phone" name="phone" defaultValue={center?.phone ?? ''} required />
                                                    <InputError message={errors.phone} />
                                                </div>

                                                <div className="grid gap-2">
                                                    <FieldLabel htmlFor="institutional_email">Email institucional</FieldLabel>
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
                                                    <FieldLabel htmlFor="website">Web (opcional)</FieldLabel>
                                                    <Input id="website" name="website" defaultValue={center?.website ?? ''} />
                                                    <InputError message={errors.website} />
                                                </div>
                                            </div>
                                        </section>

                                    <section className={UI_PRESETS.sectionCard}>
                                        <SectionIntro
                                            title="Persona de contacto"
                                            description="Responsable de coordinación entre el centro y la organización."
                                        />

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="grid gap-2">
                                                <FieldLabel htmlFor="contact_name">Nombre</FieldLabel>
                                                <Input
                                                    id="contact_name"
                                                    name="contact_name"
                                                    defaultValue={center?.contact_name ?? ''}
                                                    required
                                                />
                                                <InputError message={errors.contact_name} />
                                            </div>

                                            <div className="grid gap-2">
                                                <FieldLabel htmlFor="contact_position">Cargo</FieldLabel>
                                                <Input
                                                    id="contact_position"
                                                    name="contact_position"
                                                    defaultValue={center?.contact_position ?? ''}
                                                    required
                                                />
                                                <InputError message={errors.contact_position} />
                                            </div>

                                            <div className="grid gap-2">
                                                <FieldLabel htmlFor="contact_phone">Teléfono</FieldLabel>
                                                <Input
                                                    id="contact_phone"
                                                    name="contact_phone"
                                                    defaultValue={center?.contact_phone ?? ''}
                                                    required
                                                />
                                                <InputError message={errors.contact_phone} />
                                            </div>

                                            <div className="grid gap-2">
                                                <FieldLabel htmlFor="contact_email">Email</FieldLabel>
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

                                    <section className={UI_PRESETS.sectionCard}>
                                        <SectionIntro
                                            title="Convenio de colaboración"
                                            description="Fechas, plazas acordadas y documento principal del convenio."
                                        />

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="grid gap-2">
                                                <FieldLabel htmlFor="agreement_signed_at">Fecha de firma</FieldLabel>
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
                                                <FieldLabel htmlFor="agreement_expires_at">Fecha de vencimiento</FieldLabel>
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
                                                <FieldLabel htmlFor="agreement_agreed_slots">Plazas acordadas</FieldLabel>
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
                                                <FieldLabel htmlFor="agreement_pdf">Documento PDF</FieldLabel>
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

                                    {isReadOnly && (
                                        <section className={UI_PRESETS.sectionCard}>
                                            <div className="flex items-center justify-between gap-2">
                                                <h2 className="text-lg font-bold">Histórico de becarios por centro</h2>
                                                <p className="text-sm text-muted-foreground">Total: {internsHistory.length}</p>
                                            </div>

                                            {internsHistory.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                    No hay becarios registrados para este centro.
                                                </p>
                                            ) : (
                                                <div className="relative w-full overflow-x-auto rounded-lg border border-sidebar-border/70 dark:border-sidebar-border">
                                                    <table className="w-full min-w-[980px] text-sm">
                                                        <thead className={UI_PRESETS.tableHead}>
                                                            <tr>
                                                                <th className="px-4 py-3 text-center font-semibold">Becario</th>
                                                                <th className="px-4 py-3 text-center font-semibold">Contacto</th>
                                                                <th className="px-4 py-3 text-center font-semibold">Período</th>
                                                                <th className="px-4 py-3 text-center font-semibold">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {internsHistory.map((intern, index) => (
                                                                <tr key={intern.id} className={`border-t align-middle ${stripedRowClass(index)}`}>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <p className="font-semibold">
                                                                            {intern.first_name} {intern.last_name}
                                                                        </p>
                                                                        <p className="text-muted-foreground">{intern.dni_nie}</p>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <p className="font-medium">{intern.email}</p>
                                                                        <p className="text-muted-foreground">{intern.phone}</p>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <p className="text-xs font-semibold text-muted-foreground">Inicio: {intern.internship_start_date ?? '-'}</p>
                                                                        <p className="text-xs font-semibold text-muted-foreground">Fin: {intern.internship_end_date ?? '-'}</p>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <p className="font-semibold">{internStatusLabel(intern.status)}</p>
                                                                        {intern.deleted_at && (
                                                                            <p className="text-xs text-muted-foreground">Eliminado del sistema</p>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </section>
                                    )}

                                    <div className="flex flex-col gap-2 border-t border-sidebar-border/70 pt-4 md:flex-row md:items-center md:justify-end dark:border-sidebar-border">
                                        {isReadOnly ? (
                                            <>
                                                <Button type="button" variant="secondary" className={unifiedHoverClass} asChild>
                                                    <Link href={educationCenters.index().url}>Volver al listado</Link>
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button className={unifiedHoverClass} disabled={processing}>
                                                    {processing ? 'Guardando...' : 'Guardar'}
                                                </Button>
                                                <Button type="button" variant="secondary" className={unifiedHoverClass} asChild>
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