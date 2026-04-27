import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type HeaderBackIconProps = {
    href: string;
    label?: string;
    className?: string;
};

export default function HeaderBackIcon({
    href,
    label = 'Volver al listado',
    className,
}: HeaderBackIconProps) {
    return (
        <Button variant="ghost" size="icon" className={`h-9 w-9 shrink-0 ${className ?? ''}`} asChild>
            <Link href={href} aria-label={label} title={label}>
                <ArrowLeft className="size-5" />
            </Link>
        </Button>
    );
}