"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, MapPinned, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AdminSafety } from "@/features/safety/admin-safety";

/**
 * The check-in screen stays light for staff and customers. Only an active
 * Super Admin can mount the monitor; protected API endpoints also verify role.
 */
export function SuperAdminCheckInTracking() {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  if (!user?.isActive || !user.roles.includes("SUPER_ADMIN")) return null;

  return (
    <section
      className="mm-checkin-admin-tracking"
      aria-label="Bản đồ check-in dành cho Super Admin"
    >
      <div className="mm-checkin-admin-tracking-header">
        <div className="mm-checkin-admin-tracking-icon" aria-hidden="true">
          <MapPinned size={23} />
        </div>
        <div className="mm-checkin-admin-tracking-copy">
          <span className="mm-checkin-admin-tracking-eyebrow">
            <ShieldCheck size={13} /> CHỈ SUPER ADMIN
          </span>
          <h2>Bản đồ check-in & hành trình KTV</h2>
          <p>
            Xem điểm GPS đã chấm công, kể cả ngoài 200m, và các phiên chia sẻ hành trình đang hoạt
            động.
          </p>
        </div>
        <button
          type="button"
          className="mm-checkin-admin-tracking-toggle"
          aria-expanded={expanded}
          aria-controls="mm-checkin-admin-tracking-content"
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Thu gọn bản đồ" : "Xem bản đồ"}
          <ChevronDown size={17} className={expanded ? "is-open" : ""} aria-hidden="true" />
        </button>
      </div>
      {expanded && (
        <div id="mm-checkin-admin-tracking-content" className="mm-checkin-admin-tracking-content">
          <Link className="mm-checkin-admin-tracking-full" href="/quan-tri/cham-cong">
            Mở giao diện quản trị đầy đủ <ExternalLink size={15} aria-hidden="true" />
          </Link>
          <AdminSafety initialMapOpen />
        </div>
      )}
    </section>
  );
}
