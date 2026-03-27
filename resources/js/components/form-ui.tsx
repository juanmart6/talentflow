import { Label } from '@/components/ui/label';
import HeaderBackIcon from '@/components/header-back-icon';
import { type ReactNode } from 'react';

type SectionIntroProps = {
    title: string;
    description: string;
};

export function SectionIntro({ title, description }: SectionIntroProps) {
    return (
        <div>
            <h2 className="text-lg font-bold tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    );
}

type FieldLabelProps = {
    htmlFor: string;
    children: string;
};

export function FieldLabel({ htmlFor, children }: FieldLabelProps) {
    return (
        <Label htmlFor={htmlFor} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {children}
        </Label>
    );
}

type FormPageHeaderProps = {
    title: string;
    description: ReactNode;
    backHref?: string;
    backLabel?: string;
    action?: ReactNode;
};

export function FormPageHeader({ title, description, backHref, backLabel, action }: FormPageHeaderProps) {
    return (
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold">{title}</h1>
                <div className={`text-sm text-muted-foreground ${backHref ? 'relative pr-11' : ''}`}>
                    {description}
                    {backHref ? (
                        <HeaderBackIcon
                            href={backHref}
                            label={backLabel ?? 'Volver al listado'}
                            className="absolute right-0 top-1/2 -translate-y-1/2"
                        />
                    ) : null}
                </div>
            </div>
            {action}
        </div>
    );
}
