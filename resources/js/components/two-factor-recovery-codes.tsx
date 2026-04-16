import { Form } from '@inertiajs/react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AlertError from '@/components/alert-error';
import { Button } from '@/components/ui/button';
import { regenerateRecoveryCodes } from '@/routes/two-factor';

type Props = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
};

export default function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: Props) {
    const [codesAreVisible, setCodesAreVisible] = useState<boolean>(false);
    const codesSectionRef = useRef<HTMLDivElement | null>(null);
    const canRegenerateCodes = recoveryCodesList.length > 0 && codesAreVisible;

    const toggleCodesVisibility = useCallback(async () => {
        if (!codesAreVisible && !recoveryCodesList.length) {
            await fetchRecoveryCodes();
        }

        setCodesAreVisible(!codesAreVisible);

        if (!codesAreVisible) {
            setTimeout(() => {
                codesSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        }
    }, [codesAreVisible, recoveryCodesList.length, fetchRecoveryCodes]);

    useEffect(() => {
        if (!recoveryCodesList.length) {
            fetchRecoveryCodes();
        }
    }, [recoveryCodesList.length, fetchRecoveryCodes]);

    const RecoveryCodeIconComponent = codesAreVisible ? EyeOff : Eye;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 select-none">
                <Button
                    onClick={toggleCodesVisibility}
                    className="h-6 cursor-pointer rounded-full px-2.5 text-xs font-semibold"
                    aria-expanded={codesAreVisible}
                    aria-controls="recovery-codes-section"
                >
                    <RecoveryCodeIconComponent className="size-3.5" aria-hidden="true" />
                    {codesAreVisible ? 'Ocultar' : 'Ver'} códigos
                </Button>

                {canRegenerateCodes && (
                    <Form
                        {...regenerateRecoveryCodes.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={fetchRecoveryCodes}
                    >
                        {({ processing }) => (
                            <Button
                                variant="secondary"
                                type="submit"
                                className="h-6 cursor-pointer rounded-full px-2.5 text-xs font-semibold"
                                disabled={processing}
                                aria-describedby="regenerate-warning"
                            >
                                <RefreshCw className="size-3.5" />
                                Regenerar códigos
                            </Button>
                        )}
                    </Form>
                )}
            </div>

            <div
                id="recovery-codes-section"
                className={`relative overflow-hidden transition-all duration-300 ${codesAreVisible ? 'h-auto opacity-100' : 'h-0 opacity-0'}`}
                aria-hidden={!codesAreVisible}
            >
                <div className="space-y-3">
                    {errors?.length ? (
                        <AlertError errors={errors} />
                    ) : (
                        <>
                            <div
                                ref={codesSectionRef}
                                className="grid gap-1 rounded-lg border border-sidebar-border/70 bg-white/80 p-4 font-mono text-sm dark:border-sidebar-border dark:bg-slate-900/30"
                                role="list"
                                aria-label="Códigos de recuperación"
                            >
                                {recoveryCodesList.length ? (
                                    recoveryCodesList.map((code, index) => (
                                        <div key={index} role="listitem" className="select-text">
                                            {code}
                                        </div>
                                    ))
                                ) : (
                                    <div className="space-y-2" aria-label="Cargando códigos de recuperación">
                                        {Array.from({ length: 8 }, (_, index) => (
                                            <div
                                                key={index}
                                                className="h-4 animate-pulse rounded bg-muted-foreground/20"
                                                aria-hidden="true"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="text-xs text-muted-foreground select-none">
                                <p id="regenerate-warning">
                                    Cada código de recuperación puede utilizarse una sola vez. Si necesitas más, pulsa
                                    <span className="font-bold"> Regenerar códigos</span>.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
