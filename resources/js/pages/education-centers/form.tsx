import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import CenterAgreementSection from '@/components/education-centers/center-agreement-section';
import CenterFormTabs from '@/components/education-centers/center-form-tabs';
import CenterInternsHistory from '@/components/education-centers/center-interns-history';
import { FieldLabel, FormPageHeader, SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { UI_PRESETS } from '@/lib/ui-presets';
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
    general_notes?: string | null;
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

type CenterFormTab = 'center' | 'agreement' | 'general' | 'history';
type CenterValidationErrors = Record<string, string>;

export default function EducationCenterForm({ mode, center, trainingPrograms, agreementHistory = [], internsHistory = [] }: Props) {
    const isCreate = mode === 'create';
    const isReadOnly = mode === 'show';
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Centros Educativos',
            href: educationCenters.index().url,
        },
        {
            title: isCreate ? 'Nuevo Centro' : isReadOnly ? 'Ver Centro' : 'Editar Centro',
            href: isCreate
                ? educationCenters.create().url
                : center?.id
                    ? educationCenters.edit(center.id).url
                    : educationCenters.index().url,
        },
    ];
    const page = usePage<{ flash?: { success?: string; error?: string }; errors?: CenterValidationErrors }>();
    const lastFlashRef = useRef<string | null>(null);
    const [selectedAgreementFileName, setSelectedAgreementFileName] = useState<string | null>(null);
    const [deletingAgreementId, setDeletingAgreementId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<CenterFormTab>('center');
    const selectedTrainingPrograms = trainingPrograms.filter((program) => center?.training_program_ids?.includes(program.id));
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

    const handleFormError = (errors: CenterValidationErrors) => {
        if (isReadOnly) {
            return;
        }

        const errorKeys = Object.keys(errors ?? {});

        if (
            errorKeys.some((key) =>
                key.startsWith('agreement_')
                || key === 'agreement_pdf'
            )
        ) {
            setActiveTab('agreement');
            return;
        }

        if (errorKeys.some((key) => key === 'general_notes')) {
            setActiveTab('general');
            return;
        }

        setActiveTab('center');
    };

    const handleDeleteAgreement = (agreementId: number) => {
        if (!center?.id) {
            return;
        }

        if (!window.confirm('¿Seguro que quieres eliminar este convenio?')) {
            return;
        }

        setDeletingAgreementId(agreementId);

        router.delete(`/education-centers/${center.id}/agreements/${agreementId}`, {
            preserveScroll: true,
            onFinish: () => setDeletingAgreementId(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreate ? 'Nuevo Centro Educativo' : isReadOnly ? 'Ver Centro Educativo' : 'Editar Centro Educativo'} />

            <div className={UI_PRESETS.pageContent}>
                <div className={UI_PRESETS.pageSection}>
                    <FormPageHeader
                        title={isCreate ? 'Nuevo Centro Educativo' : isReadOnly ? 'Ver Centro Educativo' : 'Editar Centro Educativo'}
                        description="Completa la información del centro, contacto y convenio principal."
                        backHref={educationCenters.index().url}
                    />

                    <Form
                        {...formRoute}
                        options={{ preserveScroll: true, preserveState: true }}
                        onError={handleFormError}
                        className="space-y-2"
                        encType="multipart/form-data"
                        noValidate
                    >
                        {({ processing, errors }) => (
                            <>
                                <section className={UI_PRESETS.sectionCard}>
                                    <div className="-mx-4 -mt-4 border-b border-sidebar-border/70 px-4 pt-4 dark:border-sidebar-border">
                                        <CenterFormTabs
                                            activeTab={activeTab}
                                            onTabChange={setActiveTab}
                                            isReadOnly={isReadOnly}
                                        />
                                    </div>

                                <fieldset
                                    disabled={isReadOnly}
                                    className={`space-y-4 ${isReadOnly ? UI_PRESETS.readOnlyFieldset : ''}`}
                                >

                                        <div className={activeTab === 'center' ? '' : 'hidden'} aria-hidden={activeTab !== 'center'}>
                                        <section className="space-y-4 pt-4">
                                            <SectionIntro
                                                title="Datos del centro"
                                                description="Información principal del centro educativo y sus canales de contacto."
                                            />

                                            {isReadOnly ? (
                                                <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                                    <dl className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                                                        <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Nombre</dt>
                                                            <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{center?.name || '-'}</dd>
                                                        </div>
                                                        <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Dirección</dt>
                                                            <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{center?.address || '-'}</dd>
                                                        </div>
                                                        <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Teléfono</dt>
                                                            <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{center?.phone || '-'}</dd>
                                                        </div>
                                                        <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Email institucional</dt>
                                                            <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{center?.institutional_email || '-'}</dd>
                                                        </div>
                                                        <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Web</dt>
                                                            <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{center?.website || '-'}</dd>
                                                        </div>
                                                        <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Grados formativos</dt>
                                                            <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                                                {selectedTrainingPrograms.length > 0 ? selectedTrainingPrograms.map((program) => program.name).join(', ') : '-'}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </div>
                                            ) : (
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
                                                            className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 md:grid-cols-2"
                                                        >
                                                            {trainingPrograms.map((program) => (
                                                                <label
                                                                    key={program.id}
                                                                    htmlFor={`training_program_${program.id}`}
                                                                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                                                                >
                                                                    <input
                                                                        id={`training_program_${program.id}`}
                                                                        type="checkbox"
                                                                        name="training_program_ids[]"
                                                                        value={program.id}
                                                                        defaultChecked={center?.training_program_ids?.includes(program.id) ?? false}
                                                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                                                                    />
                                                                    <span>{program.name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                        <InputError message={errors.training_program_ids ?? errors['training_program_ids.0']} />
                                                    </div>
                                                </div>
                                            )}
                                        </section>
                                        </div>

                                        <div className={activeTab === 'center' ? '' : 'hidden'} aria-hidden={activeTab !== 'center'}>
                                        <section className="space-y-4">
                                            <SectionIntro
                                                title="Persona de contacto"
                                                description="Responsable de coordinación entre el centro y la organización."
                                            />

                                            {isReadOnly ? (
                                                <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                                    <dl className="divide-y divide-slate-200/80 dark:divide-slate-700/80">
                                                        <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Nombre</dt>
                                                            <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{center?.contact_name || '-'}</dd>
                                                        </div>
                                                        <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Cargo</dt>
                                                            <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{center?.contact_position || '-'}</dd>
                                                        </div>
                                                        <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Teléfono</dt>
                                                            <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{center?.contact_phone || '-'}</dd>
                                                        </div>
                                                        <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Email</dt>
                                                            <dd className="text-sm font-medium text-slate-800 dark:text-slate-100">{center?.contact_email || '-'}</dd>
                                                        </div>
                                                    </dl>
                                                </div>
                                            ) : (
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
                                            )}
                                        </section>
                                        </div>

                                        <div className={activeTab === 'agreement' ? '' : 'hidden'} aria-hidden={activeTab !== 'agreement'}>
                                            <CenterAgreementSection
                                                isCreate={isCreate}
                                                isReadOnly={isReadOnly}
                                                center={center}
                                                agreementHistory={agreementHistory}
                                                selectedAgreementFileName={selectedAgreementFileName}
                                                setSelectedAgreementFileName={setSelectedAgreementFileName}
                                                deletingAgreementId={deletingAgreementId}
                                                handleDeleteAgreement={handleDeleteAgreement}
                                                errors={errors as Record<string, string | undefined>}
                                            />
                                        </div>

                                        <div className={activeTab === 'general' ? '' : 'hidden'} aria-hidden={activeTab !== 'general'}>
                                        <section className="space-y-4 pt-4">
                                        <SectionIntro
                                            title="Información general"
                                            description="Notas internas y contexto adicional del centro educativo."
                                        />

                                        {isReadOnly ? (
                                            <div className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                                                <div className="grid gap-1 px-4 py-3 md:grid-cols-[220px_1fr] md:gap-3">
                                                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Notas</p>
                                                    <p className="text-sm font-medium whitespace-pre-line text-slate-800 dark:text-slate-100">
                                                        {center?.general_notes?.trim() ? center.general_notes : '-'}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid gap-2">
                                                <FieldLabel htmlFor="general_notes">Notas</FieldLabel>
                                                <textarea
                                                    id="general_notes"
                                                    name="general_notes"
                                                    defaultValue={center?.general_notes ?? ''}
                                                    className="min-h-[140px] w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed shadow-xs transition-colors focus:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 dark:border-slate-600 dark:bg-slate-950"
                                                    placeholder="Añade información relevante del centro..."
                                                />
                                                <InputError message={errors.general_notes} />
                                            </div>
                                        )}
                                        </section>
                                        </div>

                                        <div className={activeTab === 'history' ? '' : 'hidden'} aria-hidden={activeTab !== 'history'}>
                                            {isReadOnly && <CenterInternsHistory internsHistory={internsHistory} />}
                                        </div>
                                    </fieldset>
                                </section>
                                    <div className="flex flex-col gap-2 pt-4 md:flex-row md:items-center md:justify-end">
                                        {isReadOnly ? (
                                            <Button type="button" variant="secondary" asChild>
                                                <Link href={educationCenters.index().url}>Volver al listado</Link>
                                            </Button>
                                        ) : (
                                            <>
                                                <Button className="cursor-pointer disabled:cursor-not-allowed" disabled={processing}>
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
