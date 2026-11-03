export interface AuthUser {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  sessionId: string;
  roles: string[];
  permissions: string[];
}
export interface AuthResponse { accessToken: string; user: AuthUser }

export interface Service {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string;
  isPublished: boolean;
}
export interface Variant {
  id: string;
  serviceId: string;
  name: string;
  durationMinutes: number;
  priceVnd: string;
  isActive: boolean;
}
export interface ServiceItem {
  service: Service;
  variants: Variant[];
  imageUrl?: string;
  isDemo?: boolean;
}
export interface EligibleProviderService {
  serviceId: string;
  serviceName: string;
  branchId: string;
  mode: 'ON_SITE' | 'AT_HOME';
}
export interface Provider {
  id: string;
  publicName: string;
  avatarUrl: string | null;
  introduction: string | null;
  serviceArea: string | null;
  title?: string;
  slug?: string;
  isDemo?: boolean;
  bookable?: boolean;
  eligibleServices?: EligibleProviderService[];
}
export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  isActive: boolean;
}
export interface ChatThread {
  id: string;
  customer_user_id: string;
  provider_user_id: string;
  provider_application_id: string;
  provider_name?: string;
  customer_name?: string;
  updated_at: string;
  last_message?: string | null;
  unread_count?: number;
  privacy_locked?: boolean;
  is_locked?: boolean;
  privacy_enabled?: boolean;
  history_locked?: boolean;
  can_send?: boolean;
  blocked_by_me?: boolean;
  blocked_by_other?: boolean;
}
export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  image_url?: string | null;
  created_at: string;
  client_message_id?: string;
}
export interface Inquiry {
  id: string;
  status: string;
  providerId?: string;
  serviceId?: string;
  requestedAt?: string;
  address?: string;
  notes?: string;
  providerCompletedAt?: string | null;
}
export interface GiftEvent {
  id: string;
  title?: string;
  name?: string;
  status?: string;
}
export interface GiftReward {
  id: string;
  name?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  redeemedAt?: string | null;
}
