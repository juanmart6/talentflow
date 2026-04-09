import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export type CalendarProps = ComponentProps<typeof DayPicker>;

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn('p-3', className)}
            classNames={{
                months: 'flex flex-col gap-2 sm:flex-row',
                month: 'space-y-2',
                caption: 'relative flex items-center justify-center pt-1',
                month_caption: 'relative flex items-center justify-center pt-1',
                caption_label: 'px-8 text-center text-sm font-medium',
                nav: 'absolute inset-x-1 top-1',
                nav_button:
                    'inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white p-0 text-slate-600 shadow-xs transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800',
                nav_button_previous: 'absolute left-0',
                nav_button_next: 'absolute right-0',
                button_previous:
                    'absolute left-0 inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white p-0 text-slate-600 shadow-xs transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800',
                button_next:
                    'absolute right-0 inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-white p-0 text-slate-600 shadow-xs transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800',
                table: 'w-full border-collapse space-y-1',
                month_grid: 'w-full border-collapse',
                head_row: 'flex',
                weekdays: 'flex',
                head_cell: 'text-muted-foreground w-8 rounded-md text-[0.8rem] font-normal',
                weekday: 'text-muted-foreground w-8 rounded-md text-[0.8rem] font-normal',
                row: 'mt-1 flex w-full',
                week: 'mt-1 flex w-full',
                cell: 'h-8 w-8 p-0 text-center text-sm',
                day: 'h-8 w-8 p-0 text-center text-sm',
                day_button:
                    'inline-flex h-8 w-8 items-center justify-center rounded-md p-0 font-normal text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                day_selected:
                    'border border-[#2563eb]/35 bg-[#2563eb]/14 text-[#1e40af] hover:bg-[#2563eb]/20 hover:text-[#1e3a8a] focus:bg-[#2563eb]/20 focus:text-[#1e3a8a] dark:border-[#2563eb]/45 dark:bg-[#2563eb]/24 dark:text-sky-100 dark:hover:bg-[#2563eb]/30 dark:hover:text-sky-50',
                selected:
                    'border border-[#2563eb]/35 bg-[#2563eb]/14 text-[#1e40af] hover:bg-[#2563eb]/20 hover:text-[#1e3a8a] focus:bg-[#2563eb]/20 focus:text-[#1e3a8a] dark:border-[#2563eb]/45 dark:bg-[#2563eb]/24 dark:text-sky-100 dark:hover:bg-[#2563eb]/30 dark:hover:text-sky-50',
                day_today:
                    'border border-slate-300 text-slate-900 dark:border-slate-600 dark:text-slate-100',
                today:
                    'border border-slate-300 text-slate-900 dark:border-slate-600 dark:text-slate-100',
                day_outside: 'text-muted-foreground opacity-50',
                outside: 'text-muted-foreground opacity-50',
                day_disabled: 'text-muted-foreground opacity-50',
                disabled: 'text-muted-foreground opacity-50',
                day_hidden: 'invisible',
                hidden: 'invisible',
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation, className: iconClassName, ...iconProps }) =>
                    orientation === 'left' ? (
                        <ChevronLeft
                            className={cn('h-4 w-4', iconClassName)}
                            {...iconProps}
                        />
                    ) : (
                        <ChevronRight
                            className={cn('h-4 w-4', iconClassName)}
                            {...iconProps}
                        />
                    ),
            }}
            {...props}
        />
    );
}

export { Calendar };

