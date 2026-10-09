"use client";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePrivateData } from "./private-api";
import { AdminForm, type AdminField } from "./admin-form";
import type { Branch, Service, Training } from "./types";

interface Shift {
  id: string;
  branchId: string | null;
  weekday?: number;
  date?: string;
  kind?: "OVERRIDE" | "TIME_OFF";
  startsAtMinute: number;
  endsAtMinute: number;
  isActive: boolean;
}
interface Planning {
  timezone: string;
  branchSummaries: Array<Pick<Branch, "id" | "name">>;
  serviceSummaries: Array<Pick<Service, "id" | "name">>;
  skills: Array<{
    id: string;
    serviceId: string;
    certificateId: string;
    isActive: boolean;
    certificateValid: boolean;
  }>;
  assignments: Array<{ id: string; branchId: string; isActive: boolean }>;
  weeklyShifts: Shift[];
  datedSchedules: Shift[];
  bookable: boolean;
}
const weekdays = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
const reason: AdminField = {
  name: "reason",
  label: "Lý do thay đổi",
  type: "textarea",
  required: true,
  maxLength: 500,
};
const times: AdminField[] = [
  { name: "startsAt", label: "Bắt đầu", type: "time", required: true },
  { name: "endsAt", label: "Kết thúc", type: "time", required: true },
];
function clock(minute: number): string {
  return (
    String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0")
  );
}
function dateLabel(date: string): string {
  return date.split("-").reverse().join("/");
}
function minuteBody(body: Record<string, unknown>): Record<string, unknown> {
  const { startsAt, endsAt, ...rest } = body;
  const minute = (value: unknown) => {
    const [hours, minutes] = String(value).split(":").map(Number);
    return hours * 60 + minutes;
  };
  return { ...rest, startsAtMinute: minute(startsAt), endsAtMinute: minute(endsAt) };
}

function ScheduleList({
  planning,
  branches = [],
  adminPath,
}: {
  planning: Planning;
  branches?: Array<Pick<Branch, "id" | "name">>;
  adminPath?: string;
}) {
  const branchName = (id: string | null) =>
    id ? branches.find((b) => b.id === id)?.name || "Cơ sở được phân công" : "Mọi cơ sở";
  return (
    <>
      <h3 className="market-subtitle">Ca làm hằng tuần</h3>
      {planning.weeklyShifts
        .filter((s) => s.isActive)
        .map((shift) => (
          <details className="market-admin-details" key={shift.id}>
            <summary>
              {weekdays[shift.weekday!]} · {clock(shift.startsAtMinute)}–{clock(shift.endsAtMinute)}
            </summary>
            <p>{branchName(shift.branchId)}</p>
            {adminPath && (
              <AdminForm
                path={`${adminPath}/weekly-shifts/${shift.id}/disable`}
                method="PATCH"
                label="Ngưng ca tuần này"
                fields={[reason]}
              />
            )}
          </details>
        ))}
      {!planning.weeklyShifts.some((s) => s.isActive) && <p>Chưa có ca tuần được phân công.</p>}
      <h3 className="market-subtitle mt-6">Lịch riêng & nghỉ phép</h3>
      {planning.datedSchedules
        .filter((s) => s.isActive)
        .map((shift) => (
          <details className="market-admin-details" key={shift.id}>
            <summary>
              {dateLabel(shift.date!)} · {shift.kind === "TIME_OFF" ? "Nghỉ phép" : "Ca riêng"} ·{" "}
              {clock(shift.startsAtMinute)}–{clock(shift.endsAtMinute)}
            </summary>
            <p>{branchName(shift.branchId)}</p>
            {adminPath && (
              <AdminForm
                path={`${adminPath}/dated-schedules/${shift.id}/disable`}
                method="PATCH"
                label="Ngưng áp dụng lịch này"
                fields={[reason]}
              />
            )}
          </details>
        ))}
      {!planning.datedSchedules.some((s) => s.isActive) && <p>Chưa có thay đổi lịch theo ngày.</p>}
      <p className="market-notice">
        Giờ Việt Nam. Ca riêng thay thế toàn bộ ca tuần của ngày đó; nghỉ phép áp dụng tại mọi cơ
        sở. Giờ thực tế còn phụ thuộc giờ mở cửa và ngày nghỉ của cơ sở.
      </p>
    </>
  );
}

