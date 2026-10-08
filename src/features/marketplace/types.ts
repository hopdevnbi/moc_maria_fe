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
