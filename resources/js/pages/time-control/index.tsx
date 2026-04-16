import { Head, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    Download,
    Pause,
    Play,
    ShieldAlert,
    Timer,
    UserRoundCheck,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import AppLayout from '@/layouts/app-layout';
import { UI_PRESETS } from '@/lib/ui-presets';
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
    is_today: boolean;
    is_past: boolean;
};

type AlertRow = {
    level: 'success' | 'warning' | 'info';
    title: string;
    message: string;
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
    { id: 'clock', label: 'Fichaje' },
    { id: 'schedules', label: 'Horarios' },
    { id: 'calendar', label: 'Calendario' },
    { id: 'absence', label: 'Ausencias' },
    { id: 'summary', label: 'Resumen y alertas' },
] as const;

function toLocalDatetimeInput(date: Date): string {
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - timezoneOffset);
    return local.toISOString().slice(0, 16);
}

function formatDate(value: string | null): string {
    if (!value) return '-';
    return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES');
}

function formatDateTime(value: string | null): string {
    if (!value) return '-';
    return new Date(value).toLocaleString('es-ES');
}

function dayStatusClasses(status: DayRow['status']): string {
    return {
        off: 'border-slate-200 bg-slate-100 text-slate-600',
        scheduled: 'border-sky-200 bg-sky-50 text-sky-700',
        missing: 'border-rose-200 bg-rose-50 text-rose-700',
        partial: 'border-amber-200 bg-amber-50 text-amber-700',
        overtime: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        complete: 'border-emerald-200 bg-emerald-50 text-emerald-700',
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
    }>();
    const lastFlashRef = useRef<string | null>(null);
    const [activeTab, setActiveTab] =
        useState<(typeof tabs)[number]['id']>('clock');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
    const range = filters.range;
    const monthCursor = filters.month;
    const internId = selectedInternId ? String(selectedInternId) : '';

    const [manualEntry, setManualEntry] = useState({
        started_at: toLocalDatetimeInput(new Date()),
        ended_at: toLocalDatetimeInput(new Date()),
        break_minutes: '0',
        manual_reason: '',
    });

    const [scheduleForm, setScheduleForm] = useState({
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
    });

    const [absenceForm, setAbsenceForm] = useState({
        start_date: '',
        end_date: '',
        reason: '',
        attachment: null as File | null,
    });

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

        if (successMessage) toast.success(successMessage);
        if (errorMessage) toast.error(errorMessage);
        if (infoMessage) toast.info(infoMessage);
    }, [
        page.props.flash?.success,
        page.props.flash?.error,
        page.props.flash?.info,
    ]);

    const monthLabel = useMemo(() => {
        if (!monthCursor) return '';
        return new Date(`${monthCursor}-01T00:00:00`).toLocaleDateString(
            'es-ES',
            { month: 'long', year: 'numeric' },
        );
    }, [monthCursor]);

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
    ) => {
        setActionLoading(actionKey);
        router.post(url, withIntern(payload) as any, {
            preserveScroll: true,
            forceFormData,
            onFinish: () => setActionLoading(null),
        });
    };

    const shiftMonth = (delta: number) => {
        if (!monthCursor) return;
        const [year, month] = monthCursor.split('-').map(Number);
        const next = new Date(year, month - 1 + delta, 1);
        const value = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
        applyFilters({ month: value });
    };

    const submitManualEntry = (event: FormEvent) => {
        event.preventDefault();
        postAction(
            'manual-entry',
            '/control-horario/manual-entry',
            manualEntry,
        );
    };

    const submitSchedule = (event: FormEvent) => {
        event.preventDefault();
        postAction('schedule', '/control-horario/schedules', scheduleForm);
    };

    const loadSchedule = (schedule: Schedule) => {
        setActiveTab('schedules');
        setScheduleForm({
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
    };

    const resetSchedule = () => {
        setScheduleForm({
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
        });
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Control Horario" />

            <div className={UI_PRESETS.pageContent}>
                <div
                    className={`${UI_PRESETS.pageSection} max-w-[1300px] space-y-4`}
                >
                    <div>
                        <h1 className="text-2xl font-bold">Control Horario</h1>
                        <p className="text-sm text-muted-foreground">
                            Registro de asistencia, horarios de referencia,
                            ausencias y seguimiento de horas.
                        </p>
                    </div>

                    <Card className="border-sidebar-border/70 bg-white/70 py-0 shadow-none dark:bg-slate-900/20">
                        <CardContent className="pt-6">
                        <div className="grid gap-3 md:grid-cols-3">
                            {canManageTeam ? (
                                <div>
                                    <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                        Becario
                                    </p>
                                    <Select
                                        value={internId}
                                        onValueChange={(value) =>
                                            applyFilters({ intern_id: value })
                                        }
                                    >
                                        <SelectTrigger
                                            className={UI_PRESETS.selectTrigger}
                                        >
                                            <SelectValue placeholder="Selecciona becario" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {interns.map((intern) => (
                                                <SelectItem
                                                    key={intern.id}
                                                    value={String(intern.id)}
                                                >
                                                    {intern.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : null}

                            <div>
                                <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Periodo
                                </p>
                                <Select
                                    value={range}
                                    onValueChange={(
                                        value: Props['filters']['range'],
                                    ) => applyFilters({ range: value })}
                                >
                                    <SelectTrigger
                                        className={UI_PRESETS.selectTrigger}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="week">
                                            Semanal
                                        </SelectItem>
                                        <SelectItem value="biweekly">
                                            Quincenal
                                        </SelectItem>
                                        <SelectItem value="month">
                                            Mensual
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Mes de calendario
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => shiftMonth(-1)}
                                    >
                                        Anterior
                                    </Button>
                                    <div className="min-w-44 rounded-md border border-sidebar-border/70 bg-white/70 px-3 py-1.5 text-sm capitalize dark:bg-slate-900/20">
                                        {monthLabel}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => shiftMonth(1)}
                                    >
                                        Siguiente
                                    </Button>
                                </div>
                            </div>
                        </div>
                        </CardContent>
                    </Card>

                    <Card className="border-sidebar-border/70 bg-white/70 py-0 shadow-none dark:bg-slate-900/20">
                        <CardHeader className="rounded-t-xl border-b border-sidebar-border/70 bg-[linear-gradient(140deg,#eaf2ff_0%,#f7fbff_36%,#e9f9f2_100%)] px-4 py-3 dark:bg-[linear-gradient(140deg,#0f1d34_0%,#11233f_48%,#0f2c2b_100%)]">
                            <ToggleGroup
                                type="single"
                                value={activeTab}
                                onValueChange={(value) => {
                                    if (value) {
                                        setActiveTab(
                                            value as (typeof tabs)[number]['id'],
                                        );
                                    }
                                }}
                                className="w-full justify-start gap-1.5 rounded-none bg-transparent p-0"
                            >
                                {tabs.map((tab) => (
                                    <ToggleGroupItem
                                        key={tab.id}
                                        value={tab.id}
                                        variant="outline"
                                        size="sm"
                                        className={cn(
                                            'h-9 rounded-b-none border border-b-0 px-3 data-[state=on]:border-[#2563eb]/45 data-[state=on]:bg-white data-[state=on]:text-[#1d4ed8] dark:data-[state=on]:bg-slate-950 dark:data-[state=on]:text-sky-300',
                                        )}
                                    >
                                        {tab.label}
                                    </ToggleGroupItem>
                                ))}
                            </ToggleGroup>
                        </CardHeader>

                        <CardContent className="space-y-4 pt-4 pb-4">
                            {activeTab === 'clock' ? (
                                <div className="space-y-4">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <section
                                            className={UI_PRESETS.sectionCard}
                                        >
                                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                                <Clock3 className="size-4" />
                                                Estado de fichaje
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Becario:{' '}
                                                <span className="font-medium text-foreground">
                                                    {selectedIntern?.name ??
                                                        'Sin seleccionar'}
                                                </span>
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Entrada activa:{' '}
                                                {clockState.activeEntry
                                                    ? formatDateTime(
                                                          clockState.activeEntry
                                                              .started_at,
                                                      )
                                                    : 'No'}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                Pausa activa:{' '}
                                                {clockState.activeEntry
                                                    ?.is_on_break
                                                    ? 'Si'
                                                    : 'No'}
                                            </p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() =>
                                                        postAction(
                                                            'clock-in',
                                                            '/control-horario/clock-in',
                                                        )
                                                    }
                                                    disabled={
                                                        actionLoading !== null
                                                    }
                                                >
                                                    <Play className="size-4" />
                                                    Entrada
                                                </Button>
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
                                                        actionLoading !== null
                                                    }
                                                >
                                                    <Pause className="size-4" />
                                                    Pausa
                                                </Button>
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
                                                        actionLoading !== null
                                                    }
                                                >
                                                    <Play className="size-4" />
                                                    Reanudar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() =>
                                                        postAction(
                                                            'clock-out',
                                                            '/control-horario/clock-out',
                                                        )
                                                    }
                                                    disabled={
                                                        actionLoading !== null
                                                    }
                                                >
                                                    <Timer className="size-4" />
                                                    Salida
                                                </Button>
                                            </div>
                                        </section>

                                        {clockState.canManualEntry ? (
                                            <section
                                                className={
                                                    UI_PRESETS.sectionCard
                                                }
                                            >
                                                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                                    <UserRoundCheck className="size-4" />
                                                    Registro manual tutor
                                                </h3>
                                                <form
                                                    className="grid gap-2"
                                                    onSubmit={submitManualEntry}
                                                >
                                                    <Input
                                                        type="datetime-local"
                                                        value={
                                                            manualEntry.started_at
                                                        }
                                                        onChange={(event) =>
                                                            setManualEntry(
                                                                (current) => ({
                                                                    ...current,
                                                                    started_at:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        className={
                                                            UI_PRESETS.filterInput
                                                        }
                                                    />
                                                    <Input
                                                        type="datetime-local"
                                                        value={
                                                            manualEntry.ended_at
                                                        }
                                                        onChange={(event) =>
                                                            setManualEntry(
                                                                (current) => ({
                                                                    ...current,
                                                                    ended_at:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        className={
                                                            UI_PRESETS.filterInput
                                                        }
                                                    />
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={
                                                            manualEntry.break_minutes
                                                        }
                                                        onChange={(event) =>
                                                            setManualEntry(
                                                                (current) => ({
                                                                    ...current,
                                                                    break_minutes:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        className={
                                                            UI_PRESETS.filterInput
                                                        }
                                                        placeholder="Minutos de pausa"
                                                    />
                                                    <Input
                                                        value={
                                                            manualEntry.manual_reason
                                                        }
                                                        onChange={(event) =>
                                                            setManualEntry(
                                                                (current) => ({
                                                                    ...current,
                                                                    manual_reason:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        className={
                                                            UI_PRESETS.filterInput
                                                        }
                                                        placeholder="Justificacion del registro manual"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        className="w-fit"
                                                        disabled={
                                                            actionLoading !==
                                                            null
                                                        }
                                                    >
                                                        Guardar registro manual
                                                    </Button>
                                                </form>
                                            </section>
                                        ) : null}
                                    </div>

                                    <section className={UI_PRESETS.sectionCard}>
                                        <h3 className="mb-3 text-sm font-semibold">
                                            Ultimos fichajes
                                        </h3>
                                        <div className={UI_PRESETS.tableContainer}>
                                            <Table>
                                                <TableHeader className={UI_PRESETS.tableHead}>
                                                    <TableRow>
                                                        <TableHead className={UI_PRESETS.tableCell}>
                                                            Inicio
                                                        </TableHead>
                                                        <TableHead className={UI_PRESETS.tableCell}>
                                                            Fin
                                                        </TableHead>
                                                        <TableHead className={UI_PRESETS.tableCell}>
                                                            Horas efectivas
                                                        </TableHead>
                                                        <TableHead className={UI_PRESETS.tableCell}>
                                                            Origen
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {timeEntries.map((entry) => (
                                                        <TableRow
                                                            key={entry.id}
                                                            className="border-t border-sidebar-border/50"
                                                        >
                                                            <TableCell className={UI_PRESETS.tableCell}>
                                                                {formatDateTime(entry.started_at)}
                                                            </TableCell>
                                                            <TableCell className={UI_PRESETS.tableCell}>
                                                                {formatDateTime(entry.ended_at)}
                                                            </TableCell>
                                                            <TableCell className={UI_PRESETS.tableCell}>
                                                                {entry.effective_hours.toFixed(2)} h
                                                            </TableCell>
                                                            <TableCell className={UI_PRESETS.tableCell}>
                                                                {entry.source === 'tutor_manual'
                                                                    ? 'Manual tutor'
                                                                    : 'Fichaje directo'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </section>
                                </div>
                            ) : null}
                            {activeTab === 'schedules' ? (
                                <div className="grid gap-3 lg:grid-cols-2">
                                    <section className={UI_PRESETS.sectionCard}>
                                        <h3 className="mb-3 text-sm font-semibold">
                                            Horario semanal de referencia
                                        </h3>
                                        <form
                                            className="space-y-2"
                                            onSubmit={submitSchedule}
                                        >
                                            <Input
                                                value={scheduleForm.season_name}
                                                onChange={(event) =>
                                                    setScheduleForm(
                                                        (current) => ({
                                                            ...current,
                                                            season_name:
                                                                event.target
                                                                    .value,
                                                        }),
                                                    )
                                                }
                                                className={
                                                    UI_PRESETS.filterInput
                                                }
                                                placeholder="Nombre temporada (ej. Verano 2026)"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <Input
                                                    type="date"
                                                    value={
                                                        scheduleForm.starts_on
                                                    }
                                                    onChange={(event) =>
                                                        setScheduleForm(
                                                            (current) => ({
                                                                ...current,
                                                                starts_on:
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
                                                    value={scheduleForm.ends_on}
                                                    onChange={(event) =>
                                                        setScheduleForm(
                                                            (current) => ({
                                                                ...current,
                                                                ends_on:
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
                                            <div className="grid grid-cols-2 gap-2">
                                                {(
                                                    [
                                                        'monday',
                                                        'tuesday',
                                                        'wednesday',
                                                        'thursday',
                                                        'friday',
                                                        'saturday',
                                                        'sunday',
                                                    ] as const
                                                ).map((day) => (
                                                    <Input
                                                        key={day}
                                                        type="number"
                                                        min={0}
                                                        value={
                                                            scheduleForm[
                                                                `${day}_minutes` as keyof typeof scheduleForm
                                                            ]
                                                        }
                                                        onChange={(event) =>
                                                            setScheduleForm(
                                                                (current) => ({
                                                                    ...current,
                                                                    [`${day}_minutes`]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        className={
                                                            UI_PRESETS.filterInput
                                                        }
                                                        placeholder={`${day} min`}
                                                    />
                                                ))}
                                            </div>
                                            <Input
                                                value={scheduleForm.notes}
                                                onChange={(event) =>
                                                    setScheduleForm(
                                                        (current) => ({
                                                            ...current,
                                                            notes: event.target
                                                                .value,
                                                        }),
                                                    )
                                                }
                                                className={
                                                    UI_PRESETS.filterInput
                                                }
                                                placeholder="Notas opcionales"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    disabled={
                                                        actionLoading !== null
                                                    }
                                                >
                                                    {scheduleForm.schedule_id
                                                        ? 'Actualizar horario'
                                                        : 'Crear horario'}
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={resetSchedule}
                                                >
                                                    Limpiar
                                                </Button>
                                            </div>
                                        </form>
                                    </section>

                                    <section className={UI_PRESETS.sectionCard}>
                                        <h3 className="mb-3 text-sm font-semibold">
                                            Horarios existentes
                                        </h3>
                                        <div className="space-y-2">
                                            {schedules.map((schedule) => (
                                                <div
                                                    key={schedule.id}
                                                    className="rounded-lg border border-sidebar-border/70 bg-white/70 p-3 dark:bg-slate-900/20"
                                                >
                                                    <p className="font-medium">
                                                        {schedule.season_name ||
                                                            'Horario sin nombre'}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatDate(
                                                            schedule.starts_on,
                                                        )}{' '}
                                                        -{' '}
                                                        {formatDate(
                                                            schedule.ends_on,
                                                        )}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {schedule.weekly_total_hours.toFixed(
                                                            2,
                                                        )}{' '}
                                                        h / semana
                                                    </p>
                                                    <div className="mt-2 flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                loadSchedule(
                                                                    schedule,
                                                                )
                                                            }
                                                        >
                                                            Editar
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() =>
                                                                router.delete(
                                                                    `/control-horario/schedules/${schedule.id}`,
                                                                    {
                                                                        preserveScroll: true,
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            Eliminar
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            ) : null}

                            {activeTab === 'calendar' ? (
                                <div className="space-y-4">
                                    <section className={UI_PRESETS.sectionCard}>
                                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                            <CalendarDays className="size-4" />
                                            Vista semanal
                                        </h3>
                                        <div className="grid gap-2 md:grid-cols-7">
                                            {calendar.weekDays.map((day) => (
                                                <div
                                                    key={day.date}
                                                    className={cn(
                                                        'rounded-md border p-2 text-xs',
                                                        dayStatusClasses(
                                                            day.status,
                                                        ),
                                                    )}
                                                >
                                                    <p className="font-semibold">
                                                        {day.weekday}{' '}
                                                        {day.label}
                                                    </p>
                                                    <p>
                                                        Plan:{' '}
                                                        {day.planned_hours.toFixed(
                                                            2,
                                                        )}
                                                        h
                                                    </p>
                                                    <p>
                                                        Real:{' '}
                                                        {day.worked_hours.toFixed(
                                                            2,
                                                        )}
                                                        h
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <section className={UI_PRESETS.sectionCard}>
                                        <h3 className="mb-3 text-sm font-semibold">
                                            Vista mensual
                                        </h3>
                                        <div className="grid gap-2 md:grid-cols-7">
                                            {calendar.monthDays.map((day) => (
                                                <div
                                                    key={day.date}
                                                    className={cn(
                                                        'rounded-md border p-2 text-xs',
                                                        dayStatusClasses(
                                                            day.status,
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
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            ) : null}

                            {activeTab === 'absence' ? (
                                <div className="grid gap-3 lg:grid-cols-2">
                                    <section className={UI_PRESETS.sectionCard}>
                                        <h3 className="mb-3 text-sm font-semibold">
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
                                        <h3 className="mb-3 text-sm font-semibold">
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
                                            <h3 className="mb-3 text-sm font-semibold">
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
                                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                Horas efectivas (
                                                {summary.range.label})
                                            </p>
                                            <p className="text-xl font-semibold">
                                                {summary.range.worked_hours.toFixed(
                                                    2,
                                                )}
                                                h
                                            </p>
                                        </div>
                                        <div className={UI_PRESETS.sectionCard}>
                                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                Horas planificadas
                                            </p>
                                            <p className="text-xl font-semibold">
                                                {summary.range.planned_hours.toFixed(
                                                    2,
                                                )}
                                                h
                                            </p>
                                        </div>
                                        <div className={UI_PRESETS.sectionCard}>
                                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                Cumplimiento
                                            </p>
                                            <p className="text-xl font-semibold">
                                                {summary.range.compliance_percent.toFixed(
                                                    1,
                                                )}
                                                %
                                            </p>
                                        </div>
                                        <div className={UI_PRESETS.sectionCard}>
                                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                                Avance total
                                            </p>
                                            <p className="text-xl font-semibold">
                                                {summary.progress.progress_percent.toFixed(
                                                    1,
                                                )}
                                                %
                                            </p>
                                        </div>
                                    </section>

                                    <section className={UI_PRESETS.sectionCard}>
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <h3 className="flex items-center gap-2 text-sm font-semibold">
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
                        </CardContent>
                    </Card>

                    <section className="grid gap-3 md:grid-cols-3">
                        <div className={UI_PRESETS.sectionCard}>
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Becario
                            </p>
                            <p className="font-semibold">
                                {selectedIntern?.name ?? 'Sin datos'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {selectedIntern?.email ?? '-'}
                            </p>
                        </div>
                        <div className={UI_PRESETS.sectionCard}>
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Requeridas
                            </p>
                            <p className="font-semibold">
                                {summary.progress.required_hours}h
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Total acumulado:{' '}
                                {summary.progress.total_worked_hours.toFixed(2)}
                                h
                            </p>
                        </div>
                        <div className={UI_PRESETS.sectionCard}>
                            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Estado actual
                            </p>
                            {clockState.activeEntry ? (
                                <p className="flex items-center gap-1 font-semibold text-emerald-700">
                                    <CheckCircle2 className="size-4" />
                                    Fichaje activo
                                </p>
                            ) : (
                                <p className="font-semibold text-muted-foreground">
                                    Sin fichaje activo
                                </p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
