import { Calendar as CalendarIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePickerProps = {
    id: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    name?: string;
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
};

function parseDateValue(value: string): Date | null {
    if (!value) {
        return null;
    }

    const [yearText, monthText, dayText] = value.split('-');
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);

    if (!year || !month || !day) {
        return null;
    }

    const parsed = new Date(year, month - 1, day);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }

    return parsed;
}

function formatDateValue(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function formatDisplayValue(value: string): string {
    const parsed = parseDateValue(value);

    if (!parsed) {
        return value;
    }

    return parsed.toLocaleDateString('es-ES');
}

export default function DatePicker({
    id,
    value,
    defaultValue = '',
    onChange,
    name,
    placeholder = 'Seleccionar fecha',
    className,
    disabled = false,
    required = false,
}: DatePickerProps) {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const selectedValue = value !== undefined ? value : internalValue;
    const selectedDate = useMemo(() => parseDateValue(selectedValue), [selectedValue]);

    const setValue = (nextValue: string) => {
        if (value === undefined) {
            setInternalValue(nextValue);
        }

        onChange?.(nextValue);
    };

    return (
        <div className="w-full">
            {name ? (
                <input type="hidden" name={name} value={selectedValue} required={required} />
            ) : null}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        ref={triggerRef}
                        id={id}
                        type="button"
                        disabled={disabled}
                        className={cn(
                            'inline-flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-left shadow-xs transition-colors outline-none focus-visible:border-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-600 dark:bg-slate-950',
                            !selectedValue && 'text-muted-foreground',
                            className,
                        )}
                    >
                        <span>{selectedValue ? formatDisplayValue(selectedValue) : placeholder}</span>
                        <CalendarIcon className="h-4 w-4 opacity-70" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={selectedDate ?? undefined}
                        onSelect={(nextDate) => {
                            setValue(nextDate ? formatDateValue(nextDate) : '');
                            setOpen(false);
                            triggerRef.current?.blur();
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
