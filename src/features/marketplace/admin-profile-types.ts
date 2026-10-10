export interface AdminStaffProfile {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  avatarUploadEnabled: boolean;
  roles: string[];
  permissions: string[];
  staff: {
    id: string;
    publicName: string;
    avatarUrl: string | null;
    bio: string | null;
    isActive: boolean;
    isPublic: boolean;
  };
}
