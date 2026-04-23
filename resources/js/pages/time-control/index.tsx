import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Download,
    Eye,
    FilterX,
    Pause,
    Pencil,
    Play,
    Plus,
    Save,
    ShieldAlert,
    Timer,
    Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import DatePicker from '@/components/shared/date-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { UI_PRESETS, stripedRowClass } from '@/lib/ui-presets';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type InternOption = {
    id: number;
    name: string;
    email: string;
    required_hours: number;
};

type ClockEntry = {
    id: number;
    source: string;
    started_at: string | null;
    ended_at: string | null;
    break_started_at: string | null;
    break_minutes: number;
    manual_reason: string | null;
    is_on_break: boolean;
    effective_minutes: number;
    effective_hours: number;
};

type Schedule = {
    id: number;
    season_name: string | null;
    starts_on: string | null;
    ends_on: string | null;
    is_active: boolean;
    notes: string | null;
    weekly_total_minutes: number;
    weekly_total_hours: number;
    days: {
        monday: number;
        tuesday: number;
        wednesday: number;
        thursday: number;
        friday: number;
        saturday: number;
        sunday: number;
    };
};

type Absence = {
    id: number;
    start_date: string | null;
    end_date: string | null;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    attachment_url: string | null;
    review_note: string | null;
    reviewed_at: string | null;
    requested_by_name: string | null;
    reviewed_by_name: string | null;
    created_at: string | null;
    intern?: {
        id: number;
        name: string;
        email: string;
    } | null;
};

type DayRow = {
    date: string;
    label: string;
    weekday: string;
    worked_minutes: number;
    planned_minutes: number;
    worked_hours: number;
    planned_hours: number;
    status:
        | 'off'
        | 'scheduled'
        | 'missing'
        | 'partial'
        | 'overtime'
        | 'complete';
    off_kind: 'rest' | 'unscheduled' | null;
    is_today: boolean;
    is_past: boolean;
};

type AlertRow = {
    level: 'success' | 'warning' | 'info';
    title: string;
    message: string;
};

type DayDetails = {
    date: string;
    label: string;
    weekday: string;
    status: DayRow['status'];
    planned_minutes: number;
    planned_hours: number;
    worked_minutes: number;
    worked_hours: number;
    break_minutes: number;
    break_hours: number;
    compliance_percent: number;
    first_clock_in: string | null;
    last_clock_out: string | null;
    active_break_started_at: string | null;
    off_kind: DayRow['off_kind'];
    entries: ClockEntry[];
};

type Props = {
    interns: InternOption[];
    selectedInternId: number | null;
    selectedIntern: {
        id: number;
        name: string;
        email: string;
        required_hours: number;
        internship_start_date: string | null;
        internship_end_date: string | null;
    } | null;
    isInternUser: boolean;
    canManageTeam: boolean;
    clockState: {
        activeEntry: ClockEntry | null;
        canManualEntry: boolean;
    };
    timeEntries: ClockEntry[];
    schedules: Schedule[];
    absenceRequests: Absence[];
    pendingAbsenceRequests: Absence[];
    calendar: {
        monthCursor: string;
        monthDays: DayRow[];
        weekDays: DayRow[];
    };
    summary: {
        range: {
            label: string;
            start: string | null;
            end: string | null;
            worked_minutes: number;
            worked_hours: number;
            planned_minutes: number;
            planned_hours: number;
            compliance_percent: number;
            delay_minutes: number;
        };
        progress: {
            required_hours: number;
            total_worked_minutes: number;
            total_worked_hours: number;
            progress_percent: number;
            expected_percent: number | null;
        };
        alerts: AlertRow[];
    };
    filters: {
        range: 'week' | 'biweekly' | 'month';
        month: string;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Control Horario',
        href: '/control-horario',
    },
];

const tabs = [
    { id: 'clock', label: 'Fichaje', icon: Clock3 },
    { id: 'schedules', label: 'Horarios', icon: Timer },
    { id: 'calendar', label: 'Calendario', icon: CalendarDays },
    { id: 'absence', label: 'Ausencias', icon: ShieldAlert },
    { id: 'summary', label: 'Resumen y alertas', icon: CheckCircle2 },
] as const;

const SECTION_TITLE_CLASS =
    'mb-3 text-sm font-semibold tracking-wide text-foreground uppercase';
const SECTION_TITLE_INLINE_CLASS =
    'text-sm font-semibold tracking-wide text-foreground uppercase';
const FIELD_LABEL_CLASS =
    'text-xs font-semibold tracking-wide text-muted-foreground uppercase';
const WEEKDAY_FULL_NAMES = [
    'Lunes',
    'Martes',
    'Miercoles',
    'Jueves',
    'Viernes',
    'Sabado',
    'Domingo',
] as const;

type DayVisualStatus =
    | 'disabled'
    | 'rest'
    | 'pending'
    | 'missing'
    | 'partial'
    | 'complete';

const DAY_VISUAL_LEGEND: Array<{
    status: DayVisualStatus;
    label: string;
    dotClassName: string;
}> = [
    { status: 'disabled', label: 'Sin horario', dotClassName: 'bg-slate-400' },
    {
        status: 'rest',
        label: 'Descanso',
        dotClassName:
            'border border-slate-400 bg-[repeating-linear-gradient(-45deg,#f8fafc_0_2px,#e2e8f0_2px_4px)]',
    },
    {
        status: 'pending',
        label: 'Pendiente',
        dotClassName: 'border border-slate-400 bg-white',
    },
    { status: 'missing', label: 'Sin fichaje', dotClassName: 'bg-rose-500' },
    { status: 'partial', label: 'Parcial', dotClassName: 'bg-amber-500' },
    { status: 'complete', label: 'Completo', dotClassName: 'bg-emerald-500' },
];

const SILENCED_CLOCK_TOAST_ACTIONS = new Set([
    'clock-in',
    'clock-out',
    'start-break',
    'end-break',
]);

const SCHEDULE_DAY_DEFS = [
    { key: 'monday', shortLabel: 'Lun', fullLabel: 'Lunes' },
    { key: 'tuesday', shortLabel: 'Mar', fullLabel: 'Martes' },
    { key: 'wednesday', shortLabel: 'Mie', fullLabel: 'Miercoles' },
    { key: 'thursday', shortLabel: 'Jue', fullLabel: 'Jueves' },
    { key: 'friday', shortLabel: 'Vie', fullLabel: 'Viernes' },
    { key: 'saturday', shortLabel: 'Sab', fullLabel: 'Sabado' },
    { key: 'sunday', shortLabel: 'Dom', fullLabel: 'Domingo' },
] as const;

type ScheduleDayKey = (typeof SCHEDULE_DAY_DEFS)[number]['key'];

type ScheduleDayEditor = {
    start: string;
    end: string;
    active: boolean;
};

type ScheduleFormState = {
    schedule_id: string;
    season_name: string;
    starts_on: string;
    ends_on: string;
    monday_minutes: string;
    tuesday_minutes: string;
    wednesday_minutes: string;
    thursday_minutes: string;
    friday_minutes: string;
    saturday_minutes: string;
    sunday_minutes: string;
    notes: string;
};

type TimelineEntryFormState = {
    entry_id: number | null;
    started_at: string;
    ended_at: string;
    break_minutes: string;
    manual_reason: string;
};

function parseTimeToMinutes(value: string): number | null {
    const [hoursStr, minutesStr] = value.split(':');
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    if (
        !Number.isInteger(hours)
        || !Number.isInteger(minutes)
        || hours < 0
        || hours > 23
        || minutes < 0
        || minutes > 59
    ) {
        return null;
    }
    return (hours * 60) + minutes;
}

