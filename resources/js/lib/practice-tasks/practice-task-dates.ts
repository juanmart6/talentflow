export function parseDueDate(value: string): string | null {
    const [day, month, year] = value.split('/');

    if (!day || !month || !year) {
        return null;
    }

    return `${year}-${month}-${day}`;
}

export function dueDaysFromToday(dueAt: string): number | null {
    const dueDate = parseDueDate(dueAt);
    if (!dueDate) {
        return null;
    }

    const now = new Date();
    const target = new Date(dueDate);
    const utcToday = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const utcTarget = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());

    return Math.floor((utcTarget - utcToday) / (1000 * 60 * 60 * 24));
}

export function dueIndicatorMeta(dueAt: string): { dotClass: string; text: string } | null {
    const days = dueDaysFromToday(dueAt);

    if (days === null) {
        return null;
    }

    if (days < 0) {
        return {
            dotClass: 'bg-black dark:bg-white',
            text: `Venció hace ${Math.abs(days)} día(s)`,
        };
    }

    if (days <= 7) {
        return {
            dotClass: 'bg-red-500',
            text: days === 0 ? 'Vence hoy' : `Te quedan ${days} día(s)`,
        };
    }

    if (days <= 14) {
        return {
            dotClass: 'bg-yellow-400',
            text: `Te quedan ${days} día(s)`,
        };
    }

    return {
        dotClass: 'bg-emerald-500',
        text: `Te quedan ${days} día(s)`,
    };
}