import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Briefcase, FileText, MailPlus, Paperclip, User } from 'lucide-react';
import type { FormEvent} from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { FieldLabel, FormPageHeader, SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import DatePicker from '@/components/shared/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { getFirstFormErrorMessage } from '@/lib/form-errors';
import { INTERN_STATUS_META  } from '@/lib/interns/intern-status';
import type {InternStatus} from '@/lib/interns/intern-status';
import { UI_PRESETS } from '@/lib/ui-presets';
import interns from '@/routes/interns';
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
    access: {
        status: 'none' | 'pending' | 'accepted' | 'expired' | 'disabled';
        can_invite: boolean;
        history: Array<{
            id: string;
            step: 'sent' | 'accepted' | 'expired' | 'disabled';
            happened_at: string | null;
            by_name: string | null;
        }>;
    } | null;
    educationCenters: EducationCenterOption[];
    documentHistory: DocumentHistory;
};

type InternFormTab = 'personal' | 'academic' | 'documents' | 'general' | 'access';

function toDateInput(value?: string | null): string {
    if (!value) {
        return '';
    }

    return value.slice(0, 10);
}

function formatDisplayDate(value?: string | null): string {
    if (!value) {
        return '-';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('es-ES');
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

const accessStatusMeta: Record<
    NonNullable<Props['access']>['status'],
    { label: string; badgeClass: string }
> = {
    none: {
        label: 'Sin invitación',
        badgeClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300 dark:bg-slate-900/40 dark:text-slate-200 dark:ring-slate-700/60',
    },
    pending: {
        label: 'Invitación pendiente',
        badgeClass: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-700/40',
    },
    accepted: {
        label: 'Acceso activo',
        badgeClass: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700/40',
    },
    expired: {
        label: 'Invitación caducada',
        badgeClass: 'bg-red-100 text-red-700 ring-1 ring-red-300 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-700/40',
    },
    disabled: {
        label: 'CUENTA ELIMINADA POR USUARIO',
        badgeClass: 'bg-slate-200 text-slate-700 ring-1 ring-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600',
    },
};

const accessHistoryStepMeta: Record<
    NonNullable<NonNullable<Props['access']>['history'][number]>['step'],
    { label: string; badgeClass: string }
> = {
    sent: {
        label: 'Invitación enviada',
        badgeClass: 'bg-sky-100 text-sky-700 ring-1 ring-sky-300 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-700/40',
    },
    accepted: {
        label: 'Invitación aceptada',
        badgeClass: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700/40',
    },
    expired: {
        label: 'Invitación caducada',
        badgeClass: 'bg-red-100 text-red-700 ring-1 ring-red-300 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-700/40',
    },
    disabled: {
        label: 'CUENTA ELIMINADA POR USUARIO',
        badgeClass: 'bg-slate-200 text-slate-700 ring-1 ring-slate-400 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600',
    },
};

export default function InternFormPage({ mode, intern, access, educationCenters, documentHistory }: Props) {
    const isCreate = mode === 'create';
    const isReadOnly = mode === 'show';
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Gestión de Becarios',
            href: interns.index().url,
        },
        {
            title: isCreate ? 'Nuevo Becario' : isReadOnly ? 'Ver Becario' : 'Editar Becario',
            href: isCreate
                ? interns.create().url
                : intern?.id
                    ? interns.edit(intern.id).url
                    : interns.index().url,
        },
    ];
    const hasEducationCenters = educationCenters.length > 0;
    const page = usePage<{ flash?: { success?: string; error?: string; info?: string } }>();
    const lastFlashRef = useRef<string | null>(null);
    const [expandedHistory, setExpandedHistory] = useState<Record<keyof DocumentHistory, boolean>>({
        collaboration_agreement: false,
        insurance_policy: false,
        dni_scan: false,
    });
    const [activeTab, setActiveTab] = useState<InternFormTab>('personal');
    const [isInvitingAccess, setIsInvitingAccess] = useState(false);

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
    const availableTrainingPrograms = useMemo(
        () => selectedCenter?.training_programs ?? [],
        [selectedCenter],
    );
    const hasTrainingPrograms = availableTrainingPrograms.length > 0;
    const selectedTrainingProgram = useMemo(
        () => availableTrainingPrograms.find((program) => String(program.id) === data.training_program_id) ?? null,
        [availableTrainingPrograms, data.training_program_id],
    );

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
        const infoMessage = page.props.flash?.info;
        const flashKey = JSON.stringify({
            success: successMessage ?? null,
            error: errorMessage ?? null,
            info: infoMessage ?? null,
        });

        if (!successMessage && !errorMessage && !infoMessage) {
            return;
        }

        if (lastFlashRef.current === flashKey) {
            return;
        }

        lastFlashRef.current = flashKey;

        if (successMessage) {
            toast.success(successMessage);
        }

        if (errorMessage) {
            toast.error(errorMessage);
        }

        if (infoMessage) {
            toast.info(infoMessage);
        }
    }, [page.props.flash?.success, page.props.flash?.error, page.props.flash?.info]);

    const accessStatus = access?.status ?? 'none';
    const canInviteAccess = Boolean(intern?.id) && (access?.can_invite ?? false) && !isInvitingAccess;
    const accessHistory = access?.history ?? [];

    const handleInviteAccess = () => {
        if (!intern?.id || !canInviteAccess) {
            return;
        }

        setIsInvitingAccess(true);

        router.post(`/interns/${intern.id}/invite-access`, {}, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setIsInvitingAccess(false),
        });
    };

    const handleFormErrors = (formErrors: Partial<Record<string, string>>) => {
        const firstError = getFirstFormErrorMessage(formErrors as Record<string, unknown>);

        if (firstError) {
            toast.error(firstError);
        } else {
            toast.error('No se pudo guardar el becario. Revisa los campos obligatorios.');
        }

        const errorKeys = Object.keys(formErrors ?? {});
        const personalFields = [
            'first_name',
            'last_name',
            'dni_nie',
            'email',
            'phone',
            'address_line',
            'postal_code',
            'city',
            'province',
            'country',
        ];
        const academicFields = [
            'education_center_id',
            'training_program_id',
            'academic_year',
            'academic_tutor_name',
            'academic_tutor_email',
            'internship_start_date',
            'internship_end_date',
            'required_hours',
            'status',
            'abandonment_reason',
            'abandonment_date',
        ];
        const documentFields = [
            'collaboration_agreement_document',
            'insurance_policy_document',
            'dni_scan_document',
        ];

        if (errorKeys.some((key) => personalFields.includes(key))) {
            setActiveTab('personal');
            return;
        }

        if (errorKeys.some((key) => academicFields.includes(key))) {
            setActiveTab('academic');
            return;
        }

        if (errorKeys.some((key) => documentFields.includes(key))) {
            setActiveTab('documents');
            return;
        }

        if (errorKeys.some((key) => key === 'general_notes')) {
            setActiveTab('general');
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
                onError: (formErrors) => handleFormErrors(formErrors),
            });
            return;
        }

        transform((formData) => ({ ...formData, _method: 'PUT' }));
        post(interns.update(intern?.id ?? 0).url, {
            preserveScroll: true,
            forceFormData: true,
            onError: (formErrors) => handleFormErrors(formErrors),
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
                        backHref={interns.index().url}
                    />

                    <form onSubmit={submit} className="space-y-2 [&_[data-slot=input-error]]:hidden">
                            <section className={UI_PRESETS.sectionCard}>
                                <div className="-mx-4 -mt-4 border-b border-sidebar-border/70 px-4 pt-4 dark:border-sidebar-border">
                                    <div className="flex flex-wrap items-end gap-1.5">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={`${UI_PRESETS.tabBase} ${activeTab === 'personal' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                            onClick={() => setActiveTab('personal')}
                                        >
                                            <User className="mr-1.5 size-4 shrink-0" />
                                            Personales
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={`${UI_PRESETS.tabBase} ${activeTab === 'academic' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                            onClick={() => setActiveTab('academic')}
                                        >
                                            <Briefcase className="mr-1.5 size-4 shrink-0" />
                                            Prácticas
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={`${UI_PRESETS.tabBase} ${activeTab === 'documents' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                            onClick={() => setActiveTab('documents')}
                                        >
                                            <Paperclip className="mr-1.5 size-4 shrink-0" />
                                            Adjuntos
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className={`${UI_PRESETS.tabBase} ${activeTab === 'general' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                            onClick={() => setActiveTab('general')}
                                        >
                                            <FileText className="mr-1.5 size-4 shrink-0" />
                                            Notas
                                        </Button>
                                        {!isCreate ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className={`${UI_PRESETS.tabBase} ${activeTab === 'access' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                                onClick={() => setActiveTab('access')}
                                            >
                                                <MailPlus className="mr-1.5 size-4 shrink-0" />
                                                Acceso
                                            </Button>
                                        ) : null}
                                    </div>
                                </div>

                            <fieldset
                                disabled={isReadOnly && activeTab !== 'access'}
                                className={`space-y-4 ${isReadOnly ? UI_PRESETS.readOnlyFieldset : ''}`}
                            >

                                {activeTab === 'personal' && (
                                <section className="space-y-4 pt-4">
                                    <SectionIntro
                                        title="Datos personales"
                                        description="Identificación y datos de contacto del becario."
                                    />

                                    {isReadOnly ? (
                                        <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                            <dl className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Nombre</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.first_name || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Apellidos</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.last_name || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>DNI/NIE</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.dni_nie || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Email</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.email || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Teléfono</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.phone || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Dirección</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.address_line || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Código postal</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.postal_code || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Ciudad</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.city || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Provincia</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.province || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>País</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.country || '-'}</dd>
                                                </div>
                                            </dl>
                                        </div>
                                    ) : (
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
                                    )}
                                </section>
                                )}

                                {activeTab === 'academic' && (
                                <section className="space-y-4 pt-4">
                                    <SectionIntro
                                        title="Datos académicos y prácticas"
                                        description="Centro, tutor, período y situación de prácticas."
                                    />

                                    {isReadOnly ? (
                                        <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                            <dl className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Centro educativo</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{selectedCenter?.name || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Ciclo formativo</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{selectedTrainingProgram?.name || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Año académico</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.academic_year || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Tutor académico</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.academic_tutor_name || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Email tutor</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.academic_tutor_email || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Fecha inicio</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{formatDisplayDate(data.internship_start_date)}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Fecha fin</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{formatDisplayDate(data.internship_end_date)}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Horas requeridas</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>
                                                        {Number(data.required_hours) > 0 ? `${data.required_hours} h` : '-'}
                                                    </dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Estado</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{INTERN_STATUS_META[computedStatus].label}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Motivo abandono</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{data.abandonment_reason || '-'}</dd>
                                                </div>
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <dt className={UI_PRESETS.readOnlyFieldLabel}>Fecha abandono</dt>
                                                    <dd className={UI_PRESETS.readOnlyFieldValue}>{formatDisplayDate(data.abandonment_date)}</dd>
                                                </div>
                                            </dl>
                                        </div>
                                    ) : (
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
                                            <DatePicker
                                                id="internship_start_date"
                                                value={data.internship_start_date}
                                                onChange={(value) => setData('internship_start_date', value)}
                                                placeholder="Seleccionar fecha"
                                                className={UI_PRESETS.simpleSearchInput}
                                                required
                                            />
                                            <InputError message={errors.internship_start_date} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="internship_end_date">Fecha fin</FieldLabel>
                                            <DatePicker
                                                id="internship_end_date"
                                                value={data.internship_end_date}
                                                onChange={(value) => setData('internship_end_date', value)}
                                                placeholder="Seleccionar fecha"
                                                className={UI_PRESETS.simpleSearchInput}
                                                required
                                            />
                                            <InputError message={errors.internship_end_date === 'Las fechas de practicas deben estar dentro del periodo de un convenio del centro educativo.' ? '' : errors.internship_end_date} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="required_hours">Horas requeridas</FieldLabel>
                                            <Input id="required_hours" type="number" min={1} value={data.required_hours} onChange={(e) => setData('required_hours', Number(e.target.value))} className={UI_PRESETS.simpleSearchInput} required />
                                            <InputError message={errors.required_hours} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="status">Estado</FieldLabel>
                                            <Select value={data.status} onValueChange={(value) => setData('status', value as 'active' | 'abandoned')} required>
                                                <SelectTrigger id="status" className={UI_PRESETS.selectTrigger}>
                                                    <SelectValue placeholder="Estado" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem className={UI_PRESETS.selectItem} value="active">Automatico (segun fechas)</SelectItem>
                                                    <SelectItem className={UI_PRESETS.selectItem} value="abandoned">Abandonado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <InputError message={errors.status} />
                                        </div>
                                        <div className="grid gap-2 md:col-span-2">
                                            <FieldLabel htmlFor="abandonment_reason">Motivo abandono (opcional)</FieldLabel>
                                            <Input id="abandonment_reason" value={data.abandonment_reason} onChange={(e) => setData('abandonment_reason', e.target.value)} className={UI_PRESETS.simpleSearchInput} />
                                            <InputError message={errors.abandonment_reason} />
                                        </div>
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="abandonment_date">Fecha abandono (opcional)</FieldLabel>
                                            <DatePicker
                                                id="abandonment_date"
                                                value={data.abandonment_date}
                                                onChange={(value) => setData('abandonment_date', value)}
                                                placeholder="Seleccionar fecha"
                                                className={UI_PRESETS.simpleSearchInput}
                                                required={isAbandoned}
                                            />
                                            <InputError message={errors.abandonment_date} />
                                        </div>
                                    </div>
                                    )}
                                </section>
                                )}

                                {activeTab === 'documents' && (
                                <section className="space-y-4 pt-4">
                                    <SectionIntro
                                        title="Documentación adjunta"
                                        description="Archivos adjuntos en relación al becario con su programa de prácticas."
                                    />

                                    {!isReadOnly && (
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <FileUploadField id="collaboration_agreement_document" label="Convenio" accept=".pdf,.jpg,.jpeg,.png" file={data.collaboration_agreement_document} error={errors.collaboration_agreement_document} onChange={(file) => setData('collaboration_agreement_document', file)} />
                                            <FileUploadField id="insurance_policy_document" label="Seguro" accept=".pdf,.jpg,.jpeg,.png" file={data.insurance_policy_document} error={errors.insurance_policy_document} onChange={(file) => setData('insurance_policy_document', file)} />
                                            <FileUploadField id="dni_scan_document" label="DNI escaneado" accept=".pdf,.jpg,.jpeg,.png" file={data.dni_scan_document} error={errors.dni_scan_document} onChange={(file) => setData('dni_scan_document', file)} />
                                        </div>
                                    )}

                                    {!isCreate && (
                                        <div className={`pt-2 ${isReadOnly ? 'space-y-4' : 'grid gap-4 md:grid-cols-3'}`}>
                                            {(Object.keys(documentHistory) as Array<keyof DocumentHistory>).map((documentType) => {
                                                const documents = documentHistory[documentType];
                                                const currentDocument = documents.find((item) => item.is_current) ?? documents[0] ?? null;
                                                const hasHistory = documents.length > 1;
                                                const showFullHistory = !isReadOnly || expandedHistory[documentType];
                                                const visibleDocuments = showFullHistory ? documents : currentDocument ? [currentDocument] : [];

                                                return (
                                                    <article
                                                        key={documentType}
                                                        className={`rounded-lg border p-3 ${isReadOnly ? 'border-slate-200/80 dark:border-slate-700/80' : 'border-sidebar-border/70 bg-slate-50/60 dark:border-sidebar-border dark:bg-slate-900/30'}`}
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
                                                        <ul className={`mt-3 text-sm ${isReadOnly ? 'divide-y divide-slate-200/80 dark:divide-slate-700/80' : 'space-y-2'}`}>
                                                            {visibleDocuments.length > 0 ? (
                                                                visibleDocuments.map((item) => (
                                                                    <li
                                                                        key={`${documentType}-${item.filename}`}
                                                                        className={isReadOnly ? 'py-3 first:pt-0 last:pb-0' : 'rounded-md border border-sidebar-border/60 bg-white p-2 dark:border-sidebar-border dark:bg-slate-950/40'}
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

                                    {isReadOnly ? (
                                        <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                            <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                <p className={UI_PRESETS.readOnlyFieldLabel}>Notas</p>
                                                <p className={`${UI_PRESETS.readOnlyFieldValue} whitespace-pre-line`}>
                                                    {data.general_notes?.trim() ? data.general_notes : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            <FieldLabel htmlFor="general_notes">Notas</FieldLabel>
                                            <textarea
                                                id="general_notes"
                                                name="general_notes"
                                                value={data.general_notes ?? ''}
                                                onChange={(event) => setData('general_notes', event.target.value)}
                                                className="min-h-[140px] w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed shadow-xs transition-colors focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 dark:border-slate-600 dark:bg-slate-950"
                                                placeholder="Añade información relevante del becario..."
                                            />
                                            <InputError message={errors.general_notes} />
                                        </div>
                                    )}
                                </section>
                                )}

                                {activeTab === 'access' && !isCreate && (
                                <section className="space-y-4 pt-4">
                                    <SectionIntro
                                        title="Acceso a la plataforma"
                                        description="Gestiona la invitación y el estado de acceso del becario."
                                    />

                                    <div className="rounded-lg border border-sidebar-border/70 bg-white/70 p-4 dark:border-sidebar-border dark:bg-slate-900/20">
                                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                            <div className="space-y-1">
                                                <p className={UI_PRESETS.readOnlyFieldLabel}>Estado de acceso</p>
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${accessStatusMeta[accessStatus].badgeClass}`}>
                                                    {accessStatusMeta[accessStatus].label}
                                                </span>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                className={UI_PRESETS.iconActionButtonPrimary}
                                                onClick={handleInviteAccess}
                                                disabled={!canInviteAccess}
                                            >
                                                <MailPlus className="size-4" />
                                                {isInvitingAccess
                                                    ? 'Enviando...'
                                                    : accessStatus === 'disabled'
                                                        ? 'Reenviar invitación'
                                                    : accessStatus === 'none'
                                                        ? 'Enviar acceso'
                                                        : 'Reenviar invitación'}
                                            </Button>
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            <p className={UI_PRESETS.readOnlyFieldLabel}>Historial de actividad</p>
                                            {accessHistory.length > 0 ? (
                                                <ul className="space-y-2">
                                                    {accessHistory.map((item) => (
                                                        <li
                                                            key={item.id}
                                                            className="flex flex-col gap-2 rounded-md border border-slate-200/80 bg-white/70 px-3 py-2 text-sm md:flex-row md:items-center md:justify-between dark:border-slate-700/80 dark:bg-slate-900/40"
                                                        >
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="text-slate-700 dark:text-slate-200">
                                                                    {item.happened_at
                                                                        ? new Date(item.happened_at).toLocaleString('es-ES', {
                                                                            day: '2-digit',
                                                                            month: '2-digit',
                                                                            year: 'numeric',
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                        })
                                                                        : '-'}
                                                                </span>
                                                                {item.step === 'sent' && item.by_name ? (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        Enviada por: {item.by_name}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${accessHistoryStepMeta[item.step].badgeClass}`}>
                                                                {accessHistoryStepMeta[item.step].label}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Todavía no se han enviado invitaciones.</p>
                                            )}
                                        </div>
                                    </div>
                                </section>
                                )}
                            </fieldset>
                            </section>

                            <div className="flex flex-col gap-2 pt-4 md:flex-row md:items-center md:justify-end">
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

