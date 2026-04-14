export type RoleRow = {
    id: number;
    name: string;
};

export type RolePermissionsMap = Record<string, string[]>;

export type UserRow = {
    id: number;
    name: string;
    email: string;
    role: string | null;
    roles: string[];
    created_at: string | null;
};

export type InvitationRow = {
    id: number;
    email: string;
    role: string;
    expires_at: string | null;
    accepted_at: string | null;
    invited_by_name: string;
    created_at: string | null;
};

export type InvitationStatus = 'pending' | 'accepted' | 'expired';

export type UsersPageProps = {
    users: UserRow[];
    roles: RoleRow[];
    availableRoles: string[];
    permissions: string[];
    rolePermissions: RolePermissionsMap;
    invitations: InvitationRow[];
};