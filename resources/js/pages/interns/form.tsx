import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { FieldLabel, SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INTERN_STATUS_META, type InternStatus } from '@/lib/intern-status';
import { MODE_CARD_CLASSES, UI_PRESETS } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import interns from '@/routes/interns';
import type { BreadcrumbItem } from '@/types';

type EducationCenterOption = {
    id: number;
    name: string;
};

type InternFormData = {
    id?: number;
    education_center_id?: number | null;
    first_name?: string;
    last_name?: string;
    dni_nie?: string;
    email?: string;
    phone?: string;
    address_line?: string;
    postal_code?: string;
    city?: string;
    province?: string;
    country?: string;
    training_cycle?: string;
    academic_year?: string;
    academic_tutor_name?: string;
    academic_tutor_email?: string | null;
    internship_start_date?: string | null;
    internship_end_date?: string | null;
    required_hours?: number | null;
    status?: 'active' | 'finished' | 'abandoned';
    abandonment_reason?: string | null;
    collaboration_agreement_path?: string | null;
    insurance_policy_path?: string | null;
    dni_scan_path?: string | null;
};

type DocumentHistoryItem = {
    filename: string;
    is_current: boolean;
    preview_url: string;
    download_url: string;
    uploaded_at: string;
};

type DocumentHistory = {
    collaboration_agreement: DocumentHistoryItem[];
    insurance_policy: DocumentHistoryItem[];
    dni_scan: DocumentHistoryItem[];
};

const MODE_LABELS: Record<'create' | 'edit' | 'show', string> = {
    create: 'Alta',
    edit: 'Edicion',
    show: 'Consulta',
};

type Props = {
    mode: 'create' | 'edit' | 'show';
    intern: InternFormData | null;
    educationCenters: EducationCenterOption[];
    documentHistory: DocumentHistory;
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestion de Becarios',
        href: interns.index().url,
    },
];

function toDateInput(value?: string | null): string {
    if (!value) {
        return '';
    }

    return value.slice(0, 10);
}

function documentTypeLabel(documentType: keyof DocumentHistory): string {
    const labels: Record<keyof DocumentHistory, string> = {
        collaboration_agreement: 'Convenio',
        insurance_policy: 'Seguro',
        dni_scan: 'DNI escaneado',
    };

    return labels[documentType];
}

