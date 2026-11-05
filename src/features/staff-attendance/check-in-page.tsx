"use client";

import Link from "next/link";
import { ArrowLeft, CalendarCheck, MapPin, ShieldCheck } from "lucide-react";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { MobileHeader } from "@/features/mobile/experience";
import { MobileNavigation } from "@/features/mobile/mobile-navigation";
import { StaffAttendanceCard } from "./staff-attendance-card";
import { CheckInJourneySharing } from "./check-in-journey-sharing";
import { SuperAdminCheckInTracking } from "./super-admin-checkin-tracking";
import "@/features/safety/safety.css";
import "./check-in-page.css";

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
            Điểm danh dành cho nhân viên và kỹ thuật viên. Chọn cơ sở, kiểm tra vị trí và theo dõi
            coin của bạn.
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
          <StaffAttendanceCard standalone />
          <SuperAdminCheckInTracking />
        </RequireAuth>
      </main>
      <MobileNavigation active={null} />
    </div>
  );
}
