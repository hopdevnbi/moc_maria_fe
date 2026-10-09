"use client";
import { AdminForm } from "./admin-form";
import { usePrivateData } from "./private-api";
import type { ProviderReadiness } from "./types";

export function ProviderReadinessPanel({
  applicationId,
  canVerify = false,
}: {
  applicationId?: string;
  canVerify?: boolean;
}) {
  const isAdmin = !!applicationId;
  const base = applicationId
    ? `/admin/provider-applications/${applicationId}`
    : "/provider-applications/me";
  const query = usePrivateData<ProviderReadiness | null>(`${base}/eligibility`);
  if (query.isPending) return <p role="status">Đang kiểm tra điều kiện hồ sơ...</p>;
  if (query.isError)
    return (
      <p role="alert">
        Chưa tải được điều kiện hồ sơ. <button onClick={() => void query.refetch()}>Thử lại</button>
      </p>
    );
  if (!query.data) return null;
  const readiness = query.data;
  return (
    <section className="market-panel mt-6">
      <h2>Điều kiện hồ sơ</h2>
      <dl className="market-definition">
        <div>
          <dt>Kinh nghiệm và khu vực</dt>
          <dd>{readiness.profileComplete ? "Đã cung cấp" : "Cần bổ sung"}</dd>
        </div>
        <div>
          <dt>Đồng ý xử lý hồ sơ</dt>
          <dd>{readiness.applicationConsent ? "Đã đồng ý" : "Chưa đồng ý"}</dd>
        </div>
        <div>
          <dt>Kênh liên hệ</dt>
          <dd>{readiness.contactVerified ? "Đã được Mộc xác minh" : "Cần Mộc xác minh"}</dd>
        </div>
        <div>
          <dt>Cho phép công khai hồ sơ</dt>
          <dd>{readiness.publicConsent ? "Đã cho phép" : "Chưa cho phép"}</dd>
        </div>
      </dl>
      <p className="market-notice">
        {readiness.reviewReady
          ? "Đã đủ thông tin để Mộc xem xét hồ sơ."
          : "Cần hoàn tất thông tin và xác minh trước khi phê duyệt."}{" "}
        Quyền nhận lịch còn cần kỹ năng, điều kiện dịch vụ và lịch phục vụ. Chưa mở nhận booking.
      </p>
      {!isAdmin && (
        <>
          <AdminForm
            title="Quyền sử dụng thông tin của bạn"
            path="/provider-applications/me/consent"
            label="Lưu đồng ý xử lý hồ sơ"
            fields={[
              {
                name: "granted",
                label:
                  "Tôi đồng ý để Mộc Maria sử dụng thông tin ứng tuyển, kinh nghiệm và liên hệ để xét duyệt, tổ chức đào tạo và đánh giá hồ sơ.",
                type: "checkbox",
                value: readiness.applicationConsent,
              },
            ]}
            transform={(body) => ({
              ...body,
              scope: "APPLICATION_REVIEW",
              version: readiness.consentVersion,
            })}
          />
          <AdminForm
            path="/provider-applications/me/consent"
            label="Lưu quyền công khai hồ sơ"
            fields={[
              {
                name: "granted",
                label:
                  "Tôi cho phép công bố tên giới thiệu, kinh nghiệm và khu vực phục vụ sau khi hồ sơ đáp ứng điều kiện và được duyệt. Không công bố liên hệ riêng, giấy tờ hoặc địa chỉ nhà.",
                type: "checkbox",
                value: readiness.publicConsent,
              },
            ]}
            transform={(body) => ({
              ...body,
              scope: "PUBLIC_PROFILE",
              version: readiness.consentVersion,
            })}
          />
          <p className="market-notice">
            Bạn có thể bỏ chọn và lưu để rút lại đồng ý. Rút quyền công khai sẽ ẩn hồ sơ ngay. Đổi
            email hoặc số điện thoại cần xác minh lại. Mộc xác minh bằng trao đổi trực tiếp; chưa
            dùng OTP tự động.
          </p>
        </>
      )}
      {isAdmin && canVerify && (
        <AdminForm
          title="Ghi nhận liên hệ đã kiểm tra"
          path={`${base}/contact-verifications`}
          label="Ghi nhận xác minh"
          fields={[
            {
              name: "channel",
              label: "Kênh đã trao đổi",
              type: "select",
              required: true,
              options: [
                { value: "EMAIL", label: "Email" },
                { value: "PHONE", label: "Số điện thoại" },
              ],
            },
            {
              name: "contactValue",
              label: "Email/số điện thoại đã xác nhận",
              required: true,
              maxLength: 320,
              help: "Phải khớp kênh liên hệ hiện tại của tài khoản ứng viên.",
            },
            {
              name: "evidenceReference",
              label: "Mã biên bản xác minh",
              required: true,
              maxLength: 100,
              pattern: "[A-Za-z0-9_-]+",
              help: "Chỉ nhập mã tham chiếu nội bộ. Không nhập CCCD, nội dung trao đổi hoặc thông tin y tế.",
            },
            {
              name: "confirmedByContact",
              label:
                "Tôi đã trao đổi qua kênh này và kiểm tra ứng viên có quyền sử dụng kênh liên hệ.",
              type: "checkbox",
              required: true,
            },
          ]}
        />
      )}
      {readiness.contacts
        .filter((contact) => contact.isCurrent)
        .map((contact) => (
          <div className="market-variant" key={contact.id}>
            <p>
              {contact.channel === "EMAIL" ? "Email" : "Điện thoại"} đã kiểm tra ngày{" "}
              {new Date(contact.verifiedAt).toLocaleDateString("vi-VN")}
              {isAdmin && contact.evidenceReference ? ` · ${contact.evidenceReference}` : ""}
            </p>
            {isAdmin && canVerify && (
              <AdminForm
                path={`${base}/contact-verifications/${contact.id}/revoke`}
                method="PATCH"
                label="Thu hồi xác minh"
                fields={[
                  {
                    name: "confirm",
                    label: "Cần xác minh lại kênh này",
                    type: "checkbox",
                    required: true,
                  },
                ]}
                transform={() => undefined}
              />
            )}
          </div>
        ))}
    </section>
  );
}
