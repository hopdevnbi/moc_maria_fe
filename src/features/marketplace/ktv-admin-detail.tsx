"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { applicationLabels } from "./format";
import { usePrivateData } from "./private-api";
import { ApplicationReview } from "./training-admin";
import { KtvAvatar } from "./ktv-avatar";
import { resolveAdminKtvAvatar } from "./ktv-admin-avatar-source";
import type { Application, Course } from "./types";
import "./ktv-admin.css";

export function AdminKtvDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const applications = usePrivateData<Application[]>("/admin/provider-applications");
  const courses = usePrivateData<Course[]>("/admin/provider-training/courses");
  const item = applications.data?.find((app) => app.id === id);
  const canReview = !!user?.permissions.includes("roles.manage") && item?.userId !== user?.id;

  return (
    <div className="mm-ktv-detail">
      <Link className="mm-ktv-detail-back" href="/quan-tri/ktv">
        <ArrowLeft size={17} /> Danh sách KTV
      </Link>
      {applications.isPending ? (
        <p role="status" className="mm-ktv-loading">
          Đang tải hồ sơ KTV...
        </p>
      ) : applications.isError ? (
        <div className="mm-ktv-error" role="alert">
          Không tải được hồ sơ.
          <button type="button" onClick={() => void applications.refetch()}>
            Thử lại
          </button>
        </div>
      ) : !item ? (
        <div className="mm-ktv-error" role="alert">
          Không tìm thấy hồ sơ KTV hoặc hồ sơ đã được thay đổi.
        </div>
      ) : (
        <>
          <div className="mm-ktv-profile-hero">
            <div className="mm-ktv-profile-photo">
              <KtvAvatar
                name={item.publicName}
                src={resolveAdminKtvAvatar(item).src}
                illustrative={resolveAdminKtvAvatar(item).illustrative}
                size="large"
              />
            </div>
            <div className="mm-ktv-profile-copy">
              <span className="mm-ktv-overline">
                <ShieldCheck size={15} /> HỒ SƠ KỸ THUẬT VIÊN
              </span>
              <h2>{item.publicName}</h2>
              <span className={"mm-ktv-status mm-ktv-" + item.status.toLowerCase()}>
                <span className="mm-ktv-status-dot" />
                {applicationLabels[item.status] || item.status}
              </span>
              <div className="mm-ktv-profile-info">
                <span>
                  <MapPin size={16} />
                  {item.serviceArea || "Chưa cập nhật khu vực"}
                </span>
                <span>
                  <CalendarDays size={16} />
                  {item.createdAt
                    ? "Nộp hồ sơ " + new Date(item.createdAt).toLocaleDateString("vi-VN")
                    : "Hồ sơ ứng tuyển"}
                </span>
              </div>
            </div>
            <div className="mm-ktv-profile-seal">
              <ClipboardCheck size={25} />
              <strong>Xét duyệt nội bộ</strong>
              <small>Không tự động kích hoạt nhận lịch</small>
            </div>
          </div>
          <div className="mm-ktv-detail-breadcrumb">
            <span>Quản trị KTV</span>
            <ChevronRight size={16} />
            <strong>{item.publicName}</strong>
          </div>
          {courses.isPending ? (
            <p role="status" className="mm-ktv-loading">
              Đang tải đào tạo và chứng nhận...
            </p>
          ) : courses.isError ? (
            <div className="mm-ktv-error" role="alert">
              Chưa tải được danh sách khóa đào tạo.
              <button type="button" onClick={() => void courses.refetch()}>
                Thử lại
              </button>
            </div>
          ) : (
            <div className="mm-ktv-detail-content">
              <ApplicationReview
                key={item.id + "-" + item.status}
                application={item}
                courses={courses.data}
                canReview={canReview}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
