import { Label } from '@/components/ui/label';
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
    description: string;
    action?: ReactNode;
};

export function FormPageHeader({ title, description, action }: FormPageHeaderProps) {
    return (
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
                <h1 className="text-2xl font-bold">{title}</h1>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {action}
        </div>
    );
}
