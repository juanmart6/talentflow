import type { InternOption } from '@/types';

export type TaskStatus = 'pending' | 'in_progress' | 'in_review' | 'completed';

export type TaskCard = {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    assignmentMode: 'interns' | 'training_program';
    trainingProgramId: string | null;
    trainingProgramName: string | null;
    internIds: string[];
    internNames: string[];
    dueAt: string;
    latestStatusChangedAt: string | null;
    latestStatusChangedBy: string;
};

export type DueStateFilter = 'all' | 'overdue' | 'next_7_days' | 'over_7_days';

export type TrainingProgramOption = {
    id: string;
    name: string;
};

export type PracticeTasksViewMode = 'tutor' | 'intern';

export type PracticeTasksProps = {
    viewMode: PracticeTasksViewMode;
    interns: InternOption[];
    trainingPrograms: TrainingProgramOption[];
    tasks: TaskCard[];
};