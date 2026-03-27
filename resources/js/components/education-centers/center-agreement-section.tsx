import { Trash2 } from 'lucide-react';
import { FieldLabel, SectionIntro } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatSpanishDate } from '@/lib/education-centers';
import { UI_PRESETS } from '@/lib/ui-presets';

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

type CenterAgreementSectionProps = {
    isCreate: boolean;
    isReadOnly: boolean;
    center: {
        agreement_signed_at?: string | null;
        agreement_expires_at?: string | null;
        agreement_agreed_slots?: number | null;
        agreement_pdf_path?: string | null;
    } | null;
    agreementHistory: AgreementHistoryItem[];
    selectedAgreementFileName: string | null;
    setSelectedAgreementFileName: (value: string | null) => void;
    deletingAgreementId: number | null;
    handleDeleteAgreement: (agreementId: number) => void;
    errors: Record<string, string | undefined>;
};

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

export default function CenterAgreementSection({
    isCreate,
    isReadOnly,
    center,
    agreementHistory,
    selectedAgreementFileName,
    setSelectedAgreementFileName,
    deletingAgreementId,
    handleDeleteAgreement,
    errors,
}: CenterAgreementSectionProps) {
    return (
        <section className="space-y-4 pt-4">
            <SectionIntro
                title="Convenio de colaboración"
                description="Fechas de vigencia, plazas acordadas y documento PDF del convenio."
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
                                className={`rounded-lg border p-3 ${
                                    isReadOnly
                                        ? 'border-slate-200 bg-slate-100/90 dark:border-slate-700 dark:bg-slate-900/45'
                                        : 'border-sidebar-border/70 bg-slate-50/60 dark:border-sidebar-border dark:bg-slate-900/30'
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{agreement.filename}</span>
                                        {agreement.is_current && (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200">
                                                Vigente
                                            </span>
                                        )}
                                    </div>
                                    {!isReadOnly && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className={`${UI_PRESETS.iconActionButtonDanger} disabled:cursor-not-allowed`}
                                            disabled={deletingAgreementId === agreement.id}
                                            onClick={() => handleDeleteAgreement(agreement.id)}
                                            aria-label="Eliminar convenio"
                                            title="Eliminar convenio"
                                        >
                                            {deletingAgreementId === agreement.id ? '...' : <Trash2 />}
                                        </Button>
                                    )}
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
    );
}
