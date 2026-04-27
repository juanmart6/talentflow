type FormErrors = Record<string, unknown>;

export function getFirstFormErrorMessage(formErrors: FormErrors): string | null {
    for (const value of Object.values(formErrors)) {
        if (typeof value === 'string' && value.trim() !== '') {
            return value;
        }

        if (Array.isArray(value)) {
            const firstString = value.find((item) => typeof item === 'string' && item.trim() !== '');
            if (typeof firstString === 'string') {
                return firstString;
            }
        }
    }

    return null;
}

