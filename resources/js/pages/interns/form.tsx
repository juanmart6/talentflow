import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import interns from '@/routes/interns';
import type { BreadcrumbItem } from '@/types';

type EducationCenterOption = {
    id: number;
    name: string;
};

type InternFormData = {
    id?: number;
    education_center_id?: number | null;
    first_name?: string;
    last_name?: string;
    dni_nie?: string;
    email?: string;
    phone?: string;
    address_line?: string;
    postal_code?: string;
    city?: string;
    province?: string;
    country?: string;
    training_cycle?: string;
    academic_year?: string;
    academic_tutor_name?: string;
    academic_tutor_email?: string | null;
    internship_start_date?: string | null;
    internship_end_date?: string | null;
    required_hours?: number | null;
    status?: 'active' | 'finished' | 'abandoned';
    abandonment_reason?: string | null;
};

type Props = {
    mode: 'create' | 'edit';
    intern: InternFormData | null;
    educationCenters: EducationCenterOption[];
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Gestion de Becarios',
        href: interns.index().url,
    },
];

function toDateInput(value?: string | null): string {
    if (!value) {
        return '';
    }

    return value.slice(0, 10);
}

export default function InternFormPage({ mode, intern, educationCenters }: Props) {
    const isCreate = mode === 'create';

    const { data, setData, post, put, processing, errors } = useForm({
        education_center_id: intern?.education_center_id ? String(intern.education_center_id) : '',
        first_name: intern?.first_name ?? '',
        last_name: intern?.last_name ?? '',
        dni_nie: intern?.dni_nie ?? '',
        email: intern?.email ?? '',
        phone: intern?.phone ?? '',
        address_line: intern?.address_line ?? '',
        postal_code: intern?.postal_code ?? '',
        city: intern?.city ?? '',
        province: intern?.province ?? '',
        country: intern?.country ?? 'Espana',
        training_cycle: intern?.training_cycle ?? '',
        academic_year: intern?.academic_year ?? '',
        academic_tutor_name: intern?.academic_tutor_name ?? '',
        academic_tutor_email: intern?.academic_tutor_email ?? '',
        internship_start_date: toDateInput(intern?.internship_start_date),
        internship_end_date: toDateInput(intern?.internship_end_date),
        required_hours: intern?.required_hours ?? 0,
        status: intern?.status ?? 'active',
        abandonment_reason: intern?.abandonment_reason ?? '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isCreate) {
            post(interns.store().url, { preserveScroll: true });
            return;
        }

        put(interns.update(intern?.id ?? 0).url, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isCreate ? 'Nuevo Becario' : 'Editar Becario'} />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">Modo</p>
                        <p className="mt-2 text-2xl font-semibold">{isCreate ? 'Alta' : 'Edicion'}</p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">Estado actual</p>
                        <p className="mt-2 text-2xl font-semibold">{data.status}</p>
                    </div>
                    <div className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <p className="text-sm text-muted-foreground">Campos obligatorios</p>
                        <p className="mt-2 text-2xl font-semibold">16</p>
                    </div>
                </div>

                <div className="relative min-h-[100vh] flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 md:min-h-min dark:border-sidebar-border">
                    <div className="flex flex-col gap-4 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 className="text-2xl font-bold">{isCreate ? 'Nuevo Becario' : 'Editar Becario'}</h1>
                                <p className="text-sm text-muted-foreground">
                                    Completa datos personales, academicos y periodo de practicas.
                                </p>
                            </div>

                            <Button variant="secondary" asChild>
                                <Link href={interns.index().url}>Volver al listado</Link>
                            </Button>
                        </div>

                        <form onSubmit={submit} className="space-y-6">
                            <section className="space-y-4 rounded-lg border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                                <h2 className="text-lg font-semibold">Datos personales</h2>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="first_name">Nombre</Label>
                                        <Input id="first_name" value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} required />
                                        <InputError message={errors.first_name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="last_name">Apellidos</Label>
                                        <Input id="last_name" value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} required />
                                        <InputError message={errors.last_name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="dni_nie">DNI/NIE</Label>
                                        <Input id="dni_nie" value={data.dni_nie} onChange={(e) => setData('dni_nie', e.target.value)} required />
                                        <InputError message={errors.dni_nie} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} required />
                                        <InputError message={errors.email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="phone">Telefono</Label>
                                        <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} required />
                                        <InputError message={errors.phone} />
                                    </div>

                                    <div className="grid gap-2 md:col-span-2">
                                        <Label htmlFor="address_line">Direccion</Label>
                                        <Input id="address_line" value={data.address_line} onChange={(e) => setData('address_line', e.target.value)} required />
                                        <InputError message={errors.address_line} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="postal_code">Codigo postal</Label>
                                        <Input id="postal_code" value={data.postal_code} onChange={(e) => setData('postal_code', e.target.value)} required />
                                        <InputError message={errors.postal_code} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="city">Ciudad</Label>
                                        <Input id="city" value={data.city} onChange={(e) => setData('city', e.target.value)} required />
                                        <InputError message={errors.city} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="province">Provincia</Label>
                                        <Input id="province" value={data.province} onChange={(e) => setData('province', e.target.value)} required />
                                        <InputError message={errors.province} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="country">Pais</Label>
                                        <Input id="country" value={data.country} onChange={(e) => setData('country', e.target.value)} required />
                                        <InputError message={errors.country} />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4 rounded-lg border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                                <h2 className="text-lg font-semibold">Datos academicos y practicas</h2>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="grid gap-2 md:col-span-2">
                                        <Label htmlFor="education_center_id">Centro educativo</Label>
                                        <select
                                            id="education_center_id"
                                            value={data.education_center_id}
                                            onChange={(e) => setData('education_center_id', e.target.value)}
                                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            required
                                        >
                                            <option value="">Selecciona un centro</option>
                                            {educationCenters.map((center) => (
                                                <option key={center.id} value={String(center.id)}>
                                                    {center.name}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.education_center_id} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="training_cycle">Ciclo formativo</Label>
                                        <Input id="training_cycle" value={data.training_cycle} onChange={(e) => setData('training_cycle', e.target.value)} required />
                                        <InputError message={errors.training_cycle} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="academic_year">Ano academico</Label>
                                        <Input id="academic_year" value={data.academic_year} onChange={(e) => setData('academic_year', e.target.value)} required />
                                        <InputError message={errors.academic_year} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="academic_tutor_name">Tutor academico</Label>
                                        <Input id="academic_tutor_name" value={data.academic_tutor_name} onChange={(e) => setData('academic_tutor_name', e.target.value)} required />
                                        <InputError message={errors.academic_tutor_name} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="academic_tutor_email">Email tutor (opcional)</Label>
                                        <Input
                                            id="academic_tutor_email"
                                            type="email"
                                            value={data.academic_tutor_email}
                                            onChange={(e) => setData('academic_tutor_email', e.target.value)}
                                        />
                                        <InputError message={errors.academic_tutor_email} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="internship_start_date">Fecha inicio</Label>
                                        <Input
                                            id="internship_start_date"
                                            type="date"
                                            value={data.internship_start_date}
                                            onChange={(e) => setData('internship_start_date', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.internship_start_date} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="internship_end_date">Fecha fin</Label>
                                        <Input
                                            id="internship_end_date"
                                            type="date"
                                            value={data.internship_end_date}
                                            onChange={(e) => setData('internship_end_date', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.internship_end_date} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="required_hours">Horas requeridas</Label>
                                        <Input
                                            id="required_hours"
                                            type="number"
                                            min={1}
                                            value={data.required_hours}
                                            onChange={(e) => setData('required_hours', Number(e.target.value))}
                                            required
                                        />
                                        <InputError message={errors.required_hours} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="status">Estado</Label>
                                        <select
                                            id="status"
                                            value={data.status}
                                            onChange={(e) => setData('status', e.target.value as 'active' | 'finished' | 'abandoned')}
                                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            required
                                        >
                                            <option value="active">Activo</option>
                                            <option value="finished">Finalizado</option>
                                            <option value="abandoned">Abandonado</option>
                                        </select>
                                        <InputError message={errors.status} />
                                    </div>

                                    <div className="grid gap-2 md:col-span-2">
                                        <Label htmlFor="abandonment_reason">Motivo abandono (opcional)</Label>
                                        <Input
                                            id="abandonment_reason"
                                            value={data.abandonment_reason}
                                            onChange={(e) => setData('abandonment_reason', e.target.value)}
                                        />
                                        <InputError message={errors.abandonment_reason} />
                                    </div>
                                </div>
                            </section>

                            <div className="flex gap-2 border-t border-sidebar-border/70 pt-2 dark:border-sidebar-border">
                                <Button disabled={processing}>{processing ? 'Guardando...' : 'Guardar'}</Button>
                                <Button type="button" variant="secondary" asChild>
                                    <Link href={interns.index().url}>Cancelar</Link>
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