export default function InternFormPage({ mode, intern, educationCenters, documentHistory }: Props) {
    const isCreate = mode === 'create';
    const isReadOnly = mode === 'show';
    const [expandedHistory, setExpandedHistory] = useState<Record<keyof DocumentHistory, boolean>>({
        collaboration_agreement: false,
        insurance_policy: false,
        dni_scan: false,
    });

    const { data, setData, post, transform, processing, errors } = useForm({
        education_center_id: intern?.education_center_id ? String(intern.education_center_id) : '',
        first_name: intern?.first_name ?? '',
        last_name: intern?.last_name ?? '',
        dni_nie: intern?.dni_nie ?? '',
        email: intern?.email ?? '',
        phone: intern?.phone ?? '',
        address_line: intern?.address_line ?? '',
        postal_code: intern?.postal_code ?? '',
        city: intern?.city ?? '',
        province: intern?.province ?? '',
        country: intern?.country ?? 'Espana',
        training_cycle: intern?.training_cycle ?? '',
        academic_year: intern?.academic_year ?? '',
        academic_tutor_name: intern?.academic_tutor_name ?? '',
        academic_tutor_email: intern?.academic_tutor_email ?? '',
        internship_start_date: toDateInput(intern?.internship_start_date),
        internship_end_date: toDateInput(intern?.internship_end_date),
        required_hours: intern?.required_hours ?? 0,
        status: intern?.status ?? 'active',
        abandonment_reason: intern?.abandonment_reason ?? '',
        collaboration_agreement_document: null as File | null,
        insurance_policy_document: null as File | null,
        dni_scan_document: null as File | null,
    });

    const currentStatus = data.status as InternStatus;

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isReadOnly) {
            return;
        }

        if (isCreate) {
            post(interns.store().url, { preserveScroll: true, forceFormData: true });
            return;
        }

        transform((formData) => ({ ...formData, _method: 'PUT' }));
        post(interns.update(intern?.id ?? 0).url, {
            preserveScroll: true,
            forceFormData: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreate ? 'Nuevo Becario' : isReadOnly ? 'Ver Becario' : 'Editar Becario'} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className={`grid auto-rows-min gap-4 ${isCreate ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    <div className={`rounded-xl bg-gradient-to-r p-4 ${MODE_CARD_CLASSES[mode]}`}>
                        <p className="text-sm text-white/80">Modo</p>
                        <p className="mt-2 text-2xl font-semibold">{MODE_LABELS[mode]}</p>
                    </div>
                    <div className={`rounded-xl bg-gradient-to-r p-4 ${INTERN_STATUS_META[currentStatus].cardClass}`}>
                        <p className={`text-sm ${INTERN_STATUS_META[currentStatus].cardSubtextClass}`}>Estado actual</p>
                        <p className="mt-2 text-2xl font-semibold">{INTERN_STATUS_META[currentStatus].label}</p>
                    </div>
                    {isCreate && (
                        <div className="rounded-xl bg-gradient-to-r from-slate-800 to-slate-700 p-4 text-white">
                            <p className="text-sm text-slate-200">Campos obligatorios</p>
                            <p className="mt-2 text-2xl font-semibold">16</p>
                        </div>
                    )}
                </div>

                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <div className="flex flex-col gap-4 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 className="text-2xl font-extrabold">{isCreate ? 'Nuevo Becario' : isReadOnly ? 'Ver Becario' : 'Editar Becario'}</h1>
                                <p className="text-sm text-muted-foreground">
                                    {isReadOnly
                                        ? 'Consulta datos personales, academicos y periodo de practicas.'
                                        : 'Completa datos personales, academicos y periodo de practicas.'}
                                </p>
                                <div className="mt-3">
                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${INTERN_STATUS_META[currentStatus].badgeClass}`}>
                                        {INTERN_STATUS_META[currentStatus].label}
                                    </span>
                                </div>
                            </div>

                            <Button variant="secondary" asChild>
                                <Link href={interns.index().url}>Volver al listado</Link>
                            </Button>
                        </div>

                        <form onSubmit={submit} className="space-y-6">
                            <fieldset disabled={isReadOnly} className="space-y-6">
                            <section className={UI_PRESETS.sectionCard}>
                                <SectionIntro
                                    title="Datos personales"
                                    description="Identificacion y datos de contacto del becario."
                                />

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="first_name">Nombre</FieldLabel>
                                        <Input id="first_name" value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} required />
                                        <InputError message={errors.first_name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="last_name">Apellidos</FieldLabel>
                                        <Input id="last_name" value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} required />
                                        <InputError message={errors.last_name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="dni_nie">DNI/NIE</FieldLabel>
                                        <Input id="dni_nie" value={data.dni_nie} onChange={(e) => setData('dni_nie', e.target.value)} required />
                                        <InputError message={errors.dni_nie} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="email">Email</FieldLabel>
                                        <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="phone">Telefono</FieldLabel>
                                        <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} required />
                                        <InputError message={errors.phone} />
                                    </div>

                                    <div className="grid gap-2 md:col-span-2">
                                        <FieldLabel htmlFor="address_line">Direccion</FieldLabel>
                                        <Input id="address_line" value={data.address_line} onChange={(e) => setData('address_line', e.target.value)} required />
                                        <InputError message={errors.address_line} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="postal_code">Codigo postal</FieldLabel>
                                        <Input id="postal_code" value={data.postal_code} onChange={(e) => setData('postal_code', e.target.value)} required />
                                        <InputError message={errors.postal_code} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="city">Ciudad</FieldLabel>
                                        <Input id="city" value={data.city} onChange={(e) => setData('city', e.target.value)} required />
                                        <InputError message={errors.city} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="province">Provincia</FieldLabel>
                                        <Input id="province" value={data.province} onChange={(e) => setData('province', e.target.value)} required />
                                        <InputError message={errors.province} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="country">Pais</FieldLabel>
                                        <Input id="country" value={data.country} onChange={(e) => setData('country', e.target.value)} required />
                                        <InputError message={errors.country} />
                                    </div>
                                </div>
                            </section>

                            <section className={UI_PRESETS.sectionCard}>
                                <SectionIntro
                                    title="Datos academicos y practicas"
                                    description="Centro, tutor, periodo y situacion de practicas."
                                />

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2 md:col-span-2">
                                        <FieldLabel htmlFor="education_center_id">Centro educativo</FieldLabel>
                                        <Select
                                            value={data.education_center_id}
                                            onValueChange={(value) => setData('education_center_id', value)}
                                            required
                                        >
                                            <SelectTrigger id="education_center_id" className={UI_PRESETS.selectTrigger}>
                                                <SelectValue placeholder="Selecciona un centro" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {educationCenters.map((center) => (
                                                    <SelectItem className={UI_PRESETS.selectItem} key={center.id} value={String(center.id)}>
                                                        {center.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.education_center_id} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="training_cycle">Ciclo formativo</FieldLabel>
                                        <Input id="training_cycle" value={data.training_cycle} onChange={(e) => setData('training_cycle', e.target.value)} required />
                                        <InputError message={errors.training_cycle} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="academic_year">Ano academico</FieldLabel>
                                        <Input id="academic_year" value={data.academic_year} onChange={(e) => setData('academic_year', e.target.value)} required />
                                        <InputError message={errors.academic_year} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="academic_tutor_name">Tutor academico</FieldLabel>
                                        <Input id="academic_tutor_name" value={data.academic_tutor_name} onChange={(e) => setData('academic_tutor_name', e.target.value)} required />
                                        <InputError message={errors.academic_tutor_name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="academic_tutor_email">Email tutor (opcional)</FieldLabel>
                                        <Input
                                            id="academic_tutor_email"
                                            type="email"
                                            value={data.academic_tutor_email}
                                            onChange={(e) => setData('academic_tutor_email', e.target.value)}
                                        />
                                        <InputError message={errors.academic_tutor_email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="internship_start_date">Fecha inicio</FieldLabel>
                                        <Input
                                            id="internship_start_date"
                                            type="date"
                                            value={data.internship_start_date}
                                            onChange={(e) => setData('internship_start_date', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.internship_start_date} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="internship_end_date">Fecha fin</FieldLabel>
                                        <Input
                                            id="internship_end_date"
                                            type="date"
                                            value={data.internship_end_date}
                                            onChange={(e) => setData('internship_end_date', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.internship_end_date} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="required_hours">Horas requeridas</FieldLabel>
                                        <Input
                                            id="required_hours"
                                            type="number"
                                            min={1}
                                            value={data.required_hours}
                                            onChange={(e) => setData('required_hours', Number(e.target.value))}
                                            required
                                        />
                                        <InputError message={errors.required_hours} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="status">Estado</FieldLabel>
                                        <Select
                                            value={data.status}
                                            onValueChange={(value) => setData('status', value as 'active' | 'finished' | 'abandoned')}
                                            required
                                        >
                                            <SelectTrigger id="status" className={UI_PRESETS.selectTrigger}>
                                                <SelectValue placeholder="Estado" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem className={UI_PRESETS.selectItem} value="active">Activo</SelectItem>
                                                <SelectItem className={UI_PRESETS.selectItem} value="finished">Finalizado</SelectItem>
                                                <SelectItem className={UI_PRESETS.selectItem} value="abandoned">Abandonado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.status} />
                                    </div>

                                    <div className="grid gap-2 md:col-span-2">
                                        <FieldLabel htmlFor="abandonment_reason">Motivo abandono (opcional)</FieldLabel>
                                        <Input
                                            id="abandonment_reason"
                                            value={data.abandonment_reason}
                                            onChange={(e) => setData('abandonment_reason', e.target.value)}
                                        />
                                        <InputError message={errors.abandonment_reason} />
                                    </div>
                                </div>
                            </section>

                            <section className={UI_PRESETS.sectionCard}>
                                <SectionIntro
                                    title="Documentacion adjunta"
                                    description="Cada nueva subida queda como principal y el historico se conserva para consulta."
                                />

                                <div className="grid gap-4 md:grid-cols-3">
                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="collaboration_agreement_document">Convenio</FieldLabel>
                                        <Input
                                            id="collaboration_agreement_document"
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setData('collaboration_agreement_document', e.target.files?.[0] ?? null)}
                                        />
                                        <InputError message={errors.collaboration_agreement_document} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="insurance_policy_document">Seguro</FieldLabel>
                                        <Input
                                            id="insurance_policy_document"
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setData('insurance_policy_document', e.target.files?.[0] ?? null)}
                                        />
                                        <InputError message={errors.insurance_policy_document} />
                                    </div>

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="dni_scan_document">DNI escaneado</FieldLabel>
                                        <Input
                                            id="dni_scan_document"
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onChange={(e) => setData('dni_scan_document', e.target.files?.[0] ?? null)}
                                        />
                                        <InputError message={errors.dni_scan_document} />
                                    </div>
                                </div>

                                {!isCreate && (
                                    <div className="grid gap-4 pt-2 md:grid-cols-3">
                                        {(Object.keys(documentHistory) as Array<keyof DocumentHistory>).map((documentType) => {
                                            const documents = documentHistory[documentType];
                                            const currentDocument = documents.find((item) => item.is_current) ?? documents[0] ?? null;
                                            const hasHistory = documents.length > 1;
                                            const showFullHistory = !isReadOnly || expandedHistory[documentType];
                                            const visibleDocuments = showFullHistory
                                                ? documents
                                                : currentDocument
                                                    ? [currentDocument]
                                                    : [];

                                            return (
                                            <article key={documentType} className="rounded-lg border border-sidebar-border/70 bg-slate-50/60 p-3 dark:border-sidebar-border dark:bg-slate-900/30">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold">{documentTypeLabel(documentType)}</p>
                                                    {isReadOnly && hasHistory && (
                                                        <span
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => setExpandedHistory((previous) => ({
                                                                ...previous,
                                                                [documentType]: !previous[documentType],
                                                            }))}
                                                            onKeyDown={(event) => {
                                                                if (event.key === 'Enter' || event.key === ' ') {
                                                                    event.preventDefault();
                                                                    setExpandedHistory((previous) => ({
                                                                        ...previous,
                                                                        [documentType]: !previous[documentType],
                                                                    }));
                                                                }
                                                            }}
                                                            className="text-xs font-semibold text-primary underline"
                                                        >
                                                            {expandedHistory[documentType]
                                                                ? 'Ocultar historial'
                                                                : `Ver historial (${documents.length - 1})`}
                                                        </span>
                                                    )}
                                                </div>
                                                <ul className="mt-3 space-y-2 text-sm">
                                                    {visibleDocuments.length > 0 ? (
                                                        visibleDocuments.map((item) => (
                                                            <li key={`${documentType}-${item.filename}`} className="rounded-md border border-sidebar-border/60 bg-white p-2 dark:border-sidebar-border dark:bg-slate-950/40">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className="max-w-[180px] truncate font-medium" title={item.filename}>{item.filename}</span>
                                                                    {item.is_current && <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Principal</span>}
                                                                </div>
                                                                <p className="mt-1 text-xs text-muted-foreground">Subido: {item.uploaded_at}</p>
                                                                <div className="mt-2 flex gap-3 text-xs">
                                                                    <a href={item.preview_url} target="_blank" rel="noreferrer" className="font-medium text-primary underline">
                                                                        Previsualizar
                                                                    </a>
                                                                    <a href={item.download_url} className="font-medium text-primary underline">
                                                                        Descargar
                                                                    </a>
                                                                </div>
                                                            </li>
                                                        ))
                                                    ) : (
                                                        <li className="text-muted-foreground">Sin documentos.</li>
                                                    )}
                                                </ul>
                                            </article>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                            </fieldset>

                            <div className="flex gap-2 border-t border-sidebar-border/70 bg-background/80 pt-3 dark:border-sidebar-border">
                                {isReadOnly ? (
                                    <>
                                        <Button asChild>
                                            <Link href={interns.edit(intern?.id ?? 0).url}>Editar</Link>
                                        </Button>
                                        <Button type="button" variant="secondary" asChild>
                                            <Link href={interns.index().url}>Volver al listado</Link>
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <Button disabled={processing}>{processing ? 'Guardando...' : 'Guardar'}</Button>
                                        <Button type="button" variant="secondary" asChild>
                                            <Link href={interns.index().url}>Cancelar</Link>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
