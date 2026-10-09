"use client";
import { usePrivateData } from "./private-api";
import { AdminForm, type AdminField } from "./admin-form";
import type { Branch } from "./types";
import { TrainingCriteriaAdmin } from "./training-assessments";
interface Module {
  id: string;
  code: string;
  title: string;
  isRequired: boolean;
  isActive: boolean;
}
interface Session {
  id: string;
  moduleId: string;
  instructorUserId: string;
  branchId: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  completionReference: string | null;
}
interface SessionSummary {
  sessionId: string;
  moduleTitle: string;
  isRequired: boolean;
  startsAt: string;
  endsAt: string;
  status: string;
  instructorName: string;
  branchName: string | null;
}
interface EnrollmentSessions {
  enrollmentId: string;
  courseTitle: string;
  availableSessions: SessionSummary[];
  records: Array<
    SessionSummary & {
      isActive: boolean;
      attendance: {
        status: string;
        attendedMinutes: number;
        evidenceReference?: string;
        markedAt: string;
        history?: Array<{
          status: string;
          attendedMinutes: number;
          evidenceReference: string;
          reason: string;
          markedAt: string;
        }>;
      } | null;
    }
  >;
}
const reason: AdminField = {
  name: "reason",
  label: "Lý do ghi nhận đào tạo",
  type: "textarea",
  required: true,
  maxLength: 500,
};
const state: Record<string, string> = {
  PLANNED: "Đã xếp lịch",
  COMPLETED: "Đã hoàn tất",
  CANCELLED: "Đã hủy",
};
const presence: Record<string, string> = {
  PRESENT: "Có mặt",
  ABSENT: "Vắng",
  EXCUSED: "Vắng có lý do",
};
function time(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(value));
}
function sessionName(s: SessionSummary): string {
  return `${s.moduleTitle} · ${time(s.startsAt)} · ${s.instructorName}`;
}
export function CourseProgramAdmin({
  courseId,
  canReview,
}: {
  courseId: string;
  canReview: boolean;
}) {
  const path = `/admin/provider-training/courses/${courseId}`;
  const program = usePrivateData<{ modules: Module[]; sessions: Session[] }>(`${path}/program`);
  const instructors = usePrivateData<Array<{ id: string; displayName: string }>>(
    "/admin/provider-training/instructors",
  );
  const branches = usePrivateData<Branch[]>("/admin/branches");
  if (program.isPending || instructors.isPending || branches.isPending)
    return <p role="status">Đang tải chương trình đào tạo...</p>;
  if (program.isError || instructors.isError || branches.isError)
    return (
      <p role="alert">
        Chưa tải được chương trình.{" "}
        <button
          onClick={() => {
            void program.refetch();
            void instructors.refetch();
            void branches.refetch();
          }}
        >
          Thử lại
        </button>
      </p>
    );
  return (
    <>
      <h3 className="market-subtitle">Nội dung đào tạo</h3>
      {program.data.modules.map((m) => (
        <p key={m.id}>
          {m.code} · {m.title} · {m.isRequired ? "Bắt buộc" : "Bổ sung"}
        </p>
      ))}
      {!program.data.modules.length && <p>Chưa có nội dung đào tạo được ghi nhận.</p>}
      {canReview && (
        <details className="market-admin-details">
          <summary>Thêm nội dung đào tạo</summary>
          <AdminForm
            path={`${path}/modules`}
            label="Thêm nội dung"
            fields={[
              { name: "code", label: "Mã nội dung", required: true, pattern: "[A-Z0-9_-]{2,80}" },
              { name: "title", label: "Tên nội dung", required: true, maxLength: 180 },
              {
                name: "sortOrder",
                label: "Thứ tự nội dung",
                type: "number",
                min: 0,
                max: 32767,
                required: true,
                value: 0,
              },
              { name: "isRequired", label: "Nội dung bắt buộc", type: "checkbox", value: true },
              reason,
            ]}
          />
        </details>
      )}
      <TrainingCriteriaAdmin courseId={courseId} canReview={canReview} />
      <h3 className="market-subtitle mt-6">Buổi học & người phụ trách</h3>
      {program.data.sessions.map((s) => (
        <details className="market-admin-details" key={s.id}>
          <summary>
            {program.data.modules.find((m) => m.id === s.moduleId)?.title} · {time(s.startsAt)}
          </summary>
          <p>
            {state[s.status]} · Kết thúc {time(s.endsAt)}
          </p>
          <p>
            {instructors.data.find((i) => i.id === s.instructorUserId)?.displayName ||
              "Người phụ trách đã được ghi nhận"}{" "}
            ·{" "}
            {branches.data.find((b) => b.id === s.branchId)?.name ||
              "Địa điểm được người phụ trách thông báo"}
          </p>
          {s.completionReference && <p>Biên bản buổi học: {s.completionReference}</p>}
          {canReview && s.status === "PLANNED" && (
            <AdminForm
              path={`/admin/provider-training/sessions/${s.id}/state`}
              method="PATCH"
              label="Chốt trạng thái buổi học"
              fields={[
                {
                  name: "status",
                  label: "Kết quả buổi học",
                  type: "select",
                  required: true,
                  options: [
                    { value: "COMPLETED", label: "Đã hoàn tất thực tế" },
                    { value: "CANCELLED", label: "Hủy buổi học" },
                  ],
                },
                {
                  name: "completionReference",
                  label: "Mã biên bản buổi học",
                  pattern: "[A-Za-z0-9_-]{3,100}",
                  help: "Bắt buộc khi hoàn tất. Chỉ nhập mã tham chiếu, không nhập tài liệu cá nhân.",
                },
                {
                  name: "recordConfirmed",
                  label: "Tôi đã kiểm tra và xác nhận trạng thái buổi học",
                  type: "checkbox",
                  required: true,
                },
                reason,
              ]}
            />
          )}
        </details>
      ))}
      {!program.data.sessions.length && <p>Chưa có buổi học được xếp lịch.</p>}
      {canReview && program.data.modules.some((m) => m.isActive) && (
        <details className="market-admin-details">
          <summary>Thêm buổi học</summary>
          <AdminForm
            path={`${path}/sessions`}
            label="Xếp buổi học"
            fields={[
              {
                name: "moduleId",
                label: "Nội dung của buổi học",
                type: "select",
                required: true,
                options: program.data.modules
                  .filter((m) => m.isActive)
                  .map((m) => ({ value: m.id, label: m.title })),
              },
              {
                name: "instructorUserId",
                label: "Người phụ trách đào tạo",
                type: "select",
                required: true,
                options: instructors.data.map((i) => ({ value: i.id, label: i.displayName })),
                help: "Chọn người đã được Mộc kiểm tra chuyên môn phù hợp.",
              },
              {
                name: "branchId",
                label: "Cơ sở đào tạo (nếu có)",
                type: "select",
                options: branches.data
                  .filter((b) => b.isActive)
                  .map((b) => ({ value: b.id, label: b.name })),
              },
              {
                name: "startsAt",
                label: "Bắt đầu buổi học — giờ Việt Nam",
                type: "datetime-local",
                required: true,
              },
              {
                name: "endsAt",
                label: "Kết thúc buổi học — giờ Việt Nam",
                type: "datetime-local",
                required: true,
              },
              reason,
            ]}
            transform={(body) => ({
              ...body,
              startsAt: String(body.startsAt) + "+07:00",
              endsAt: String(body.endsAt) + "+07:00",
            })}
          />
        </details>
      )}
      <p className="market-notice">
        Xếp chuyên viên vào buổi học trước khi chốt. Người phụ trách không được có hai buổi trùng
        giờ. Buổi đã chốt giữ nguyên lịch sử; bổ sung bằng buổi mới.
      </p>
    </>
  );
}
export function EnrollmentSessionsAdmin({
  enrollmentId,
  canReview,
}: {
  enrollmentId: string;
  canReview: boolean;
}) {
  const path = `/admin/provider-training/enrollments/${enrollmentId}/sessions`;
  const query = usePrivateData<EnrollmentSessions>(path);
  if (query.isPending) return <p role="status">Đang tải buổi học của chuyên viên...</p>;
  if (query.isError)
    return (
      <p role="alert">
        Chưa tải được buổi học. <button onClick={() => void query.refetch()}>Thử lại</button>
      </p>
    );
  return (
    <>
      <h3 className="market-subtitle mt-6">Buổi học & điểm danh</h3>
      {query.data.records.map((s) => (
        <details className="market-admin-details" key={s.sessionId}>
          <summary>{sessionName(s)}</summary>
          <p>
            {state[s.status]} · {s.isActive ? "Có trong danh sách" : "Đã rút khỏi danh sách"} ·{" "}
            {s.isRequired ? "Nội dung bắt buộc" : "Nội dung bổ sung"}
          </p>
          <p>
            Đến {time(s.endsAt)} · {s.branchName || "Địa điểm được người phụ trách thông báo"}
          </p>
          <p>
            {s.attendance
              ? `${presence[s.attendance.status]} · ${s.attendance.attendedMinutes} phút`
              : "Chưa được ghi nhận điểm danh"}
          </p>
          {s.attendance?.evidenceReference && (
            <p>Biên bản điểm danh: {s.attendance.evidenceReference}</p>
          )}
          {!!s.attendance?.history?.length && (
            <details className="market-admin-details">
              <summary>Lịch sử điểm danh ({s.attendance.history.length})</summary>
              {s.attendance.history.map((h, i) => (
                <p key={i}>
                  {time(h.markedAt)} · {presence[h.status]} · {h.attendedMinutes} phút ·{" "}
                  {h.evidenceReference}
                  <br />
                  {h.reason}
                </p>
              ))}
            </details>
          )}
          {canReview && s.isActive && s.status === "PLANNED" && (
            <AdminForm
              path={path}
              label="Rút khỏi buổi học này"
              fields={[reason]}
              transform={(body) => ({ ...body, sessionId: s.sessionId, isActive: false })}
            />
          )}
          {canReview && s.isActive && s.status === "COMPLETED" && (
            <AdminForm
              key={s.attendance?.markedAt || "new-attendance"}
              path={`${path}/${s.sessionId}/attendance`}
              label="Lưu điểm danh"
              fields={[
                {
                  name: "status",
                  label: "Tình trạng tham gia",
                  type: "select",
                  required: true,
                  value: s.attendance?.status || "PRESENT",
                  options: [
                    { value: "PRESENT", label: "Có mặt" },
                    { value: "ABSENT", label: "Vắng" },
                    { value: "EXCUSED", label: "Vắng có lý do" },
                  ],
                },
                {
                  name: "attendedMinutes",
                  label: "Số phút có mặt đã kiểm tra",
                  type: "number",
                  min: 0,
                  max: Math.floor((Date.parse(s.endsAt) - Date.parse(s.startsAt)) / 60000),
                  required: true,
                  value: s.attendance?.attendedMinutes ?? 0,
                  help: "Vắng hoặc vắng có lý do ghi 0 phút.",
                },
                {
                  name: "evidenceReference",
                  label: "Mã biên bản điểm danh",
                  required: true,
                  pattern: "[A-Za-z0-9_-]{3,100}",
                  value: s.attendance?.evidenceReference,
                },
                {
                  name: "attendanceConfirmed",
                  label: "Tôi đã kiểm tra thời lượng tham gia thực tế",
                  type: "checkbox",
                  required: true,
                },
                reason,
              ]}
            />
          )}
        </details>
      ))}
      {!query.data.records.length && <p>Chưa được xếp buổi học.</p>}
      {canReview && query.data.availableSessions.length > 0 && (
        <details className="market-admin-details">
          <summary>Xếp hoặc rút chuyên viên khỏi buổi học</summary>
          <AdminForm
            path={path}
            label="Lưu danh sách buổi học"
            fields={[
              {
                name: "sessionId",
                label: "Buổi học thuộc khóa này",
                type: "select",
                required: true,
                options: query.data.availableSessions.map((s) => ({
                  value: s.sessionId,
                  label: sessionName(s),
                })),
              },
              { name: "isActive", label: "Xếp vào buổi học", type: "checkbox", value: true },
              reason,
            ]}
          />
        </details>
      )}
      <p className="market-notice">
        Điểm danh được ghi riêng theo từng buổi và có lịch sử điều chỉnh. Kết quả khóa học còn cần
        đánh giá tay nghề, không tự đạt chỉ vì có mặt.
      </p>
    </>
  );
}
export function OwnTrainingSessions() {
  const query = usePrivateData<EnrollmentSessions[]>("/provider-applications/me/training-sessions");
  if (query.isPending) return <p role="status">Đang tải lịch đào tạo...</p>;
  if (query.isError)
    return (
      <p role="alert">
        Chưa tải được lịch đào tạo. <button onClick={() => void query.refetch()}>Thử lại</button>
      </p>
    );
  return (
    <section className="market-section">
      <h2>Lịch đào tạo của bạn</h2>
      {query.data.some((e) => e.records.length) ? (
        query.data
          .filter((e) => e.records.length)
          .map((e) => (
            <article className="market-panel mb-6" key={e.enrollmentId}>
              <h3 className="market-subtitle">{e.courseTitle}</h3>
              {e.records.map((s) => (
                <div className="market-admin-details" key={s.sessionId}>
                  <h4 className="font-semibold">{s.moduleTitle}</h4>
                  <p>
                    {time(s.startsAt)} – {time(s.endsAt)}
                  </p>
                  <p>
                    {s.instructorName} ·{" "}
                    {s.branchName || "Địa điểm sẽ được người phụ trách thông báo"}
                  </p>
                  <p>
                    {state[s.status]} ·{" "}
                    {s.attendance
                      ? `${presence[s.attendance.status]} · ${s.attendance.attendedMinutes} phút`
                      : "Chưa ghi nhận điểm danh"}
                  </p>
                </div>
              ))}
            </article>
          ))
      ) : (
        <p>Mộc sẽ thông báo khi bạn được xếp vào buổi đào tạo cụ thể.</p>
      )}
    </section>
  );
}