export function OwnProviderPlanning() {
  const planning = usePrivateData<Planning | null>("/provider-applications/me/planning");
  if (planning.isPending) return <p role="status">Đang tải lịch phân công...</p>;
  if (planning.isError)
    return (
      <p role="alert">
        Chưa tải được lịch. <button onClick={() => void planning.refetch()}>Thử lại</button>
      </p>
    );
  if (!planning.data) return null;
  return (
    <section className="market-section">
      <h2>Kỹ năng & lịch phân công</h2>
      <p>
        {planning.data.skills.filter((s) => s.isActive && s.certificateValid).length} kỹ năng dịch
        vụ và {planning.data.assignments.filter((s) => s.isActive).length} cơ sở được phân công.
      </p>
      {planning.data.skills.map((skill) => (
        <p key={skill.id}>
          {planning.data!.serviceSummaries.find((s) => s.id === skill.serviceId)?.name ||
            "Dịch vụ được phân công"}{" "}
          ·{" "}
          {!skill.isActive
            ? "Đã ngưng"
            : skill.certificateValid
              ? "Có chứng nhận còn hiệu lực"
              : "Cần chứng nhận còn hiệu lực"}
        </p>
      ))}
      {planning.data.assignments.map((a) => (
        <p key={a.id}>
          {planning.data!.branchSummaries.find((b) => b.id === a.branchId)?.name ||
            "Cơ sở được phân công"}{" "}
          · {a.isActive ? "Đang phân công" : "Đã ngưng"}
        </p>
      ))}
      <ScheduleList planning={planning.data} branches={planning.data.branchSummaries} />
      <p className="market-notice">
        Mộc xác nhận kỹ năng, phân công và điều chỉnh lịch sau khi trao đổi với bạn. Phân công chưa
        đồng nghĩa mở nhận đặt lịch.
      </p>
    </section>
  );
}

