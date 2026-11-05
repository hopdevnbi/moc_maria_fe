"use client";

import { useState } from "react";
import { CalendarCheck2, MapPinned } from "lucide-react";
import { AdminSafety } from "@/features/safety/admin-safety";
import { StaffAttendanceAdmin } from "./staff-attendance-admin";
import "@/features/safety/safety.css";
import "./attendance-admin-workspace.css";

/** Both panels enforce SUPER_ADMIN on the client; their APIs enforce it again. */
export function AttendanceAdminWorkspace() {
  const [tab, setTab] = useState<"attendance" | "tracking">("attendance");
  return (
    <div className="mm-att-workspace">
      <div
        className="mm-att-workspace-tabs"
        role="tablist"
        aria-label="Quản lý chấm công và định vị KTV"
      >
        <button
          type="button"
          role="tab"
          id="tab-attendance"
          aria-controls="panel-attendance"
          aria-selected={tab === "attendance"}
          className={tab === "attendance" ? "is-active" : ""}
          onClick={() => setTab("attendance")}
        >
          <CalendarCheck2 size={18} /> Chấm công & coin
        </button>
        <button
          type="button"
          role="tab"
          id="tab-tracking"
          aria-controls="panel-tracking"
          aria-selected={tab === "tracking"}
          className={tab === "tracking" ? "is-active" : ""}
          onClick={() => setTab("tracking")}
        >
          <MapPinned size={18} /> Định vị & hành trình KTV
        </button>
      </div>
      {tab === "attendance" ? (
        <section role="tabpanel" id="panel-attendance" aria-labelledby="tab-attendance">
          <StaffAttendanceAdmin />
        </section>
      ) : (
        <section role="tabpanel" id="panel-tracking" aria-labelledby="tab-tracking">
          <AdminSafety />
        </section>
      )}
    </div>
  );
}
