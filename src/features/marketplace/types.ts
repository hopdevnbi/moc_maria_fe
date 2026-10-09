export interface Category {
  isPublished: boolean;
  sortOrder: number;
  updatedAt?: string;
  id: string;
  name: string;
  slug: string;
  description: string | null;
}
export interface Service {
  isPublished: boolean;
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
}
export interface Variant {
  updatedAt?: string;
  id: string;
  serviceId: string;
  name: string;
  durationMinutes: number;
  priceVnd: string;
  isActive: boolean;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}
export interface ServiceItem {
  service: Service;
  variants: Variant[];
  isDemo?: boolean;
  imageUrl?: string;
  imageSrcSet?: string;
  imageAlt?: string;
  photoSourceFile?: string;
  tag?: string;
  demoProviderIds?: string[];
}
export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string | null;
  isActive: boolean;
}
export interface ServiceDetail extends ServiceItem {
  branches: Array<{ branch: Branch; priceOverrideVnd: string | null }>;
}
export interface Provider {
  id: string;
  publicName: string;
  introduction: string | null;
  serviceArea: string | null;
  avatarUrl: string | null;
  // Demo-only UI data. These profiles do not represent vetted providers or accept bookings.
  isDemo?: boolean;
  age?: number;
  demoServices?: Array<{
    id: string;
    name: string;
    durationMinutes: number;
    priceVnd: number;
  }>;
  slug?: string;
  title?: string;
  yearsExperience?: number | null;
  providerKind?: string;
  eligibleServices?: EligibleProviderService[];
  bookable?: boolean;
}
export interface EligibleProviderService {
  policyId: string;
  serviceId: string;
  serviceName: string;
  branchId: string;
  branchName: string;
  mode: "ON_SITE" | "AT_HOME";
  jurisdictionCode: string;
  territoryLabel: string;
  travelBufferMinutes: number;
  travelFeeVnd: string;
  maxRadiusKm: number | null;
}
export interface Application {
  id: string;
  publicName: string;
  introduction: string | null;
  serviceArea: string | null;
  status: string;
  reviewNote: string | null;
  userId: string;
}
export interface Course {
  id: string;
  code: string;
  title: string;
  description: string | null;
  isActive: boolean;
}
export interface Enrollment {
  evidenceCurrent?: boolean;
  currentAttendancePercent?: number;
  id: string;
  courseId: string;
  providerApplicationId: string;
  status: string;
  attendancePercent: number;
  assessmentPassed: boolean;
  assessedAt: string | null;
}
export interface Certificate {
  isValid: boolean;
  id: string;
  courseCode: string;
  title: string;
  certificateNumber: string;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}
export interface Training {
  enrollments: Array<{ enrollment: Enrollment; course: Course | null }>;
  certificates: Certificate[];
}
export interface ProviderReadiness {
  consentVersion: string;
  applicationConsent: boolean;
  publicConsent: boolean;
  contactVerified: boolean;
  profileComplete: boolean;
  reviewReady: boolean;
  bookable: boolean;
  bookingBlockers: string[];
  contacts: Array<{
    id: string;
    channel: "EMAIL" | "PHONE";
    verifiedAt: string;
    revokedAt: string | null;
    isCurrent: boolean;
    evidenceReference?: string;
  }>;
}
