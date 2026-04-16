import { FieldLabel } from '@/components/form-ui';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';

type FileUploadFieldProps = {
    id: string;
    name?: string;
    label: string;
    accept?: string;
    required?: boolean;
    error?: string;
    selectedFileName?: string | null;
    emptyText?: string;
    buttonText?: string;
    onChange?: (file: File | null) => void;
    buttonClassName?: string;
};

export default function FileUploadField({
    id,
    name,
    label,
    accept,
    required,
    error,
    selectedFileName,
    emptyText = 'Ningún archivo seleccionado',
    buttonText = 'Seleccionar archivo',
    onChange,
    buttonClassName,
}: FileUploadFieldProps) {
    return (
        <div className="grid gap-2">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <div className="flex min-h-9 min-w-0 items-center gap-3 text-sm">
                <label
                    htmlFor={id}
                    className={
                        buttonClassName ??
                        'inline-flex h-9 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-md border border-[#2563eb]/35 bg-white px-4 text-sm font-medium text-[#1d4ed8] shadow-xs transition-colors hover:border-[#2563eb]/60 hover:bg-[#2563eb]/10 dark:border-[#2563eb]/45 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-[#2563eb]/20'
                    }
                >
                    {buttonText}
                </label>

                <span className={`${selectedFileName ? 'min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200' : 'min-w-0 flex-1 truncate text-muted-foreground'}`}>
                    {selectedFileName ?? emptyText}
                </span>

                <Input
                    id={id}
                    type="file"
                    name={name}
                    accept={accept}
                    required={required}
                    className="sr-only"
                    onChange={(event) => onChange?.(event.target.files?.[0] ?? null)}
                />
            </div>
            <InputError message={error} />
        </div>
    );
}
