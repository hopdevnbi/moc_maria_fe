"use client";

import Link from "next/link";
import { ArrowLeft, CalendarCheck, MapPin, ShieldCheck } from "lucide-react";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { MobileHeader } from "@/features/mobile/experience";
import { MobileNavigation } from "@/features/mobile/mobile-navigation";
import { StaffAttendanceCard } from "./staff-attendance-card";
import { CustomerAttendanceCard } from "./customer-attendance-card";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { CheckInJourneySharing } from "./check-in-journey-sharing";
import { SuperAdminCheckInTracking } from "./super-admin-checkin-tracking";
import "@/features/safety/safety.css";
import "./check-in-page.css";

const employeeRoles = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "BRANCH_MANAGER",
  "RECEPTIONIST",
  "THERAPIST",
  "DOCTOR_CONSULTANT",
]);

export function CheckInForRole() {
  const { user } = useAuth();
  if (!user) return null;
  return user.roles.some((role) => employeeRoles.has(role)) ||
    user.permissions.includes("staff.portal") ? (
    <StaffAttendanceCard standalone />
  ) : (
    <CustomerAttendanceCard />
  );
}

export function CheckInPage() {
  return (
    <div className="mobile-experience mm-checkin-page">
      <MobileHeader />
      <main className="mm-checkin-main">
        <Link href="/tai-khoan" className="mm-checkin-back">
          <ArrowLeft size={16} /> Tài khoản của tôi
        </Link>
        <header className="mm-checkin-intro">
          <span>
            <CalendarCheck size={17} /> MỖI NGÀY CÙNG MỘC
          </span>
          <h1>Check-in tại Mộc Maria</h1>
          <p>
            Khách hàng check-in trong 100m nhận 5 coin mỗi ngày. Nhân viên và KTV giữ quy định
            check-in trong 200m; chia sẻ hành trình GPS là chức năng riêng, tự nguyện.
          </p>
          <div>
            <span>
              <MapPin size={15} /> GPS chỉ bật khi bạn chọn
            </span>
            <span>
              <ShieldCheck size={15} /> Một lượt mỗi ngày, giờ Việt Nam
            </span>
          </div>
        </header>
        <RequireAuth>
          <CheckInJourneySharing />
          <CheckInForRole />
          <SuperAdminCheckInTracking />
        </RequireAuth>
      </main>
      <MobileNavigation active={null} />
    </div>
  );
}
