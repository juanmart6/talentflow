import type { CenterStatus } from '@/lib/education-centers/center-status';
import type { Paginated } from '@/types/pagination';

export type Agreement = {
    signed_at: string | null;
    expires_at: string | null;
    agreed_slots: number | null;
    pdf_path: string | null;
};

export type CenterRow = {
    id: number;
    name: string;
    address: string;
    phone: string;
    institutional_email: string;
    contact_name: string;
    contact_position: string;
    collaboration_agreements_count: number;
    latest_agreement: Agreement | null;
    status: CenterStatus;
};

export type CentersPagination = Paginated<CenterRow>;

export type CenterFilters = {
    search: string;
    agreement_status: string;
};

