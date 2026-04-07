import type { Paginated } from '@/types/pagination';

export type InternOption = {
    id: string;
    name: string;
    trainingProgramId?: string | null;
    trainingProgramName?: string | null;
};

export type InternRow = {
    id: number;
    first_name: string;
    last_name: string;
    dni_nie: string;
    email: string;
    phone: string;
    status: 'active' | 'upcoming_active' | 'finished' | 'abandoned';
    internship_start_date: string | null;
    internship_end_date: string | null;
    required_hours: number;
    education_center: {
        id: number;
        name: string;
    } | null;
    training_program: {
        id: number;
        name: string;
    } | null;
};

export type InternsPagination = Paginated<InternRow>;

export type EducationCenterOption = {
    id: number;
    name: string;
};

export type TrainingProgramOption = {
    id: number;
    name: string;
};

export type InternFilters = {
    search: string;
    status: string;
    education_center_id: number | null;
    training_program_id: number | null;
    start_date_from: string;
    start_date_to: string;
    end_date_from: string;
    end_date_to: string;
};

export type InternStatusCounts = {
    upcoming_active: number;
    active: number;
    finished: number;
    abandoned: number;
};