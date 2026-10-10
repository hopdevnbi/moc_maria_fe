"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FilterX,
  GraduationCap,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AdminForm } from "./admin-form";
import { applicationLabels } from "./format";
import { usePrivateData } from "./private-api";
import { CourseProgramAdmin } from "./training-sessions";
import type { Application, Course } from "./types";
import { KtvAvatar } from "./ktv-avatar";
import { resolveAdminKtvAvatar } from "./ktv-admin-avatar-source";
import {
  countKtvStatus,
  filterKtvApplications,
  ktvStatusGroups,
  KTV_PAGE_SIZE,
  pageCount,
  type KtvSortOrder,
  type KtvStatusFilter,
} from "./ktv-admin-utils";
import "./ktv-admin.css";

function KtvCourseManager() {
  const courses = usePrivateData<Course[]>("/admin/provider-training/courses");
  const { user } = useAuth();
  const canReview = !!user?.permissions.includes("roles.manage");
  if (courses.isPending)
    return (
      <p className="mm-ktv-loading" role="status">
        Đang tải khóa đào tạo...
      </p>
    );
  if (courses.isError)
    return (
      <div className="mm-ktv-error" role="alert">
        Chưa tải được danh sách khóa học.{" "}
        <button type="button" onClick={() => void courses.refetch()}>
          Thử lại
        </button>
      </div>
    );
  return (
    <div className="mm-ktv-course-wrap">
      <div className="mm-ktv-course-header">
        <div>
          <span className="mm-ktv-overline">HỌC VIỆN NỘI BỘ</span>
          <h2>Khóa đào tạo</h2>
          <p>Chương trình đào tạo và buổi học phục vụ quy trình đánh giá KTV.</p>
        </div>
        <span className="mm-ktv-total">{courses.data.length} khóa học</span>
      </div>
      <div className="mm-ktv-course-grid">
        <section className="mm-ktv-course-list">
          {courses.data.map((course) => (
            <article className="mm-ktv-course-card" key={course.id}>
              <div className="mm-ktv-course-card-top">
                <span className="mm-ktv-course-code">{course.code}</span>
                <span
                  className={
                    "mm-ktv-status " + (course.isActive ? "mm-ktv-approved" : "mm-ktv-suspended")
                  }
                >
                  {course.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                </span>
              </div>
              <h3>{course.title}</h3>
              <p>{course.description || "Chưa có mô tả khóa học."}</p>
              <details className="mm-ktv-course-details">
                <summary>
                  Chương trình & buổi học <ChevronRight size={16} />
                </summary>
                <CourseProgramAdmin courseId={course.id} canReview={canReview} />
              </details>
            </article>
          ))}
          {!courses.data.length && <p className="mm-ktv-empty">Chưa có khóa đào tạo nào.</p>}
        </section>
        {canReview && (
          <aside className="mm-ktv-course-create market-panel">
            <AdminForm
              title="Tạo khóa đào tạo"
              path="/admin/provider-training/courses"
              label="Tạo khóa học"
              fields={[
                {
                  name: "code",
                  label: "Mã khóa học",
                  required: true,
                  maxLength: 80,
                  pattern: "[A-Z0-9_-]+",
                  help: "Chữ in hoa, số và dấu gạch.",
                },
                { name: "title", label: "Tên khóa học", required: true, maxLength: 180 },
                { name: "description", label: "Mô tả", type: "textarea", maxLength: 1500 },
              ]}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

export function KtvAdminDirectory() {
  const applications = usePrivateData<Application[]>("/admin/provider-applications");
  const [tab, setTab] = useState<"LIST" | "COURSES">("LIST");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<KtvStatusFilter>("ALL");
  const [sort, setSort] = useState<KtvSortOrder>("NEWEST");
  const [page, setPage] = useState(1);

  const all = applications.data || [];
  const filtered = filterKtvApplications(all, search, filter, sort);
  const maxPage = pageCount(filtered.length);
  const currentPage = Math.min(page, maxPage);
  const items = filtered.slice((currentPage - 1) * KTV_PAGE_SIZE, currentPage * KTV_PAGE_SIZE);
  function chooseFilter(value: KtvStatusFilter) {
    setFilter(value);
    setPage(1);
  }
  function changeSearch(value: string) {
    setSearch(value);
    setPage(1);
  }
  function changeSort(value: KtvSortOrder) {
    setSort(value);
    setPage(1);
  }
  function clearFilters() {
    setSearch("");
    setFilter("ALL");
    setSort("NEWEST");
    setPage(1);
  }

  return (
    <div className="mm-ktv-console">
      <header className="mm-ktv-console-intro">
        <div className="mm-ktv-console-intro-copy">
          <span className="mm-ktv-overline">
            <ShieldCheck size={15} /> HỒ SƠ NHÂN SỰ · MỘC MARIA
          </span>
          <h2>Đội ngũ kỹ thuật viên</h2>
          <p>Quản lý hồ sơ, xét duyệt và theo dõi quá trình đào tạo tại một nơi.</p>
        </div>
        <div className="mm-ktv-intro-graphic" aria-hidden="true">
          <UsersRound size={44} />
        </div>
      </header>
      <div className="mm-ktv-tabs" role="group" aria-label="Các mục quản trị KTV">
        <button
          type="button"
          className={tab === "LIST" ? "active" : ""}
          aria-pressed={tab === "LIST"}
          onClick={() => setTab("LIST")}
        >
          <UsersRound size={17} /> Danh sách KTV
        </button>
        <button
          type="button"
          className={tab === "COURSES" ? "active" : ""}
          aria-pressed={tab === "COURSES"}
          onClick={() => setTab("COURSES")}
        >
          <GraduationCap size={18} /> Đào tạo nội bộ
        </button>
      </div>
      {tab === "COURSES" ? (
        <KtvCourseManager />
      ) : applications.isPending ? (
        <p className="mm-ktv-loading" role="status">
          Đang tải danh sách KTV...
        </p>
      ) : applications.isError ? (
        <div className="mm-ktv-error" role="alert">
          Chưa tải được danh sách KTV.{" "}
          <button type="button" onClick={() => void applications.refetch()}>
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <div className="mm-ktv-overview">
            <div>
              <span className="mm-ktv-overview-icon">
                <UsersRound size={19} />
              </span>
              <span>
                <strong>{all.length}</strong>
                <small>Tổng hồ sơ</small>
              </span>
            </div>
            <div>
              <span className="mm-ktv-overview-icon amber">
                <ClipboardCheck size={19} />
              </span>
              <span>
                <strong>{countKtvStatus(all, "PENDING")}</strong>
                <small>Cần xử lý</small>
              </span>
            </div>
            <div>
              <span className="mm-ktv-overview-icon green">
                <CheckCircle2 size={19} />
              </span>
              <span>
                <strong>{countKtvStatus(all, "APPROVED")}</strong>
                <small>Đã duyệt</small>
              </span>
            </div>
          </div>
          <section className="mm-ktv-table-panel" aria-label="Bảng danh sách kỹ thuật viên">
            <div className="mm-ktv-toolbar">
              <div>
                <span className="mm-ktv-overline">DANH SÁCH HỒ SƠ</span>
                <h3>
                  Kỹ thuật viên <span className="mm-ktv-total">{filtered.length}</span>
                </h3>
              </div>
              <button
                className="mm-ktv-reload"
                type="button"
                onClick={() => void applications.refetch()}
                disabled={applications.isFetching}
              >
                <RefreshCw size={16} className={applications.isFetching ? "mm-ktv-spin" : ""} /> Làm
                mới
              </button>
            </div>
            <div className="mm-ktv-searchbar">
              <label className="mm-ktv-search">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">Tìm theo tên, khu vực hoặc mã hồ sơ</span>
                <input
                  value={search}
                  onChange={(e) => changeSearch(e.target.value)}
                  placeholder="Tìm theo tên, khu vực hoặc mã hồ sơ..."
                  type="search"
                />
              </label>
              <label className="mm-ktv-sort">
                <SlidersHorizontal size={17} />
                <span className="sr-only">Sắp xếp danh sách</span>
                <select value={sort} onChange={(e) => changeSort(e.target.value as KtvSortOrder)}>
                  <option value="NEWEST">Mới nhất</option>
                  <option value="OLDEST">Cũ nhất</option>
                  <option value="NAME">Tên A - Z</option>
                </select>
              </label>
            </div>
            <div className="mm-ktv-filters" role="group" aria-label="Lọc KTV theo trạng thái">
              {ktvStatusGroups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  className={filter === group.id ? "active" : ""}
                  aria-pressed={filter === group.id}
                  onClick={() => chooseFilter(group.id)}
                >
                  {group.label}
                  <span>{countKtvStatus(all, group.id)}</span>
                </button>
              ))}
            </div>
            {filtered.length ? (
              <>
                <div className="mm-ktv-table-scroll">
                  <table className="mm-ktv-table">
                    <thead>
                      <tr>
                        <th scope="col">Kỹ thuật viên</th>
                        <th scope="col">Khu vực</th>
                        <th scope="col">Trạng thái</th>
                        <th scope="col">Cập nhật</th>
                        <th scope="col">
                          <span className="sr-only">Thao tác</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td data-label="KTV">
                            <div className="mm-ktv-person">
                              <KtvAvatar
                                name={item.publicName}
                                src={resolveAdminKtvAvatar(item).src}
                                illustrative={resolveAdminKtvAvatar(item).illustrative}
                              />
                              <span className="mm-ktv-person-copy">
                                <strong>{item.publicName}</strong>
                                <small>Hồ sơ #{item.id.slice(0, 8).toUpperCase()}</small>
                              </span>
                            </div>
                          </td>
                          <td data-label="Khu vực">
                            <span className="mm-ktv-location">
                              <MapPin size={15} />
                              {item.serviceArea || "Chưa cập nhật"}
                            </span>
                          </td>
                          <td data-label="Trạng thái">
                            <span className={"mm-ktv-status mm-ktv-" + item.status.toLowerCase()}>
                              <span className="mm-ktv-status-dot" />
                              {applicationLabels[item.status] || item.status}
                            </span>
                          </td>
                          <td data-label="Cập nhật">
                            <time dateTime={item.updatedAt || item.createdAt || undefined}>
                              {item.updatedAt || item.createdAt
                                ? new Date(
                                    item.updatedAt || item.createdAt || "",
                                  ).toLocaleDateString("vi-VN")
                                : "—"}
                            </time>
                          </td>
                          <td data-label="Thao tác">
                            <Link
                              className="mm-ktv-detail-button"
                              href={"/quan-tri/ktv/" + encodeURIComponent(item.id)}
                            >
                              Xem chi tiết <ArrowRight size={16} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <footer className="mm-ktv-pagination">
                  <p>
                    Hiển thị{" "}
                    <strong>
                      {(currentPage - 1) * KTV_PAGE_SIZE + 1}–
                      {Math.min(currentPage * KTV_PAGE_SIZE, filtered.length)}
                    </strong>{" "}
                    / {filtered.length} hồ sơ
                  </p>
                  <div className="mm-ktv-pagination-controls">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setPage(currentPage - 1)}
                      aria-label="Trang trước"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span>
                      Trang {currentPage} / {maxPage}
                    </span>
                    <button
                      type="button"
                      disabled={currentPage === maxPage}
                      onClick={() => setPage(currentPage + 1)}
                      aria-label="Trang sau"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </footer>
              </>
            ) : (
              <div className="mm-ktv-empty-filter">
                <FilterX size={30} />
                <strong>Không tìm thấy hồ sơ phù hợp</strong>
                <p>Thử đổi từ khóa hoặc trạng thái lọc.</p>
                <button type="button" onClick={clearFilters}>
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </section>
          <p className="mm-ktv-privacy">
            <ShieldCheck size={16} /> Avatar chỉ hiển thị từ hồ sơ nhân viên thực; hồ sơ chưa có ảnh
            được thay bằng chữ viết tắt. Quy trình duyệt và chứng nhận vẫn tuân thủ quyền quản trị
            hiện tại.
          </p>
        </>
      )}
    </div>
  );
}