function minutesToTime(totalMinutes: number): string {
    const safeMinutes = Math.max(0, Math.round(totalMinutes));
    const hours = Math.floor(safeMinutes / 60) % 24;
    const minutes = safeMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getScheduleMinutes(day: ScheduleDayEditor): number {
    if (!day.active) return 0;
    const start = parseTimeToMinutes(day.start);
    const end = parseTimeToMinutes(day.end);
    if (start === null || end === null || end <= start) return 0;
    return end - start;
}

function formatScheduleHours(minutes: number): string {
    return `${(minutes / 60).toFixed(1)}h`;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
    const totalMinutes = index * 30;
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const minutes = String(totalMinutes % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
});

const EMPTY_SCHEDULE_FORM: ScheduleFormState = {
    schedule_id: '',
    season_name: '',
    starts_on: '',
    ends_on: '',
    monday_minutes: '0',
    tuesday_minutes: '0',
    wednesday_minutes: '0',
    thursday_minutes: '0',
    friday_minutes: '0',
    saturday_minutes: '0',
    sunday_minutes: '0',
    notes: '',
};

const EMPTY_SCHEDULE_DAYS: Record<ScheduleDayKey, ScheduleDayEditor> = {
    monday: { start: '09:00', end: '14:00', active: false },
    tuesday: { start: '09:00', end: '14:00', active: false },
    wednesday: { start: '09:00', end: '14:00', active: false },
    thursday: { start: '09:00', end: '14:00', active: false },
    friday: { start: '09:00', end: '14:00', active: false },
    saturday: { start: '09:00', end: '14:00', active: false },
    sunday: { start: '09:00', end: '14:00', active: false },
};

function formatDate(value: string | null): string {
    if (!value) return '-';
    return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES');
}

function formatDateTime(value: string | null): string {
    if (!value) return '-';
    return new Date(value).toLocaleString('es-ES');
}

function formatTime(value: string | null): string {
    if (!value) return '-';
    return new Date(value).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatClockTime(value: string | null): string {
    return value ? formatTime(value) : '--:--';
}

function toDateTimeLocalInput(value: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildTimelineEntryCreateForm(date: string | null): TimelineEntryFormState {
    return {
        entry_id: null,
        started_at: date ? `${date}T09:00` : '',
        ended_at: date ? `${date}T14:00` : '',
        break_minutes: '0',
        manual_reason: '',
    };
}

function buildTimelineEntryEditForm(entry: ClockEntry): TimelineEntryFormState {
    return {
        entry_id: entry.id,
        started_at: toDateTimeLocalInput(entry.started_at),
        ended_at: toDateTimeLocalInput(entry.ended_at),
        break_minutes: String(entry.break_minutes ?? 0),
        manual_reason: entry.manual_reason ?? '',
    };
}

function formatMinutesDetailed(totalMinutes: number): string {
    const safeMinutes = Math.max(0, Math.round(totalMinutes));
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;

    if (hours === 0) return `${minutes} min`;
    if (minutes === 0) return `${hours} h`;
    return `${hours} h ${minutes} min`;
}

function formatEntrySource(source: string): string {
    if (source === 'tutor_manual') return 'Manual';
    if (source === 'self') return 'Auto';
    return source;
}

function dateKeyToUtcDate(value: string): Date {
    const [year, month, day] = value.split('-').map((part) => Number(part));
    return new Date(Date.UTC(year, month - 1, day));
}

function utcDateToDateKey(value: Date): string {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function localDateToDateKey(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function shiftDateKey(value: string, days: number): string {
    const date = dateKeyToUtcDate(value);
    date.setUTCDate(date.getUTCDate() + days);
    return utcDateToDateKey(date);
}

function formatWorkedElapsed(entry: ClockEntry | null, now: Date): string {
    if (!entry?.started_at) return '--:--:--';

    const started = new Date(entry.started_at);
    if (Number.isNaN(started.getTime())) return '--:--:--';

    let workedMs = Math.max(0, now.getTime() - started.getTime());
    workedMs -= Math.max(0, (entry.break_minutes ?? 0) * 60_000);

    if (entry.is_on_break && entry.break_started_at) {
        const breakStartedAt = new Date(entry.break_started_at);
        if (!Number.isNaN(breakStartedAt.getTime())) {
            workedMs -= Math.max(0, now.getTime() - breakStartedAt.getTime());
        }
    }

    const totalSeconds = Math.floor(Math.max(0, workedMs) / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
        2,
        '0',
    )}:${String(seconds).padStart(2, '0')}`;
}

function resolveDayVisualStatus(
    plannedHours: number,
    workedHours: number,
    isPast: boolean,
    offKind: DayRow['off_kind'] | DayDetails['off_kind'],
): DayVisualStatus {
    const hasPlannedHours = plannedHours > 0.01;
    const hasWorkedHours = workedHours > 0.01;

    if (!hasPlannedHours && !hasWorkedHours) {
        return offKind === 'rest' ? 'rest' : 'disabled';
    }
    if (!hasPlannedHours && hasWorkedHours) return 'complete';
    if (!isPast && !hasWorkedHours) return 'pending';
    if (!hasWorkedHours) return 'missing';
    if (workedHours >= 7.99 || workedHours >= plannedHours) return 'complete';
    return 'partial';
}

function dayVisualClasses(status: DayVisualStatus): string {
    return {
        disabled: 'border-slate-200 bg-slate-50/70 text-slate-400 opacity-50',
        rest: 'border-slate-300 text-slate-600 bg-[repeating-linear-gradient(-45deg,#f8fafc_0_8px,#e2e8f0_8px_16px)] dark:border-slate-600 dark:text-slate-300 dark:bg-[repeating-linear-gradient(-45deg,#0f172a_0_8px,#1e293b_8px_16px)]',
        pending:
            'border-sidebar-border/70 bg-white text-slate-700 dark:border-sidebar-border dark:bg-slate-900/20 dark:text-slate-200',
        missing: 'border-rose-200 bg-rose-50 text-rose-700',
        partial: 'border-amber-200 bg-amber-50 text-amber-700',
        complete: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    }[status];
}

function dayVisualBadgeClasses(status: DayVisualStatus): string {
    return {
        disabled: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
        rest: 'border-slate-300 text-slate-700 bg-[repeating-linear-gradient(-45deg,#f8fafc_0_6px,#e2e8f0_6px_12px)] dark:border-slate-600 dark:text-slate-200 dark:bg-[repeating-linear-gradient(-45deg,#0f172a_0_6px,#1e293b_6px_12px)]',
        pending:
            'border-sidebar-border/70 bg-white text-slate-700 dark:border-sidebar-border dark:bg-slate-900/30 dark:text-slate-200',
        missing: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-700/50 dark:bg-rose-900/20 dark:text-rose-200',
        partial: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-200',
        complete: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-200',
    }[status];
}

function dayVisualProgressClass(status: DayVisualStatus): string {
    return {
        disabled: 'bg-slate-300',
        rest: 'bg-slate-300',
        pending: 'bg-slate-300',
        missing: 'bg-rose-400',
        partial: 'bg-amber-400',
        complete: 'bg-emerald-400',
    }[status];
}

function absenceBadgeVariant(
    status: Absence['status'],
): 'secondary' | 'default' | 'destructive' {
    if (status === 'approved') return 'default';
    if (status === 'rejected') return 'destructive';
    return 'secondary';
}

export default function TimeControlPage({
    interns,
    selectedInternId,
    selectedIntern,
    canManageTeam,
    clockState,
    timeEntries,
    schedules,
    absenceRequests,
    pendingAbsenceRequests,
    calendar,
    summary,
    filters,
}: Props) {
    const page = usePage<{
        flash?: { success?: string; error?: string; info?: string };
        errors?: {
            date_range?: string;
            season_name?: string;
            starts_on?: string;
            ends_on?: string;
        };
    }>();
    const lastFlashRef = useRef<string | null>(null);
    const lastScheduleErrorRef = useRef<string | null>(null);
    const lastActionRef = useRef<string | null>(null);
    const [activeTab, setActiveTab] =
        useState<(typeof tabs)[number]['id']>('summary');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
    const [liveNow, setLiveNow] = useState<Date>(() => new Date());
    const [openTimeSelectKey, setOpenTimeSelectKey] = useState<string | null>(
        null,
    );
    const [isEditScheduleDialogOpen, setIsEditScheduleDialogOpen] =
        useState(false);
    const [editOpenTimeSelectKey, setEditOpenTimeSelectKey] = useState<
        string | null
    >(null);
    const range = filters.range;
    const monthCursor = filters.month;
    const internId = selectedInternId ? String(selectedInternId) : '';

    const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(
        EMPTY_SCHEDULE_FORM,
    );
    const [editScheduleForm, setEditScheduleForm] = useState<ScheduleFormState>(
        EMPTY_SCHEDULE_FORM,
    );
    const [scheduleDays, setScheduleDays] = useState<
        Record<ScheduleDayKey, ScheduleDayEditor>
    >(EMPTY_SCHEDULE_DAYS);
    const [editScheduleDays, setEditScheduleDays] = useState<
        Record<ScheduleDayKey, ScheduleDayEditor>
    >(EMPTY_SCHEDULE_DAYS);

    const [absenceForm, setAbsenceForm] = useState({
        start_date: '',
        end_date: '',
        reason: '',
        attachment: null as File | null,
    });
    const [weekStartOverride, setWeekStartOverride] = useState<string | null>(
        null,
    );
    const [isDayDetailsOpen, setIsDayDetailsOpen] = useState(false);
    const [dayDetailsLoading, setDayDetailsLoading] = useState(false);
    const [dayDetails, setDayDetails] = useState<DayDetails | null>(null);
    const [dayDetailsDate, setDayDetailsDate] = useState<string | null>(null);
    const [dayDetailsTab, setDayDetailsTab] = useState<'status' | 'timeline'>(
        'status',
    );
    const [isTimelineEntryFormOpen, setIsTimelineEntryFormOpen] =
        useState(false);
    const [timelineEntryForm, setTimelineEntryForm] =
        useState<TimelineEntryFormState>(() => buildTimelineEntryCreateForm(null));
    const dayDetailsRequestRef = useRef(0);

    useEffect(() => {
        const successMessage = page.props.flash?.success;
        const errorMessage = page.props.flash?.error;
        const infoMessage = page.props.flash?.info;
        const key = JSON.stringify({
            success: successMessage ?? null,
            error: errorMessage ?? null,
            info: infoMessage ?? null,
        });

        if (!successMessage && !errorMessage && !infoMessage) return;
        if (lastFlashRef.current === key) return;
        lastFlashRef.current = key;
        const actionKey = lastActionRef.current;
        lastActionRef.current = null;

        if (
            actionKey
            && SILENCED_CLOCK_TOAST_ACTIONS.has(actionKey)
        ) {
            return;
        }

        if (successMessage) toast.success(successMessage);
        if (errorMessage) toast.error(errorMessage);
        if (infoMessage) toast.info(infoMessage);
    }, [
        page.props.flash?.success,
        page.props.flash?.error,
        page.props.flash?.info,
    ]);

    useEffect(() => {
        const timerId = window.setInterval(() => {
            setLiveNow(new Date());
        }, 1000);

        return () => window.clearInterval(timerId);
    }, []);

    useEffect(() => {
        const message =
            page.props.errors?.date_range
            || page.props.errors?.season_name
            || page.props.errors?.starts_on
            || page.props.errors?.ends_on
            || null;

        if (!message) {
            lastScheduleErrorRef.current = null;
            return;
        }

        if (lastScheduleErrorRef.current === message) {
            return;
        }

        lastScheduleErrorRef.current = message;
        toast.error(message);
    }, [
        page.props.errors?.date_range,
        page.props.errors?.season_name,
        page.props.errors?.starts_on,
        page.props.errors?.ends_on,
    ]);

    const applyFilters = (
        overrides: Partial<{
            intern_id: string;
            range: Props['filters']['range'];
            month: string;
        }> = {},
    ) => {
        router.get(
            '/control-horario',
            {
                intern_id: canManageTeam
                    ? (overrides.intern_id ?? (internId || undefined))
                    : undefined,
                range: overrides.range ?? range,
                month: overrides.month ?? monthCursor,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const withIntern = <T extends Record<string, unknown>>(
        payload: T,
    ): T & { intern_id?: string } => ({
        ...payload,
        ...(internId ? { intern_id: internId } : {}),
    });

    const postAction = (
        actionKey: string,
        url: string,
        payload: Record<string, unknown> = {},
        forceFormData = false,
        onSuccess?: () => void,
    ) => {
        lastActionRef.current = actionKey;
        setActionLoading(actionKey);
        router.post(url, withIntern(payload) as any, {
            preserveScroll: true,
            forceFormData,
            onSuccess,
            onFinish: () => setActionLoading(null),
        });
    };

    const buildSchedulePayload = (
        form: ScheduleFormState,
        days: Record<ScheduleDayKey, ScheduleDayEditor>,
    ) => {
        if (!form.season_name.trim()) {
            toast.error('Debes indicar un nombre para el calendario.');
            return null;
        }

        if (!form.starts_on || !form.ends_on) {
            toast.error('Debes indicar fecha de inicio y fecha de fin.');
            return null;
        }

        if (form.ends_on < form.starts_on) {
            toast.error('La fecha de fin debe ser igual o posterior a la de inicio.');
            return null;
        }

        const hasInvalidRow = SCHEDULE_DAY_DEFS.some((dayDef) => {
            const row = days[dayDef.key];
            if (!row.active) return false;
            const start = parseTimeToMinutes(row.start);
            const end = parseTimeToMinutes(row.end);
            return start === null || end === null || end <= start;
        });

        if (hasInvalidRow) {
            toast.error('Revisa las horas: la salida debe ser mayor a la entrada.');
            return null;
        }

        const dayMinutes = Object.fromEntries(
            SCHEDULE_DAY_DEFS.map((dayDef) => [
                dayDef.key,
                getScheduleMinutes(days[dayDef.key]),
            ]),
        ) as Record<ScheduleDayKey, number>;

        return {
            ...form,
            season_name: form.season_name.trim(),
            monday_minutes: String(dayMinutes.monday),
            tuesday_minutes: String(dayMinutes.tuesday),
            wednesday_minutes: String(dayMinutes.wednesday),
            thursday_minutes: String(dayMinutes.thursday),
            friday_minutes: String(dayMinutes.friday),
            saturday_minutes: String(dayMinutes.saturday),
            sunday_minutes: String(dayMinutes.sunday),
        };
    };

    const submitSchedule = (event: FormEvent) => {
        event.preventDefault();
        const payload = buildSchedulePayload(scheduleForm, scheduleDays);
        if (!payload) return;
        postAction('schedule', '/control-horario/schedules', payload);
    };

    const submitEditSchedule = (event: FormEvent) => {
        event.preventDefault();
        const payload = buildSchedulePayload(editScheduleForm, editScheduleDays);
        if (!payload) return;
        postAction(
            'schedule',
            '/control-horario/schedules',
            payload,
            false,
            () => {
                resetEditSchedule();
            },
        );
    };

    const loadSchedule = (schedule: Schedule) => {
        setActiveTab('schedules');
        const fromMinutes = (minutes: number): ScheduleDayEditor => ({
            start: '09:00',
            end: minutesToTime((9 * 60) + minutes),
            active: minutes > 0,
        });

        setEditScheduleForm({
            schedule_id: String(schedule.id),
            season_name: schedule.season_name ?? '',
            starts_on: schedule.starts_on ?? '',
            ends_on: schedule.ends_on ?? '',
            monday_minutes: String(schedule.days.monday),
            tuesday_minutes: String(schedule.days.tuesday),
            wednesday_minutes: String(schedule.days.wednesday),
            thursday_minutes: String(schedule.days.thursday),
            friday_minutes: String(schedule.days.friday),
            saturday_minutes: String(schedule.days.saturday),
            sunday_minutes: String(schedule.days.sunday),
            notes: schedule.notes ?? '',
        });
        setEditScheduleDays({
            monday: fromMinutes(schedule.days.monday),
            tuesday: fromMinutes(schedule.days.tuesday),
            wednesday: fromMinutes(schedule.days.wednesday),
            thursday: fromMinutes(schedule.days.thursday),
            friday: fromMinutes(schedule.days.friday),
            saturday: fromMinutes(schedule.days.saturday),
            sunday: fromMinutes(schedule.days.sunday),
        });
        setEditOpenTimeSelectKey(null);
        setIsEditScheduleDialogOpen(true);
    };

    const resetSchedule = () => {
        setScheduleForm(EMPTY_SCHEDULE_FORM);
        setScheduleDays(EMPTY_SCHEDULE_DAYS);
        setOpenTimeSelectKey(null);
    };

    const resetEditSchedule = () => {
        setEditScheduleForm(EMPTY_SCHEDULE_FORM);
        setEditScheduleDays(EMPTY_SCHEDULE_DAYS);
        setEditOpenTimeSelectKey(null);
        setIsEditScheduleDialogOpen(false);
    };

    const submitAbsence = (event: FormEvent) => {
        event.preventDefault();
        postAction(
            'absence',
            '/control-horario/absences',
            {
                start_date: absenceForm.start_date,
                end_date: absenceForm.end_date,
                reason: absenceForm.reason,
                attachment: absenceForm.attachment ?? undefined,
            },
            true,
        );
    };

    const runReview = (absenceId: number, status: 'approved' | 'rejected') => {
        lastActionRef.current = 'absence-review';
        setActionLoading(`review-${absenceId}-${status}`);
        router.patch(
            `/control-horario/absences/${absenceId}/review`,
            {
                status,
                review_note: reviewNotes[absenceId] ?? '',
            },
            {
                preserveScroll: true,
                onFinish: () => setActionLoading(null),
            },
        );
    };

    const openPdf = () => {
        const params = new URLSearchParams();
        if (internId) params.set('intern_id', internId);
        params.set('range', range);
        window.location.href = `/control-horario/export/pdf?${params.toString()}`;
    };

    const openDayDetails = async (
        date: string,
        options?: { preserveTab?: boolean },
    ) => {
        if (canManageTeam && !internId) {
            toast.error('Selecciona un becario para ver el detalle diario.');
            return;
        }

        setIsDayDetailsOpen(true);
        setDayDetailsLoading(true);
        setDayDetailsDate(date);
        setDayDetails(null);
        if (!options?.preserveTab) {
            setDayDetailsTab('status');
        }
        setIsTimelineEntryFormOpen(false);
        setTimelineEntryForm(buildTimelineEntryCreateForm(null));

        const requestId = dayDetailsRequestRef.current + 1;
        dayDetailsRequestRef.current = requestId;

        try {
            const params = new URLSearchParams({ date });
            if (internId) params.set('intern_id', internId);

            const response = await fetch(
                `/control-horario/day-details?${params.toString()}`,
                {
                    headers: {
                        Accept: 'application/json',
                    },
                },
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const payload = (await response.json()) as DayDetails;
            if (dayDetailsRequestRef.current !== requestId) return;
            setDayDetails(payload);
        } catch {
            if (dayDetailsRequestRef.current !== requestId) return;
            toast.error('No se pudo cargar el detalle del dia.');
            setDayDetails(null);
        } finally {
            if (dayDetailsRequestRef.current === requestId) {
                setDayDetailsLoading(false);
            }
        }
    };

    const closeDayDetailsDialog = () => {
        setIsDayDetailsOpen(false);
        setDayDetailsLoading(false);
        setDayDetailsTab('status');
        setIsTimelineEntryFormOpen(false);
        setTimelineEntryForm(buildTimelineEntryCreateForm(null));
    };

    const openCreateTimelineEntryForm = () => {
        if (!clockState.canManualEntry) {
            toast.error('No tienes permisos para registrar fichajes manuales.');
            return;
        }

        const targetDate = dayDetails?.date ?? dayDetailsDate;
        setDayDetailsTab('timeline');
        setTimelineEntryForm(buildTimelineEntryCreateForm(targetDate));
        setIsTimelineEntryFormOpen(true);
    };

    const openEditTimelineEntryForm = (entry: ClockEntry) => {
        if (!clockState.canManualEntry) {
            toast.error('No tienes permisos para editar fichajes manuales.');
            return;
        }

        if (entry.source !== 'tutor_manual') {
            toast.error('Solo se pueden editar fichajes manuales.');
            return;
        }

        setDayDetailsTab('timeline');
        setTimelineEntryForm(buildTimelineEntryEditForm(entry));
        setIsTimelineEntryFormOpen(true);
    };

    const closeTimelineEntryForm = () => {
        setIsTimelineEntryFormOpen(false);
        setTimelineEntryForm(buildTimelineEntryCreateForm(null));
    };

    const submitTimelineEntryForm = (event: FormEvent) => {
        event.preventDefault();

        if (!clockState.canManualEntry) {
            toast.error('No tienes permisos para registrar fichajes manuales.');
            return;
        }

        if (!internId) {
            toast.error('Selecciona un becario para guardar fichajes manuales.');
            return;
        }

        const manualReason = timelineEntryForm.manual_reason.trim();
        if (!timelineEntryForm.started_at || !timelineEntryForm.ended_at) {
            toast.error('Debes indicar una hora de inicio y de fin.');
            return;
        }

        if (!manualReason) {
            toast.error('Debes indicar un motivo.');
            return;
        }

        const parsedBreakMinutes = Number(timelineEntryForm.break_minutes);
        if (
            !Number.isFinite(parsedBreakMinutes)
            || parsedBreakMinutes < 0
            || parsedBreakMinutes > 720
        ) {
            toast.error('Las pausas deben estar entre 0 y 720 minutos.');
            return;
        }

        const payload = {
            intern_id: internId,
            started_at: timelineEntryForm.started_at,
            ended_at: timelineEntryForm.ended_at,
            break_minutes: Math.round(parsedBreakMinutes),
            manual_reason: manualReason,
        };

        const selectedDate = dayDetails?.date ?? dayDetailsDate;
        const entryId = timelineEntryForm.entry_id;

        if (entryId !== null) {
            setActionLoading(`day-entry-update-${entryId}`);
            router.patch(`/control-horario/entries/${entryId}`, payload, {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    closeTimelineEntryForm();
                    if (selectedDate) {
                        void openDayDetails(selectedDate, { preserveTab: true });
                    }
                },
                onFinish: () => setActionLoading(null),
            });
            return;
        }

        setActionLoading('day-entry-create');
        router.post('/control-horario/manual-entry', payload, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                closeTimelineEntryForm();
                if (selectedDate) {
                    void openDayDetails(selectedDate, { preserveTab: true });
                }
            },
            onFinish: () => setActionLoading(null),
        });
    };

    const deleteTimelineEntry = (entry: ClockEntry) => {
        if (!clockState.canManualEntry) {
            toast.error('No tienes permisos para eliminar fichajes manuales.');
            return;
        }

        if (entry.source !== 'tutor_manual') {
            toast.error('Solo se pueden eliminar fichajes manuales.');
            return;
        }

        if (!internId) {
            toast.error('Selecciona un becario para eliminar fichajes manuales.');
            return;
        }

        const confirmed = window.confirm(
            'Se eliminara el fichaje manual seleccionado. Esta accion no se puede deshacer.',
        );
        if (!confirmed) return;

        const selectedDate = dayDetails?.date ?? dayDetailsDate;
        setActionLoading(`day-entry-delete-${entry.id}`);
        router.delete(`/control-horario/entries/${entry.id}`, {
            data: {
                intern_id: internId,
            },
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                if (timelineEntryForm.entry_id === entry.id) {
                    closeTimelineEntryForm();
                }
                if (selectedDate) {
                    void openDayDetails(selectedDate, { preserveTab: true });
                }
            },
            onFinish: () => setActionLoading(null),
        });
    };

    const activeEntry = clockState.activeEntry;
    const canClockIn = !activeEntry;
    const canStartBreak = activeEntry !== null && !activeEntry.is_on_break;
    const canEndBreak = activeEntry !== null && activeEntry.is_on_break;
    const clockStatusTextClass = activeEntry
        ? activeEntry.is_on_break
            ? 'text-amber-700'
            : 'text-emerald-700'
        : 'text-slate-700';
    const clockStatusDotClass = activeEntry
        ? activeEntry.is_on_break
            ? 'dot-pause'
            : 'dot-live'
        : 'dot-stop';
    const clockStatusLabel = canClockIn
        ? 'Pendiente'
        : activeEntry?.is_on_break
          ? 'Pausa'
          : 'Entrada';
    const activeElapsedLabel = formatWorkedElapsed(activeEntry, liveNow);
    const primaryClockAction = canClockIn
        ? {
              key: 'clock-in',
              label: 'Fichar entrada',
              url: '/control-horario/clock-in',
          }
        : {
              key: 'clock-out',
              label: 'Fichar salida',
              url: '/control-horario/clock-out',
          };
    const isClockOutPrimary = primaryClockAction.key === 'clock-out';
    const latestSixEntries = timeEntries.slice(0, 6);
    const defaultWeekStart = calendar.weekDays[0]?.date ?? null;
    const selectedWeekStart =
        weekStartOverride
        && calendar.monthDays.some((day) => day.date === weekStartOverride)
            ? weekStartOverride
            : defaultWeekStart;
    const monthDaysByDate = new Map(
        calendar.monthDays.map((day) => [day.date, day]),
    );
    const visibleWeekDays = selectedWeekStart
        ? Array.from({ length: 7 }, (_, index) =>
            monthDaysByDate.get(shiftDateKey(selectedWeekStart, index)),
        ).filter((day): day is DayRow => day !== undefined)
        : [];
    const weekDaysToRender =
        visibleWeekDays.length === 7 ? visibleWeekDays : calendar.weekDays;
    const navigateWeek = (direction: 'previous' | 'next') => {
        if (!selectedWeekStart) return;

        const dayOffset = direction === 'next' ? 7 : -7;
        const nextWeekStart = shiftDateKey(selectedWeekStart, dayOffset);
        setWeekStartOverride(nextWeekStart);

        const firstGridDate = calendar.monthDays[0]?.date;
        const lastGridDate = calendar.monthDays[calendar.monthDays.length - 1]
            ?.date;

        if (!firstGridDate || !lastGridDate) return;
        if (nextWeekStart < firstGridDate || nextWeekStart > lastGridDate) {
            applyFilters({ month: nextWeekStart.slice(0, 7) });
        }
    };
    const todayDateKey = localDateToDateKey(new Date());
    const dayDetailsVisualStatus = dayDetails
        ? resolveDayVisualStatus(
            dayDetails.planned_hours,
            dayDetails.worked_hours,
            dayDetails.date < todayDateKey,
            dayDetails.off_kind,
        )
        : null;
    const dayDetailsStatusLegendItem = dayDetailsVisualStatus
        ? DAY_VISUAL_LEGEND.find((item) => item.status === dayDetailsVisualStatus)
        : null;
    const dayDetailsStatusBadgeClass = dayDetailsVisualStatus
        ? dayVisualBadgeClasses(dayDetailsVisualStatus)
        : 'border-sidebar-border/70 bg-white text-foreground dark:bg-slate-900/30';
    const dayDetailsDateLabel = formatDate(dayDetails?.date ?? dayDetailsDate);
    const dayDetailsProgressPercent = dayDetails
        ? Math.max(0, Math.min(100, dayDetails.compliance_percent))
        : 0;
    const dayDetailsProgressFillClass = dayDetailsVisualStatus
        ? dayVisualProgressClass(dayDetailsVisualStatus)
        : 'bg-slate-300';
    const scheduleRowErrors = Object.fromEntries(
        SCHEDULE_DAY_DEFS.map((dayDef) => {
            const row = scheduleDays[dayDef.key];
            if (!row.active) return [dayDef.key, ''] as const;
            const start = parseTimeToMinutes(row.start);
            const end = parseTimeToMinutes(row.end);
            if (start === null || end === null) {
                return [dayDef.key, 'Formato no valido'] as const;
            }
            if (end <= start) {
                return [dayDef.key, 'Salida debe ser mayor'] as const;
            }
            return [dayDef.key, ''] as const;
        }),
    ) as Record<ScheduleDayKey, string>;
    const weeklyMinutes = SCHEDULE_DAY_DEFS.reduce(
        (sum, dayDef) => sum + getScheduleMinutes(scheduleDays[dayDef.key]),
        0,
    );
    const editScheduleRowErrors = Object.fromEntries(
        SCHEDULE_DAY_DEFS.map((dayDef) => {
            const row = editScheduleDays[dayDef.key];
            if (!row.active) return [dayDef.key, ''] as const;
            const start = parseTimeToMinutes(row.start);
            const end = parseTimeToMinutes(row.end);
            if (start === null || end === null) {
                return [dayDef.key, 'Formato no valido'] as const;
            }
            if (end <= start) {
                return [dayDef.key, 'Salida debe ser mayor'] as const;
            }
            return [dayDef.key, ''] as const;
        }),
    ) as Record<ScheduleDayKey, string>;
    const editWeeklyMinutes = SCHEDULE_DAY_DEFS.reduce(
        (sum, dayDef) => sum + getScheduleMinutes(editScheduleDays[dayDef.key]),
        0,
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Control Horario" />

            <div className={UI_PRESETS.pageContent}>
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Control Horario</h1>
                        <p className="text-sm text-muted-foreground">
                            Registro de asistencia, horarios de referencia,
                            ausencias y seguimiento de horas.
                        </p>
                    </div>
                </div>

                <div className={`${UI_PRESETS.pageSection} space-y-4`}>
                    <section
                        className={
                            canManageTeam
                                ? UI_PRESETS.filterBarEmphasis
                                : UI_PRESETS.sectionCard
                        }
                    >
                        <div className="grid gap-3 md:grid-cols-3">
                            {canManageTeam ? (
                                <Select
                                    value={internId}
                                    onValueChange={(value) =>
                                        applyFilters({ intern_id: value })
                                    }
                                >
                                    <SelectTrigger
                                        className={`${UI_PRESETS.selectTrigger} h-auto min-h-[92px] w-full rounded-lg border-sidebar-border/70 bg-white/70 p-3 text-left shadow-none dark:border-sidebar-border dark:bg-slate-900/20`}
                                    >
                                        <div className="flex w-full flex-col items-start gap-0.5 pr-5">
                                            <p className={FIELD_LABEL_CLASS}>
                                                Becario
                                            </p>
                                            <p className="font-semibold">
                                                {selectedIntern?.name ??
                                                    'Selecciona becario'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedIntern?.email ??
                                                    'Sin becario seleccionado'}
                                            </p>
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {interns.map((intern) => (
                                            <SelectItem
                                                className={UI_PRESETS.selectItem}
                                                key={intern.id}
                                                value={String(intern.id)}
                                            >
                                                {intern.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="rounded-lg border border-sidebar-border/70 bg-white/70 p-3 dark:border-sidebar-border dark:bg-slate-900/20">
                                    <p className={FIELD_LABEL_CLASS}>
                                        Becario
                                    </p>
                                    <p className="font-semibold">
                                        {selectedIntern?.name ?? 'Sin datos'}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {selectedIntern?.email ?? '-'}
                                    </p>
                                </div>
                            )}
                            <div className="rounded-lg border border-sidebar-border/70 bg-white/70 p-3 dark:border-sidebar-border dark:bg-slate-900/20">
                                <p className={FIELD_LABEL_CLASS}>
                                   Horas requeridas
                                </p>
                                <p className="font-semibold">
                                    {summary.progress.required_hours}h
                                </p>
                            </div>
                            <div className="rounded-lg border border-sidebar-border/70 bg-white/70 p-3 dark:border-sidebar-border dark:bg-slate-900/20">
                                <p className={FIELD_LABEL_CLASS}>
                                    Estado del fichaje
                                </p>
                                <p
                                    className={cn(
                                        'flex items-center gap-1 font-semibold',
                                        clockStatusTextClass,
                                    )}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={clockStatusDotClass}
                                    />
                                    {clockState.activeEntry
                                        ? activeEntry?.is_on_break
                                            ? 'En pausa'
                                            : 'Fichaje activo'
                                        : 'Sin fichaje activo'}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className={UI_PRESETS.sectionCard}>
                        <div className={UI_PRESETS.tabsHeaderEmphasis}>
                            <div className="flex flex-wrap items-end gap-1.5">
                                {tabs.map((tab) => {
                                    const TabIcon = tab.icon;

                                    return (
                                        <Button
                                            key={tab.id}
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setActiveTab(tab.id)}
                                            className={`${UI_PRESETS.tabBase} ${activeTab === tab.id ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <TabIcon className="size-4 shrink-0" />
                                                <span>{tab.label}</span>
                                            </span>
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4">
                            {activeTab === 'clock' ? (
                                <div className="space-y-4">
                                    <div className="grid gap-3 lg:grid-cols-2">
                                        <div className="rounded-lg border border-sidebar-border/70 bg-white/70 p-4 dark:border-sidebar-border dark:bg-slate-900/20">
                                                <h3 className={SECTION_TITLE_CLASS}>
                                                    Estado del fichaje
                                                </h3>
                                                <div className="flex items-center justify-center gap-4 text-center">
                                                    <div
                                                        className={cn(
                                                            'flex size-20 items-center justify-center rounded-full border-2',
                                                            activeEntry
                                                                ? activeEntry.is_on_break
                                                                    ? 'border-amber-400 bg-amber-100/70 text-amber-700'
                                                                    : 'border-emerald-500 bg-emerald-100/70 text-emerald-700'
                                                                : 'border-slate-400 bg-slate-100 text-slate-600',
                                                        )}
                                                    >
                                                        {activeEntry ? (
                                                            activeEntry.is_on_break ? (
                                                                <Pause className="size-8" />
                                                            ) : (
                                                                <CheckCircle2 className="size-8" />
                                                            )
                                                        ) : (
                                                            <Clock3 className="size-8" />
                                                        )}
                                                    </div>
                                                    <div className="text-center">
                                                        <p
                                                            className={cn(
                                                                'flex items-center justify-center gap-2 text-4xl font-semibold tracking-tight leading-none',
                                                                clockStatusTextClass,
                                                            )}
                                                        >
                                                            <span
                                                                aria-hidden="true"
                                                                className={clockStatusDotClass}
                                                            />
                                                            {clockStatusLabel}
                                                        </p>
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            {activeEntry?.started_at
                                                                ? `Desde ${formatDateTime(activeEntry.started_at)}`
                                                                : 'Sin entrada activa'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="rounded-lg border border-sidebar-border/70 bg-white/70 p-4 dark:border-sidebar-border dark:bg-slate-900/20">
                                                <h3 className={SECTION_TITLE_CLASS}>
                                                    Llevas fichado
                                                </h3>
                                                <div className="space-y-4 text-center">
                                                    <p className="text-4xl font-semibold tracking-tight leading-none text-emerald-700">
                                                        {canClockIn
                                                            ? '--:--:--'
                                                            : activeElapsedLabel}
                                                    </p>

                                                    <div className="flex flex-wrap justify-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant={
                                                                isClockOutPrimary
                                                                    ? 'destructive'
                                                                    : 'default'
                                                            }
                                                            onClick={() =>
                                                                postAction(
                                                                    primaryClockAction.key,
                                                                    primaryClockAction.url,
                                                                )
                                                            }
                                                            disabled={
                                                                actionLoading !==
                                                                null
                                                            }
                                                        >
                                                            {primaryClockAction.key ===
                                                            'clock-out' ? (
                                                                <Timer className="size-4" />
                                                            ) : (
                                                                <Play className="size-4" />
                                                            )}
                                                            {
                                                                primaryClockAction.label
                                                            }
                                                        </Button>
                                                        {canStartBreak ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    postAction(
                                                                        'start-break',
                                                                        '/control-horario/start-break',
                                                                    )
                                                                }
                                                                disabled={
                                                                    actionLoading !==
                                                                    null
                                                                }
                                                            >
                                                                <Pause className="size-4" />
                                                                Pausa
                                                            </Button>
                                                        ) : null}
                                                        {canEndBreak ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() =>
                                                                    postAction(
                                                                        'end-break',
                                                                        '/control-horario/end-break',
                                                                    )
                                                                }
                                                                disabled={
                                                                    actionLoading !==
                                                                    null
                                                                }
                                                            >
                                                                <Play className="size-4" />
                                                                Reanudar
                                                            </Button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                    <section className={UI_PRESETS.sectionCard}>
                                        <h3 className={SECTION_TITLE_CLASS}>
                                            Ultimos fichajes
                                        </h3>
                                        <div
                                            className={`${UI_PRESETS.tableContainer} max-h-[17rem] overflow-y-auto`}
                                        >
                                            <Table>
                                                <TableHeader className={UI_PRESETS.tableHead}>
                                                    <TableRow>
                                                        <TableHead className={UI_PRESETS.tableCellCentered}>
                                                            Inicio
                                                        </TableHead>
                                                        <TableHead className={UI_PRESETS.tableCellCentered}>
                                                            Fin
                                                        </TableHead>
                                                        <TableHead className={UI_PRESETS.tableCellCentered}>
                                                            Horas efectivas
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {latestSixEntries.length > 0 ? (
                                                        latestSixEntries.map((entry) => (
                                                            <TableRow
                                                                key={entry.id}
                                                                className="border-t border-sidebar-border/50"
                                                            >
                                                                <TableCell className={UI_PRESETS.tableCellCentered}>
                                                                    {formatDateTime(
                                                                        entry.started_at,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className={UI_PRESETS.tableCellCentered}>
                                                                    {formatDateTime(
                                                                        entry.ended_at,
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className={UI_PRESETS.tableCellCentered}>
                                                                    {entry.effective_hours.toFixed(
                                                                        2,
                                                                    )}{' '}
                                                                    h
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    ) : (
                                                        <TableRow className="border-t border-sidebar-border/50">
                                                            <TableCell
                                                                colSpan={3}
                                                                className={`${UI_PRESETS.tableCellCentered} text-sm text-muted-foreground`}
                                                            >
                                                                No hay fichajes
                                                                registrados.
                                                            </TableCell>
                                                        </TableRow>
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </section>

                                </div>
                            ) : null}
                            {activeTab === 'schedules' ? (
                                <div className="grid gap-4 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)] xl:items-start">
                                    <section className={`relative overflow-hidden ${UI_PRESETS.sectionCard} bg-[linear-gradient(140deg,#eaf2ff_0%,#f7fbff_36%,#e9f9f2_100%)] xl:sticky xl:top-4 dark:bg-[linear-gradient(140deg,#0f1d34_0%,#11233f_48%,#0f2c2b_100%)]`}>
                                        <div className="relative z-10">
                                            <h3 className={SECTION_TITLE_CLASS}>
                                                Horarios existentes
                                            </h3>
                                            <div className="space-y-2">
                                                {schedules.map((schedule) => (
                                                    <div
                                                        key={schedule.id}
                                                        className="space-y-2 rounded-lg border border-sidebar-border/70 bg-white/80 p-3 backdrop-blur-[1px] dark:bg-slate-900/30"
                                                    >
                                                        <p className="font-medium">
                                                            {schedule.season_name ||
                                                                'Horario sin nombre'}
                                                        </p>
                                                        <div className="space-y-1 text-sm text-muted-foreground">
                                                            <p className="flex items-center gap-1.5">
                                                                <CalendarDays className="size-3.5" />
                                                                <span>
                                                                    {formatDate(schedule.starts_on)} -{' '}
                                                                    {formatDate(schedule.ends_on)}
                                                                </span>
                                                            </p>
                                                            <p className="flex items-center gap-1.5">
                                                                <Timer className="size-3.5" />
                                                                <span>
                                                                    {schedule.weekly_total_hours.toFixed(2)} h / semana
                                                                </span>
                                                            </p>
                                                        </div>
                                                        <div className="mt-2 flex justify-center gap-2">
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className={UI_PRESETS.iconActionButtonPrimary}
                                                                aria-label="Abrir horario"
                                                                title="Abrir horario"
                                                                onClick={() =>
                                                                    loadSchedule(
                                                                        schedule,
                                                                    )
                                                                }
                                                            >
                                                                <Eye className="size-4" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="outline"
                                                                className={UI_PRESETS.iconActionButtonDanger}
                                                                aria-label="Eliminar horario"
                                                                title="Eliminar horario"
                                                                onClick={() =>
                                                                    router.delete(
                                                                        `/control-horario/schedules/${schedule.id}`,
                                                                        {
                                                                            preserveScroll: true,
                                                                        },
                                                                    )
                                                                }
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </section>
                                    <section className={`${UI_PRESETS.sectionCard} bg-white dark:bg-slate-900/20`}>
                                        <h3 className={SECTION_TITLE_CLASS}>
                                            Creacion de horario
                                        </h3>
                                        <p className="mb-1 text-xs text-muted-foreground">
                                            Define un nuevo horario y guardalo para este becario.
                                        </p>
                                        <form
                                            className="space-y-5"
                                            onSubmit={submitSchedule}
                                        >
                                            <div className="space-y-1">
                                                <label
                                                    htmlFor="schedule-season-name"
                                                    className={FIELD_LABEL_CLASS}
                                                >
                                                    Nombre del calendario
                                                </label>
                                                <Input
                                                    id="schedule-season-name"
                                                    required
                                                    value={scheduleForm.season_name}
                                                    onChange={(event) =>
                                                        setScheduleForm((current) => ({
                                                            ...current,
                                                            season_name: event.target.value,
                                                        }))
                                                    }
                                                    className={UI_PRESETS.filterInput}
                                                    placeholder="Ej. Jornada anual 2026"
                                                />
                                            </div>

                                            <div className="grid gap-2 md:grid-cols-2">
                                                <div className="space-y-1">
                                                    <label
                                                        htmlFor="schedule-starts-on"
                                                        className={FIELD_LABEL_CLASS}
                                                    >
                                                        Fecha inicio
                                                    </label>
                                                    <DatePicker
                                                        id="schedule-starts-on"
                                                        value={scheduleForm.starts_on}
                                                        onChange={(value) =>
                                                            setScheduleForm((current) => ({
                                                                ...current,
                                                                starts_on: value,
                                                            }))
                                                        }
                                                        placeholder="Fecha inicio"
                                                        className={UI_PRESETS.filterInput}
                                                        required
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label
                                                        htmlFor="schedule-ends-on"
                                                        className={FIELD_LABEL_CLASS}
                                                    >
                                                        Fecha fin
                                                    </label>
                                                    <DatePicker
                                                        id="schedule-ends-on"
                                                        value={scheduleForm.ends_on}
                                                        onChange={(value) =>
                                                            setScheduleForm((current) => ({
                                                                ...current,
                                                                ends_on: value,
                                                            }))
                                                        }
                                                        placeholder="Fecha fin"
                                                        className={UI_PRESETS.filterInput}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className={`${UI_PRESETS.tableContainer} bg-white`}>
                                                <table className="w-full min-w-[650px] bg-white text-sm">
                                                    <thead className={UI_PRESETS.tableHead}>
                                                        <tr>
                                                            <th className={`${UI_PRESETS.tableCellCentered} ${FIELD_LABEL_CLASS}`}>Dia</th>
                                                            <th className={`${UI_PRESETS.tableCellCentered} ${FIELD_LABEL_CLASS}`}>Entrada</th>
                                                            <th className={`${UI_PRESETS.tableCellCentered} ${FIELD_LABEL_CLASS}`}>Salida</th>
                                                            <th className={`${UI_PRESETS.tableCellCentered} ${FIELD_LABEL_CLASS}`}>Horas</th>
                                                            <th className={`${UI_PRESETS.tableCellCentered} ${FIELD_LABEL_CLASS}`}>Activo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {SCHEDULE_DAY_DEFS.map((dayDef) => {
                                                            const row = scheduleDays[dayDef.key];
                                                            const rowMinutes = getScheduleMinutes(row);
                                                            const rowError =
                                                                scheduleRowErrors[dayDef.key];
                                                            const startKey = `${dayDef.key}-start`;
                                                            const endKey = `${dayDef.key}-end`;
                                                            const startOptions = TIME_OPTIONS.includes(
                                                                row.start,
                                                            )
                                                                ? TIME_OPTIONS
                                                                : [row.start, ...TIME_OPTIONS];
                                                            const endOptions = TIME_OPTIONS.includes(
                                                                row.end,
                                                            )
                                                                ? TIME_OPTIONS
                                                                : [row.end, ...TIME_OPTIONS];

                                                            return (
                                                                <tr
                                                                    key={dayDef.key}
                                                                    className="border-t border-sidebar-border/50"
                                                                >
                                                                    <td className={`${UI_PRESETS.tableCellCentered} font-semibold`}>
                                                                        {dayDef.shortLabel}
                                                                    </td>
                                                                    <td
                                                                        className={UI_PRESETS.tableCellCentered}
                                                                        onClick={() => {
                                                                            if (!row.active) return;
                                                                            setOpenTimeSelectKey(startKey);
                                                                        }}
                                                                    >
                                                                        <Select
                                                                            value={row.start}
                                                                            disabled={!row.active}
                                                                            open={
                                                                                openTimeSelectKey
                                                                                === startKey
                                                                            }
                                                                            onOpenChange={(open) =>
                                                                                setOpenTimeSelectKey(
                                                                                    open
                                                                                        ? startKey
                                                                                        : null,
                                                                                )
                                                                            }
                                                                            onValueChange={(value) =>
                                                                                setScheduleDays(
                                                                                    (current) => ({
                                                                                        ...current,
                                                                                        [dayDef.key]:
                                                                                            {
                                                                                                ...current[
                                                                                                    dayDef
                                                                                                        .key
                                                                                                ],
                                                                                                start: value,
                                                                                            },
                                                                                    }),
                                                                                )
                                                                            }
                                                                        >
                                                                            <SelectTrigger
                                                                                className={cn(
                                                                                    UI_PRESETS.selectTrigger,
                                                                                    'w-full justify-center',
                                                                                    rowError
                                                                                        ? 'border-rose-400 focus-visible:border-rose-400'
                                                                                        : '',
                                                                                )}
                                                                            >
                                                                                <SelectValue placeholder="Hora" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {startOptions.map((option) => (
                                                                                    <SelectItem
                                                                                        className={UI_PRESETS.selectItem}
                                                                                        key={`${dayDef.key}-start-${option}`}
                                                                                        value={option}
                                                                                    >
                                                                                        {option}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </td>
                                                                    <td
                                                                        className={UI_PRESETS.tableCellCentered}
                                                                        onClick={() => {
                                                                            if (!row.active) return;
                                                                            setOpenTimeSelectKey(endKey);
                                                                        }}
                                                                    >
                                                                        <Select
                                                                            value={row.end}
                                                                            disabled={!row.active}
                                                                            open={
                                                                                openTimeSelectKey
                                                                                === endKey
                                                                            }
                                                                            onOpenChange={(open) =>
                                                                                setOpenTimeSelectKey(
                                                                                    open
                                                                                        ? endKey
                                                                                        : null,
                                                                                )
                                                                            }
                                                                            onValueChange={(value) =>
                                                                                setScheduleDays(
                                                                                    (current) => ({
                                                                                        ...current,
                                                                                        [dayDef.key]:
                                                                                            {
                                                                                                ...current[
                                                                                                    dayDef
                                                                                                        .key
                                                                                                ],
                                                                                                end: value,
                                                                                            },
                                                                                    }),
                                                                                )
                                                                            }
                                                                        >
                                                                            <SelectTrigger
                                                                                className={cn(
                                                                                    UI_PRESETS.selectTrigger,
                                                                                    'w-full justify-center',
                                                                                    rowError
                                                                                        ? 'border-rose-400 focus-visible:border-rose-400'
                                                                                        : '',
                                                                                )}
                                                                            >
                                                                                <SelectValue placeholder="Hora" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {endOptions.map((option) => (
                                                                                    <SelectItem
                                                                                        className={UI_PRESETS.selectItem}
                                                                                        key={`${dayDef.key}-end-${option}`}
                                                                                        value={option}
                                                                                    >
                                                                                        {option}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </td>
                                                                    <td className={UI_PRESETS.tableCellCentered}>
                                                                        <div className="rounded-md bg-slate-100 px-2 py-1 text-center font-semibold text-[#2563eb] dark:bg-slate-800/70">
                                                                            {formatScheduleHours(
                                                                                rowMinutes,
                                                                            )}
                                                                        </div>
                                                                        {rowError ? (
                                                                            <p className="mt-1 text-xs text-rose-600">
                                                                                {rowError}
                                                                            </p>
                                                                        ) : null}
                                                                    </td>
                                                                    <td className={UI_PRESETS.tableCellCentered}>
                                                                        <button
                                                                            type="button"
                                                                            aria-pressed={row.active}
                                                                            onClick={() =>
                                                                                setScheduleDays(
                                                                                    (current) => ({
                                                                                        ...current,
                                                                                        [dayDef.key]:
                                                                                            {
                                                                                                ...current[
                                                                                                    dayDef
                                                                                                        .key
                                                                                                ],
                                                                                                active:
                                                                                                    !current[
                                                                                                        dayDef
                                                                                                            .key
                                                                                                    ]
                                                                                                        .active,
                                                                                            },
                                                                                    }),
                                                                                )
                                                                            }
                                                                            className={cn(
                                                                                'relative inline-flex h-7 w-12 items-center rounded-full border transition-colors',
                                                                                row.active
                                                                                    ? 'border-[#2563eb]/45 bg-[#2563eb]'
                                                                                    : 'border-slate-300 bg-slate-200',
                                                                            )}
                                                                        >
                                                                            <span
                                                                                className={cn(
                                                                                    'inline-block h-5 w-5 rounded-full bg-white transition-transform',
                                                                                    row.active
                                                                                        ? 'translate-x-6'
                                                                                        : 'translate-x-1',
                                                                                )}
                                                                            />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="grid grid-cols-1 gap-3 rounded-lg border border-sidebar-border/70 bg-white p-3 dark:bg-slate-900/20 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                                <p className="text-sm font-medium text-muted-foreground sm:justify-self-start">
                                                    Total semanal:
                                                </p>
                                                <p className="justify-self-center text-3xl font-bold text-[#2563eb] sm:col-start-2">
                                                    {formatScheduleHours(
                                                        weeklyMinutes,
                                                    )}
                                                </p>
                                                <div
                                                    className="hidden sm:block"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    type="submit"
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label={
                                                        scheduleForm.schedule_id
                                                            ? 'Actualizar horario'
                                                            : 'Guardar horario'
                                                    }
                                                    title={
                                                        scheduleForm.schedule_id
                                                            ? 'Actualizar horario'
                                                            : 'Guardar horario'
                                                    }
                                                    disabled={actionLoading !== null}
                                                    className={UI_PRESETS.iconActionButtonSuccess}
                                                >
                                                    <Save className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    aria-label="Eliminar filtros"
                                                    title="Eliminar filtros"
                                                    className={UI_PRESETS.iconActionButton}
                                                    onClick={resetSchedule}
                                                >
                                                    <FilterX className="size-4" />
                                                </Button>
                                            </div>
                                        </form>
                                    </section>

                                    <Dialog
                                        open={isEditScheduleDialogOpen}
                                        onOpenChange={(open) => {
                                            if (!open) {
                                                resetEditSchedule();
                                            } else {
                                                setIsEditScheduleDialogOpen(true);
                                            }
                                        }}
                                    >
                                        <DialogContent
                                            overlayClassName="bg-black/35 backdrop-blur-sm"
                                            hideCloseButton
                                            className="w-[96vw] max-w-[980px] overflow-hidden p-0 !bg-white sm:max-w-[980px]"
                                        >
                                            <div className="max-h-[88vh] overflow-y-auto bg-white p-6">
                                                <div className="mb-1 flex items-start justify-between gap-3">
                                                    <DialogHeader className="space-y-1 pb-1">
                                                        <DialogTitle>
                                                            Ver horario existente
                                                        </DialogTitle>
                                                        <DialogDescription>
                                                            Ve o Modifica los datos del horario y guarda los cambios.
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="shrink-0"
                                                        aria-label="Volver"
                                                        title="Volver"
                                                        onClick={resetEditSchedule}
                                                    >
                                                        <ArrowLeft className="size-4" />
                                                    </Button>
                                                </div>

                                                <form
                                                    className="min-w-0 space-y-5"
                                                    onSubmit={submitEditSchedule}
                                                >
                                                <div className="space-y-1">
                                                    <label
                                                        htmlFor="edit-schedule-season-name"
                                                        className={FIELD_LABEL_CLASS}
                                                    >
                                                        Nombre del calendario
                                                    </label>
                                                    <Input
                                                        id="edit-schedule-season-name"
                                                        required
                                                        value={editScheduleForm.season_name}
                                                        onChange={(event) =>
                                                            setEditScheduleForm((current) => ({
                                                                ...current,
                                                                season_name: event.target.value,
                                                            }))
                                                        }
                                                        className={UI_PRESETS.filterInput}
                                                        placeholder="Ej. Jornada anual 2026"
                                                    />
                                                </div>

                                                <div className="grid gap-2 md:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <label
                                                            htmlFor="edit-schedule-starts-on"
                                                            className={FIELD_LABEL_CLASS}
                                                        >
                                                            Fecha inicio
                                                        </label>
                                                        <DatePicker
                                                            id="edit-schedule-starts-on"
                                                            value={editScheduleForm.starts_on}
                                                            onChange={(value) =>
                                                                setEditScheduleForm((current) => ({
                                                                    ...current,
                                                                    starts_on: value,
                                                                }))
                                                            }
                                                            placeholder="Fecha inicio"
                                                            className={UI_PRESETS.filterInput}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label
                                                            htmlFor="edit-schedule-ends-on"
                                                            className={FIELD_LABEL_CLASS}
                                                        >
                                                            Fecha fin
                                                        </label>
                                                        <DatePicker
                                                            id="edit-schedule-ends-on"
                                                            value={editScheduleForm.ends_on}
                                                            onChange={(value) =>
                                                                setEditScheduleForm((current) => ({
                                                                    ...current,
                                                                    ends_on: value,
                                                                }))
                                                            }
                                                            placeholder="Fecha fin"
                                                            className={UI_PRESETS.filterInput}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className={`${UI_PRESETS.tableContainer} bg-white`}>
                                                    <table className="w-full min-w-[720px] bg-white text-sm">
                                                        <thead className={UI_PRESETS.tableHead}>
                                                            <tr>
                                                                <th className={`${UI_PRESETS.tableCellCentered} ${FIELD_LABEL_CLASS}`}>Dia</th>
                                                                <th className={`${UI_PRESETS.tableCellCentered} ${FIELD_LABEL_CLASS}`}>Entrada</th>
                                                                <th className={`${UI_PRESETS.tableCellCentered} ${FIELD_LABEL_CLASS}`}>Salida</th>
                                                                <th className={`${UI_PRESETS.tableCellCentered} ${FIELD_LABEL_CLASS}`}>Horas</th>
                                                                <th className={`${UI_PRESETS.tableCellCentered} ${FIELD_LABEL_CLASS}`}>Activo</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {SCHEDULE_DAY_DEFS.map((dayDef) => {
                                                                const row = editScheduleDays[dayDef.key];
                                                                const rowMinutes = getScheduleMinutes(row);
                                                                const rowError =
                                                                    editScheduleRowErrors[dayDef.key];
                                                                const startKey = `edit-${dayDef.key}-start`;
                                                                const endKey = `edit-${dayDef.key}-end`;
                                                                const startOptions = TIME_OPTIONS.includes(
                                                                    row.start,
                                                                )
                                                                    ? TIME_OPTIONS
                                                                    : [row.start, ...TIME_OPTIONS];
                                                                const endOptions = TIME_OPTIONS.includes(
                                                                    row.end,
                                                                )
                                                                    ? TIME_OPTIONS
                                                                    : [row.end, ...TIME_OPTIONS];

                                                                return (
                                                                    <tr
                                                                        key={`edit-${dayDef.key}`}
                                                                        className="border-t border-sidebar-border/50"
                                                                    >
                                                                        <td className={`${UI_PRESETS.tableCellCentered} font-semibold`}>
                                                                            {dayDef.shortLabel}
                                                                        </td>
                                                                        <td
                                                                            className={UI_PRESETS.tableCellCentered}
                                                                            onClick={() => {
                                                                                if (!row.active) return;
                                                                                setEditOpenTimeSelectKey(startKey);
                                                                            }}
                                                                        >
                                                                            <Select
                                                                                value={row.start}
                                                                                disabled={!row.active}
                                                                                open={
                                                                                    editOpenTimeSelectKey
                                                                                    === startKey
                                                                                }
                                                                                onOpenChange={(open) =>
                                                                                    setEditOpenTimeSelectKey(
                                                                                        open
                                                                                            ? startKey
                                                                                            : null,
                                                                                    )
                                                                                }
                                                                                onValueChange={(value) =>
                                                                                    setEditScheduleDays(
                                                                                        (current) => ({
                                                                                            ...current,
                                                                                            [dayDef.key]:
                                                                                                {
                                                                                                    ...current[
                                                                                                        dayDef
                                                                                                            .key
                                                                                                    ],
                                                                                                    start: value,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                            >
                                                                                <SelectTrigger
                                                                                    className={cn(
                                                                                        UI_PRESETS.selectTrigger,
                                                                                        'w-full justify-center',
                                                                                        rowError
                                                                                            ? 'border-rose-400 focus-visible:border-rose-400'
                                                                                            : '',
                                                                                    )}
                                                                                >
                                                                                    <SelectValue placeholder="Hora" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {startOptions.map((option) => (
                                                                                        <SelectItem
                                                                                            className={UI_PRESETS.selectItem}
                                                                                            key={`edit-${dayDef.key}-start-${option}`}
                                                                                            value={option}
                                                                                        >
                                                                                            {option}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </td>
                                                                        <td
                                                                            className={UI_PRESETS.tableCellCentered}
                                                                            onClick={() => {
                                                                                if (!row.active) return;
                                                                                setEditOpenTimeSelectKey(endKey);
                                                                            }}
                                                                        >
                                                                            <Select
                                                                                value={row.end}
                                                                                disabled={!row.active}
                                                                                open={
                                                                                    editOpenTimeSelectKey
                                                                                    === endKey
                                                                                }
                                                                                onOpenChange={(open) =>
                                                                                    setEditOpenTimeSelectKey(
                                                                                        open
                                                                                            ? endKey
                                                                                            : null,
                                                                                    )
                                                                                }
                                                                                onValueChange={(value) =>
                                                                                    setEditScheduleDays(
                                                                                        (current) => ({
                                                                                            ...current,
                                                                                            [dayDef.key]:
                                                                                                {
                                                                                                    ...current[
                                                                                                        dayDef
                                                                                                            .key
                                                                                                    ],
                                                                                                    end: value,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                            >
                                                                                <SelectTrigger
                                                                                    className={cn(
                                                                                        UI_PRESETS.selectTrigger,
                                                                                        'w-full justify-center',
                                                                                        rowError
                                                                                            ? 'border-rose-400 focus-visible:border-rose-400'
                                                                                            : '',
                                                                                    )}
                                                                                >
                                                                                    <SelectValue placeholder="Hora" />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    {endOptions.map((option) => (
                                                                                        <SelectItem
                                                                                            className={UI_PRESETS.selectItem}
                                                                                            key={`edit-${dayDef.key}-end-${option}`}
                                                                                            value={option}
                                                                                        >
                                                                                            {option}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        </td>
                                                                        <td className={UI_PRESETS.tableCellCentered}>
                                                                            <div className="rounded-md bg-slate-100 px-2 py-1 text-center font-semibold text-[#2563eb] dark:bg-slate-800/70">
                                                                                {formatScheduleHours(
                                                                                    rowMinutes,
                                                                                )}
                                                                            </div>
                                                                            {rowError ? (
                                                                                <p className="mt-1 text-xs text-rose-600">
                                                                                    {rowError}
                                                                                </p>
                                                                            ) : null}
                                                                        </td>
                                                                        <td className={UI_PRESETS.tableCellCentered}>
                                                                            <button
                                                                                type="button"
                                                                                aria-pressed={row.active}
                                                                                onClick={() =>
                                                                                    setEditScheduleDays(
                                                                                        (current) => ({
                                                                                            ...current,
                                                                                            [dayDef.key]:
                                                                                                {
                                                                                                    ...current[
                                                                                                        dayDef
                                                                                                            .key
                                                                                                    ],
                                                                                                    active:
                                                                                                        !current[
                                                                                                            dayDef
                                                                                                                .key
                                                                                                        ]
                                                                                                            .active,
                                                                                                },
                                                                                        }),
                                                                                    )
                                                                                }
                                                                                className={cn(
                                                                                    'relative inline-flex h-7 w-12 items-center rounded-full border transition-colors',
                                                                                    row.active
                                                                                        ? 'border-[#2563eb]/45 bg-[#2563eb]'
                                                                                        : 'border-slate-300 bg-slate-200',
                                                                                )}
                                                                            >
                                                                                <span
                                                                                    className={cn(
                                                                                        'inline-block h-5 w-5 rounded-full bg-white transition-transform',
                                                                                        row.active
                                                                                            ? 'translate-x-6'
                                                                                            : 'translate-x-1',
                                                                                    )}
                                                                                />
                                                                            </button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <div className="grid grid-cols-1 gap-3 rounded-lg border border-sidebar-border/70 bg-white p-3 dark:bg-slate-900/20 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                                    <p className="text-sm font-medium text-muted-foreground sm:justify-self-start">
                                                        Total semanal:
                                                    </p>
                                                    <p className="justify-self-center text-3xl font-bold text-[#2563eb] sm:col-start-2">
                                                        {formatScheduleHours(
                                                            editWeeklyMinutes,
                                                        )}
                                                    </p>
                                                    <div
                                                        className="hidden sm:block"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        type="submit"
                                                        disabled={actionLoading !== null}
                                                        className={UI_PRESETS.saveButton}
                                                    >
                                                        Guardar
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        onClick={resetEditSchedule}
                                                    >
                                                        Volver
                                                    </Button>
                                                </div>
                                                </form>
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                </div>
                            ) : null}

                            {activeTab === 'calendar' ? (
                                <div className="space-y-4">
                                    <div className="mb-3 rounded-xl border border-sidebar-border/70 bg-white/80 px-3 py-2 dark:bg-slate-900/35">
                                        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center text-xs text-muted-foreground">
                                            <span className="font-semibold text-foreground">
                                                Leyenda de estados:
                                            </span>
                                            {DAY_VISUAL_LEGEND.map((item) => (
                                                <span
                                                    key={item.status}
                                                    className="inline-flex items-center gap-2"
                                                >
                                                    <span
                                                        aria-hidden="true"
                                                        className={cn(
                                                            'inline-block size-3 rounded-full',
                                                            item.dotClassName,
                                                        )}
                                                    />
                                                    {item.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <section className={UI_PRESETS.sectionCard}>
                                        <div className="mb-3 flex items-center justify-between">
                                            <h3 className={SECTION_TITLE_INLINE_CLASS}>
                                                Vista semanal
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        navigateWeek('previous')
                                                    }
                                                    disabled={!selectedWeekStart}
                                                    aria-label="Semana anterior"
                                                    className={UI_PRESETS.iconActionButton}
                                                >
                                                    <ChevronLeft className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        navigateWeek('next')
                                                    }
                                                    disabled={!selectedWeekStart}
                                                    aria-label="Semana siguiente"
                                                    className={UI_PRESETS.iconActionButton}
                                                >
                                                    <ChevronRight className="size-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-7">
                                            {weekDaysToRender.map((day) => {
                                                const dayIndex = new Date(day.date).getDay();
                                                const dayName = WEEKDAY_FULL_NAMES[(dayIndex + 6) % 7];
                                                const visualStatus = resolveDayVisualStatus(
                                                    day.planned_hours,
                                                    day.worked_hours,
                                                    day.is_past,
                                                    day.off_kind,
                                                );
                                                const progress = day.planned_hours > 0
                                                    ? (day.worked_hours / day.planned_hours) * 100
                                                    : 0;

                                                return (
                                                    <button
                                                        type="button"
                                                        key={day.date}
                                                        onClick={() =>
                                                            openDayDetails(
                                                                day.date,
                                                            )
                                                        }
                                                        className={cn(
                                                            'w-full rounded-lg border p-3 text-center transition-all duration-200',
                                                            'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/45',
                                                            dayVisualClasses(visualStatus),
                                                        )}
                                                    >
                                                        <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground">
                                                            {dayName}
                                                        </p>
                                                        <p className="text-3xl font-extrabold mb-2.5 text-foreground">
                                                            {day.label}
                                                        </p>
                                                        <div className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-700/60">
                                                            <div
                                                                className={cn(
                                                                    'h-full transition-all duration-300',
                                                                    dayVisualProgressClass(visualStatus),
                                                                )}
                                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                                            />
                                                        </div>
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            {day.worked_hours.toFixed(1)}h / {day.planned_hours.toFixed(1)}h
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <section className={UI_PRESETS.sectionCard}>
                                        <h3 className={SECTION_TITLE_CLASS}>
                                            Vista mensual
                                        </h3>
                                        <div className="mb-2 hidden gap-2 md:grid md:grid-cols-7">
                                            {WEEKDAY_FULL_NAMES.map((weekdayName) => (
                                                <p
                                                    key={`month-weekday-${weekdayName}`}
                                                    className="text-center text-xs font-semibold tracking-wide text-muted-foreground"
                                                >
                                                    {weekdayName}
                                                </p>
                                            ))}
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-7">
                                            {calendar.monthDays.map((day) => {
                                                const visualStatus = resolveDayVisualStatus(
                                                    day.planned_hours,
                                                    day.worked_hours,
                                                    day.is_past,
                                                    day.off_kind,
                                                );

                                                return (
                                                    <button
                                                        type="button"
                                                        key={day.date}
                                                        onClick={() =>
                                                            openDayDetails(day.date)
                                                        }
                                                        className={cn(
                                                            'rounded-md border p-2 text-left text-xs',
                                                            'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/45',
                                                            dayVisualClasses(
                                                                visualStatus,
                                                            ),
                                                            day.date.startsWith(
                                                                monthCursor,
                                                            )
                                                                ? ''
                                                                : 'opacity-45',
                                                        )}
                                                    >
                                                        <p className="font-semibold">
                                                            {day.label}
                                                        </p>
                                                        <p>
                                                            {day.worked_hours.toFixed(
                                                                1,
                                                            )}
                                                            h /{' '}
                                                            {day.planned_hours.toFixed(
                                                                1,
                                                            )}
                                                            h
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <Dialog
                                        open={isDayDetailsOpen}
                                        onOpenChange={(open) => {
                                            if (open) {
                                                setIsDayDetailsOpen(true);
                                                return;
                                            }
                                            closeDayDetailsDialog();
                                        }}
                                    >
                                        <DialogContent
                                            overlayClassName="bg-black/35 backdrop-blur-sm"
                                            hideCloseButton
                                            className="!w-[94vw] !max-w-[760px] !block overflow-hidden border-sidebar-border/70 p-0 !bg-white dark:!bg-slate-950 [&_button]:cursor-pointer"
                                        >
                                            <div className="flex min-h-0 min-w-0 max-h-[85vh] flex-col">
                                                <DialogHeader className="border-b border-sidebar-border/70 bg-[linear-gradient(140deg,#eaf2ff_0%,#f7fbff_36%,#e9f9f2_100%)] px-5 pb-3 pt-4 dark:border-sidebar-border dark:bg-[linear-gradient(140deg,#0f1d34_0%,#11233f_48%,#0f2c2b_100%)] sm:px-6">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <DialogTitle className="text-base font-semibold text-foreground">
                                                            {dayDetailsDateLabel !== '-'
                                                                ? `Detalle diario ${dayDetailsDateLabel}`
                                                                : 'Detalle diario'}
                                                        </DialogTitle>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            className="shrink-0"
                                                            aria-label="Volver"
                                                            title="Volver"
                                                            onClick={closeDayDetailsDialog}
                                                        >
                                                            <ArrowLeft className="size-4" />
                                                        </Button>
                                                    </div>
                                                </DialogHeader>

                                                <div className="min-w-0 space-y-5 overflow-x-hidden overflow-y-auto px-6 py-6 sm:px-7 sm:py-7">
                                                    {dayDetailsLoading ? (
                                                        <div className="rounded-lg border border-sidebar-border/70 bg-white/80 p-4 text-sm text-muted-foreground dark:bg-slate-900/20">
                                                            Cargando detalle del dia...
                                                        </div>
                                                    ) : null}

                                                    {!dayDetailsLoading && dayDetails ? (
                                                        <div className="min-w-0 space-y-4">
                                                            <section className="space-y-1 py-1 text-center">
                                                                <p className={cn(FIELD_LABEL_CLASS, 'text-center')}>
                                                                    Cumplimiento
                                                                </p>
                                                                <p className="text-4xl font-extrabold leading-none text-foreground">
                                                                    {dayDetails.compliance_percent.toFixed(
                                                                        1,
                                                                    )}
                                                                    %
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {dayDetails.worked_hours.toFixed(
                                                                        1,
                                                                    )}
                                                                    h de{' '}
                                                                    {dayDetails.planned_hours.toFixed(
                                                                        1,
                                                                    )}
                                                                    h
                                                                </p>
                                                            </section>

                                                            <section className={cn(UI_PRESETS.sectionCard, 'space-y-4 p-5')}>
                                                                <div className="grid grid-cols-2 gap-2 rounded-xl border border-sidebar-border/70 bg-white/80 p-1 dark:bg-slate-900/30">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setDayDetailsTab(
                                                                                'status',
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                                                                            dayDetailsTab
                                                                                ===
                                                                                'status'
                                                                                ? 'bg-[#2563eb] text-white shadow-sm'
                                                                                : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/70',
                                                                        )}
                                                                    >
                                                                        Estado
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setDayDetailsTab(
                                                                                'timeline',
                                                                            )
                                                                        }
                                                                        className={cn(
                                                                            'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                                                                            dayDetailsTab
                                                                                ===
                                                                                'timeline'
                                                                                ? 'bg-[#2563eb] text-white shadow-sm'
                                                                                : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800/70',
                                                                        )}
                                                                    >
                                                                        Timeline de fichajes (
                                                                        {dayDetails
                                                                            .entries
                                                                            .length}
                                                                        )
                                                                    </button>
                                                                </div>

                                                                {dayDetailsTab === 'status' ? (
                                                                    <div className="space-y-4">
                                                                        <div className="flex flex-col items-center justify-center space-y-2 text-center">
                                                                            <p
                                                                                className={cn(
                                                                                    FIELD_LABEL_CLASS,
                                                                                    'w-full text-center',
                                                                                )}
                                                                            >
                                                                                Estado
                                                                            </p>
                                                                            <span
                                                                                className={cn(
                                                                                    'inline-flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm font-semibold shadow-sm',
                                                                                    dayDetailsStatusBadgeClass,
                                                                                )}
                                                                            >
                                                                                {dayDetailsStatusLegendItem ? (
                                                                                    <span
                                                                                        aria-hidden="true"
                                                                                        className={cn(
                                                                                            'inline-block size-2.5 rounded-full',
                                                                                            dayDetailsStatusLegendItem.dotClassName,
                                                                                        )}
                                                                                    />
                                                                                ) : null}
                                                                                {dayDetailsStatusLegendItem?.label ?? '-'}
                                                                            </span>
                                                                        </div>

                                                                        <div>
                                                                            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                                                                                <span>
                                                                                    Progreso del dia
                                                                                </span>
                                                                                <span>
                                                                                    {dayDetailsProgressPercent.toFixed(
                                                                                        1,
                                                                                    )}
                                                                                    %
                                                                                </span>
                                                                            </div>
                                                                            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-700/70">
                                                                                <div
                                                                                    className={cn(
                                                                                        'h-full transition-all duration-300',
                                                                                        dayDetailsProgressFillClass,
                                                                                    )}
                                                                                    style={{
                                                                                        width: `${dayDetailsProgressPercent}%`,
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid gap-3 sm:grid-cols-3">
                                                                            <div className="rounded-lg border border-sidebar-border/70 bg-white/80 p-3 text-center dark:bg-slate-900/30">
                                                                                <p className={FIELD_LABEL_CLASS}>
                                                                                    Trabajadas
                                                                                </p>
                                                                                <p className="mt-1 text-sm font-semibold text-foreground">
                                                                                    {dayDetails.worked_hours.toFixed(
                                                                                        1,
                                                                                    )}
                                                                                    h
                                                                                </p>
                                                                            </div>
                                                                            <div className="rounded-lg border border-sidebar-border/70 bg-white/80 p-3 text-center dark:bg-slate-900/30">
                                                                                <p className={FIELD_LABEL_CLASS}>
                                                                                    Planificadas
                                                                                </p>
                                                                                <p className="mt-1 text-sm font-semibold text-foreground">
                                                                                    {dayDetails.planned_hours.toFixed(
                                                                                        1,
                                                                                    )}
                                                                                    h
                                                                                </p>
                                                                            </div>
                                                                            <div className="rounded-lg border border-sidebar-border/70 bg-white/80 p-3 text-center dark:bg-slate-900/30">
                                                                                <p className={FIELD_LABEL_CLASS}>
                                                                                    Pausas
                                                                                </p>
                                                                                <p className="mt-1 text-sm font-semibold text-foreground">
                                                                                    {dayDetails.break_hours.toFixed(
                                                                                        1,
                                                                                    )}
                                                                                    h
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                                            <div className="rounded-lg border border-sidebar-border/70 bg-white/80 p-3 text-center dark:bg-slate-900/30">
                                                                                <p className={FIELD_LABEL_CLASS}>
                                                                                    Primera entrada
                                                                                </p>
                                                                                <p className="mt-1 text-sm font-semibold text-foreground">
                                                                                    {formatClockTime(
                                                                                        dayDetails.first_clock_in,
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                            <div className="rounded-lg border border-sidebar-border/70 bg-white/80 p-3 text-center dark:bg-slate-900/30">
                                                                                <p className={FIELD_LABEL_CLASS}>
                                                                                    Ultima salida
                                                                                </p>
                                                                                <p className="mt-1 text-sm font-semibold text-foreground">
                                                                                    {formatClockTime(
                                                                                        dayDetails.last_clock_out,
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <section className="space-y-3">
                                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                                            <h4 className={SECTION_TITLE_INLINE_CLASS}>
                                                                                Timeline de fichajes
                                                                            </h4>
                                                                            <div className="flex items-center gap-2">
                                                                                <Badge variant="secondary">
                                                                                    {
                                                                                        dayDetails
                                                                                            .entries
                                                                                            .length
                                                                                    }{' '}
                                                                                    registros
                                                                                </Badge>
                                                                                {clockState.canManualEntry ? (
                                                                                    <Button
                                                                                        type="button"
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        onClick={openCreateTimelineEntryForm}
                                                                                        disabled={actionLoading !== null}
                                                                                    >
                                                                                        <Plus className="size-4" />
                                                                                        Nuevo fichaje
                                                                                    </Button>
                                                                                ) : null}
                                                                            </div>
                                                                        </div>

                                                                        {clockState.canManualEntry
                                                                        && isTimelineEntryFormOpen ? (
                                                                            <form
                                                                                className="space-y-3 rounded-lg border border-sidebar-border/70 bg-white/80 p-3 dark:bg-slate-900/30"
                                                                                onSubmit={submitTimelineEntryForm}
                                                                            >
                                                                                <p className={FIELD_LABEL_CLASS}>
                                                                                    {timelineEntryForm.entry_id
                                                                                    !== null
                                                                                        ? 'Editar fichaje manual'
                                                                                        : 'Nuevo fichaje manual'}
                                                                                </p>
                                                                                <div className="grid gap-2 sm:grid-cols-2">
                                                                                    <div className="space-y-1">
                                                                                        <p className={FIELD_LABEL_CLASS}>
                                                                                            Inicio
                                                                                        </p>
                                                                                        <Input
                                                                                            type="datetime-local"
                                                                                            value={
                                                                                                timelineEntryForm.started_at
                                                                                            }
                                                                                            onChange={(event) =>
                                                                                                setTimelineEntryForm(
                                                                                                    (current) => ({
                                                                                                        ...current,
                                                                                                        started_at:
                                                                                                            event
                                                                                                                .target
                                                                                                                .value,
                                                                                                    }),
                                                                                                )
                                                                                            }
                                                                                            className={UI_PRESETS.filterInput}
                                                                                            required
                                                                                        />
                                                                                    </div>
                                                                                    <div className="space-y-1">
                                                                                        <p className={FIELD_LABEL_CLASS}>
                                                                                            Fin
                                                                                        </p>
                                                                                        <Input
                                                                                            type="datetime-local"
                                                                                            value={
                                                                                                timelineEntryForm.ended_at
                                                                                            }
                                                                                            onChange={(event) =>
                                                                                                setTimelineEntryForm(
                                                                                                    (current) => ({
                                                                                                        ...current,
                                                                                                        ended_at:
                                                                                                            event
                                                                                                                .target
                                                                                                                .value,
                                                                                                    }),
                                                                                                )
                                                                                            }
                                                                                            className={UI_PRESETS.filterInput}
                                                                                            required
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
                                                                                    <div className="space-y-1">
                                                                                        <p className={FIELD_LABEL_CLASS}>
                                                                                            Pausa (min)
                                                                                        </p>
                                                                                        <Input
                                                                                            type="number"
                                                                                            min={0}
                                                                                            max={720}
                                                                                            value={
                                                                                                timelineEntryForm.break_minutes
                                                                                            }
                                                                                            onChange={(event) =>
                                                                                                setTimelineEntryForm(
                                                                                                    (current) => ({
                                                                                                        ...current,
                                                                                                        break_minutes:
                                                                                                            event
                                                                                                                .target
                                                                                                                .value,
                                                                                                    }),
                                                                                                )
                                                                                            }
                                                                                            className={UI_PRESETS.filterInput}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="space-y-1">
                                                                                        <p className={FIELD_LABEL_CLASS}>
                                                                                            Motivo
                                                                                        </p>
                                                                                        <Input
                                                                                            value={
                                                                                                timelineEntryForm.manual_reason
                                                                                            }
                                                                                            onChange={(event) =>
                                                                                                setTimelineEntryForm(
                                                                                                    (current) => ({
                                                                                                        ...current,
                                                                                                        manual_reason:
                                                                                                            event
                                                                                                                .target
                                                                                                                .value,
                                                                                                    }),
                                                                                                )
                                                                                            }
                                                                                            className={UI_PRESETS.filterInput}
                                                                                            placeholder="Motivo del ajuste manual"
                                                                                            maxLength={500}
                                                                                            required
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex flex-wrap justify-end gap-2">
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        onClick={closeTimelineEntryForm}
                                                                                        disabled={actionLoading !== null}
                                                                                    >
                                                                                        Cancelar
                                                                                    </Button>
                                                                                    <Button
                                                                                        type="submit"
                                                                                        size="sm"
                                                                                        disabled={actionLoading !== null}
                                                                                    >
                                                                                        <Save className="size-4" />
                                                                                        {timelineEntryForm.entry_id
                                                                                        !== null
                                                                                            ? 'Guardar cambios'
                                                                                            : 'Crear fichaje'}
                                                                                    </Button>
                                                                                </div>
                                                                            </form>
                                                                        ) : null}

                                                                        <div
                                                                            className={`${UI_PRESETS.tableContainer} min-w-0 max-h-[18rem] overflow-y-auto overflow-x-hidden [&>[data-slot=table-container]]:overflow-x-hidden`}
                                                                        >
                                                                            <Table className="w-full table-fixed text-sm [&_td]:!whitespace-normal [&_th]:!whitespace-normal">
                                                                                <TableHeader className={cn(UI_PRESETS.tableHead, 'sticky top-0 z-10')}>
                                                                                    <TableRow>
                                                                                        <TableHead className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}>
                                                                                            #
                                                                                        </TableHead>
                                                                                        <TableHead className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}>
                                                                                            Inicio
                                                                                        </TableHead>
                                                                                        <TableHead className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}>
                                                                                            Fin
                                                                                        </TableHead>
                                                                                        <TableHead className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}>
                                                                                            Pausa
                                                                                        </TableHead>
                                                                                        <TableHead className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}>
                                                                                            Completadas
                                                                                        </TableHead>
                                                                                        <TableHead className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}>
                                                                                            Origen
                                                                                        </TableHead>
                                                                                        {clockState.canManualEntry ? (
                                                                                            <TableHead
                                                                                                className={cn(
                                                                                                    'px-2 py-2 text-center text-[11px]',
                                                                                                    FIELD_LABEL_CLASS,
                                                                                                )}
                                                                                            >
                                                                                                Acciones
                                                                                            </TableHead>
                                                                                        ) : null}
                                                                                    </TableRow>
                                                                                </TableHeader>
                                                                                <TableBody>
                                                                                    {dayDetails.entries.length > 0 ? (
                                                                                        dayDetails.entries.map((entry, index) => {
                                                                                            const liveBreakMinutes =
                                                                                                entry.is_on_break
                                                                                                && entry.break_started_at
                                                                                                    ? Math.floor(
                                                                                                        Math.max(
                                                                                                            0,
                                                                                                            liveNow.getTime()
                                                                                                            - new Date(
                                                                                                                entry.break_started_at,
                                                                                                            ).getTime(),
                                                                                                        )
                                                                                                        / 60_000,
                                                                                                    )
                                                                                                    : 0;

                                                                                            return (
                                                                                                <TableRow
                                                                                                    key={entry.id}
                                                                                                    className={cn(
                                                                                                        'border-t border-sidebar-border/50',
                                                                                                        stripedRowClass(index),
                                                                                                    )}
                                                                                                >
                                                                                                    <TableCell className="px-2 py-2 text-center">
                                                                                                        {index + 1}
                                                                                                    </TableCell>
                                                                                                    <TableCell className="px-2 py-2 text-center">
                                                                                                        {formatClockTime(
                                                                                                            entry.started_at,
                                                                                                        )}
                                                                                                    </TableCell>
                                                                                                    <TableCell className="px-2 py-2 text-center">
                                                                                                        {formatClockTime(
                                                                                                            entry.ended_at,
                                                                                                        )}
                                                                                                    </TableCell>
                                                                                                    <TableCell className="px-2 py-2 text-center">
                                                                                                        <div className="space-y-1 text-center">
                                                                                                            <p className="font-medium text-foreground">
                                                                                                                {formatMinutesDetailed(
                                                                                                                    entry.break_minutes
                                                                                                                    + liveBreakMinutes,
                                                                                                                )}
                                                                                                            </p>
                                                                                                            {entry.is_on_break
                                                                                                            && entry.break_started_at ? (
                                                                                                                <p className="text-[11px] text-amber-700">
                                                                                                                    Activa
                                                                                                                </p>
                                                                                                            ) : null}
                                                                                                        </div>
                                                                                                    </TableCell>
                                                                                                    <TableCell className="px-2 py-2 text-center">
                                                                                                        <span className="font-medium text-foreground">
                                                                                                            {entry.effective_hours.toFixed(
                                                                                                                1,
                                                                                                            )}
                                                                                                            h
                                                                                                        </span>
                                                                                                    </TableCell>
                                                                                                    <TableCell className="px-2 py-2 text-center">
                                                                                                        <div className="flex flex-col items-center gap-1">
                                                                                                            <Badge variant="secondary">
                                                                                                                {formatEntrySource(
                                                                                                                    entry.source,
                                                                                                                )}
                                                                                                            </Badge>
                                                                                                            {entry.manual_reason ? (
                                                                                                                <p
                                                                                                                    className="max-w-[140px] truncate text-[11px] leading-tight text-muted-foreground"
                                                                                                                    title={entry.manual_reason}
                                                                                                                >
                                                                                                                    {entry.manual_reason}
                                                                                                                </p>
                                                                                                            ) : null}
                                                                                                        </div>
                                                                                                    </TableCell>
                                                                                                    {clockState.canManualEntry ? (
                                                                                                        <TableCell className="px-2 py-2 text-center">
                                                                                                            {entry.source ===
                                                                                                            'tutor_manual' ? (
                                                                                                                <div className="flex items-center justify-center gap-1">
                                                                                                                    <Button
                                                                                                                        type="button"
                                                                                                                        size="icon"
                                                                                                                        variant="outline"
                                                                                                                        className={UI_PRESETS.iconActionButton}
                                                                                                                        aria-label="Editar fichaje"
                                                                                                                        title="Editar fichaje"
                                                                                                                        onClick={() =>
                                                                                                                            openEditTimelineEntryForm(
                                                                                                                                entry,
                                                                                                                            )
                                                                                                                        }
                                                                                                                        disabled={actionLoading !== null}
                                                                                                                    >
                                                                                                                        <Pencil className="size-4" />
                                                                                                                    </Button>
                                                                                                                    <Button
                                                                                                                        type="button"
                                                                                                                        size="icon"
                                                                                                                        variant="outline"
                                                                                                                        className={UI_PRESETS.iconActionButtonDanger}
                                                                                                                        aria-label="Eliminar fichaje"
                                                                                                                        title="Eliminar fichaje"
                                                                                                                        onClick={() =>
                                                                                                                            deleteTimelineEntry(
                                                                                                                                entry,
                                                                                                                            )
                                                                                                                        }
                                                                                                                        disabled={actionLoading !== null}
                                                                                                                    >
                                                                                                                        <Trash2 className="size-4" />
                                                                                                                    </Button>
                                                                                                                </div>
                                                                                                            ) : (
                                                                                                                <span className="text-[11px] text-muted-foreground">
                                                                                                                    Auto
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </TableCell>
                                                                                                    ) : null}
                                                                                                </TableRow>
                                                                                            );
                                                                                        })
                                                                                    ) : (
                                                                                        <TableRow className="border-t border-sidebar-border/50">
                                                                                            <TableCell
                                                                                                colSpan={clockState.canManualEntry ? 7 : 6}
                                                                                                className="px-2 py-3 text-center text-sm text-muted-foreground"
                                                                                            >
                                                                                                No hay fichajes registrados en este dia.
                                                                                            </TableCell>
                                                                                        </TableRow>
                                                                                    )}
                                                                                </TableBody>
                                                                            </Table>
                                                                        </div>
                                                                    </section>
                                                                )}
                                                            </section>
                                                        </div>
                                                    ) : null}

                                                    {!dayDetailsLoading
                                                    && !dayDetails ? (
                                                        <p className="rounded-lg border border-sidebar-border/70 bg-white/70 p-3 text-sm text-muted-foreground dark:bg-slate-900/20">
                                                            No hay informacion disponible para este dia.
                                                        </p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            ) : null}

                            {activeTab === 'absence' ? (
                                <div className="grid gap-3 lg:grid-cols-2">
                                    <section className={UI_PRESETS.sectionCard}>
                                        <h3 className={SECTION_TITLE_CLASS}>
                                            Solicitud de ausencia
                                        </h3>
                                        <form
                                            className="space-y-2"
                                            onSubmit={submitAbsence}
                                        >
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input
                                                    type="date"
                                                    value={
                                                        absenceForm.start_date
                                                    }
                                                    onChange={(event) =>
                                                        setAbsenceForm(
                                                            (current) => ({
                                                                ...current,
                                                                start_date:
                                                                    event.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                    className={
                                                        UI_PRESETS.filterInput
                                                    }
                                                />
                                                <Input
                                                    type="date"
                                                    value={absenceForm.end_date}
                                                    onChange={(event) =>
                                                        setAbsenceForm(
                                                            (current) => ({
                                                                ...current,
                                                                end_date:
                                                                    event.target
                                                                        .value,
                                                            }),
                                                        )
                                                    }
                                                    className={
                                                        UI_PRESETS.filterInput
                                                    }
                                                />
                                            </div>
                                            <Input
                                                value={absenceForm.reason}
                                                onChange={(event) =>
                                                    setAbsenceForm(
                                                        (current) => ({
                                                            ...current,
                                                            reason: event.target
                                                                .value,
                                                        }),
                                                    )
                                                }
                                                className={
                                                    UI_PRESETS.filterInput
                                                }
                                                placeholder="Motivo"
                                            />
                                            <Input
                                                type="file"
                                                onChange={(event) =>
                                                    setAbsenceForm(
                                                        (current) => ({
                                                            ...current,
                                                            attachment:
                                                                event.target
                                                                    .files?.[0] ??
                                                                null,
                                                        }),
                                                    )
                                                }
                                                className={
                                                    UI_PRESETS.filterInput
                                                }
                                            />
                                            <Button
                                                size="sm"
                                                disabled={
                                                    actionLoading !== null
                                                }
                                            >
                                                Enviar solicitud
                                            </Button>
                                        </form>
                                    </section>

                                    <section className={UI_PRESETS.sectionCard}>
                                        <h3 className={SECTION_TITLE_CLASS}>
                                            Historial de ausencias
                                        </h3>
                                        <div className="space-y-2">
                                            {absenceRequests.map((absence) => (
                                                <div
                                                    key={absence.id}
                                                    className="rounded-lg border border-sidebar-border/70 bg-white/70 p-3 text-sm dark:bg-slate-900/20"
                                                >
                                                    <div className="mb-1 flex items-center justify-between gap-2">
                                                        <p className="font-medium">
                                                            {formatDate(
                                                                absence.start_date,
                                                            )}{' '}
                                                            -{' '}
                                                            {formatDate(
                                                                absence.end_date,
                                                            )}
                                                        </p>
                                                        <Badge
                                                            variant={absenceBadgeVariant(
                                                                absence.status,
                                                            )}
                                                        >
                                                            {absence.status}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-muted-foreground">
                                                        {absence.reason}
                                                    </p>
                                                    {absence.attachment_url ? (
                                                        <a
                                                            href={
                                                                absence.attachment_url
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-xs text-blue-600 hover:underline"
                                                        >
                                                            Ver justificante
                                                        </a>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {canManageTeam &&
                                    pendingAbsenceRequests.length > 0 ? (
                                        <section
                                            className={`${UI_PRESETS.sectionCard} lg:col-span-2`}
                                        >
                                            <h3 className={SECTION_TITLE_CLASS}>
                                                Pendientes de revision
                                            </h3>
                                            <div className="space-y-2">
                                                {pendingAbsenceRequests.map(
                                                    (absence) => (
                                                        <div
                                                            key={absence.id}
                                                            className="rounded-lg border border-sidebar-border/70 bg-white/70 p-3 dark:bg-slate-900/20"
                                                        >
                                                            <p className="text-sm font-medium">
                                                                {
                                                                    absence
                                                                        .intern
                                                                        ?.name
                                                                }{' '}
                                                                -{' '}
                                                                {formatDate(
                                                                    absence.start_date,
                                                                )}{' '}
                                                                a{' '}
                                                                {formatDate(
                                                                    absence.end_date,
                                                                )}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {absence.reason}
                                                            </p>
                                                            <Input
                                                                value={
                                                                    reviewNotes[
                                                                        absence
                                                                            .id
                                                                    ] ?? ''
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    setReviewNotes(
                                                                        (
                                                                            current,
                                                                        ) => ({
                                                                            ...current,
                                                                            [absence.id]:
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                        }),
                                                                    )
                                                                }
                                                                className={`${UI_PRESETS.filterInput} mt-2`}
                                                                placeholder="Nota de revision (opcional)"
                                                            />
                                                            <div className="mt-2 flex gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        runReview(
                                                                            absence.id,
                                                                            'approved',
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        actionLoading !==
                                                                        null
                                                                    }
                                                                >
                                                                    Aprobar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="destructive"
                                                                    onClick={() =>
                                                                        runReview(
                                                                            absence.id,
                                                                            'rejected',
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        actionLoading !==
                                                                        null
                                                                    }
                                                                >
                                                                    Rechazar
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </section>
                                    ) : null}
                                </div>
                            ) : null}

                            {activeTab === 'summary' ? (
                                <div className="space-y-4">
                                    <section className="grid gap-3 md:grid-cols-4">
                                        <div className={UI_PRESETS.sectionCard}>
                                            <p className={FIELD_LABEL_CLASS}>
                                                Horas efectivas (
                                                {summary.range.label})
                                            </p>
                                            <p className={UI_PRESETS.summaryCardValue}>
                                                {summary.range.worked_hours.toFixed(
                                                    2,
                                                )}
                                                h
                                            </p>
                                        </div>
                                        <div className={UI_PRESETS.sectionCard}>
                                            <p className={FIELD_LABEL_CLASS}>
                                                Horas planificadas
                                            </p>
                                            <p className={UI_PRESETS.summaryCardValue}>
                                                {summary.range.planned_hours.toFixed(
                                                    2,
                                                )}
                                                h
                                            </p>
                                        </div>
                                        <div className={UI_PRESETS.sectionCard}>
                                            <p className={FIELD_LABEL_CLASS}>
                                                Cumplimiento
                                            </p>
                                            <p className={UI_PRESETS.summaryCardValue}>
                                                {summary.range.compliance_percent.toFixed(
                                                    1,
                                                )}
                                                %
                                            </p>
                                        </div>
                                        <div className={UI_PRESETS.sectionCard}>
                                            <p className={FIELD_LABEL_CLASS}>
                                                Avance total
                                            </p>
                                            <p className={UI_PRESETS.summaryCardValue}>
                                                {summary.progress.progress_percent.toFixed(
                                                    1,
                                                )}
                                                %
                                            </p>
                                        </div>
                                    </section>

                                    <section className={UI_PRESETS.sectionCard}>
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <h3
                                                className={cn(
                                                    'flex items-center gap-2',
                                                    SECTION_TITLE_INLINE_CLASS,
                                                )}
                                            >
                                                <ShieldAlert className="size-4" />
                                                Alertas de cumplimiento
                                            </h3>
                                            <Button size="sm" onClick={openPdf}>
                                                <Download className="size-4" />
                                                Exportar PDF
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {summary.alerts.map(
                                                (alert, index) => (
                                                    <Alert
                                                        key={`${alert.title}-${index}`}
                                                        className={cn(
                                                            'text-sm',
                                                            alert.level ===
                                                                'success' &&
                                                                'border-emerald-200 bg-emerald-50',
                                                            alert.level ===
                                                                'warning' &&
                                                                'border-amber-200 bg-amber-50',
                                                            alert.level ===
                                                                'info' &&
                                                                'border-sky-200 bg-sky-50',
                                                        )}
                                                    >
                                                        <AlertTitle className="font-semibold">
                                                            {alert.title}
                                                        </AlertTitle>
                                                        <AlertDescription className="text-muted-foreground">
                                                            {alert.message}
                                                        </AlertDescription>
                                                    </Alert>
                                                ),
                                            )}
                                        </div>
                                    </section>
                                </div>
                            ) : null}
                        </div>
                    </section>

                </div>
            </div>
        </AppLayout>
    );
}

