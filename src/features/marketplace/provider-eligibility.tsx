"use client";

import { useState } from "react";
import { usePrivateData } from "./private-api";
import { AdminForm, type AdminField } from "./admin-form";
import { formatPrice } from "./format";
import type { Branch, Service, Course, EligibleProviderService } from "./types";

interface Readiness {
  profile: { slug: string; title: string; yearsExperience: number | null } | null;
  providerKind: string | null;
  qualityStatus: string | null;
  services: EligibleProviderService[];
  blockers: string[];
  serviceReady: boolean;
  bookable: boolean;
}
interface Policy {
  id: string;
  serviceId: string;
  branchId: string;
  courseId: string;
  mode: "ON_SITE" | "AT_HOME";
  jurisdictionCode: string;
  territoryLabel: string;
  legalRequirement: "LICENSE_REQUIRED" | "NOT_REQUIRED";
  legalReviewReference: string;
  validUntil: string;
  isActive: boolean;
  reviewedAt: string;
}
interface Grant {
  id: string;
  policyId: string;
  credentialReference: string | null;
  credentialValidUntil: string | null;
  travelBufferMinutes: number;
  travelFeeVnd: string;
  maxRadiusKm: number | null;
  isActive: boolean;
  reviewedAt: string;
}
interface Configuration {
  profile:
    | (NonNullable<Readiness["profile"]> & { isPublished: boolean; reviewedAt: string })
    | null;
  review: { providerKind: string; qualityStatus: string; reviewedAt: string } | null;
  grants: Grant[];
}
const reason: AdminField = {
  name: "reason",
  label: "Lý do và kết quả kiểm tra",
  type: "textarea",
  required: true,
  maxLength: 500,
};
const reference = "[A-Za-z0-9_-]{3,100}";
const blockers: Record<string, string> = {
  APPLICATION_NOT_APPROVED: "Hồ sơ ứng tuyển chưa được phê duyệt.",
  PUBLIC_PROFILE_NOT_REVIEWED: "Hồ sơ công khai chưa được rà soát và xuất bản.",
  STAFF_PROFILE_DISABLED: "Hồ sơ nhân sự chưa được bật công khai và hoạt động.",
  QUALITY_NOT_ACTIVE: "Chất lượng phục vụ chưa được xác nhận ở trạng thái hoạt động.",
  NO_VALID_SERVICE_TRAINING_LEGAL_TERRITORY_AND_SCHEDULE:
    "Chưa có dịch vụ đủ điều kiện: cần khóa đào tạo đúng dịch vụ, chứng nhận còn hạn, phạm vi và chính sách còn hiệu lực, phân công và ca làm.",
  PROFILE_OR_CURRENT_CONTACT_OR_APPLICATION_CONSENT:
    "Cần hoàn thiện hồ sơ, đồng ý xét duyệt và xác minh liên hệ hiện tại.",
  PUBLIC_CONSENT_REQUIRED: "Chuyên viên chưa đồng ý công khai hồ sơ.",
};
function day(value?: string | null): string {
  return value
    ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value))
    : "";
}
function expiryBody(body: Record<string, unknown>): Record<string, unknown> {
  const result = { ...body };
  for (const key of ["validUntil", "credentialValidUntil"]) {
    if (result[key]) result[key] = String(result[key]) + "T23:59:59+07:00";
  }
  return result;
}
function ReadinessDetails({ data }: { data: Readiness }) {
  return (
    <>
      <p className="market-badge">
        {data.serviceReady ? "Đủ điều kiện công khai dịch vụ" : "Cần hoàn thiện điều kiện"}
      </p>
      {data.blockers.length > 0 && (
        <ul className="list-disc pl-5 space-y-2">
          {data.blockers.map((code) => (
            <li key={code}>{blockers[code] || "Mộc cần kiểm tra thêm điều kiện phục vụ."}</li>
          ))}
        </ul>
      )}
      {data.services.map((s) => (
        <p key={s.policyId}>
          {s.serviceName} · {s.branchName} · {s.mode === "ON_SITE" ? "Tại cơ sở" : "Tại nhà"} ·{" "}
          {s.territoryLabel}
        </p>
      ))}
      {!data.bookable && (
        <p className="market-notice">
          Điều kiện công khai được kiểm tra riêng với lịch trống. Nhận đặt lịch sẽ mở khi hệ thống
          đặt lịch hoàn tất.
        </p>
      )}
    </>
  );
}
export function OwnServiceReadiness() {
  const query = usePrivateData<Readiness | null>("/provider-applications/me/service-readiness");
  if (query.isPending) return <p role="status">Đang tải điều kiện phục vụ...</p>;
  if (query.isError)
    return (
      <p role="alert">
        Chưa tải được điều kiện. <button onClick={() => void query.refetch()}>Thử lại</button>
      </p>
    );
  if (!query.data) return null;
  return (
    <section className="market-section">
      <h2>Điều kiện phục vụ của bạn</h2>
      <ReadinessDetails data={query.data} />
    </section>
  );
}
export function AdminProviderEligibility({
  applicationId,
  courses,
  canReview,
}: {
  applicationId: string;
  courses: Course[];
  canReview: boolean;
}) {
  const query = usePrivateData<Readiness>(
    `/admin/provider-applications/${applicationId}/service-readiness`,
  );
  return (
    <section className="market-panel mt-6">
      <h2>Hồ sơ công khai & điều kiện từng dịch vụ</h2>
      {query.isPending ? (
        <p role="status">Đang kiểm tra điều kiện...</p>
      ) : query.isError ? (
        <p role="alert">
          Chưa tải được điều kiện. <button onClick={() => void query.refetch()}>Thử lại</button>
        </p>
      ) : (
        <ReadinessDetails data={query.data} />
      )}
      {canReview && <EligibilityEditor applicationId={applicationId} courses={courses} />}
    </section>
  );
}
function EligibilityEditor({
  applicationId,
  courses,
}: {
  applicationId: string;
  courses: Course[];
}) {
  const path = `/admin/provider-applications/${applicationId}`;
  const config = usePrivateData<Configuration>(`${path}/service-configuration`);
  const policies = usePrivateData<Policy[]>("/admin/service-provider-policies");
  const branches = usePrivateData<Branch[]>("/admin/branches");
  const services = usePrivateData<Service[]>("/admin/services");
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [selectedGrantPolicy, setSelectedGrantPolicy] = useState("");
  if (config.isPending || policies.isPending || branches.isPending || services.isPending)
    return <p role="status">Đang tải cấu hình rà soát...</p>;
  if (config.isError || policies.isError || branches.isError || services.isError)
    return (
      <p role="alert">
        Chưa tải được cấu hình.{" "}
        <button
          onClick={() => {
            void config.refetch();
            void policies.refetch();
            void branches.refetch();
            void services.refetch();
          }}
        >
          Thử lại
        </button>
      </p>
    );
  const profile = config.data.profile;
  const review = config.data.review;
  const policy = policies.data.find((p) => p.id === selectedPolicy);
  const grantPolicy = policies.data.find((p) => p.id === selectedGrantPolicy);
  const grant = config.data.grants.find((g) => g.policyId === selectedGrantPolicy);
  const policyName = (p: Policy) =>
    `${services.data.find((s) => s.id === p.serviceId)?.name || "Dịch vụ"} · ${branches.data.find((b) => b.id === p.branchId)?.name || "Cơ sở"} · ${p.mode === "AT_HOME" ? "Tại nhà" : "Tại cơ sở"} · ${p.territoryLabel}${p.isActive ? "" : " · Ngưng"}`;
  return (
    <div className="market-two-column mt-6">
      <section>
        {profile && (
          <p>
            Hồ sơ đã lưu: {profile.title}
            {profile.yearsExperience != null
              ? ` · ${profile.yearsExperience} năm kinh nghiệm`
              : ""}{" "}
            · {profile.isPublished ? "Đã xuất bản" : "Bản nháp"}
          </p>
        )}
        {review && (
          <p>
            Chất lượng hiện tại:{" "}
            {
              (
                {
                  ACTIVE: "Hoạt động",
                  WATCHLIST: "Theo dõi",
                  PAUSED: "Tạm ngưng",
                  SUSPENDED: "Đình chỉ",
                } as Record<string, string>
              )[review.qualityStatus]
            }
          </p>
        )}
        <details className="market-admin-details">
          <summary>Rà soát hồ sơ công khai</summary>
          <AdminForm
            key={profile?.reviewedAt || "new-profile"}
            path={`${path}/public-profile`}
            label="Lưu hồ sơ công khai"
            fields={[
              {
                name: "slug",
                label: "Định danh hồ sơ",
                required: true,
                pattern: "[a-z0-9]+(-[a-z0-9]+)*",
                maxLength: 120,
                value: profile?.slug,
                help: "Chữ thường không dấu, số và dấu gạch ngang.",
              },
              {
                name: "title",
                label: "Chức danh đã kiểm tra",
                required: true,
                maxLength: 120,
                value: profile?.title,
              },
              {
                name: "yearsExperience",
                label: "Số năm kinh nghiệm đã kiểm tra",
                type: "number",
                min: 0,
                max: 60,
                value: profile?.yearsExperience,
              },
              {
                name: "isPublished",
                label: "Xuất bản hồ sơ sau khi được đồng ý công khai",
                type: "checkbox",
                value: profile?.isPublished,
              },
              {
                name: "accuracyConfirmed",
                label: "Tôi đã kiểm tra độ chính xác của chức danh và kinh nghiệm",
                type: "checkbox",
                required: true,
              },
              reason,
            ]}
          />
        </details>
        <details className="market-admin-details">
          <summary>Phân loại chuyên viên & chất lượng</summary>
          <AdminForm
            key={review?.reviewedAt || "new-review"}
            path={`${path}/operating-review`}
            label="Lưu đánh giá hoạt động"
            fields={[
              {
                name: "providerKind",
                label: "Loại chuyên viên",
                type: "select",
                required: true,
                value: review?.providerKind,
                options: [
                  { value: "WELLNESS", label: "Chuyên viên wellness" },
                  { value: "SPECIALIST", label: "Chuyên gia — cần điều kiện chuyên ngành" },
                ],
              },
              {
                name: "qualityStatus",
                label: "Trạng thái chất lượng",
                type: "select",
                required: true,
                value: review?.qualityStatus,
                options: [
                  { value: "ACTIVE", label: "Hoạt động" },
                  { value: "WATCHLIST", label: "Theo dõi — chưa nhận dịch vụ" },
                  { value: "PAUSED", label: "Tạm ngưng" },
                  { value: "SUSPENDED", label: "Đình chỉ" },
                ],
              },
              reason,
            ]}
          />
        </details>
        <details className="market-admin-details">
          <summary>Chính sách dịch vụ, đào tạo & khu vực</summary>
          <p>
            Áp dụng cho mọi chuyên viên được gán chính sách này. Chỉ ghi nhận kết quả rà soát thực
            tế; mã tham chiếu trỏ tới hồ sơ lưu riêng.
          </p>
          <label className="market-form">
            Chính sách cần chỉnh
            <select value={selectedPolicy} onChange={(e) => setSelectedPolicy(e.target.value)}>
              <option value="">Tạo chính sách mới</option>
              {policies.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {policyName(p)}
                </option>
              ))}
            </select>
          </label>
          <AdminForm
            key={(policy?.id || "new") + (policy?.reviewedAt || "")}
            path="/admin/service-provider-policies"
            label="Lưu chính sách dịch vụ"
            transform={expiryBody}
            fields={[
              {
                name: "serviceId",
                label: "Dịch vụ cần rà soát",
                type: "select",
                required: true,
                value: policy?.serviceId,
                options: services.data.map((s) => ({ value: s.id, label: s.name })),
              },
              {
                name: "branchId",
                label: "Cơ sở áp dụng chính sách",
                type: "select",
                required: true,
                value: policy?.branchId,
                options: branches.data.map((b) => ({ value: b.id, label: b.name })),
              },
              {
                name: "courseId",
                label: "Khóa đào tạo bắt buộc",
                type: "select",
                required: true,
                value: policy?.courseId,
                options: courses.map((c) => ({
                  value: c.id,
                  label: c.title + (c.isActive ? "" : " · Ngưng"),
                })),
              },
              {
                name: "mode",
                label: "Hình thức phục vụ",
                type: "select",
                required: true,
                value: policy?.mode,
                options: [
                  { value: "ON_SITE", label: "Tại cơ sở" },
                  { value: "AT_HOME", label: "Tại nhà" },
                ],
              },
              {
                name: "jurisdictionCode",
                label: "Mã khu vực quản lý",
                required: true,
                pattern: "[A-Z0-9_-]{2,64}",
                value: policy?.jurisdictionCode,
              },
              {
                name: "territoryLabel",
                label: "Tên phạm vi phục vụ",
                required: true,
                maxLength: 120,
                value: policy?.territoryLabel,
              },
              {
                name: "legalRequirement",
                label: "Kết quả rà soát yêu cầu chuyên ngành",
                type: "select",
                required: true,
                value: policy?.legalRequirement,
                options: [
                  { value: "LICENSE_REQUIRED", label: "Bắt buộc giấy phép/chứng chỉ chuyên ngành" },
                  {
                    value: "NOT_REQUIRED",
                    label: "Đã rà soát: không yêu cầu giấy phép riêng cho phạm vi này",
                  },
                ],
              },
              {
                name: "legalReviewReference",
                label: "Mã biên bản rà soát chính sách",
                required: true,
                pattern: reference,
                value: policy?.legalReviewReference,
                help: "Mã tham chiếu, không nhập giấy tờ cá nhân vào đây.",
              },
              {
                name: "validUntil",
                label: "Chính sách có hiệu lực đến hết ngày",
                type: "date",
                required: true,
                value: day(policy?.validUntil),
              },
              {
                name: "isActive",
                label: "Áp dụng chính sách",
                type: "checkbox",
                value: policy?.isActive,
              },
              {
                name: "legalReviewConfirmed",
                label:
                  "Tôi xác nhận đã rà soát đào tạo, hình thức và điều kiện pháp lý của phạm vi này",
                type: "checkbox",
                required: true,
              },
              reason,
            ]}
          />
          <p className="market-notice">
            Đổi dịch vụ, cơ sở, hình thức hoặc mã khu vực sẽ tạo phạm vi mới. Ngưng chính sách cũ
            nếu không còn áp dụng. Chuyên gia vẫn cần xác minh chuyên ngành kể cả khi chính sách
            không yêu cầu giấy phép riêng.
          </p>
        </details>
      </section>
      <section>
        <h3 className="market-subtitle">Phạm vi đã xác nhận cho chuyên viên</h3>
        {config.data.grants.map((g) => {
          const p = policies.data.find((p) => p.id === g.policyId);
          return (
            <p key={g.id}>
              {p ? policyName(p) : "Phạm vi dịch vụ"} · {g.isActive ? "Đang áp dụng" : "Đã ngưng"}
              {p?.mode === "AT_HOME"
                ? ` · Phí di chuyển ${formatPrice(g.travelFeeVnd)} · Buffer ${g.travelBufferMinutes} phút`
                : ""}
            </p>
          );
        })}
        {!config.data.grants.length && <p>Chưa có phạm vi được xác nhận.</p>}
        <details className="market-admin-details">
          <summary>Xác nhận hoặc ngưng phạm vi phục vụ</summary>
          <label className="market-form">
            Phạm vi cần xác nhận
            <select
              required
              value={selectedGrantPolicy}
              onChange={(e) => setSelectedGrantPolicy(e.target.value)}
            >
              <option value="">Chọn chính sách...</option>
              {policies.data.map((p) => (
                <option key={p.id} value={p.id}>
                  {policyName(p)}
                </option>
              ))}
            </select>
          </label>
          {grantPolicy && (
            <AdminForm
              key={grantPolicy.id + (grant?.reviewedAt || "new")}
              path={`${path}/service-grants`}
              label="Lưu phạm vi chuyên viên"
              transform={(body) =>
                expiryBody({
                  travelBufferMinutes: 0,
                  travelFeeVnd: 0,
                  ...body,
                  policyId: grantPolicy.id,
                })
              }
              fields={[
                {
                  name: "credentialReference",
                  label: "Mã biên bản xác minh chuyên ngành",
                  pattern: reference,
                  value: grant?.credentialReference,
                  help: "Bắt buộc khi kích hoạt phạm vi có yêu cầu chuyên ngành. Chỉ nhập mã hồ sơ kiểm tra, không nhập CCCD hoặc dữ liệu y tế.",
                },
                {
                  name: "credentialValidUntil",
                  label: "Xác minh chuyên ngành có hiệu lực đến hết ngày",
                  type: "date",
                  value: day(grant?.credentialValidUntil),
                },
                ...(grantPolicy.mode === "AT_HOME"
                  ? [
                      {
                        name: "travelBufferMinutes",
                        label: "Thời gian di chuyển dự phòng (phút)",
                        type: "number" as const,
                        required: true,
                        min: 0,
                        max: 240,
                        value: grant?.travelBufferMinutes ?? 0,
                      },
                      {
                        name: "travelFeeVnd",
                        label: "Phí di chuyển (VND)",
                        type: "number" as const,
                        required: true,
                        min: 0,
                        max: 100000000,
                        value: grant?.travelFeeVnd ?? 0,
                      },
                      {
                        name: "maxRadiusKm",
                        label: "Bán kính phục vụ từ cơ sở (km, nếu giới hạn)",
                        type: "number" as const,
                        min: 1,
                        max: 500,
                        value: grant?.maxRadiusKm,
                        help: "Cơ sở phải có tọa độ đã kiểm tra.",
                      },
                    ]
                  : []),
                {
                  name: "isActive",
                  label: "Áp dụng phạm vi này",
                  type: "checkbox",
                  value: grant?.isActive,
                },
                {
                  name: "conditionsConfirmed",
                  label: "Tôi đã kiểm tra điều kiện của chuyên viên trong phạm vi này",
                  type: "checkbox",
                  required: true,
                },
                reason,
              ]}
            />
          )}
          {grantPolicy?.mode === "ON_SITE" && (
            <p>Phục vụ tại cơ sở: phí di chuyển và thời gian dự phòng bằng 0.</p>
          )}
        </details>
      </section>
    </div>
  );
}
