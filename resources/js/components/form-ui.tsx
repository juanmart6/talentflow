import { Label } from '@/components/ui/label';

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
