import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarClock,
    CalendarDays,
    CalendarX2,
    CirclePlus,
    ChartNoAxesCombined,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock3,
    Eye,
    FileText,
    FilterX,
    Pause,
    Pencil,
    Play,
    Save,
    ShieldAlert,
    Timer,
    Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import DatePicker from '@/components/shared/date-picker';
import FileUploadField from '@/components/shared/file-upload-field';
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
    status: 'pendiente' | 'aprobada' | 'rechazada';
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
    { id: 'summary', label: 'Resumen y alertas', icon: ChartNoAxesCombined },
    { id: 'clock', label: 'Fichaje', icon: Clock3 },
    { id: 'schedules', label: 'Horarios', icon: CalendarClock },
    { id: 'calendar', label: 'Calendario', icon: CalendarDays },
    { id: 'absence', label: 'Ausencias', icon: CalendarX2 },
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
const SCHEDULE_DAY_KEY_BY_UTC_WEEKDAY: readonly [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

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

function calculateSchedulePeriodMinutes(
    days: Record<ScheduleDayKey, ScheduleDayEditor>,
    startsOn: string,
    endsOn: string,
): number {
    if (!startsOn || !endsOn || endsOn < startsOn) return 0;

    const current = dateKeyToUtcDate(startsOn);
    const end = dateKeyToUtcDate(endsOn);
    let total = 0;

    while (current <= end) {
        const dayKey = SCHEDULE_DAY_KEY_BY_UTC_WEEKDAY[
            current.getUTCDay()
        ] as ScheduleDayKey;
        total += getScheduleMinutes(days[dayKey]);
        current.setUTCDate(current.getUTCDate() + 1);
    }

    return total;
}

function calculateSchedulePeriodMinutesFromDayMinutes(
    days: Record<ScheduleDayKey, number>,
    startsOn: string,
    endsOn: string,
): number {
    if (!startsOn || !endsOn || endsOn < startsOn) return 0;

    const current = dateKeyToUtcDate(startsOn);
    const end = dateKeyToUtcDate(endsOn);
    let total = 0;

    while (current <= end) {
        const dayKey = SCHEDULE_DAY_KEY_BY_UTC_WEEKDAY[
            current.getUTCDay()
        ] as ScheduleDayKey;
        total += Math.max(0, days[dayKey] ?? 0);
        current.setUTCDate(current.getUTCDate() + 1);
    }

    return total;
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

function splitLocalDateTime(value: string): { date: string; time: string } {
    if (!value) {
        return { date: '', time: '' };
    }

    const [datePart = '', timePartRaw = ''] = value.split('T');
    const timePart = timePartRaw.slice(0, 5);

    return {
        date: /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '',
        time: /^\d{2}:\d{2}$/.test(timePart) ? timePart : '',
    };
}

function joinLocalDateTime(date: string, time: string, fallbackTime: string): string {
    if (!date) return '';
    const normalizedTime = /^\d{2}:\d{2}$/.test(time) ? time : fallbackTime;
    return `${date}T${normalizedTime}`;
}

function openNativeInputPicker(input: HTMLInputElement): void {
    const pickerInput = input as HTMLInputElement & {
        showPicker?: () => void;
    };
    pickerInput.showPicker?.();
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

function buildTimelineEntryEditForm(
    entry: ClockEntry,
    targetDate: string | null,
): TimelineEntryFormState {
    const startDateTime = toDateTimeLocalInput(entry.started_at);
    const endDateTime = toDateTimeLocalInput(entry.ended_at);
    const startParts = splitLocalDateTime(startDateTime);
    const endParts = splitLocalDateTime(endDateTime);

    return {
        entry_id: entry.id,
        started_at: targetDate
            ? joinLocalDateTime(targetDate, startParts.time, '09:00')
            : startDateTime,
        ended_at: targetDate
            ? joinLocalDateTime(targetDate, endParts.time, '14:00')
            : endDateTime,
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

function shiftDateKey(value: string, days: number): string {
    const date = dateKeyToUtcDate(value);
    date.setUTCDate(date.getUTCDate() + days);
    return utcDateToDateKey(date);
}

function monthCursorToUtcDate(value: string): Date | null {
    const [yearPart, monthPart] = value.split('-');
    const year = Number(yearPart);
    const month = Number(monthPart);

    if (
        !Number.isInteger(year)
        || !Number.isInteger(month)
        || month < 1
        || month > 12
    ) {
        return null;
    }

    return new Date(Date.UTC(year, month - 1, 1));
}

function shiftMonthCursor(value: string, months: number): string {
    const baseDate = monthCursorToUtcDate(value);
    if (!baseDate) return value;

    baseDate.setUTCMonth(baseDate.getUTCMonth() + months);
    const year = baseDate.getUTCFullYear();
    const month = String(baseDate.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

function formatMonthCursorLabel(value: string): string {
    const date = monthCursorToUtcDate(value);
    if (!date) return value;

    const formatted = new Intl.DateTimeFormat('es-ES', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    }).format(date);

    return formatted.toUpperCase();
}

function formatDateRangeLabel(startDateKey: string, endDateKey: string): string {
    const formatter = new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
    });

    return `${formatter.format(dateKeyToUtcDate(startDateKey))} - ${formatter.format(
        dateKeyToUtcDate(endDateKey),
    )}`;
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
        return offKind === 'rest' ? 'rest' : 'pending';
    }
    if (!hasPlannedHours && hasWorkedHours) return 'complete';
    if (!isPast && !hasWorkedHours) return 'pending';
    if (!hasWorkedHours) return 'missing';

    // Los 30 minutos de descanso ya estan incluidos en las horas efectivas
    if (workedHours >= plannedHours) return 'complete';
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
    if (status === 'aprobada') return 'default';
    if (status === 'rechazada') return 'destructive';
    return 'secondary';
}

function absenceStatusLabel(status: Absence['status']): string {
    if (status === 'aprobada') return 'Aprobada';
    if (status === 'rechazada') return 'Rechazada';
    return 'Pendiente';
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

    const runReview = (absenceId: number, status: 'aprobada' | 'rechazada') => {
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

    const openPdf = (options?: {
        startDate?: string | null;
        endDate?: string | null;
        range?: Props['filters']['range'];
        rangeLabel?: string;
    }) => {
        if (canManageTeam && !internId) {
            toast.error('Selecciona un becario para exportar el parte.');
            return;
        }

        const params = new URLSearchParams();
        if (internId) params.set('intern_id', internId);

        if (options?.startDate && options?.endDate) {
            params.set('start_date', options.startDate);
            params.set('end_date', options.endDate);
            if (options.rangeLabel?.trim()) {
                params.set('range_label', options.rangeLabel.trim());
            }
        } else {
            params.set('range', options?.range ?? range);
        }

        const exportUrl = `/control-horario/export/pdf?${params.toString()}`;
        void (async () => {
            try {
                const response = await fetch(exportUrl, {
                    method: 'GET',
                    credentials: 'same-origin',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (!response.ok) {
                    let errorMessage = 'No se pudo exportar el PDF.';
                    if (response.status === 403) {
                        errorMessage = 'No tienes permisos para exportar el PDF.';
                    } else {
                        const payload = await response
                            .json()
                            .catch(() => null) as { message?: string } | null;
                        if (payload?.message) {
                            errorMessage = payload.message;
                        }
                    }
                    toast.error(errorMessage);
                    return;
                }

                const blob = await response.blob();
                const contentDisposition = response.headers.get('content-disposition') ?? '';
                const encodedFilenameMatch = contentDisposition.match(
                    /filename\*=UTF-8''([^;]+)/i,
                );
                const filenameMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
                const filename = encodedFilenameMatch?.[1]
                    ? decodeURIComponent(encodedFilenameMatch[1])
                    : (filenameMatch?.[1] ?? 'parte-horas.pdf');

                const fileUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = fileUrl;
                link.download = filename;
                document.body.append(link);
                link.click();
                link.remove();
                window.setTimeout(() => URL.revokeObjectURL(fileUrl), 1500);
            } catch {
                toast.error('No se pudo exportar el PDF. Intentalo de nuevo.');
            }
        })();
    };

    const openDayDetails = async (
        date: string,
        options?: { preserveTab?: boolean },
    ) => {
        if (canManageTeam && !internId) {
            toast.error('Selecciona un becario para ver el detalle diario.');
            return;
        }

        const targetCalendarDay = monthDaysByDate.get(date);
        if (!targetCalendarDay || targetCalendarDay.off_kind === 'unscheduled') {
            toast.error('Solo puedes abrir dias con horario planificado.');
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
                const errorPayload = await response
                    .json()
                    .catch(() => null) as { message?: string } | null;
                throw new Error(
                    errorPayload?.message
                    ?? `No se pudo cargar el detalle del dia (HTTP ${response.status}).`,
                );
            }

            const payload = (await response.json()) as DayDetails;
            if (dayDetailsRequestRef.current !== requestId) return;
            setDayDetails(payload);
        } catch (error) {
            if (dayDetailsRequestRef.current !== requestId) return;
            toast.error(
                error instanceof Error && error.message
                    ? error.message
                    : 'No se pudo cargar el detalle del dia.',
            );
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
            toast.error('No tienes permisos para editar fichajes.');
            return;
        }

        const targetDate = dayDetails?.date ?? dayDetailsDate;
        setDayDetailsTab('timeline');
        setTimelineEntryForm(buildTimelineEntryEditForm(entry, targetDate));
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

        const selectedDate = dayDetails?.date ?? dayDetailsDate;
        if (!selectedDate) {
            toast.error('No se pudo determinar la fecha seleccionada.');
            return;
        }

        const normalizedStartedAt = joinLocalDateTime(
            selectedDate,
            splitLocalDateTime(timelineEntryForm.started_at).time,
            '09:00',
        );
        const normalizedEndedAt = joinLocalDateTime(
            selectedDate,
            splitLocalDateTime(timelineEntryForm.ended_at).time,
            '14:00',
        );

        if (!normalizedStartedAt || !normalizedEndedAt) {
            toast.error('Debes indicar una hora de inicio y de fin.');
            return;
        }

        if (normalizedEndedAt <= normalizedStartedAt) {
            toast.error('La hora de fin debe ser posterior a la hora de inicio.');
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
            started_at: normalizedStartedAt,
            ended_at: normalizedEndedAt,
            break_minutes: Math.round(parsedBreakMinutes),
            manual_reason: manualReason,
            target_date: selectedDate,
        };

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
    const isScheduledCalendarDay = (day: DayRow) => day.off_kind !== 'unscheduled';
    const isCurrentMonthDay = (day: DayRow) => day.date.startsWith(monthCursor);
    const weekHasScheduledDays = weekDaysToRender.some(isScheduledCalendarDay);
    const monthHasScheduledDays = calendar.monthDays.some(
        (day) => isCurrentMonthDay(day) && isScheduledCalendarDay(day),
    );
    const weekRangeLabel =
        weekDaysToRender.length >= 2
            ? formatDateRangeLabel(
                weekDaysToRender[0].date,
                weekDaysToRender[weekDaysToRender.length - 1].date,
            )
            : null;
    const timelineTargetDate = dayDetails?.date ?? dayDetailsDate ?? '';
    const timelineStartParts = splitLocalDateTime(timelineEntryForm.started_at);
    const timelineEndParts = splitLocalDateTime(timelineEntryForm.ended_at);
    const timelineColumnWidths = clockState.canManualEntry
        ? {
              order: '8%',
              start: '14%',
              end: '14%',
              pause: '16%',
              completed: '16%',
              source: '20%',
              actions: '12%',
          }
        : {
              order: '9%',
              start: '16%',
              end: '16%',
              pause: '18%',
              completed: '18%',
              source: '23%',
          };
    const currentMonthLabel = formatMonthCursorLabel(monthCursor);
    const weekPdfStartDate = weekDaysToRender[0]?.date ?? null;
    const weekPdfEndDate = weekDaysToRender[weekDaysToRender.length - 1]?.date ?? null;
    const monthCursorDate = monthCursorToUtcDate(monthCursor);
    const monthPdfStartDate = monthCursorDate
        ? utcDateToDateKey(monthCursorDate)
        : null;
    const monthPdfEndDate = monthCursorDate
        ? (() => {
              const monthEnd = new Date(monthCursorDate.getTime());
              monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
              return utcDateToDateKey(monthEnd);
          })()
        : null;
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
    const navigateMonth = (direction: 'previous' | 'next') => {
        const nextMonth = shiftMonthCursor(
            monthCursor,
            direction === 'next' ? 1 : -1,
        );
        setWeekStartOverride(null);
        applyFilters({ month: nextMonth });
    };
    const dayDetailsDateLabel = formatDate(dayDetails?.date ?? dayDetailsDate);
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
    const periodMinutes = calculateSchedulePeriodMinutes(
        scheduleDays,
        scheduleForm.starts_on,
        scheduleForm.ends_on,
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
    const editPeriodMinutes = calculateSchedulePeriodMinutes(
        editScheduleDays,
        editScheduleForm.starts_on,
        editScheduleForm.ends_on,
    );
    const activeSchedule = schedules.find((schedule) => schedule.is_active) ?? null;
    const activeSchedulePlannedMinutes =
        activeSchedule?.starts_on && activeSchedule?.ends_on
            ? calculateSchedulePeriodMinutesFromDayMinutes(
                activeSchedule.days,
                activeSchedule.starts_on,
                activeSchedule.ends_on,
            )
            : null;
    const plannedHoursFromSchedule =
        activeSchedulePlannedMinutes !== null
            ? Math.round((activeSchedulePlannedMinutes / 60) * 100) / 100
            : summary.range.planned_hours;

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
                        <div className="grid gap-3 md:grid-cols-4">
                            {canManageTeam ? (
                                <Select
                                    value={internId}
                                    onValueChange={(value) =>
                                        applyFilters({ intern_id: value })
                                    }
                                >
                                    <SelectTrigger
                                        className={`${UI_PRESETS.selectTrigger} h-auto min-h-[92px] w-full cursor-pointer rounded-lg border-sidebar-border/70 bg-white/70 p-3 text-left shadow-none dark:border-sidebar-border dark:bg-slate-900/20`}
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
                                                className={`${UI_PRESETS.selectItem} cursor-pointer`}
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
                                    Fecha inicio y fin
                                </p>
                                <p className="font-semibold">
                                    {formatDate(selectedIntern?.internship_start_date ?? null)} -{' '}
                                    {formatDate(selectedIntern?.internship_end_date ?? null)}
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

                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div className="rounded-md border border-sidebar-border/60 bg-slate-50/70 px-3 py-3 text-center dark:bg-slate-900/30">
                                                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                        Horas semanales
                                                    </p>
                                                    <p className="mt-1 text-3xl font-bold text-[#2563eb]">
                                                        {formatScheduleHours(
                                                            weeklyMinutes,
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="rounded-md border border-sidebar-border/60 bg-slate-50/70 px-3 py-3 text-center dark:bg-slate-900/30">
                                                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                        Total periodo
                                                    </p>
                                                    <p className="mt-1 text-3xl font-bold text-[#2563eb]">
                                                        {formatScheduleHours(
                                                            periodMinutes,
                                                        )}
                                                    </p>
                                                </div>
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
                                            className="!w-[94vw] !max-w-[980px] !block overflow-hidden border-sidebar-border/70 p-0 !bg-white dark:!bg-slate-950 [&_button]:cursor-pointer"
                                        >
                                            <div className="flex min-h-0 min-w-0 max-h-[88vh] flex-col">
                                                <DialogHeader className="border-b border-sidebar-border/70 bg-[linear-gradient(140deg,#eaf2ff_0%,#f7fbff_36%,#e9f9f2_100%)] px-5 pb-3 pt-4 dark:border-sidebar-border dark:bg-[linear-gradient(140deg,#0f1d34_0%,#11233f_48%,#0f2c2b_100%)] sm:px-6">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="space-y-1">
                                                            <DialogTitle className="text-base font-semibold text-foreground">
                                                                Ver horario existente
                                                            </DialogTitle>
                                                            <DialogDescription className="text-sm text-muted-foreground">
                                                                Ve o modifica los datos del horario y guarda los cambios.
                                                            </DialogDescription>
                                                        </div>
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
                                                </DialogHeader>

                                                <div className="min-w-0 overflow-x-hidden overflow-y-auto px-6 py-5 sm:px-7 sm:py-6">
                                                <form
                                                    className="min-w-0 space-y-6"
                                                    onSubmit={submitEditSchedule}
                                                >
                                                <div className="space-y-3">
                                                    <div className="space-y-2">
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

                                                    <div className="grid gap-4 md:grid-cols-2">
                                                        <div className="space-y-2">
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
                                                        <div className="space-y-2">
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

                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                    <div className="rounded-md border border-sidebar-border/60 bg-slate-50/70 px-3 py-3 text-center dark:bg-slate-900/30">
                                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                            Horas semanales
                                                        </p>
                                                        <p className="mt-1 text-3xl font-bold text-[#2563eb]">
                                                            {formatScheduleHours(
                                                                editWeeklyMinutes,
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-md border border-sidebar-border/60 bg-slate-50/70 px-3 py-3 text-center dark:bg-slate-900/30">
                                                        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                            Total periodo
                                                        </p>
                                                        <p className="mt-1 text-3xl font-bold text-[#2563eb]">
                                                            {formatScheduleHours(
                                                                editPeriodMinutes,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2 pt-1">
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
                                            {DAY_VISUAL_LEGEND
                                                .filter(
                                                    (item) =>
                                                        item.status !== 'disabled'
                                                        && item.status !== 'pending',
                                                )
                                                .map((item) => (
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
                                        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                            <h3 className={cn(SECTION_TITLE_INLINE_CLASS, 'justify-self-start')}>
                                                Vista semanal
                                            </h3>
                                            <div className="justify-self-center text-center">
                                                {weekRangeLabel ? (
                                                    <p className="text-sm font-medium text-muted-foreground">
                                                        {weekRangeLabel}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className="flex items-center justify-self-end gap-2">
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
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className={UI_PRESETS.iconActionButton}
                                                    onClick={() =>
                                                        openPdf({
                                                            startDate: weekPdfStartDate,
                                                            endDate: weekPdfEndDate,
                                                            rangeLabel: 'Semana visible',
                                                        })
                                                    }
                                                    disabled={!weekPdfStartDate || !weekPdfEndDate}
                                                    aria-label="Exportar semana en PDF"
                                                    title="Exportar semana en PDF"
                                                >
                                                    <FileText className="size-4 text-rose-600" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid gap-2 md:grid-cols-7">
                                            {weekDaysToRender.map((day) => {
                                                const isDayScheduled = isScheduledCalendarDay(day);
                                                if (!isDayScheduled) {
                                                    return (
                                                        <div
                                                            key={day.date}
                                                            aria-hidden="true"
                                                            className="h-full min-h-[172px] rounded-lg border border-transparent bg-transparent p-3"
                                                        />
                                                    );
                                                }

                                                const dayIndex = dateKeyToUtcDate(day.date).getUTCDay();
                                                const dayName = WEEKDAY_FULL_NAMES[(dayIndex + 6) % 7];
                                                const visualStatus = resolveDayVisualStatus(
                                                    day.planned_hours,
                                                    day.worked_hours,
                                                    day.is_past,
                                                    day.off_kind,
                                                );
                                                const hasPlannedHours = day.planned_hours > 0.01;
                                                const workedForPlannedProgress = hasPlannedHours
                                                    ? Math.min(day.worked_hours, day.planned_hours)
                                                    : day.worked_hours;
                                                const extraHours = Math.max(
                                                    0,
                                                    day.worked_hours - day.planned_hours,
                                                );
                                                const progress = hasPlannedHours
                                                    ? (workedForPlannedProgress / day.planned_hours) * 100
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
                                                        {visualStatus !== 'rest' && hasPlannedHours ? (
                                                            <div className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60 dark:bg-slate-700/60">
                                                                <div
                                                                    className={cn(
                                                                        'h-full transition-all duration-300',
                                                                        dayVisualProgressClass(
                                                                            visualStatus,
                                                                        ),
                                                                    )}
                                                                    style={{
                                                                        width: `${Math.min(progress, 100)}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        ) : null}
                                                        <p className="text-xs font-medium text-muted-foreground">
                                                            {workedForPlannedProgress.toFixed(1)}h / {day.planned_hours.toFixed(1)}h
                                                        </p>
                                                        {extraHours > 0.01 ? (
                                                            <p className="mt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                                +{extraHours.toFixed(1)}h extra
                                                            </p>
                                                        ) : null}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {!weekHasScheduledDays ? (
                                            <p className="mt-3 rounded-lg border border-sidebar-border/70 bg-white/70 p-3 text-sm text-muted-foreground dark:bg-slate-900/20">
                                                No hay horario planificado para esta semana.
                                            </p>
                                        ) : null}
                                    </section>

                                    <section className={UI_PRESETS.sectionCard}>
                                        <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                            <h3 className={cn(SECTION_TITLE_INLINE_CLASS, 'justify-self-start')}>
                                                Vista mensual
                                            </h3>
                                            <div className="justify-self-center text-center">
                                                <p className="text-sm font-medium text-muted-foreground">
                                                    {currentMonthLabel}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-self-end gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        navigateMonth('previous')
                                                    }
                                                    aria-label="Mes anterior"
                                                    className={UI_PRESETS.iconActionButton}
                                                >
                                                    <ChevronLeft className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() =>
                                                        navigateMonth('next')
                                                    }
                                                    aria-label="Mes siguiente"
                                                    className={UI_PRESETS.iconActionButton}
                                                >
                                                    <ChevronRight className="size-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="outline"
                                                    className={UI_PRESETS.iconActionButton}
                                                    onClick={() =>
                                                        openPdf({
                                                            startDate: monthPdfStartDate,
                                                            endDate: monthPdfEndDate,
                                                            rangeLabel: 'Mes visible',
                                                        })
                                                    }
                                                    disabled={!monthPdfStartDate || !monthPdfEndDate}
                                                    aria-label="Exportar mes en PDF"
                                                    title="Exportar mes en PDF"
                                                >
                                                    <FileText className="size-4 text-rose-600" />
                                                </Button>
                                            </div>
                                        </div>
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
                                        <div className="grid gap-2 md:grid-cols-7 md:auto-rows-[60px]">
                                            {calendar.monthDays.map((day) => {
                                                const isDayInCurrentMonth = isCurrentMonthDay(day);
                                                const isDayScheduled = isScheduledCalendarDay(day);

                                                if (!isDayInCurrentMonth || !isDayScheduled) {
                                                    return (
                                                        <div
                                                            key={day.date}
                                                            aria-hidden="true"
                                                            className="h-full rounded-md border border-transparent bg-transparent p-1.5"
                                                        />
                                                    );
                                                }

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
                                                            'h-full w-full rounded-md border p-1.5 text-left text-xs',
                                                            'flex flex-col justify-between',
                                                            'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/45',
                                                            dayVisualClasses(
                                                                visualStatus,
                                                            ),
                                                        )}
                                                    >
                                                        <p className="font-semibold leading-none">
                                                            {day.label}
                                                        </p>
                                                        <p className="leading-none">
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
                                        {!monthHasScheduledDays ? (
                                            <p className="mt-3 rounded-lg border border-sidebar-border/70 bg-white/70 p-3 text-sm text-muted-foreground dark:bg-slate-900/20">
                                                No hay horario planificado para este mes.
                                            </p>
                                        ) : null}
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
                                                            <section className={cn(UI_PRESETS.sectionCard, 'space-y-4 p-4')}>
                                                                <div className={UI_PRESETS.tabsHeaderEmphasis}>
                                                                    <div className="flex flex-wrap items-end gap-1.5">
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                setDayDetailsTab(
                                                                                    'status',
                                                                                )
                                                                            }
                                                                            className={`${UI_PRESETS.tabBase} ${dayDetailsTab === 'status' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                                                        >
                                                                            <span className="flex items-center gap-1.5">
                                                                                <CheckCircle2 className="size-4 shrink-0" />
                                                                                <span>Estado</span>
                                                                            </span>
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                setDayDetailsTab(
                                                                                    'timeline',
                                                                                )
                                                                            }
                                                                            className={`${UI_PRESETS.tabBase} ${dayDetailsTab === 'timeline' ? UI_PRESETS.tabActive : UI_PRESETS.tabInactive}`}
                                                                        >
                                                                            <span className="flex items-center gap-1.5">
                                                                                <Clock3 className="size-4 shrink-0" />
                                                                                <span>Timeline</span>
                                                                            </span>
                                                                        </Button>
                                                                    </div>
                                                                </div>

                                                                {dayDetailsTab === 'status' ? (
                                                                    <section className="space-y-3">
                                                                        <div className="overflow-hidden rounded-lg border border-sidebar-border/70 bg-white/80 dark:bg-slate-900/30">
                                                                            <div className="grid grid-cols-1 gap-1 border-b border-sidebar-border/70 px-4 py-3 sm:grid-cols-[220px_1fr] sm:items-center sm:gap-4">
                                                                                <p className={FIELD_LABEL_CLASS}>
                                                                                    Horas planificadas
                                                                                </p>
                                                                                <p className="text-base font-semibold text-foreground">
                                                                                    {dayDetails.planned_hours.toFixed(
                                                                                        1,
                                                                                    )}{' '}
                                                                                    h
                                                                                </p>
                                                                            </div>
                                                                            <div className="grid grid-cols-1 gap-1 border-b border-sidebar-border/70 px-4 py-3 sm:grid-cols-[220px_1fr] sm:items-center sm:gap-4">
                                                                                <p className={FIELD_LABEL_CLASS}>
                                                                                    Horas trabajadas
                                                                                </p>
                                                                                <p className="text-base font-semibold text-foreground">
                                                                                    {dayDetails.worked_hours.toFixed(
                                                                                        1,
                                                                                    )}{' '}
                                                                                    h
                                                                                </p>
                                                                            </div>
                                                                            <div className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[220px_1fr] sm:items-center sm:gap-4">
                                                                                <p className={FIELD_LABEL_CLASS}>
                                                                                    Descansos
                                                                                </p>
                                                                                <p className="text-base font-semibold text-foreground">
                                                                                    {dayDetails.break_hours.toFixed(
                                                                                        1,
                                                                                    )}{' '}
                                                                                    h
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </section>
                                                                ) : (
                                                                    <section className="space-y-3">
                                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                                            <h4 className={SECTION_TITLE_INLINE_CLASS}>
                                                                                Timeline de fichajes
                                                                            </h4>
                                                                            <div className="flex items-center gap-2">
                                                                                {clockState.canManualEntry ? (
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="outline"
                                                                                        size="icon"
                                                                                        className={UI_PRESETS.iconActionButtonPrimary}
                                                                                        onClick={openCreateTimelineEntryForm}
                                                                                        disabled={actionLoading !== null}
                                                                                        aria-label="Nuevo fichaje"
                                                                                        title="Nuevo fichaje"
                                                                                    >
                                                                                        <CirclePlus />
                                                                                    </Button>
                                                                                ) : null}
                                                                            </div>
                                                                        </div>

                                                                        {clockState.canManualEntry ? (
                                                                            <Dialog
                                                                                open={isTimelineEntryFormOpen}
                                                                                onOpenChange={(open) => {
                                                                                    if (open) {
                                                                                        setIsTimelineEntryFormOpen(
                                                                                            true,
                                                                                        );
                                                                                        return;
                                                                                    }
                                                                                    closeTimelineEntryForm();
                                                                                }}
                                                                            >
                                                                                <DialogContent
                                                                                    overlayClassName="bg-black/35 backdrop-blur-sm"
                                                                                    hideCloseButton
                                                                                    className="!w-[94vw] !max-w-[640px] !block overflow-hidden border-sidebar-border/70 p-0 !bg-white dark:!bg-slate-950 [&_button]:cursor-pointer"
                                                                                >
                                                                                    <div className="flex min-h-0 min-w-0 max-h-[80vh] flex-col">
                                                                                        <DialogHeader className="border-b border-sidebar-border/70 bg-[linear-gradient(140deg,#eaf2ff_0%,#f7fbff_36%,#e9f9f2_100%)] px-5 pb-3 pt-4 dark:border-sidebar-border dark:bg-[linear-gradient(140deg,#0f1d34_0%,#11233f_48%,#0f2c2b_100%)] sm:px-6">
                                                                                            <div className="flex items-center justify-between gap-3">
                                                                                                <div className="min-w-0">
                                                                                                    <DialogTitle className="text-base font-semibold text-foreground">
                                                                                                        {timelineEntryForm.entry_id
                                                                                                        !==
                                                                                                        null
                                                                                                            ? 'Editar fichaje manual'
                                                                                                            : 'Nuevo fichaje manual'}
                                                                                                    </DialogTitle>
                                                                                                    <DialogDescription className="text-sm text-muted-foreground">
                                                                                                        Completa el fichaje y guarda los cambios.
                                                                                                    </DialogDescription>
                                                                                                </div>
                                                                                                <Button
                                                                                                    type="button"
                                                                                                    size="icon"
                                                                                                    variant="ghost"
                                                                                                    className="shrink-0"
                                                                                                    aria-label="Volver"
                                                                                                    title="Volver"
                                                                                                    onClick={closeTimelineEntryForm}
                                                                                                >
                                                                                                    <ArrowLeft className="size-4" />
                                                                                                </Button>
                                                                                            </div>
                                                                                        </DialogHeader>

                                                                                        <form
                                                                                            className="min-w-0 space-y-3 overflow-y-auto px-6 py-6 sm:px-7 sm:py-7"
                                                                                            onSubmit={submitTimelineEntryForm}
                                                                                        >
                                                                                            <div className="grid gap-2 sm:grid-cols-2">
                                                                                                <div className="space-y-1">
                                                                                                    <p className={FIELD_LABEL_CLASS}>
                                                                                                        Inicio
                                                                                                    </p>
                                                                                                    <div className="grid gap-2 sm:grid-cols-[1fr_132px]">
                                                                                                        <DatePicker
                                                                                                            id="timeline-start-date"
                                                                                                            value={
                                                                                                                timelineTargetDate
                                                                                                                || timelineStartParts.date
                                                                                                            }
                                                                                                            placeholder="Fecha"
                                                                                                            className={`${UI_PRESETS.filterInput} cursor-pointer`}
                                                                                                            disabled
                                                                                                        />
                                                                                                        <Input
                                                                                                            type="time"
                                                                                                            step={60}
                                                                                                            value={
                                                                                                                timelineStartParts.time
                                                                                                            }
                                                                                                            onChange={(event) =>
                                                                                                                setTimelineEntryForm(
                                                                                                                    (
                                                                                                                        current,
                                                                                                                    ) => ({
                                                                                                                        ...current,
                                                                                                                        started_at:
                                                                                                                            joinLocalDateTime(
                                                                                                                                splitLocalDateTime(
                                                                                                                                    current.started_at,
                                                                                                                                )
                                                                                                                                    .date
                                                                                                                                || timelineTargetDate,
                                                                                                                                event
                                                                                                                                    .target
                                                                                                                                    .value,
                                                                                                                                '09:00',
                                                                                                                            ),
                                                                                                                    }),
                                                                                                                )
                                                                                                            }
                                                                                                            onClick={(event) =>
                                                                                                                openNativeInputPicker(
                                                                                                                    event.currentTarget,
                                                                                                                )
                                                                                                            }
                                                                                                            onFocus={(event) =>
                                                                                                                openNativeInputPicker(
                                                                                                                    event.currentTarget,
                                                                                                                )
                                                                                                            }
                                                                                                            className={`${UI_PRESETS.filterInput} cursor-pointer`}
                                                                                                            required
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="space-y-1">
                                                                                                    <p className={FIELD_LABEL_CLASS}>
                                                                                                        Fin
                                                                                                    </p>
                                                                                                    <div className="grid gap-2 sm:grid-cols-[1fr_132px]">
                                                                                                        <DatePicker
                                                                                                            id="timeline-end-date"
                                                                                                            value={
                                                                                                                timelineTargetDate
                                                                                                                || timelineEndParts.date
                                                                                                            }
                                                                                                            placeholder="Fecha"
                                                                                                            className={`${UI_PRESETS.filterInput} cursor-pointer`}
                                                                                                            disabled
                                                                                                        />
                                                                                                        <Input
                                                                                                            type="time"
                                                                                                            step={60}
                                                                                                            value={
                                                                                                                timelineEndParts.time
                                                                                                            }
                                                                                                            onChange={(event) =>
                                                                                                                setTimelineEntryForm(
                                                                                                                    (
                                                                                                                        current,
                                                                                                                    ) => ({
                                                                                                                        ...current,
                                                                                                                        ended_at:
                                                                                                                            joinLocalDateTime(
                                                                                                                                splitLocalDateTime(
                                                                                                                                    current.ended_at,
                                                                                                                                )
                                                                                                                                    .date
                                                                                                                                || timelineTargetDate,
                                                                                                                                event
                                                                                                                                    .target
                                                                                                                                    .value,
                                                                                                                                '14:00',
                                                                                                                            ),
                                                                                                                    }),
                                                                                                                )
                                                                                                            }
                                                                                                            onClick={(event) =>
                                                                                                                openNativeInputPicker(
                                                                                                                    event.currentTarget,
                                                                                                                )
                                                                                                            }
                                                                                                            onFocus={(event) =>
                                                                                                                openNativeInputPicker(
                                                                                                                    event.currentTarget,
                                                                                                                )
                                                                                                            }
                                                                                                            className={`${UI_PRESETS.filterInput} cursor-pointer`}
                                                                                                            required
                                                                                                        />
                                                                                                    </div>
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
                                                                                                        maxLength={500}
                                                                                                        required
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex flex-wrap justify-end gap-2 pt-1">
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
                                                                                                    {timelineEntryForm.entry_id
                                                                                                    !==
                                                                                                    null
                                                                                                        ? 'Guardar'
                                                                                                        : 'Crear fichaje'}
                                                                                                </Button>
                                                                                            </div>
                                                                                        </form>
                                                                                    </div>
                                                                                </DialogContent>
                                                                            </Dialog>
                                                                        ) : null}

                                                                        <div
                                                                            className={`${UI_PRESETS.tableContainer} min-w-0 max-h-[18rem] overflow-y-auto overflow-x-hidden [&>[data-slot=table-container]]:overflow-x-hidden`}
                                                                        >
                                                                            <Table className="w-full table-fixed text-sm [&_td]:!whitespace-normal [&_th]:!whitespace-normal">
                                                                                <TableHeader className={cn(UI_PRESETS.tableHead, 'sticky top-0 z-10')}>
                                                                                    <TableRow>
                                                                                        <TableHead
                                                                                            style={{
                                                                                                width: timelineColumnWidths.order,
                                                                                            }}
                                                                                            className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}
                                                                                        >
                                                                                            #
                                                                                        </TableHead>
                                                                                        <TableHead
                                                                                            style={{
                                                                                                width: timelineColumnWidths.start,
                                                                                            }}
                                                                                            className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}
                                                                                        >
                                                                                            Inicio
                                                                                        </TableHead>
                                                                                        <TableHead
                                                                                            style={{
                                                                                                width: timelineColumnWidths.end,
                                                                                            }}
                                                                                            className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}
                                                                                        >
                                                                                            Fin
                                                                                        </TableHead>
                                                                                        <TableHead
                                                                                            style={{
                                                                                                width: timelineColumnWidths.pause,
                                                                                            }}
                                                                                            className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}
                                                                                        >
                                                                                            Pausa
                                                                                        </TableHead>
                                                                                        <TableHead
                                                                                            style={{
                                                                                                width: timelineColumnWidths.completed,
                                                                                            }}
                                                                                            className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}
                                                                                        >
                                                                                            Completadas
                                                                                        </TableHead>
                                                                                        <TableHead
                                                                                            style={{
                                                                                                width: timelineColumnWidths.source,
                                                                                            }}
                                                                                            className={cn('px-2 py-2 text-center text-[11px]', FIELD_LABEL_CLASS)}
                                                                                        >
                                                                                            Origen
                                                                                        </TableHead>
                                                                                        {clockState.canManualEntry ? (
                                                                                            <TableHead
                                                                                                style={{
                                                                                                    width: timelineColumnWidths.actions,
                                                                                                }}
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
                                                                                                    <TableCell
                                                                                                        style={{
                                                                                                            width: timelineColumnWidths.order,
                                                                                                        }}
                                                                                                        className="px-2 py-2 text-center"
                                                                                                    >
                                                                                                        {index + 1}
                                                                                                    </TableCell>
                                                                                                    <TableCell
                                                                                                        style={{
                                                                                                            width: timelineColumnWidths.start,
                                                                                                        }}
                                                                                                        className="px-2 py-2 text-center"
                                                                                                    >
                                                                                                        {formatClockTime(
                                                                                                            entry.started_at,
                                                                                                        )}
                                                                                                    </TableCell>
                                                                                                    <TableCell
                                                                                                        style={{
                                                                                                            width: timelineColumnWidths.end,
                                                                                                        }}
                                                                                                        className="px-2 py-2 text-center"
                                                                                                    >
                                                                                                        {formatClockTime(
                                                                                                            entry.ended_at,
                                                                                                        )}
                                                                                                    </TableCell>
                                                                                                    <TableCell
                                                                                                        style={{
                                                                                                            width: timelineColumnWidths.pause,
                                                                                                        }}
                                                                                                        className="px-2 py-2 text-center"
                                                                                                    >
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
                                                                                                    <TableCell
                                                                                                        style={{
                                                                                                            width: timelineColumnWidths.completed,
                                                                                                        }}
                                                                                                        className="px-2 py-2 text-center"
                                                                                                    >
                                                                                                        <span className="font-medium text-foreground">
                                                                                                            {entry.effective_hours.toFixed(
                                                                                                                1,
                                                                                                            )}
                                                                                                            h
                                                                                                        </span>
                                                                                                    </TableCell>
                                                                                                    <TableCell
                                                                                                        style={{
                                                                                                            width: timelineColumnWidths.source,
                                                                                                        }}
                                                                                                        className="px-2 py-2 text-center"
                                                                                                    >
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
                                                                                                        <TableCell
                                                                                                            style={{
                                                                                                                width: timelineColumnWidths.actions,
                                                                                                            }}
                                                                                                            className="px-2 py-2 text-center"
                                                                                                        >
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
                                <div className="grid gap-4 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)] xl:items-start">
                                    <section className={`relative overflow-hidden ${UI_PRESETS.sectionCard} bg-[linear-gradient(140deg,#eaf2ff_0%,#f7fbff_36%,#e9f9f2_100%)] xl:sticky xl:top-4 dark:bg-[linear-gradient(140deg,#0f1d34_0%,#11233f_48%,#0f2c2b_100%)]`}>
                                        <div className="relative z-10">
                                            <h3 className={SECTION_TITLE_CLASS}>
                                                Ausencias existentes
                                            </h3>
                                            <div className="space-y-2">
                                                {absenceRequests.length > 0 ? (
                                                    absenceRequests.map((absence) => (
                                                        <div
                                                            key={absence.id}
                                                            className="space-y-2 rounded-lg border border-sidebar-border/70 bg-white/80 p-3 backdrop-blur-[1px] dark:bg-slate-900/30"
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="font-medium">
                                                                    {formatDate(absence.start_date)} -{' '}
                                                                    {formatDate(absence.end_date)}
                                                                </p>
                                                                <Badge
                                                                    variant={absenceBadgeVariant(
                                                                        absence.status,
                                                                    )}
                                                                >
                                                                    {absenceStatusLabel(absence.status)}
                                                                </Badge>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground">
                                                                {absence.reason}
                                                            </p>
                                                            {absence.attachment_url ? (
                                                                <div className="mt-2 flex justify-center">
                                                                    <Button
                                                                        asChild
                                                                        size="icon"
                                                                        variant="outline"
                                                                        className={UI_PRESETS.iconActionButtonPrimary}
                                                                        aria-label="Ver justificante"
                                                                        title="Ver justificante"
                                                                    >
                                                                        <a
                                                                            href={absence.attachment_url}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                        >
                                                                            <Eye className="size-4" />
                                                                        </a>
                                                                    </Button>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="rounded-lg border border-sidebar-border/70 bg-white/80 p-3 text-sm text-muted-foreground dark:bg-slate-900/30">
                                                        No hay ausencias registradas.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    <div className="space-y-4">
                                        <section className={`${UI_PRESETS.sectionCard} bg-white dark:bg-slate-900/20`}>
                                            <h3 className={SECTION_TITLE_CLASS}>
                                                Creacion de ausencia
                                            </h3>
                                            <p className="mb-1 text-xs text-muted-foreground">
                                                Registra una ausencia e incluye justificante si corresponde.
                                            </p>
                                            <form
                                                className="space-y-4"
                                                onSubmit={submitAbsence}
                                            >
                                                <div className="grid gap-2 md:grid-cols-2">
                                                    <div className="space-y-1">
                                                        <label
                                                            htmlFor="absence-start-date"
                                                            className={FIELD_LABEL_CLASS}
                                                        >
                                                            Fecha inicio
                                                        </label>
                                                        <DatePicker
                                                            id="absence-start-date"
                                                            value={absenceForm.start_date}
                                                            onChange={(value) =>
                                                                setAbsenceForm((current) => ({
                                                                    ...current,
                                                                    start_date: value,
                                                                }))
                                                            }
                                                            placeholder="Fecha inicio"
                                                            className={UI_PRESETS.filterInput}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label
                                                            htmlFor="absence-end-date"
                                                            className={FIELD_LABEL_CLASS}
                                                        >
                                                            Fecha fin
                                                        </label>
                                                        <DatePicker
                                                            id="absence-end-date"
                                                            value={absenceForm.end_date}
                                                            onChange={(value) =>
                                                                setAbsenceForm((current) => ({
                                                                    ...current,
                                                                    end_date: value,
                                                                }))
                                                            }
                                                            placeholder="Fecha fin"
                                                            className={UI_PRESETS.filterInput}
                                                            required
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label
                                                        htmlFor="absence-reason"
                                                        className={FIELD_LABEL_CLASS}
                                                    >
                                                        Motivo
                                                    </label>
                                                    <Input
                                                        id="absence-reason"
                                                        value={absenceForm.reason}
                                                        onChange={(event) =>
                                                            setAbsenceForm((current) => ({
                                                                ...current,
                                                                reason: event.target.value,
                                                            }))
                                                        }
                                                        className={UI_PRESETS.filterInput}
                                                        placeholder="Ej. Cita medica"
                                                        required
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <FileUploadField
                                                        id="absence-attachment"
                                                        label="Justificante (opcional)"
                                                        selectedFileName={absenceForm.attachment?.name ?? null}
                                                        onChange={(file) =>
                                                            setAbsenceForm((current) => ({
                                                                ...current,
                                                                attachment: file,
                                                            }))
                                                        }
                                                    />
                                                </div>

                                                <div className="flex justify-end">
                                                    <Button
                                                        size="sm"
                                                        disabled={actionLoading !== null}
                                                        className={UI_PRESETS.saveButton}
                                                    >
                                                        Enviar solicitud
                                                    </Button>
                                                </div>
                                            </form>
                                        </section>

                                        {canManageTeam &&
                                        pendingAbsenceRequests.length > 0 ? (
                                            <section className={UI_PRESETS.sectionCard}>
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
                                                                {absence.attachment_url ? (
                                                                    <a
                                                                        href={absence.attachment_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="mt-1 inline-flex text-xs text-blue-600 hover:underline"
                                                                    >
                                                                        Ver justificante
                                                                    </a>
                                                                ) : null}
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
                                                                                'aprobada',
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
                                                                                'rechazada',
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
                                </div>
                            ) : null}

                            {activeTab === 'summary' ? (
                                <div className="space-y-4">
                                    <section className="grid gap-3 md:grid-cols-3">
                                        <div className={UI_PRESETS.sectionCard}>
                                            <p className={FIELD_LABEL_CLASS}>
                                                Horas realizadas
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
                                                {plannedHoursFromSchedule.toFixed(
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
