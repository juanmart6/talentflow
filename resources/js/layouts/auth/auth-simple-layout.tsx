import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';
import { home } from '@/routes';

type AuthSimpleLayoutProps = {
    children: React.ReactNode;
    title?: string;
    description?: string;
    containerClassName?: string;
};

export default function AuthSimpleLayout({
    children,
    title,
    description,
    containerClassName,
}: AuthSimpleLayoutProps) {
    return (
        <div className="relative z-20 -mt-7 flex min-h-svh flex-col items-center justify-center gap-2 bg-background p-6 md:-mt-10 md:p-10">
            <div className={cn('relative z-20 w-full max-w-sm', containerClassName)}>
                <div className="relative z-20 flex flex-col gap-1 md:gap-2">
                    <div className="relative z-30 flex flex-col items-center gap-0">
                        <Link
                            href={home()}
                            className="flex flex-col items-center font-medium"
                        >
                            <AppLogoIcon className="h-44 w-44 scale-[1.5] fill-current text-[var(--foreground)] dark:text-white md:h-56 md:w-56" />
                            {title && <span className="sr-only">{title}</span>}
                        </Link>

                        {(title || description) && (
                            <div className="space-y-2 text-center">
                                {title && <h1 className="text-xl font-medium">{title}</h1>}
                                {description && (
                                    <p className="text-center text-sm text-muted-foreground">
                                        {description}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
