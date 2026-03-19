import TFLogo from '@/assets/TF_logo.svg';
import { cn } from '@/lib/utils';
import type { ImgHTMLAttributes } from 'react';

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
