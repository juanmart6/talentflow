import { Head } from '@inertiajs/react';
import { CalendarDays, CirclePlus, FilterX, MessageSquare, Paperclip, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UI_PRESETS } from '@/lib/ui-presets';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type InternOption = {
    id: string;
    name: string;
};

type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed';

type TaskCard = {
    id: string;
    title: string;
    description: string;
    practiceType: PracticeType;
    status: TaskStatus;
    internIds: string[];
    internNames: string[];
    dueAt: string;
};

type Props = {
    viewMode: 'tutor' | 'intern';
    interns: InternOption[];
};

type CommentAuthor = 'tutor' | 'intern';

type TaskComment = {
    id: string;
    author: CommentAuthor;
    message: string;
    at: string;
};

type TaskAttachment = {
    id: string;
    author: CommentAuthor;
    name: string;
};

type PracticeType = 'development' | 'test' | 'live_activity';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Prácticas y tareas',
        href: '/practice-tasks',
    },
];

const STATUS_COLUMNS: Array<{ status: TaskStatus; label: string; className: string }> = [
    { status: 'pending', label: 'Pendiente', className: 'border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/30' },
    { status: 'in_progress', label: 'En progreso', className: 'border-sky-200 bg-sky-50/40 dark:border-sky-900/70 dark:bg-sky-950/15' },
    { status: 'in_review', label: 'En revisión', className: 'border-amber-200 bg-amber-50/40 dark:border-amber-900/70 dark:bg-amber-950/15' },
    { status: 'completed', label: 'Completada', className: 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/70 dark:bg-emerald-950/15' },
];

const MOCK_TASKS: TaskCard[] = [
    {
        id: '1',
        title: 'Actualizar manual de bienvenida',
        description: 'Revisar estructura y añadir capturas de pantalla.',
        practiceType: 'development',
        status: 'pending',
        internIds: ['1'],
        internNames: ['María López'],
        dueAt: '05/04/2026',
    },
    {
        id: '2',
        title: 'Panel de centros educativos',
        description: 'Maquetar tabla responsive con filtros principales.',
        practiceType: 'live_activity',
        status: 'in_progress',
        internIds: ['2'],
        internNames: ['Javier Sánchez'],
        dueAt: '02/04/2026',
    },
    {
        id: '3',
        title: 'Pruebas del flujo de alta',
        description: 'Documentar casos de validación y errores esperados.',
        practiceType: 'test',
        status: 'in_review',
        internIds: ['1', '3'],
        internNames: ['María López', 'Lucía Martín'],
        dueAt: '31/03/2026',
    },
    {
        id: '4',
        title: 'Carga inicial de becarios',
        description: 'Validar seeders y consistencia de datos base.',
        practiceType: 'development',
        status: 'completed',
        internIds: ['3'],
        internNames: ['Lucía Martín'],
        dueAt: '28/03/2026',
    },
];

const PRACTICE_TYPE_OPTIONS: Array<{ value: PracticeType; label: string }> = [
    { value: 'development', label: 'Tarea de Desarrollo' },
    { value: 'test', label: 'Test' },
    { value: 'live_activity', label: 'Actividad en vivo' },
];

function parseDueDate(value: string): string | null {
    const [day, month, year] = value.split('/');

    if (!day || !month || !year) {
        return null;
    }

    return `${year}-${month}-${day}`;
}

export default function PracticeTasksPage({ viewMode, interns }: Props) {
    const [search, setSearch] = useState('');
    const [internFilter, setInternFilter] = useState('all');
    const [practiceTypeFilter, setPracticeTypeFilter] = useState<'all' | PracticeType>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const hasActiveFilters =
        search.trim() !== '' || internFilter !== 'all' || practiceTypeFilter !== 'all' || dateFrom !== '' || dateTo !== '';
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [practiceType, setPracticeType] = useState<PracticeType>('development');
    const [dueDate, setDueDate] = useState('');
    const [selectedInternIds, setSelectedInternIds] = useState<string[]>([]);
    const [comments, setComments] = useState<TaskComment[]>([
        { id: 'c-1', author: 'tutor', message: 'Incluye checklist de pruebas y capturas.', at: 'Hoy · 09:10' },
        { id: 'c-2', author: 'intern', message: 'Perfecto, esta tarde subo el primer avance.', at: 'Hoy · 09:24' },
    ]);
    const [newCommentAuthor, setNewCommentAuthor] = useState<CommentAuthor>('tutor');
    const [newCommentMessage, setNewCommentMessage] = useState('');
    const [attachments, setAttachments] = useState<TaskAttachment[]>([]);

    const filteredTasks = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const isInvalidDateRange = dateFrom !== '' && dateTo !== '' && dateFrom > dateTo;

        return MOCK_TASKS.filter((task) => {
            const matchesSearch =
                normalizedSearch === '' ||
                task.title.toLowerCase().includes(normalizedSearch) ||
                task.description.toLowerCase().includes(normalizedSearch);

            const matchesIntern = viewMode !== 'tutor' || internFilter === 'all' || task.internIds.includes(internFilter);
            const matchesPracticeType = practiceTypeFilter === 'all' || task.practiceType === practiceTypeFilter;
            const taskDueDate = parseDueDate(task.dueAt);
            const matchesDateFrom = isInvalidDateRange || dateFrom === '' || (taskDueDate !== null && taskDueDate >= dateFrom);
            const matchesDateTo = isInvalidDateRange || dateTo === '' || (taskDueDate !== null && taskDueDate <= dateTo);

            return matchesSearch && matchesIntern && matchesPracticeType && matchesDateFrom && matchesDateTo;
        });
    }, [search, internFilter, practiceTypeFilter, dateFrom, dateTo, viewMode]);
    const hasInvalidDateRange = dateFrom !== '' && dateTo !== '' && dateFrom > dateTo;

    const handleClearFilters = () => {
        setSearch('');
        setInternFilter('all');
        setPracticeTypeFilter('all');
        setDateFrom('');
        setDateTo('');
    };

    const handleTutorFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const incoming = Array.from(files).map((file, index) => ({
            id: `a-t-${Date.now()}-${index}`,
            author: 'tutor' as const,
            name: file.name,
        }));

        setAttachments((prev) => [...prev, ...incoming]);
    };

    const handleInternFiles = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const incoming = Array.from(files).map((file, index) => ({
            id: `a-i-${Date.now()}-${index}`,
            author: 'intern' as const,
            name: file.name,
        }));

        setAttachments((prev) => [...prev, ...incoming]);
    };

    const handleAddComment = () => {
        const message = newCommentMessage.trim();
        if (message === '') return;

        const now = new Date();
        const at = `${now.toLocaleDateString('es-ES')} · ${now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

        setComments((prev) => [
            ...prev,
            {
                id: `c-${Date.now()}`,
                author: newCommentAuthor,
                message,
                at,
            },
        ]);

        setNewCommentMessage('');
    };

    const handleResetCreateForm = () => {
        setTaskTitle('');
        setTaskDescription('');
        setPracticeType('development');
        setDueDate('');
        setSelectedInternIds([]);
        setNewCommentAuthor('tutor');
        setNewCommentMessage('');
        setComments([
            { id: 'c-1', author: 'tutor', message: 'Incluye checklist de pruebas y capturas.', at: 'Hoy · 09:10' },
            { id: 'c-2', author: 'intern', message: 'Perfecto, esta tarde subo el primer avance.', at: 'Hoy · 09:24' },
        ]);
        setAttachments([]);
    };

    const handleCloseCreateDialog = () => {
        setIsCreateTaskOpen(false);
        handleResetCreateForm();
    };

    const toggleInternSelection = (internId: string, checked: boolean) => {
        setSelectedInternIds((prev) =>
            checked ? Array.from(new Set([...prev, internId])) : prev.filter((id) => id !== internId),
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Prácticas y tareas" />

            <div className={UI_PRESETS.pageContent}>
                <div className="flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Prácticas y tareas</h1>
                        <p className="text-sm text-muted-foreground">
                            Gestiona tareas y su seguimiento operativo.
                        </p>
                    </div>
                </div>

                <div className={UI_PRESETS.pageSection}>
                    <form className={`${UI_PRESETS.filterBar} mb-2`} onSubmit={(event) => event.preventDefault()}>
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                <div className="relative min-w-0 flex-1">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(event) => setSearch(event.target.value)}
                                        placeholder="Buscar tareas por título o descripción"
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 pl-9 text-sm`}
                                    />
                                </div>

                                <div className="flex items-center gap-2 lg:ml-auto lg:shrink-0">
                                     <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className={UI_PRESETS.iconActionButton}
                                        onClick={handleClearFilters}
                                        disabled={!hasActiveFilters}
                                        title="Eliminar filtros"
                                        aria-label="Eliminar filtros"
                                    >
                                        <FilterX />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className={UI_PRESETS.iconActionButtonPrimary}
                                        onClick={() => setIsCreateTaskOpen(true)}
                                        title="Nueva tarea"
                                        aria-label="Nueva tarea"
                                    >
                                        <CirclePlus />
                                    </Button>
                                </div>
                            </div>

                            <div className={`grid gap-2 ${viewMode === 'tutor' ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2 xl:grid-cols-3'}`}>
                                {viewMode === 'tutor' ? (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-medium text-muted-foreground">Becario</span>
                                        <Select value={internFilter} onValueChange={setInternFilter}>
                                            <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                                <SelectValue placeholder="Becario" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem className={UI_PRESETS.selectItem} value="all">
                                                    Todos los becarios
                                                </SelectItem>
                                                {interns.map((intern) => (
                                                    <SelectItem className={UI_PRESETS.selectItem} key={intern.id} value={intern.id}>
                                                        {intern.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : null}

                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Tipo de práctica</span>
                                    <Select value={practiceTypeFilter} onValueChange={(value) => setPracticeTypeFilter(value as 'all' | PracticeType)}>
                                        <SelectTrigger className={`${UI_PRESETS.selectTrigger} w-full`}>
                                            <SelectValue placeholder="Tipo de práctica" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem className={UI_PRESETS.selectItem} value="all">
                                                Todos los tipos
                                            </SelectItem>
                                            {PRACTICE_TYPE_OPTIONS.map((option) => (
                                                <SelectItem className={UI_PRESETS.selectItem} key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Desde</span>
                                    <Input
                                        type="date"
                                        value={dateFrom}
                                        onChange={(event) => setDateFrom(event.target.value)}
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-medium text-muted-foreground">Hasta</span>
                                    <Input
                                        type="date"
                                        value={dateTo}
                                        onChange={(event) => setDateTo(event.target.value)}
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                    {hasInvalidDateRange ? (
                        <p className="mb-2 text-sm font-medium text-destructive">
                            La fecha "Desde" no puede ser posterior a la fecha "Hasta".
                        </p>
                    ) : null}

                    <div className={UI_PRESETS.sectionCard}>
                        <div className="overflow-x-auto pb-1">
                            <div className="flex min-w-max items-start gap-4">
                                {STATUS_COLUMNS.map((column) => {
                                    const tasksInColumn = filteredTasks.filter((task) => task.status === column.status);

                                    return (
                                        <section key={column.status} className={`w-[300px] min-w-[300px] flex-1 rounded-2xl border p-3 ${column.className}`}>
                                            <div className="mb-3 flex items-center justify-between border-b border-slate-200/70 pb-2 dark:border-slate-700/70">
                                                <h2 className="text-sm font-semibold">{column.label}</h2>
                                                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
                                                    {tasksInColumn.length}
                                                </span>
                                            </div>

                                            <div className="space-y-2.5">
                                                <div className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-muted-foreground dark:border-slate-700">
                                                    Sin tareas en esta columna.
                                                </div>
                                            </div>
                                        </section>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Dialog open={isCreateTaskOpen} onOpenChange={(open) => (open ? setIsCreateTaskOpen(true) : handleCloseCreateDialog())}>
                <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Nueva tarea</DialogTitle>
                        <DialogDescription>
                            Crea la tarea y registra comunicación/archivos entre tutor y becario.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <section className="rounded-xl border border-sidebar-border/70 bg-white/70 p-4 dark:border-sidebar-border dark:bg-slate-900/20">
                            <div className="mb-3 flex items-center gap-2">
                                <CalendarDays className="size-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">Datos de la tarea</h3>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2 md:col-span-2">
                                    <label htmlFor="task-title" className="text-xs font-medium text-muted-foreground">
                                        Tarea
                                    </label>
                                    <Input
                                        id="task-title"
                                        value={taskTitle}
                                        onChange={(event) => setTaskTitle(event.target.value)}
                                        placeholder="Ej. Actualizar onboarding de becarios"
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                                    />
                                </div>

                                <div className="grid gap-2 md:col-span-2">
                                    <label htmlFor="task-description" className="text-xs font-medium text-muted-foreground">
                                        Descripción de la tarea
                                    </label>
                                    <textarea
                                        id="task-description"
                                        value={taskDescription}
                                        onChange={(event) => setTaskDescription(event.target.value)}
                                        placeholder="Describe alcance, criterios de aceptación y dependencias."
                                        className="min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-xs outline-none transition focus:border-slate-400 dark:border-slate-600 dark:bg-slate-950"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="task-practice-type" className="text-xs font-medium text-muted-foreground">
                                        Tipo de práctica
                                    </label>
                                    <Select value={practiceType} onValueChange={(value) => setPracticeType(value as PracticeType)}>
                                        <SelectTrigger id="task-practice-type" className={UI_PRESETS.selectTrigger}>
                                            <SelectValue placeholder="Selecciona tipo de práctica" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRACTICE_TYPE_OPTIONS.map((option) => (
                                                <SelectItem key={option.value} value={option.value} className={UI_PRESETS.selectItem}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <label htmlFor="task-due-date" className="text-xs font-medium text-muted-foreground">
                                        Fecha de entrega
                                    </label>
                                    <Input
                                        id="task-due-date"
                                        type="date"
                                        value={dueDate}
                                        onChange={(event) => setDueDate(event.target.value)}
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                                    />
                                </div>

                                <div className="grid gap-2 md:col-span-2">
                                    <p className="text-xs font-medium text-muted-foreground">
                                        Becario(s) asignado(s)
                                    </p>
                                    <div className="grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50 md:grid-cols-2">
                                        {interns.length > 0 ? (
                                            interns.map((intern) => {
                                                const checked = selectedInternIds.includes(intern.id);

                                                return (
                                                    <label
                                                        key={intern.id}
                                                        htmlFor={`create-task-intern-${intern.id}`}
                                                        className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                                                    >
                                                        <Checkbox
                                                            id={`create-task-intern-${intern.id}`}
                                                            checked={checked}
                                                            onCheckedChange={(value) => toggleInternSelection(intern.id, value === true)}
                                                        />
                                                        <span>{intern.name}</span>
                                                    </label>
                                                );
                                            })
                                        ) : (
                                            <p className="text-xs text-muted-foreground">
                                                No hay becarios disponibles para asignar.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-xl border border-sidebar-border/70 bg-white/70 p-4 dark:border-sidebar-border dark:bg-slate-900/20">
                            <div className="mb-3 flex items-center gap-2">
                                <MessageSquare className="size-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">Comentarios</h3>
                            </div>

                            <div className="mb-4 max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                {comments.map((comment) => {
                                    const isTutor = comment.author === 'tutor';

                                    return (
                                        <article
                                            key={comment.id}
                                            className={`rounded-lg border p-2.5 text-sm ${isTutor ? 'border-sky-200 bg-sky-50/70 dark:border-sky-900/70 dark:bg-sky-950/20' : 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20'}`}
                                        >
                                            <div className="mb-1 flex items-center justify-between">
                                                <span className="text-xs font-semibold uppercase tracking-wide">
                                                    {isTutor ? 'Tutor' : 'Becario'}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">{comment.at}</span>
                                            </div>
                                            <p className="text-sm">{comment.message}</p>
                                        </article>
                                    );
                                })}
                            </div>

                            <div className="grid gap-2 md:grid-cols-[180px_minmax(0,1fr)_auto]">
                                <Select value={newCommentAuthor} onValueChange={(value) => setNewCommentAuthor(value as CommentAuthor)}>
                                    <SelectTrigger className={UI_PRESETS.selectTrigger}>
                                        <SelectValue placeholder="Autor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem className={UI_PRESETS.selectItem} value="tutor">
                                            Tutor
                                        </SelectItem>
                                        <SelectItem className={UI_PRESETS.selectItem} value="intern">
                                            Becario
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                <Input
                                    value={newCommentMessage}
                                    onChange={(event) => setNewCommentMessage(event.target.value)}
                                    placeholder="Escribe un comentario..."
                                    className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                                />

                                <Button type="button" variant="outline" onClick={handleAddComment}>
                                    Añadir
                                </Button>
                            </div>
                        </section>

                        <section className="rounded-xl border border-sidebar-border/70 bg-white/70 p-4 dark:border-sidebar-border dark:bg-slate-900/20">
                            <div className="mb-3 flex items-center gap-2">
                                <Paperclip className="size-4 text-muted-foreground" />
                                <h3 className="text-sm font-semibold">Archivos adjuntos</h3>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Adjuntos del tutor
                                    </p>
                                    <Input
                                        type="file"
                                        multiple
                                        onChange={(event) => {
                                            handleTutorFiles(event.target.files);
                                            event.currentTarget.value = '';
                                        }}
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                                    />
                                </div>

                                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/50">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Adjuntos del becario
                                    </p>
                                    <Input
                                        type="file"
                                        multiple
                                        onChange={(event) => {
                                            handleInternFiles(event.target.files);
                                            event.currentTarget.value = '';
                                        }}
                                        className={`${UI_PRESETS.simpleSearchInput} h-9 text-sm`}
                                    />
                                </div>
                            </div>

                            <div className="mt-4 max-h-40 space-y-2 overflow-y-auto rounded-xl border border-dashed border-slate-300 p-3 dark:border-slate-700">
                                {attachments.length > 0 ? (
                                    attachments.map((attachment) => (
                                        <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950">
                                            <span className="truncate">{attachment.name}</span>
                                            <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                {attachment.author === 'tutor' ? 'Tutor' : 'Becario'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Todavía no hay archivos adjuntos.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={handleCloseCreateDialog}>
                            Cancelar
                        </Button>
                        <Button type="button">
                            Crear tarea
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
