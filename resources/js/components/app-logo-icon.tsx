import type { ImgHTMLAttributes } from 'react';
import TFLogo from '@/assets/TF_logo.svg';
import { cn } from '@/lib/utils';

export default function AppLogoIcon({
    className,
    ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            {...props}
            src={TFLogo}
            alt="TalentFlow"
            className={cn('h-20 w-20', className)}
            loading="lazy"
        />
    );
}
