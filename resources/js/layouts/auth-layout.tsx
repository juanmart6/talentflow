import AuthLayoutTemplate from '@/layouts/auth/auth-simple-layout';

export default function AuthLayout({
    children,
    title,
    description,
    containerClassName,
    ...props
}: {
    children: React.ReactNode;
    title?: string;
    description?: string;
    containerClassName?: string;
}) {
    return (
        <AuthLayoutTemplate
            title={title}
            description={description}
            containerClassName={containerClassName}
            {...props}
        >
            {children}
        </AuthLayoutTemplate>
    );
}
