"use client";
import { AdminForm, type AdminField } from "./admin-form";
import { usePrivateData } from "./private-api";
import type { Service, Certificate } from "./types";
interface Criterion {
  id: string;
  code: string;
  title: string;
  serviceId: string | null;
  minimumScore: number;
  isRequired: boolean;
  isActive: boolean;
}
interface Module {
  id: string;
  title: string;
  requiredMinutes: number | null;
  isRequired: boolean;
  isActive: boolean;
}
interface Requirements {
  modules: Module[];
  criteria: Criterion[];
}
interface ProgressModule {
  id: string;
  title: string;
  requiredMinutes: number | null;
  attendedMinutes: number;
  attendancePercent: number;
}
interface Attempt {
  id: string;
  passed: boolean;
  attendancePercent: number;
  validUntil: string;
  assessedAt: string;
  evidenceReference: string;
  reason: string;
  snapshot: {
    criteria: Array<{
      title: string;
      score: number | null;
      minimumScore: number;
      isRequired: boolean;
    }>;
  };
}
interface AssessmentView {
  modules: ProgressModule[];
  criteria: Criterion[];
  requirementsConfigured: boolean;
  attendanceReady: boolean;
  attendancePercent: number;
  latestAssessment: Attempt | null;
  evidenceCurrent: boolean;
  history: Attempt[];
}
const reason: AdminField = {
  name: "reason",
  label: "Lý do ghi nhận sát hạch",
  type: "textarea",
  required: true,
  maxLength: 500,
};
const date = (s: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(s));
function criterionFields(services: Service[], c?: Criterion): AdminField[] {
  return [
    {
      name: "code",
      label: "Mã tiêu chí",
      required: true,
      pattern: "[A-Z0-9_-]{2,80}",
      value: c?.code,
    },
    {
      name: "title",
      label: "Tên tiêu chí thực hành",
      required: true,
      maxLength: 180,
      value: c?.title,
    },
    {
      name: "serviceId",
      label: "Dịch vụ được sát hạch (nếu áp dụng)",
      type: "select",
      value: c?.serviceId,
      options: services.map((s) => ({ value: s.id, label: s.name })),
    },
    {
      name: "minimumScore",
      label: "Điểm tối thiểu của tiêu chí (1–100)",
      type: "number",
      min: 1,
      max: 100,
      required: true,
      value: c?.minimumScore,
    },
    {
      name: "isRequired",
      label: "Tiêu chí bắt buộc",
      type: "checkbox",
      value: c?.isRequired ?? true,
    },
    {
      name: "isActive",
      label: "Áp dụng tiêu chí này",
      type: "checkbox",
      value: c?.isActive ?? true,
    },
    {
      name: "criteriaConfirmed",
      label: "Tôi đã kiểm tra tiêu chí và thang điểm của Mộc",
      type: "checkbox",
      required: true,
    },
    reason,
  ];
}
export function TrainingCriteriaAdmin({
  courseId,
  canReview,
}: {
  courseId: string;
  canReview: boolean;
}) {
  const path = `/admin/provider-training/courses/${courseId}`,
    q = usePrivateData<Requirements>(path + "/requirements"),
    services = usePrivateData<Service[]>("/admin/services");
  if (q.isPending || services.isPending) return <p role="status">Đang tải yêu cầu đào tạo...</p>;
  if (q.isError || services.isError)
    return (
      <p role="alert">
        Chưa tải được tiêu chí.{" "}
        <button
          onClick={() => {
            void q.refetch();
            void services.refetch();
          }}
        >
          Thử lại
        </button>
      </p>
    );
  return (
    <section className="mt-6">
      <h3 className="market-subtitle">Khối lượng học & tiêu chí thực hành</h3>
      <p className="market-notice">
        Mộc xác định thời lượng và điểm đạt thực tế. Mỗi nội dung bắt buộc cần ít nhất 80% thời
        lượng có mặt; chưa cấu hình đủ sẽ chưa được công nhận hoàn thành.
      </p>
      {q.data.modules.map((m) => (
        <details className="market-admin-details" key={m.id}>
          <summary>
            {m.title} · {m.requiredMinutes ? m.requiredMinutes + " phút" : "Chưa định thời lượng"}
          </summary>
          <p>
            {m.isRequired ? "Bắt buộc" : "Bổ sung"} · {m.isActive ? "Đang áp dụng" : "Đã ngưng"}
          </p>
          {canReview && (
            <AdminForm
              path={path + `/modules/${m.id}/requirements`}
              method="PATCH"
              label="Lưu yêu cầu học phần"
              fields={[
                {
                  name: "requiredMinutes",
                  label: "Thời lượng đào tạo yêu cầu (phút)",
                  type: "number",
                  required: true,
                  min: 1,
                  max: 4800,
                  value: m.requiredMinutes,
                },
                {
                  name: "isRequired",
                  label: "Học phần bắt buộc",
                  type: "checkbox",
                  value: m.isRequired,
                },
                {
                  name: "isActive",
                  label: "Áp dụng học phần",
                  type: "checkbox",
                  value: m.isActive,
                },
                {
                  name: "requirementsConfirmed",
                  label: "Tôi đã kiểm tra khối lượng học cần thiết",
                  type: "checkbox",
                  required: true,
                },
                reason,
              ]}
            />
          )}
        </details>
      ))}
      {q.data.criteria.map((c) => (
        <details className="market-admin-details" key={c.id}>
          <summary>
            {c.title} · đạt từ {c.minimumScore}/100
          </summary>
          <p>
            {c.isRequired ? "Bắt buộc" : "Bổ sung"} · {c.isActive ? "Đang áp dụng" : "Đã ngưng"} ·{" "}
            {services.data.find((s) => s.id === c.serviceId)?.name || "Tiêu chí chung của khóa"}
          </p>
          {canReview && (
            <AdminForm
              path={path + "/criteria/" + c.id}
              method="PATCH"
              label="Lưu tiêu chí"
              fields={criterionFields(services.data, c)}
            />
          )}
        </details>
      ))}
      {!q.data.criteria.length && <p>Chưa có tiêu chí thực hành được xác nhận.</p>}
      {canReview && (
        <details className="market-admin-details">
          <summary>Thêm tiêu chí thực hành</summary>
          <AdminForm
            path={path + "/criteria"}
            label="Tạo tiêu chí"
            fields={criterionFields(services.data)}
          />
        </details>
      )}
    </section>
  );
}
export function EnrollmentAssessmentsAdmin({
  enrollmentId,
  canReview,
}: {
  enrollmentId: string;
  canReview: boolean;
}) {
  const path = `/admin/provider-training/enrollments/${enrollmentId}/assessments`,
    q = usePrivateData<AssessmentView>(path);
  if (q.isPending) return <p role="status">Đang tính thời lượng tham gia...</p>;
  if (q.isError)
    return (
      <p role="alert">
        Chưa tải được sát hạch. <button onClick={() => void q.refetch()}>Thử lại</button>
      </p>
    );
  const d = q.data,
    active = d.criteria.filter((c) => c.isActive);
  return (
    <section className="mt-6">
      <h3 className="market-subtitle">Sát hạch theo bằng chứng</h3>
      <p className="market-notice">
        Lần sát hạch mới thay thế kết quả hiện hành. Nếu đã có chứng nhận, cần ghi nhận gia hạn sau
        khi lần sát hạch mới đạt.
      </p>
      <p>
        Tham gia thực tế: {d.attendancePercent}% ·{" "}
        {d.attendanceReady ? "Đủ thời lượng bắt buộc" : "Chưa đủ thời lượng bắt buộc"}
      </p>
      {d.modules.map((m) => (
        <p key={m.id}>
          {m.title}: {m.attendedMinutes} / {m.requiredMinutes ?? "chưa xác định"} phút ·{" "}
          {m.attendancePercent}%
        </p>
      ))}
      <p className="market-notice">
        {!d.requirementsConfigured
          ? "Cần Mộc cấu hình thời lượng học và tiêu chí thực hành trước khi đánh giá."
          : d.evidenceCurrent
            ? "Kết quả đạt còn phù hợp điểm danh và yêu cầu hiện hành."
            : "Chưa có kết quả đạt còn hiệu lực theo điểm danh và yêu cầu hiện hành."}
      </p>
      {canReview && d.requirementsConfigured && (
        <AdminForm
          path={path}
          label="Ghi nhận lần sát hạch"
          fields={[
            ...active.map(
              (c): AdminField => ({
                name: "score_" + c.id,
                label: `Điểm: ${c.title} (đạt từ ${c.minimumScore}/100)`,
                type: "number",
                required: true,
                min: 0,
                max: 100,
              }),
            ),
            {
              name: "evidenceReference",
              label: "Mã biên bản sát hạch",
              required: true,
              pattern: "[A-Za-z0-9_-]{3,100}",
            },
            {
              name: "validUntil",
              label: "Kết quả được công nhận đến ngày",
              type: "date",
              required: true,
            },
            {
              name: "practicalConfirmed",
              label: "Tôi đã trực tiếp kiểm tra bằng chứng sát hạch thực hành",
              type: "checkbox",
              required: true,
            },
            reason,
          ]}
          transform={(body) => ({
            scores: active.map((c) => ({
              criterionId: c.id,
              score: Number(body["score_" + c.id]),
            })),
            evidenceReference: body.evidenceReference,
            validUntil: String(body.validUntil) + "T23:59:59+07:00",
            practicalConfirmed: body.practicalConfirmed,
            reason: body.reason,
          })}
        />
      )}
      {d.history.length > 0 && (
        <details className="market-admin-details">
          <summary>Lịch sử sát hạch ({d.history.length})</summary>
          {d.history.map((a) => (
            <article className="market-admin-details" key={a.id}>
              <h4 className="font-semibold">
                {date(a.assessedAt)} · {a.passed ? "Đạt" : "Chưa đạt"}
              </h4>
              <p>
                Tham gia {a.attendancePercent}% · Công nhận đến {date(a.validUntil)}
              </p>
              {a.snapshot.criteria.map((c, i) => (
                <p key={i}>
                  {c.title}: {c.score ?? "chưa ghi nhận"}/100 · Yêu cầu {c.minimumScore}/100
                </p>
              ))}
              <p>
                {a.evidenceReference} · {a.reason}
              </p>
            </article>
          ))}
        </details>
      )}
    </section>
  );
}
interface Issuance {
  id: string;
  kind: string;
  certificateNumber: string;
  issuedAt: string;
  expiresAt: string | null;
  reason: string;
}
export function CertificateHistoryAdmin({
  applicationId,
  certificate,
  canReview,
}: {
  applicationId: string;
  certificate: Certificate;
  canReview: boolean;
}) {
  const path = `/admin/provider-applications/${applicationId}/certificates/${certificate.id}`,
    q = usePrivateData<Issuance[]>(path + "/history");
  return (
    <>
      <h3 className="market-subtitle mt-6">Lịch sử cấp & gia hạn</h3>
      {q.isPending ? (
        <p role="status">Đang tải lịch sử...</p>
      ) : q.isError ? (
        <p role="alert">
          Chưa tải được lịch sử. <button onClick={() => void q.refetch()}>Thử lại</button>
        </p>
      ) : (
        q.data.map((a) => (
          <p key={a.id}>
            {date(a.issuedAt)} ·{" "}
            {a.kind === "RENEWED"
              ? "Gia hạn"
              : a.kind === "IMPORTED"
                ? "Bản ghi trước khi có sát hạch chi tiết"
                : "Cấp lần đầu"}{" "}
            · {a.certificateNumber}
            <br />
            {a.reason}
          </p>
        ))
      )}
      {canReview && (
        <details className="market-admin-details">
          <summary>Gia hạn sau sát hạch mới</summary>
          <p className="market-notice">
            Cần một lần sát hạch đạt mới sau lần cấp trước. Chứng nhận thu hồi cần được xét lại hồ
            sơ; gia hạn không tự phê duyệt chuyên viên.
          </p>
          <AdminForm
            path={path + "/renew"}
            label="Ghi nhận gia hạn"
            fields={[
              {
                name: "certificateNumber",
                label: "Số chứng nhận mới",
                required: true,
                pattern: "[A-Z0-9_-]{6,60}",
              },
              { name: "expiresAt", label: "Ngày hết hạn mới", type: "date", required: true },
              {
                name: "issuedConfirmed",
                label: "Tôi đã kiểm tra sát hạch mới và thời hạn chứng nhận",
                type: "checkbox",
                required: true,
              },
              reason,
            ]}
            transform={(body) => ({
              ...body,
              courseCode: certificate.courseCode,
              title: certificate.title,
              expiresAt: String(body.expiresAt) + "T23:59:59+07:00",
            })}
          />
        </details>
      )}
    </>
  );
}