export function AdminProviderPlanning({
  applicationId,
  applicationUserId,
  canReview,
}: {
  applicationId: string;
  applicationUserId: string;
  canReview: boolean;
}) {
  const { user } = useAuth();
  const path = `/admin/provider-applications/${applicationId}`;
  const planning = usePrivateData<Planning>(`${path}/planning`);
  const branches = usePrivateData<Branch[]>("/admin/branches");
  const services = usePrivateData<Service[]>("/admin/services");
  const training = usePrivateData<Training>(`${path}/training`);
  const canManage = !!user?.permissions.includes("staff.manage") && user.id !== applicationUserId;
  if (planning.isPending || branches.isPending || services.isPending || training.isPending)
    return <p role="status">Đang tải kỹ năng & lịch...</p>;
  if (planning.isError || branches.isError || services.isError || training.isError)
    return (
      <p role="alert">
        Chưa tải được dữ liệu phân công.{" "}
        <button
          onClick={() => {
            void planning.refetch();
            void branches.refetch();
            void services.refetch();
            void training.refetch();
          }}
        >
          Thử lại
        </button>
      </p>
    );
  const branchOptions = branches.data.map((branch) => ({
    value: branch.id,
    label: branch.name + (branch.isActive ? "" : " · Tạm ngưng"),
  }));
  const branchField: AdminField = {
    name: "branchId",
    label: "Cơ sở",
    type: "select",
    required: true,
    options: branchOptions,
  };
  return (
    <section className="market-panel mt-6">
      <h2>Kỹ năng & lịch phục vụ</h2>
      <div className="market-two-column">
        <section>
          <h3 className="market-subtitle">Kỹ năng được xác nhận</h3>
          {planning.data.skills.map((skill) => (
            <p key={skill.id}>
              {services.data.find((s) => s.id === skill.serviceId)?.name || "Dịch vụ"} ·{" "}
              {!skill.isActive
                ? "Đã ngưng"
                : skill.certificateValid
                  ? "Có chứng nhận còn hiệu lực"
                  : "Chứng nhận không còn hiệu lực"}
            </p>
          ))}
          {!planning.data.skills.length && <p>Chưa có kỹ năng dịch vụ được xác nhận.</p>}
          {canReview && (
            <details className="market-admin-details">
              <summary>Gán hoặc ngưng kỹ năng</summary>
              <AdminForm
                path={`${path}/skills`}
                label="Lưu kỹ năng"
                fields={[
                  {
                    name: "serviceId",
                    label: "Dịch vụ",
                    type: "select",
                    required: true,
                    options: services.data.map((s) => ({ value: s.id, label: s.name })),
                  },
                  {
                    name: "certificateId",
                    label: "Chứng nhận đào tạo của KTV",
                    type: "select",
                    required: true,
                    options: training.data.certificates.map((c) => ({
                      value: c.id,
                      label: `${c.title} · ${c.isValid ? "Còn hiệu lực" : "Không còn hiệu lực"}`,
                    })),
                  },
                  { name: "isActive", label: "Áp dụng kỹ năng này", type: "checkbox", value: true },
                  reason,
                ]}
              />
              <p>
                Chỉ chọn chứng nhận phù hợp với dịch vụ sau khi kiểm tra tay nghề. Chứng nhận nội bộ
                không thay thế điều kiện pháp lý chuyên ngành.
              </p>
            </details>
          )}
          <h3 className="market-subtitle mt-6">Cơ sở được phân công</h3>
          {planning.data.assignments.map((a) => (
            <p key={a.id}>
              {branches.data.find((b) => b.id === a.branchId)?.name || "Cơ sở"} ·{" "}
              {a.isActive ? "Đang phân công" : "Đã ngưng"}
            </p>
          ))}
          {canManage && (
            <details className="market-admin-details">
              <summary>Phân công hoặc ngưng tại cơ sở</summary>
              <AdminForm
                path={`${path}/branch-assignments`}
                label="Lưu phân công"
                fields={[
                  branchField,
                  { name: "isActive", label: "Áp dụng phân công", type: "checkbox", value: true },
                  reason,
                ]}
              />
            </details>
          )}
        </section>
        <section>
          <ScheduleList
            planning={planning.data}
            branches={branches.data}
            adminPath={canManage ? path : undefined}
          />
          {canManage && (
            <>
              <details className="market-admin-details">
                <summary>Thêm ca hằng tuần</summary>
                <AdminForm
                  path={`${path}/weekly-shifts`}
                  label="Thêm ca tuần"
                  fields={[
                    branchField,
                    {
                      name: "weekday",
                      label: "Ngày trong tuần",
                      type: "select",
                      required: true,
                      options: weekdays.map((label, value) => ({ label, value: String(value) })),
                    },
                    ...times,
                    reason,
                  ]}
                  transform={(body) => ({ ...minuteBody(body), weekday: Number(body.weekday) })}
                />
              </details>
              <details className="market-admin-details">
                <summary>Thêm ca riêng hoặc nghỉ phép</summary>
                <AdminForm
                  path={`${path}/dated-schedules`}
                  label="Lưu lịch theo ngày"
                  fields={[
                    {
                      name: "kind",
                      label: "Loại lịch",
                      type: "select",
                      required: true,
                      options: [
                        { value: "OVERRIDE", label: "Ca riêng thay thế ca tuần" },
                        { value: "TIME_OFF", label: "Nghỉ phép tại mọi cơ sở" },
                      ],
                    },
                    {
                      ...branchField,
                      required: false,
                      help: "Chọn cơ sở khi tạo ca riêng; nghỉ phép áp dụng toàn bộ cơ sở.",
                    },
                    { name: "date", label: "Ngày", type: "date", required: true },
                    ...times,
                    reason,
                  ]}
                  transform={(body) => {
                    const converted = minuteBody(body);
                    if (body.kind === "TIME_OFF") delete converted.branchId;
                    return converted;
                  }}
                />
              </details>
            </>
          )}
        </section>
      </div>
      <p className="market-notice">
        Kỹ năng, lịch và phân công được quản lý riêng. KTV chỉ nhận được đặt lịch khi điều kiện dịch
        vụ, pháp lý, khu vực và hệ thống đặt lịch đã được xác nhận đầy đủ.
      </p>
    </section>
  );
}
