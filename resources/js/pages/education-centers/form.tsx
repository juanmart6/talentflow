import { Form, Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { FieldLabel, FormPageHeader, SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import educationCenters from '@/routes/education-centers';
import interns from '@/routes/interns';
import { toast } from 'sonner';
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
    training_program_ids?: number[];
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
    training_program_name?: string | null;
    status: 'active' | 'upcoming_active' | 'finished' | 'abandoned' | string;
    internship_start_date: string | null;
    internship_end_date: string | null;
    deleted_at: string | null;
};

type AgreementHistoryItem = {
    id: number;
    is_current: boolean;
    signed_at: string | null;
    expires_at: string | null;
    agreed_slots: number | null;
    filename: string;
    preview_url: string | null;
    uploaded_at: string | null;
};

type Props = {
    mode: 'create' | 'edit' | 'show';
    center: CenterFormData | null;
    trainingPrograms: Array<{ id: number; name: string }>;
    agreementHistory?: AgreementHistoryItem[];
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
    if (status === 'upcoming_active') return 'Activo proximamente';
    if (status === 'finished') return 'Finalizado';
    if (status === 'abandoned') return 'Abandonado';

    return status;
}

function internStatusBadgeClass(status: string): string {
    if (status === 'active') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200';
    if (status === 'upcoming_active') return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-200';
    if (status === 'finished') return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
    if (status === 'abandoned') return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200';

    return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

function formatSpanishDate(date: string | null): string {
    if (!date) {
        return '-';
    }

    const [year, month, day] = date.slice(0, 10).split('-');

    if (!year || !month || !day) {
        return date;
    }

    return `${day}/${month}/${year}`;
}

type FileUploadFieldProps = {
    id: string;
    name: string;
    label: string;
    accept: string;
    error?: string;
    required?: boolean;
    selectedFileName?: string | null;
    onChange?: (fileName: string | null) => void;
};

function FileUploadField({ id, name, label, accept, error, required, selectedFileName, onChange }: FileUploadFieldProps) {
    return (
        <div className="grid gap-2">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <div className="flex min-h-9 items-center gap-3 text-sm">
                <label
                    htmlFor={id}
                    className="inline-flex h-9 cursor-pointer items-center rounded-md border border-[#2563eb]/35 bg-white px-3 text-sm font-medium text-[#1d4ed8] shadow-xs transition-colors hover:border-[#2563eb]/60 hover:bg-[#2563eb]/10 dark:border-[#2563eb]/45 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-[#2563eb]/20"
                >
                    Seleccionar archivo
                </label>
                <span className="truncate text-muted-foreground">
                    {selectedFileName ?? 'Ningún archivo seleccionado'}
                </span>
                <Input
                    id={id}
                    type="file"
                    name={name}
                    accept={accept}
                    required={required}
                    className="sr-only"
                    onChange={(event) => onChange?.(event.target.files?.[0]?.name ?? null)}
                />
            </div>
            <InputError message={error} />
        </div>
    );
}

export default function EducationCenterForm({ mode, center, trainingPrograms, agreementHistory = [], internsHistory = [] }: Props) {
    const isCreate = mode === 'create';
    const isReadOnly = mode === 'show';
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const lastFlashRef = useRef<string | null>(null);
    const [selectedAgreementFileName, setSelectedAgreementFileName] = useState<string | null>(null);
    const formRoute = isCreate
        ? educationCenters.store.form()
        : educationCenters.update.form(center?.id ?? 0);

    useEffect(() => {
        const successMessage = page.props.flash?.success;
        const errorMessage = page.props.flash?.error;
        const flashKey = successMessage ? `success:${successMessage}` : errorMessage ? `error:${errorMessage}` : null;

        if (!flashKey || lastFlashRef.current === flashKey) {
            return;
        }

        lastFlashRef.current = flashKey;

        if (successMessage) {
            toast.success(successMessage);
        }

        if (errorMessage) {
            toast.error(errorMessage);
        }
    }, [page.props.flash?.success, page.props.flash?.error]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreate ? 'Nuevo Centro Educativo' : isReadOnly ? 'Ver Centro Educativo' : 'Editar Centro Educativo'} />

            <div className={UI_PRESETS.pageContent}>
                <div className={UI_PRESETS.pageSection}>
                    <FormPageHeader
                        title={isCreate ? 'Nuevo Centro Educativo' : isReadOnly ? 'Ver Centro Educativo' : 'Editar Centro Educativo'}
                        description="Completa la información del centro, contacto y convenio principal."
                        action={(
                            <Button variant="secondary" asChild>
                                <Link href={educationCenters.index().url}>Volver al listado</Link>
                            </Button>
                        )}
                    />

                    <Form
                        {...formRoute}
                        options={{ preserveScroll: true }}
                        className="space-y-2"
                        encType="multipart/form-data"
                    >
                        {({ processing, errors }) => (
                            <>
                                <fieldset
                                    disabled={isReadOnly}
                                    className={`space-y-2 ${isReadOnly ? UI_PRESETS.readOnlyFieldset : ''}`}
                                >
                                        <section className={UI_PRESETS.sectionCard}>
                                            <SectionIntro
                                                title="Datos del centro"
                                                description="Información principal del centro educativo y sus canales de contacto."
                                            />

                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div className="grid gap-2 md:col-span-2">
                                                    <FieldLabel htmlFor="name">Nombre</FieldLabel>
                                                    <Input id="name" name="name" defaultValue={center?.name ?? ''} className={UI_PRESETS.simpleSearchInput} required />
                                                    <InputError message={errors.name} />
                                                </div>

                                                <div className="grid gap-2 md:col-span-2">
                                                    <FieldLabel htmlFor="address">Dirección</FieldLabel>
                                                    <Input id="address" name="address" defaultValue={center?.address ?? ''} className={UI_PRESETS.simpleSearchInput} required />
                                                    <InputError message={errors.address} />
                                                </div>

                                                <div className="grid gap-2">
                                                    <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                                                    <Input id="phone" name="phone" defaultValue={center?.phone ?? ''} className={UI_PRESETS.simpleSearchInput} required />
                                                    <InputError message={errors.phone} />
                                                </div>

                                                <div className="grid gap-2">
                                                    <FieldLabel htmlFor="institutional_email">Email institucional</FieldLabel>
                                                    <Input
                                                        id="institutional_email"
                                                        type="email"
                                                        name="institutional_email"
                                                        defaultValue={center?.institutional_email ?? ''}
                                                        className={UI_PRESETS.simpleSearchInput}
                                                        required
                                                    />
                                                    <InputError message={errors.institutional_email} />
                                                </div>

                                                <div className="grid gap-2 md:col-span-2">
                                                    <FieldLabel htmlFor="website">Web (opcional)</FieldLabel>
                                                    <Input id="website" name="website" defaultValue={center?.website ?? ''} className={UI_PRESETS.simpleSearchInput} />
                                                    <InputError message={errors.website} />
                                                </div>

                                                <div className="grid gap-2 md:col-span-2">
                                                    <FieldLabel htmlFor="training-programs-group">Grados formativos</FieldLabel>
                                                    <div
                                                        id="training-programs-group"
                                                        className={`grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700 md:grid-cols-2 ${
                                                            isReadOnly
                                                                ? 'bg-slate-100/90 dark:bg-slate-900/45'
                                                                : 'bg-white dark:bg-slate-950'
                                                        }`}
                                                    >
                                                        {trainingPrograms.map((program) => (
                                                            <label
                                                                key={program.id}
                                                                htmlFor={`training_program_${program.id}`}
                                                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                                                                    isReadOnly
                                                                        ? 'border-slate-200 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-900/45'
                                                                        : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950'
                                                                }`}
                                                            >
                                                                <input
                                                                    id={`training_program_${program.id}`}
                                                                    type="checkbox"
                                                                    name="training_program_ids[]"
                                                                    value={program.id}
                                                                    defaultChecked={center?.training_program_ids?.includes(program.id) ?? false}
                                                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30 disabled:cursor-default disabled:opacity-100"
                                                                />
                                                                <span>{program.name}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <InputError message={errors.training_program_ids ?? errors['training_program_ids.0']} />
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
                                                        className={UI_PRESETS.simpleSearchInput}
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
                                                        className={UI_PRESETS.simpleSearchInput}
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
                                                        className={UI_PRESETS.simpleSearchInput}
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
                                                        className={UI_PRESETS.simpleSearchInput}
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

                                            {!isReadOnly && (
                                                <div className="grid gap-4 md:grid-cols-2">
                                                    <div className="grid gap-2">
                                                        <FieldLabel htmlFor="agreement_signed_at">Fecha de firma</FieldLabel>
                                                        <Input
                                                            id="agreement_signed_at"
                                                            type="date"
                                                            name="agreement_signed_at"
                                                            defaultValue={center?.agreement_signed_at ?? ''}
                                                            className={UI_PRESETS.simpleSearchInput}
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
                                                            className={UI_PRESETS.simpleSearchInput}
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
                                                            className={UI_PRESETS.simpleSearchInput}
                                                            required
                                                        />
                                                        <InputError message={errors.agreement_agreed_slots} />
                                                    </div>

                                                    <FileUploadField
                                                        id="agreement_pdf"
                                                        name="agreement_pdf"
                                                        label="Documento PDF"
                                                        accept="application/pdf"
                                                        required={isCreate}
                                                        error={errors.agreement_pdf}
                                                        selectedFileName={selectedAgreementFileName}
                                                        onChange={setSelectedAgreementFileName}
                                                    />
                                                </div>
                                            )}

                                            {!isCreate && agreementHistory.length > 0 && (
                                                <div className="grid gap-3">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-sm font-semibold">Historial de convenios</p>
                                                        <p className="text-xs text-muted-foreground">Total: {agreementHistory.length}</p>
                                                    </div>

                                                    <div className="grid gap-3">
                                                        {agreementHistory.map((agreement) => (
                                                            <article
                                                                key={agreement.id}
                                                                className="rounded-lg border border-sidebar-border/70 bg-slate-50/60 p-3 dark:border-sidebar-border dark:bg-slate-900/30"
                                                            >
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="font-medium">{agreement.filename}</span>
                                                                </div>

                                                                <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
                                                                    <p>Firma: {formatSpanishDate(agreement.signed_at)}</p>
                                                                    <p>Vence: {formatSpanishDate(agreement.expires_at)}</p>
                                                                    <p>Plazas: {agreement.agreed_slots ?? '-'}</p>
                                                                    <p>Subido: {formatSpanishDate(agreement.uploaded_at)}</p>
                                                                </div>

                                                                {agreement.preview_url && (
                                                                    <div className="mt-3">
                                                                        <a
                                                                            href={agreement.preview_url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="text-sm font-medium text-primary underline underline-offset-2"
                                                                        >
                                                                            Ver PDF
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </article>
                                                        ))}
                                                    </div>
                                                </div>
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
                                                    <table className="w-full min-w-[920px] table-fixed text-sm">
                                                        <colgroup>
                                                            <col className="w-1/4" />
                                                            <col className="w-1/4" />
                                                            <col className="w-1/4" />
                                                            <col className="w-1/4" />
                                                        </colgroup>
                                                        <thead className={UI_PRESETS.tableHead}>
                                                            <tr>
                                                                <th className="px-4 py-3 text-center font-semibold">Becario</th>
                                                                <th className="px-4 py-3 text-center font-semibold">Ciclo formativo</th>
                                                                <th className="px-4 py-3 text-center font-semibold">Período</th>
                                                                <th className="px-4 py-3 text-center font-semibold">Estado</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {internsHistory.map((intern, index) => (
                                                                <tr key={intern.id} className={`h-20 border-t align-middle ${stripedRowClass(index)}`}>
                                                                    <td className="px-4 py-3 text-center align-middle">
                                                                        <Link
                                                                            href={interns.show(intern.id).url}
                                                                            className="font-semibold leading-tight text-primary underline-offset-2 hover:underline"
                                                                        >
                                                                            {intern.first_name} {intern.last_name}
                                                                        </Link>
                                                                        <p className="mt-1 text-xs text-muted-foreground">{intern.dni_nie}</p>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center align-middle">
                                                                        <p className="font-medium leading-tight">{intern.training_program_name ?? '-'}</p>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center align-middle">
                                                                        <p className="text-xs font-semibold text-muted-foreground">Inicio: {formatSpanishDate(intern.internship_start_date)}</p>
                                                                        <p className="mt-1 text-xs font-semibold text-muted-foreground">Fin: {formatSpanishDate(intern.internship_end_date)}</p>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center align-middle">
                                                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${internStatusBadgeClass(intern.status)}`}>
                                                                            {internStatusLabel(intern.status)}
                                                                        </span>
                                                                        {intern.deleted_at && (
                                                                            <p className="mt-1 text-xs text-muted-foreground">Eliminado del sistema</p>
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
                                            <Button type="button" variant="secondary" asChild>
                                                <Link href={educationCenters.index().url}>Volver al listado</Link>
                                            </Button>
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
        </AppLayout>
    );
}

