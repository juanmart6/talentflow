import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, FileText, Paperclip, User } from 'lucide-react';
import { FieldLabel, FormPageHeader, SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { INTERN_STATUS_META, type InternStatus } from '@/lib/intern-status';
import { UI_PRESETS } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import interns from '@/routes/interns';
import { toast } from 'sonner';
import type { BreadcrumbItem } from '@/types';

type EducationCenterOption = {
    id: number;
    name: string;
    training_programs: TrainingProgramOption[];
};

type TrainingProgramOption = {
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
    training_program_id?: number | null;
    academic_year?: string;
    academic_tutor_name?: string;
    academic_tutor_email?: string | null;
    internship_start_date?: string | null;
    internship_end_date?: string | null;
    required_hours?: number | null;
    status?: InternStatus;
    abandonment_reason?: string | null;
    abandonment_date?: string | null;
    general_notes?: string | null;
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

type Props = {
    mode: 'create' | 'edit' | 'show';
    intern: InternFormData | null;
    educationCenters: EducationCenterOption[];
    documentHistory: DocumentHistory;
};

type InternFormTab = 'personal' | 'academic' | 'documents' | 'general';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestión de Becarios',
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

type FileUploadFieldProps = {
    id: string;
    label: string;
    accept: string;
    file: File | null;
    error?: string;
    onChange: (file: File | null) => void;
};

function FileUploadField({ id, label, accept, file, error, onChange }: FileUploadFieldProps) {
    return (
        <div className="grid gap-2">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <div className="flex min-h-9 min-w-0 items-center gap-3 text-sm">
                <label
                    htmlFor={id}
                    className="inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border border-[#2563eb]/35 bg-white px-4 text-sm font-medium text-[#1d4ed8] shadow-xs transition-colors hover:border-[#2563eb]/60 hover:bg-[#2563eb]/10 dark:border-[#2563eb]/45 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-[#2563eb]/20"
                >
                    Seleccionar archivo
                </label>
                <span className={`${file ? 'min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200' : 'min-w-0 flex-1 truncate text-muted-foreground'}`}>
                    {file?.name ?? 'Ningún archivo seleccionado'}
                </span>
                <Input
                    id={id}
                    type="file"
                    accept={accept}
                    className="sr-only"
                    onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                />
            </div>
            <InputError message={error} />
        </div>
    );
}

export default function InternFormPage({ mode, intern, educationCenters, documentHistory }: Props) {
    const isCreate = mode === 'create';
    const isReadOnly = mode === 'show';
    const hasEducationCenters = educationCenters.length > 0;
    const page = usePage<{ flash?: { success?: string; error?: string } }>();
    const lastFlashRef = useRef<string | null>(null);
    const [expandedHistory, setExpandedHistory] = useState<Record<keyof DocumentHistory, boolean>>({
        collaboration_agreement: false,
        insurance_policy: false,
        dni_scan: false,
    });
    const [activeTab, setActiveTab] = useState<InternFormTab>('personal');

    const { data, setData, post, transform, processing, errors } = useForm({
        education_center_id: intern?.education_center_id ? String(intern.education_center_id) : '',
        training_program_id: intern?.training_program_id ? String(intern.training_program_id) : '',
        first_name: intern?.first_name ?? '',
        last_name: intern?.last_name ?? '',
        dni_nie: intern?.dni_nie ?? '',
        email: intern?.email ?? '',
        phone: intern?.phone ?? '',
        address_line: intern?.address_line ?? '',
        postal_code: intern?.postal_code ?? '',
        city: intern?.city ?? '',
        province: intern?.province ?? '',
        country: intern?.country ?? 'España',
        academic_year: intern?.academic_year ?? '',
        academic_tutor_name: intern?.academic_tutor_name ?? '',
        academic_tutor_email: intern?.academic_tutor_email ?? '',
        internship_start_date: toDateInput(intern?.internship_start_date),
        internship_end_date: toDateInput(intern?.internship_end_date),
        required_hours: intern?.required_hours ?? 0,
        status: intern?.status === 'abandoned' ? 'abandoned' : 'active',
        abandonment_reason: intern?.abandonment_reason ?? '',
        abandonment_date: toDateInput(intern?.abandonment_date),
        general_notes: intern?.general_notes ?? '',
        collaboration_agreement_document: null as File | null,
        insurance_policy_document: null as File | null,
        dni_scan_document: null as File | null,
    });

    const computedStatus = useMemo<InternStatus>(() => {
        if (data.status === 'abandoned') {
            return 'abandoned';
        }

        if (!data.internship_start_date || !data.internship_end_date) {
            return 'active';
        }

        const today = new Date().toISOString().slice(0, 10);

        if (today < data.internship_start_date) {
            return 'upcoming_active';
        }

        if (today > data.internship_end_date) {
            return 'finished';
        }

        return 'active';
    }, [data.status, data.internship_start_date, data.internship_end_date]);
    const isAbandoned = data.status === 'abandoned';
    const selectedCenter = useMemo(
        () => educationCenters.find((center) => String(center.id) === data.education_center_id) ?? null,
        [educationCenters, data.education_center_id],
    );
    const availableTrainingPrograms = selectedCenter?.training_programs ?? [];
    const hasTrainingPrograms = availableTrainingPrograms.length > 0;

    useEffect(() => {
        if (
            data.training_program_id !== ''
            && !availableTrainingPrograms.some((program) => String(program.id) === data.training_program_id)
        ) {
            setData('training_program_id', '');
        }
    }, [availableTrainingPrograms, data.training_program_id, setData]);

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

    const showAgreementDateToastIfNeeded = (formErrors: Partial<Record<string, string>>) => {
        const agreementDateError = formErrors.internship_end_date;
        if (agreementDateError?.includes('Las fechas de practicas deben estar dentro del periodo de un convenio del centro educativo.')) {
            toast.error('Las fechas de practicas deben estar dentro del periodo de un convenio del centro educativo.');
        }
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isReadOnly) {
            return;
        }

        if (isCreate) {
            if (!hasEducationCenters) {
                toast.error('No hay centros educativos disponibles. Crea un centro antes de crear un becario.');
                return;
            }

            post(interns.store().url, {
                preserveScroll: true,
                forceFormData: true,
                onError: (formErrors) => showAgreementDateToastIfNeeded(formErrors),
            });
            return;
        }

        transform((formData) => ({ ...formData, _method: 'PUT' }));
        post(interns.update(intern?.id ?? 0).url, {
            preserveScroll: true,
            forceFormData: true,
            onError: (formErrors) => showAgreementDateToastIfNeeded(formErrors),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreate ? 'Nuevo Becario' : isReadOnly ? 'Ver Becario' : 'Editar Becario'} />

            <div className={UI_PRESETS.pageContent}>
                <div className={UI_PRESETS.pageSection}>
                    <FormPageHeader
                        title={isCreate ? 'Nuevo Becario' : isReadOnly ? 'Ver Becario' : 'Editar Becario'}
                        description="Completa datos personales, académicos y período de prácticas."
                        action={(
                            <Button variant="secondary" asChild>
                                <Link href={interns.index().url}>Volver al listado</Link>
                            </Button>
                        )}
                    />

                    <form onSubmit={submit} className="space-y-2">
                            <section className={UI_PRESETS.sectionCard}>
                                <div className="-mx-4 -mt-4 border-b border-sidebar-border/70 px-4 pt-4 dark:border-sidebar-border">
                                    <div className="flex flex-wrap items-end gap-1.5">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                                                activeTab === 'personal'
                                                    ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                                                    : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                                            }`}
                                            onClick={() => setActiveTab('personal')}
                                        >
                                            <User className="mr-1.5 size-4 shrink-0" />
                                            Personales
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                                                activeTab === 'academic'
                                                    ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                                                    : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                                            }`}
                                            onClick={() => setActiveTab('academic')}
                                        >
                                            <Briefcase className="mr-1.5 size-4 shrink-0" />
                                            Prácticas
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                                                activeTab === 'documents'
                                                    ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                                                    : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                                            }`}
                                            onClick={() => setActiveTab('documents')}
                                        >
                                            <Paperclip className="mr-1.5 size-4 shrink-0" />
                                            Adjuntos
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={`h-9 min-w-[118px] justify-center rounded-b-none border border-b-0 px-3 cursor-pointer ${
                                                activeTab === 'general'
                                                    ? 'border-[#2563eb]/45 bg-white text-[#1d4ed8] shadow-sm hover:bg-white dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-slate-950'
                                                    : 'border-transparent text-muted-foreground hover:border-[#2563eb]/30 hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:hover:border-[#2563eb]/40 dark:hover:bg-[#2563eb]/15 dark:hover:text-sky-300'
                                            }`}
                                            onClick={() => setActiveTab('general')}
                                        >
                                            <FileText className="mr-1.5 size-4 shrink-0" />
                                            Notas
                                        </Button>
                                    </div>
                                </div>

                            <fieldset
                                disabled={isReadOnly}
                                className={`space-y-4 ${isReadOnly ? UI_PRESETS.readOnlyFieldset : ''}`}
                            >

                                {activeTab === 'personal' && (
                                <section className="space-y-4 pt-4">
                                    <SectionIntro
                                        title="Datos personales"
                                        description="Identificación y datos de contacto del becario."
                                    />

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="first_name">Nombre</FieldLabel>
                                            <Input id="first_name" value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.first_name} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="last_name">Apellidos</FieldLabel>
                                            <Input id="last_name" value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.last_name} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="dni_nie">DNI/NIE</FieldLabel>
                                            <Input id="dni_nie" value={data.dni_nie} onChange={(e) => setData('dni_nie', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.dni_nie} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="email">Email</FieldLabel>
                                            <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.email} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                                            <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.phone} />
                                        </div>
                                        <div className="grid gap-2 md:col-span-2">
                                            <FieldLabel htmlFor="address_line">Dirección</FieldLabel>
                                            <Input id="address_line" value={data.address_line} onChange={(e) => setData('address_line', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.address_line} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="postal_code">Código postal</FieldLabel>
                                            <Input id="postal_code" value={data.postal_code} onChange={(e) => setData('postal_code', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.postal_code} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="city">Ciudad</FieldLabel>
                                            <Input id="city" value={data.city} onChange={(e) => setData('city', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.city} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="province">Provincia</FieldLabel>
                                            <Input id="province" value={data.province} onChange={(e) => setData('province', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.province} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="country">País</FieldLabel>
                                            <Input id="country" value={data.country} onChange={(e) => setData('country', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.country} />
                                        </div>
                                    </div>
                                </section>
                                )}

                                {activeTab === 'academic' && (
                                <section className="space-y-4 pt-4">
                                    <SectionIntro
                                        title="Datos académicos y prácticas"
                                        description="Centro, tutor, período y situación de prácticas."
                                    />

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="grid gap-2 md:col-span-2">
                                            <FieldLabel htmlFor="education_center_id">Centro educativo</FieldLabel>
                                            <Select
                                                value={data.education_center_id}
                                                onValueChange={(value) => {
                                                    setData('education_center_id', value);
                                                    setData('training_program_id', '');
                                                }}
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
                                            {!hasEducationCenters ? (
                                                <p className="text-xs text-destructive">
                                                    No hay centros educativos disponibles. Crea uno primero para poder dar de alta becarios.
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="training_program_id">Ciclo formativo</FieldLabel>
                                            <Select
                                                value={data.training_program_id}
                                                onValueChange={(value) => setData('training_program_id', value)}
                                                disabled={!selectedCenter || !hasTrainingPrograms}
                                                required
                                            >
                                                <SelectTrigger id="training_program_id" className={UI_PRESETS.selectTrigger}>
                                                    <SelectValue
                                                        placeholder={
                                                            !selectedCenter
                                                                ? 'Selecciona primero un centro'
                                                                : hasTrainingPrograms
                                                                    ? 'Selecciona un grado'
                                                                    : 'El centro no tiene grados'
                                                        }
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableTrainingPrograms.map((program) => (
                                                        <SelectItem className={UI_PRESETS.selectItem} key={program.id} value={String(program.id)}>
                                                            {program.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.training_program_id} />
                                            {selectedCenter && !hasTrainingPrograms ? (
                                                <p className="text-xs text-destructive">
                                                    El centro seleccionado no tiene grados formativos configurados.
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="academic_year">Año académico</FieldLabel>
                                            <Input id="academic_year" value={data.academic_year} onChange={(e) => setData('academic_year', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.academic_year} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="academic_tutor_name">Tutor académico</FieldLabel>
                                            <Input id="academic_tutor_name" value={data.academic_tutor_name} onChange={(e) => setData('academic_tutor_name', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.academic_tutor_name} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="academic_tutor_email">Email tutor (opcional)</FieldLabel>
                                            <Input id="academic_tutor_email" type="email" value={data.academic_tutor_email} onChange={(e) => setData('academic_tutor_email', e.target.value)} className={UI_PRESETS.simpleSearchInput} />
                                            <InputError message={errors.academic_tutor_email} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="internship_start_date">Fecha inicio</FieldLabel>
                                            <Input id="internship_start_date" type="date" value={data.internship_start_date} onChange={(e) => setData('internship_start_date', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.internship_start_date} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="internship_end_date">Fecha fin</FieldLabel>
                                            <Input id="internship_end_date" type="date" value={data.internship_end_date} onChange={(e) => setData('internship_end_date', e.target.value)} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.internship_end_date === 'Las fechas de practicas deben estar dentro del periodo de un convenio del centro educativo.' ? '' : errors.internship_end_date} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="required_hours">Horas requeridas</FieldLabel>
                                            <Input id="required_hours" type="number" min={1} value={data.required_hours} onChange={(e) => setData('required_hours', Number(e.target.value))} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.required_hours} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="status">Estado</FieldLabel>
                                            {isReadOnly ? (
                                                <Input
                                                    id="status"
                                                    value={INTERN_STATUS_META[computedStatus].label}
                                                    className={UI_PRESETS.simpleSearchInput}
                                                    readOnly
                                                    disabled
                                                />
                                            ) : (
                                                <Select value={data.status} onValueChange={(value) => setData('status', value as 'active' | 'abandoned')} required>
                                                    <SelectTrigger id="status" className={UI_PRESETS.selectTrigger}>
                                                        <SelectValue placeholder="Estado" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem className={UI_PRESETS.selectItem} value="active">Automatico (segun fechas)</SelectItem>
                                                        <SelectItem className={UI_PRESETS.selectItem} value="abandoned">Abandonado</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            <InputError message={errors.status} />
                                        </div>
                                        <div className="grid gap-2 md:col-span-2">
                                            <FieldLabel htmlFor="abandonment_reason">Motivo abandono (opcional)</FieldLabel>
                                            <Input id="abandonment_reason" value={data.abandonment_reason} onChange={(e) => setData('abandonment_reason', e.target.value)} className={UI_PRESETS.simpleSearchInput} />
                                            <InputError message={errors.abandonment_reason} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="abandonment_date">Fecha abandono (opcional)</FieldLabel>
                                            <Input
                                                id="abandonment_date"
                                                type="date"
                                                value={data.abandonment_date}
                                                onChange={(e) => setData('abandonment_date', e.target.value)}
                                                className={UI_PRESETS.simpleSearchInput}
                                                required={isAbandoned}
                                            />
                                            <InputError message={errors.abandonment_date} />
                                        </div>
                                    </div>
                                </section>
                                )}

                                {activeTab === 'documents' && (
                                <section className="space-y-4 pt-4">
                                    <SectionIntro
                                        title="Documentación adjunta"
                                        description="Cada nueva subida queda como principal y el histórico se conserva para consulta."
                                    />

                                    {!isReadOnly && (
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <FileUploadField id="collaboration_agreement_document" label="Convenio" accept=".pdf,.jpg,.jpeg,.png" file={data.collaboration_agreement_document} error={errors.collaboration_agreement_document} onChange={(file) => setData('collaboration_agreement_document', file)} />
                                            <FileUploadField id="insurance_policy_document" label="Seguro" accept=".pdf,.jpg,.jpeg,.png" file={data.insurance_policy_document} error={errors.insurance_policy_document} onChange={(file) => setData('insurance_policy_document', file)} />
                                            <FileUploadField id="dni_scan_document" label="DNI escaneado" accept=".pdf,.jpg,.jpeg,.png" file={data.dni_scan_document} error={errors.dni_scan_document} onChange={(file) => setData('dni_scan_document', file)} />
                                        </div>
                                    )}

                                    {!isCreate && (
                                        <div className="grid gap-4 pt-2 md:grid-cols-3">
                                            {(Object.keys(documentHistory) as Array<keyof DocumentHistory>).map((documentType) => {
                                                const documents = documentHistory[documentType];
                                                const currentDocument = documents.find((item) => item.is_current) ?? documents[0] ?? null;
                                                const hasHistory = documents.length > 1;
                                                const showFullHistory = !isReadOnly || expandedHistory[documentType];
                                                const visibleDocuments = showFullHistory ? documents : currentDocument ? [currentDocument] : [];

                                                return (
                                                    <article
                                                        key={documentType}
                                                        className={`rounded-lg border p-3 ${
                                                            isReadOnly
                                                                ? 'border-slate-200 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-900/45'
                                                                : 'border-sidebar-border/70 bg-slate-50/60 dark:border-sidebar-border dark:bg-slate-900/30'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-sm font-semibold">{documentTypeLabel(documentType)}</p>
                                                            {isReadOnly && hasHistory && (
                                                                <span
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    onClick={() => setExpandedHistory((previous) => ({ ...previous, [documentType]: !previous[documentType] }))}
                                                                    onKeyDown={(event) => {
                                                                        if (event.key === 'Enter' || event.key === ' ') {
                                                                            event.preventDefault();
                                                                            setExpandedHistory((previous) => ({ ...previous, [documentType]: !previous[documentType] }));
                                                                        }
                                                                    }}
                                                                    className="cursor-pointer text-xs font-semibold text-primary underline"
                                                                >
                                                                    {expandedHistory[documentType] ? 'Ocultar historial' : `Ver historial (${documents.length - 1})`}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <ul className="mt-3 space-y-2 text-sm">
                                                            {visibleDocuments.length > 0 ? (
                                                                visibleDocuments.map((item) => (
                                                                    <li
                                                                        key={`${documentType}-${item.filename}`}
                                                                        className={`rounded-md border p-2 ${
                                                                            isReadOnly
                                                                                ? 'border-slate-200 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-900/45'
                                                                                : 'border-sidebar-border/60 bg-white dark:border-sidebar-border dark:bg-slate-950/40'
                                                                        }`}
                                                                    >
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="max-w-[180px] truncate font-medium" title={item.filename}>{item.filename}</span>
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
                                )}

                                {activeTab === 'general' && (
                                <section className="space-y-4 pt-4">
                                    <SectionIntro
                                        title="Información general"
                                        description="Notas internas y contexto adicional del becario."
                                    />

                                    <div className="grid gap-2">
                                        <FieldLabel htmlFor="general_notes">Notas</FieldLabel>
                                        <textarea
                                            id="general_notes"
                                            name="general_notes"
                                            value={data.general_notes ?? ''}
                                            onChange={(event) => setData('general_notes', event.target.value)}
                                            className={`min-h-[140px] w-full resize-y rounded-md border border-slate-300 px-3 py-2.5 text-sm leading-relaxed shadow-xs transition-colors focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 dark:border-slate-600 ${isReadOnly ? 'bg-slate-100/90 dark:bg-slate-900/45' : 'bg-white dark:bg-slate-950'}`}
                                            placeholder="Añade información relevante del becario..."
                                            readOnly={isReadOnly}
                                        />
                                        <InputError message={errors.general_notes} />
                                    </div>
                                </section>
                                )}
                            </fieldset>
                            </section>

                            <div className="flex flex-col gap-2 border-t border-sidebar-border/70 pt-4 md:flex-row md:items-center md:justify-end dark:border-sidebar-border">
                                {isReadOnly ? (
                                    <Button type="button" variant="secondary" asChild>
                                        <Link href={interns.index().url}>Volver al listado</Link>
                                    </Button>
                                ) : (
                                    <>
                                        <Button className="cursor-pointer disabled:cursor-not-allowed" disabled={processing || !hasEducationCenters}>
                                            {processing ? 'Guardando...' : 'Guardar'}
                                        </Button>
                                        <Button type="button" variant="secondary" asChild>
                                            <Link href={interns.index().url}>Cancelar</Link>
                                        </Button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
        </AppLayout>
    );
}

