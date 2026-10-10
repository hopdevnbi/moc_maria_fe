"use client";
import { usePrivateData } from "./private-api";
import { AdminForm } from "./admin-form";
import { applicationLabels, enrollmentLabels } from "./format";
import type { Application, Course, Training } from "./types";
import { ProviderReadinessPanel } from "./provider-readiness";
import { AdminProviderPlanning } from "./provider-planning";
import { AdminProviderEligibility } from "./provider-eligibility";
import { EnrollmentSessionsAdmin } from "./training-sessions";
import { EnrollmentAssessmentsAdmin, CertificateHistoryAdmin } from "./training-assessments";
import { KtvAdminDirectory } from "./ktv-admin-directory";

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
  return <KtvAdminDirectory />;
}

export function ApplicationReview({
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
      <AdminProviderEligibility
        applicationId={application.id}
        courses={courses}
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
                    {enrollment.evidenceCurrent
                      ? "Đạt hiện hành"
                      : enrollment.assessmentPassed
                        ? "Cần rà soát"
                        : "Chưa đạt"}
                  </summary>
                  <p>Trạng thái: {enrollmentLabels[enrollment.status] || "Đang cập nhật"}</p>
                  <EnrollmentSessionsAdmin enrollmentId={enrollment.id} canReview={canReview} />
                  <EnrollmentAssessmentsAdmin
                    enrollmentId={enrollment.id}
                    canReview={
                      canReview &&
                      ["TRAINING", "ASSESSMENT", "APPROVED", "SUSPENDED"].includes(
                        application.status,
                      )
                    }
                  />
                </details>
              ))}
              {training.data.certificates.map((cert) => (
                <details className="market-admin-details" key={cert.id}>
                  <summary>
                    {cert.title} · {cert.isValid ? "Còn hiệu lực" : "Không còn hiệu lực"}
                  </summary>
                  <p>Số chứng nhận: {cert.certificateNumber}</p>
                  <CertificateHistoryAdmin
                    applicationId={application.id}
                    certificate={cert}
                    canReview={
                      canReview &&
                      ["TRAINING", "ASSESSMENT", "APPROVED"].includes(application.status)
                    }
                  />
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
                  {
                    name: "expiresAt",
                    label: "Ngày hết hạn chứng nhận",
                    type: "date",
                    required: true,
                  },
                  {
                    name: "issuedConfirmed",
                    label: "Tôi đã kiểm tra sát hạch đạt và thời hạn chứng nhận",
                    type: "checkbox",
                    required: true,
                  },
                  {
                    name: "reason",
                    label: "Lý do cấp chứng nhận",
                    type: "textarea",
                    required: true,
                    maxLength: 500,
                  },
                ]}
                transform={(body) => ({
                  ...body,
                  expiresAt: String(body.expiresAt) + "T23:59:59+07:00",
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
