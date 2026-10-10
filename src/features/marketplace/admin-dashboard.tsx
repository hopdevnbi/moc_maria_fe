"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Crown,
  LayoutGrid,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import "./admin-dashboard.css";

type DashboardItem = {
  title: string;
  description: string;
  href?: string;
  icon: LucideIcon;
  tag: string;
  permission?: string;
  adminOnly?: boolean;
  soon?: boolean;
};
const operations: DashboardItem[] = [
  {
    title: "Kỹ thuật viên",
    description: "Hồ sơ, xét duyệt ứng tuyển, lịch làm việc và chứng nhận nội bộ.",
    href: "/quan-tri/ktv",
    icon: UserRoundCheck,
    tag: "Nhân sự & chuyên môn",
    permission: "staff.manage",
  },
  {
    title: "Dịch vụ & bảng giá",
    description: "Gói chăm sóc, thời lượng, giá niêm yết và trạng thái công bố.",
    href: "/quan-tri/dich-vu",
    icon: Sparkles,
    tag: "Danh mục & giá",
    permission: "staff.manage",
  },
  {
    title: "Cơ sở & vận hành",
    description: "Địa điểm phục vụ, lịch mở cửa, phòng và tài nguyên.",
    href: "/quan-tri/co-so",
    icon: Building2,
    tag: "Cơ sở & vận hành",
    permission: "staff.manage",
  },
];
const upcoming: DashboardItem[] = [
  {
    title: "Quản lý khách hàng",
    description: "Tìm kiếm hồ sơ, quản lý tình trạng và lịch sử chăm sóc khách hàng.",
    icon: UsersRound,
    tag: "Đang xây dựng",
    adminOnly: true,
    permission: "customers.manage",
    soon: true,
  },
  {
    title: "Hội viên VIP",
    description: "Tiếp nhận yêu cầu nâng hạng, Admin xét duyệt và thiết lập quyền lợi.",
    icon: Crown,
    tag: "Chờ phát hành",
    adminOnly: true,
    permission: "customers.manage",
    soon: true,
  },
];

export function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = !!user?.roles.some((role) => role === "SUPER_ADMIN" || role === "ADMIN");
  const accessible = (item: DashboardItem) =>
    !!user &&
    (!item.permission || user.permissions.includes(item.permission)) &&
    (!item.adminOnly || isAdmin);
  const available = operations.filter(accessible);
  const pending = upcoming.filter(accessible);

  return (
    <div className="mm-admin-dashboard">
      <section className="mm-admin-welcome">
        <div className="mm-admin-welcome-copy">
          <span className="mm-admin-welcome-label">
            <span /> CHÀO MỪNG QUAY LẠI
          </span>
          <h2>
            Xin chào, <em>{user?.displayName || "quản trị viên"}.</em>
          </h2>
          <p>
            Mọi công việc vận hành của Mộc Maria trong một không gian gọn gàng, dễ theo dõi. Hãy
            chọn khu vực bạn muốn quản lý.
          </p>
          {available.length > 0 && (
            <Link href={available[0].href || "/quan-tri"} className="mm-admin-welcome-button">
              Bắt đầu công việc <ArrowRight size={18} />
            </Link>
          )}
        </div>
        <div className="mm-admin-welcome-art" aria-hidden="true">
          <span className="mm-admin-welcome-ring mm-admin-ring-a" />
          <span className="mm-admin-welcome-ring mm-admin-ring-b" />
          <span className="mm-admin-welcome-mark">M</span>
          <span className="mm-admin-welcome-dot" />
        </div>
      </section>

      <div className="mm-admin-section-title">
        <div>
          <span className="mm-admin-mini-eyebrow">LỐI TẮT ĐIỀU HÀNH</span>
          <h2>Quản lý từng hạng mục</h2>
        </div>
        <span className="mm-admin-section-count">
          <LayoutGrid size={16} /> {available.length} phân hệ hiện có
        </span>
      </div>
      <section className="mm-admin-dashboard-grid" aria-label="Các phân hệ quản lý đang hoạt động">
        {available.map(({ href, title, description, icon: Icon, tag }, index) => (
          <Link href={href || "/quan-tri"} className="mm-admin-module" key={title}>
            <span className={"mm-admin-module-icon mm-admin-module-icon-" + index}>
              <Icon size={25} strokeWidth={1.7} />
            </span>
            <span className="mm-admin-module-tag">
              <CheckCircle2 size={13} /> Sẵn sàng quản lý
            </span>
            <strong>{title}</strong>
            <span className="mm-admin-module-desc">{description}</span>
            <span className="mm-admin-module-footer">
              {tag}
              <ArrowUpRight size={19} />
            </span>
          </Link>
        ))}
        {available.length === 0 && (
          <p className="mm-admin-dashboard-empty">
            Tài khoản này chưa được cấp quyền thao tác các phân hệ kinh doanh.
          </p>
        )}
      </section>

      {pending.length > 0 && (
        <>
          <div className="mm-admin-section-title mm-admin-section-title-upcoming">
            <div>
              <span className="mm-admin-mini-eyebrow">LỘ TRÌNH NÂNG CẤP</span>
              <h2>Khách hàng & hội viên</h2>
            </div>
          </div>
          <section
            className="mm-admin-dashboard-grid mm-admin-dashboard-upcoming"
            aria-label="Các phân hệ đang hoàn thiện"
          >
            {pending.map(({ title, description, icon: Icon, tag }) => (
              <div className="mm-admin-module mm-admin-module-locked" key={title}>
                <span className="mm-admin-module-icon">
                  <Icon size={24} strokeWidth={1.7} />
                </span>
                <span className="mm-admin-module-tag mm-admin-tag-coming">
                  <LockKeyhole size={13} />
                  {tag}
                </span>
                <strong>{title}</strong>
                <span className="mm-admin-module-desc">{description}</span>
                <span className="mm-admin-module-footer">
                  Sẽ được mở sau khi phát hành <LockKeyhole size={17} />
                </span>
              </div>
            ))}
          </section>
        </>
      )}

      <div className="mm-admin-note">
        <span className="mm-admin-note-icon">
          <ShieldCheck size={21} />
        </span>
        <div>
          <strong>Quản trị rõ ràng, bảo vệ dữ liệu</strong>
          <p>
            Mỗi nhân viên chỉ thấy phân hệ được cấp quyền. Các thay đổi về khách hàng và VIP chỉ
            được kích hoạt sau khi Backend và quy trình xét duyệt được triển khai chính thức.
          </p>
        </div>
        <ClipboardList size={21} className="mm-admin-note-tail" aria-hidden="true" />
      </div>
    </div>
  );
}
