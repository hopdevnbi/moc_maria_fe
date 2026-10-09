"use client";
import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePrivateData } from "./private-api";
import { AdminForm } from "./admin-form";
import { EmptyState } from "./components";
import { applicationLabels, enrollmentLabels } from "./format";
import type { Application, Course, Training } from "./types";
import { ProviderReadinessPanel } from "./provider-readiness";
import { AdminProviderPlanning } from "./provider-planning";

const transitions: Record<string, string[]> = {
  APPLIED: ["REVIEWING", "REJECTED"],
  REVIEWING: ["TRAINING", "REJECTED"],
  TRAINING: ["ASSESSMENT", "REJECTED"],
  ASSESSMENT: ["TRAINING", "APPROVED", "REJECTED"],
  APPROVED: ["SUSPENDED"],
  REJECTED: ["REVIEWING"],
  SUSPENDED: ["TRAINING", "ASSESSMENT", "APPROVED", "REJECTED"],
};
export function TrainingAdmin() {
  const { user } = useAuth();
  const canReview = !!user?.permissions.includes("roles.manage");
  const applications = usePrivateData<Application[]>("/admin/provider-applications");
  const courses = usePrivateData<Course[]>("/admin/provider-training/courses");
  const [selected, setSelected] = useState<string>("");
  if (applications.isPending || courses.isPending)
    return <p role="status">Đang tải ứng tuyển và đào tạo...</p>;
  if (applications.isError || courses.isError)
    return (
      <EmptyState title="Chưa tải được dữ liệu" error>
        <button
          className="market-button"
          onClick={() => {
            void applications.refetch();
            void courses.refetch();
          }}
        >
          Thử lại
        </button>
      </EmptyState>
    );
  const application = applications.data.find((item) => item.id === selected);
  return (
    <>
      <div className="market-two-column">
        <section>
          <h2 className="market-subtitle">Hồ sơ ứng tuyển</h2>
          {applications.data.length ? (
            applications.data.map((item) => (
              <article className="market-panel mb-6" key={item.id}>
                <span className="market-badge">
                  {applicationLabels[item.status] || item.status}
                </span>
                <h2 className="mt-4!">{item.publicName}</h2>
                <p>{item.serviceArea || "Chưa có khu vực phục vụ"}</p>
                <button
                  className="market-button market-button-secondary"
                  onClick={() => setSelected(item.id)}
                >
                  Xem hồ sơ & đào tạo
                </button>
              </article>
            ))
          ) : (
            <EmptyState title="Chưa có hồ sơ ứng tuyển">
              <p>Các hồ sơ được gửi qua website sẽ xuất hiện tại đây.</p>
            </EmptyState>
          )}
        </section>
        <section>
          <h2 className="market-subtitle">Khóa đào tạo nội bộ</h2>
          {courses.data.map((course) => (
            <article className="market-panel mb-6" key={course.id}>
              <span className="market-badge">{course.code}</span>
              <h2 className="mt-4!">{course.title}</h2>
              <p>{course.description}</p>
              <p>{course.isActive ? "Đang hoạt động" : "Tạm ngưng"}</p>
            </article>
          ))}
          {canReview && (
            <article className="market-panel">
              <AdminForm
                title="Thêm khóa đào tạo"
                path="/admin/provider-training/courses"
                label="Tạo khóa học"
                fields={[
                  {
                    name: "code",
                    label: "Mã khóa học",
                    required: true,
                    maxLength: 80,
                    pattern: "[A-Z0-9_-]+",
                    help: "Chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.",
                  },
                  { name: "title", label: "Tên khóa học", required: true, maxLength: 180 },
                  { name: "description", label: "Mô tả", type: "textarea", maxLength: 1500 },
                ]}
              />
            </article>
          )}
        </section>
      </div>
      {application && (
        <section className="market-section">
          <ApplicationReview
            key={application.id + application.status}
            application={application}
            courses={courses.data}
            canReview={canReview && application.userId !== user?.id}
          />
        </section>
      )}
    </>
  );
}
function ApplicationReview({
  application,
  courses,
  canReview,
}: {
  application: Application;
  courses: Course[];
  canReview: boolean;
}) {
  const training = usePrivateData<Training>(
    `/admin/provider-applications/${application.id}/training`,
  );
  const activeCourses = courses.filter((course) => course.isActive);
  return (
    <>
      <h2 className="market-subtitle">Hồ sơ của {application.publicName}</h2>
      <ProviderReadinessPanel applicationId={application.id} canVerify={canReview} />
      <AdminProviderPlanning
        applicationId={application.id}
        applicationUserId={application.userId}
        canReview={canReview}
      />
      <div className="market-two-column">
        <article className="market-panel">
          <dl className="market-definition">
            <div>
              <dt>Kinh nghiệm & giới thiệu</dt>
              <dd>{application.introduction || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt>Khu vực mong muốn phục vụ</dt>
              <dd>{application.serviceArea || "Chưa cập nhật"}</dd>
            </div>
            <div>
              <dt>Trạng thái hồ sơ</dt>
              <dd>{applicationLabels[application.status]}</dd>
            </div>
          </dl>
          {canReview && (
            <AdminForm
              title="Xem xét hồ sơ"
              path={`/admin/provider-applications/${application.id}/review`}
              method="PATCH"
              label="Ghi nhận quyết định"
              fields={[
                {
                  name: "status",
                  label: "Trạng thái tiếp theo",
                  type: "select",
                  required: true,
                  options: (transitions[application.status] || []).map((status) => ({
                    value: status,
                    label: applicationLabels[status] || status,
                  })),
                },
                {
                  name: "note",
                  label: "Phản hồi gửi ứng viên",
                  type: "textarea",
                  required: true,
                  maxLength: 500,
                },
              ]}
            />
          )}
          <p className="market-notice">
            Phê duyệt yêu cầu chứng nhận hợp lệ. Hồ sơ công khai và điều kiện nhận lịch được quản lý
            riêng. Không tự duyệt hồ sơ hoặc tự đánh giá tay nghề.
          </p>
        </article>
        <article className="market-panel">
          <h2>Đào tạo & chứng nhận</h2>
          {training.isPending ? (
            <p role="status">Đang tải...</p>
          ) : training.isError ? (
            <p role="alert">
              Chưa tải được đào tạo.{" "}
              <button onClick={() => void training.refetch()}>Thử lại</button>
            </p>
          ) : (
            <>
              {training.data.enrollments.map(({ enrollment, course }) => (
                <details className="market-admin-details" key={enrollment.id}>
                  <summary>
                    {course?.title || "Khóa học"} · {enrollment.attendancePercent}% ·{" "}
                    {enrollment.assessmentPassed ? "Đạt" : "Chưa đạt"}
                  </summary>
                  <p>Trạng thái: {enrollmentLabels[enrollment.status] || "Đang cập nhật"}</p>
                  {canReview && ["TRAINING", "ASSESSMENT"].includes(application.status) && (
                    <AdminForm
                      title="Ghi nhận kết quả đã xác minh"
                      method="PATCH"
                      path={`/admin/provider-training/enrollments/${enrollment.id}/assessment`}
                      label="Lưu kết quả đánh giá"
                      fields={[
                        {
                          name: "attendancePercent",
                          label: "Tỷ lệ tham gia đào tạo (%)",
                          type: "number",
                          required: true,
                          min: 0,
                          max: 100,
                          value: enrollment.attendancePercent,
                        },
                        {
                          name: "assessmentPassed",
                          label: "Đạt đánh giá tay nghề",
                          type: "checkbox",
                          value: enrollment.assessmentPassed,
                        },
                      ]}
                    />
                  )}
                </details>
              ))}
              {training.data.certificates.map((cert) => (
                <details className="market-admin-details" key={cert.id}>
                  <summary>
                    {cert.title} · {cert.isValid ? "Còn hiệu lực" : "Không còn hiệu lực"}
                  </summary>
                  <p>Số chứng nhận: {cert.certificateNumber}</p>
                  {canReview && !cert.revokedAt && (
                    <AdminForm
                      path={`/admin/provider-applications/${application.id}/certificates/${cert.id}/revoke`}
                      method="PATCH"
                      label="Thu hồi chứng nhận"
                      fields={[
                        {
                          name: "confirmed",
                          label:
                            "Tôi đã kiểm tra và xác nhận thu hồi. KTV đã duyệt sẽ tạm ngưng phục vụ.",
                          type: "checkbox",
                          required: true,
                        },
                      ]}
                      transform={() => undefined}
                    />
                  )}
                </details>
              ))}
            </>
          )}
          {canReview && ["REVIEWING", "TRAINING", "ASSESSMENT"].includes(application.status) && (
            <details className="market-admin-details">
              <summary>Chỉ định khóa học</summary>
              <AdminForm
                path="/admin/provider-training/enrollments"
                label="Ghi danh khóa học"
                fields={[
                  {
                    name: "courseId",
                    label: "Khóa đào tạo",
                    type: "select",
                    required: true,
                    options: activeCourses.map((course) => ({
                      value: course.id,
                      label: course.title,
                    })),
                  },
                ]}
                transform={(body) => ({ ...body, providerApplicationId: application.id })}
              />
            </details>
          )}
          {canReview && ["TRAINING", "ASSESSMENT", "APPROVED"].includes(application.status) && (
            <details className="market-admin-details">
              <summary>Cấp chứng nhận nội bộ</summary>
              <AdminForm
                path={`/admin/provider-applications/${application.id}/certificates`}
                label="Cấp chứng nhận"
                fields={[
                  {
                    name: "courseCode",
                    label: "Khóa học đã hoàn thành",
                    type: "select",
                    required: true,
                    options: activeCourses.map((course) => ({
                      value: course.code,
                      label: course.title,
                    })),
                  },
                  {
                    name: "certificateNumber",
                    label: "Số chứng nhận",
                    required: true,
                    maxLength: 60,
                    pattern: "[A-Z0-9_-]+",
                  },
                  { name: "expiresAt", label: "Ngày hết hạn (nếu áp dụng)", type: "date" },
                ]}
                transform={(body) => ({
                  ...body,
                  title:
                    activeCourses.find((course) => course.code === body.courseCode)?.title ||
                    "Chứng nhận đào tạo nội bộ",
                })}
              />
            </details>
          )}
        </article>
      </div>
    </>
  );
}
