"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { ApiError } from "@/features/auth/auth-api";
import { EmptyState } from "./components";
import { applicationLabels } from "./format";
import type { Application, Training } from "./types";
import { ProviderReadinessPanel } from "./provider-readiness";
import { AdminForm } from "./admin-form";
import { OwnProviderPlanning } from "./provider-planning";
import { OwnServiceReadiness } from "./provider-eligibility";
import { OwnTrainingSessions } from "./training-sessions";

function useApplication() {
  const { user, authFetch } = useAuth();
  return useQuery({
    queryKey: ["private", user?.id, "provider-application"],
    queryFn: () =>
      authFetch<Application | null>("/provider-applications/me", { cache: "no-store" }),
    enabled: !!user,
    retry: false,
  });
}

function PortalNavigation() {
  return (
    <nav className="market-portal-nav" aria-label="Hồ sơ chuyên viên">
      <Link href="/ktv/ho-so">
        <ClipboardList size={17} /> Hồ sơ ứng tuyển
      </Link>
      <Link href="/ktv/dao-tao">
        <GraduationCap size={17} /> Đào tạo & chứng nhận
      </Link>
      <Link href="/tai-khoan">Tài khoản của tôi</Link>
    </nav>
  );
}

export function ApplicationPortal() {
  return (
    <RequireAuth>
      <ApplicationContent />
    </RequireAuth>
  );
}

function ApplicationContent() {
  const application = useApplication();
  return (
    <>
      <PortalNavigation />
      {application.isPending ? (
        <p role="status">Đang tải hồ sơ của bạn...</p>
      ) : application.isError ? (
        <EmptyState title="Chưa tải được hồ sơ" error>
          <p>Kết nối đang gián đoạn. Vui lòng thử lại.</p>
          <button className="market-button" onClick={() => void application.refetch()}>
            Tải lại hồ sơ
          </button>
        </EmptyState>
      ) : application.data ? (
        <ApplicationSummary application={application.data} />
      ) : (
        <ApplicationForm />
      )}
    </>
  );
}

function ApplicationSummary({ application }: { application: Application }) {
  return (
    <div className="market-two-column">
      <article className="market-panel">
        <span className="market-badge">
          <ClipboardList size={15} />
          {applicationLabels[application.status] || application.status}
        </span>
        <h2 className="mt-6!">{application.publicName}</h2>
        <dl className="market-definition">
          <div>
            <dt>Khu vực mong muốn phục vụ</dt>
            <dd>{application.serviceArea || "Chưa cập nhật"}</dd>
          </div>
          <div>
            <dt>Kinh nghiệm & giới thiệu</dt>
            <dd className="whitespace-pre-line">{application.introduction || "Chưa cập nhật"}</dd>
          </div>
        </dl>
        {application.reviewNote && (
          <p className="market-notice">Phản hồi từ Mộc: {application.reviewNote}</p>
        )}
        <ProviderReadinessPanel />
        {application.status !== "APPROVED" && (
          <AdminForm
            title="Bổ sung thông tin ứng tuyển"
            path="/provider-applications/me"
            method="PATCH"
            label="Lưu hồ sơ ứng tuyển"
            fields={[
              {
                name: "publicName",
                label: "Tên hiển thị mong muốn",
                required: true,
                maxLength: 160,
                value: application.publicName,
              },
              {
                name: "serviceArea",
                label: "Khu vực mong muốn phục vụ",
                required: true,
                maxLength: 160,
                value: application.serviceArea,
              },
              {
                name: "introduction",
                label: "Giới thiệu kinh nghiệm",
                type: "textarea",
                required: true,
                maxLength: 500,
                value: application.introduction,
                help: "Không nhập CCCD, hồ sơ y tế hay thông tin khách hàng.",
              },
            ]}
          />
        )}
      </article>
      <aside className="market-panel">
        <h2>Bước tiếp theo của bạn</h2>
        <p>
          Mộc sẽ xem xét hồ sơ, trao đổi về kinh nghiệm và chỉ định đào tạo phù hợp. Bạn có thể theo
          dõi khóa học và chứng nhận tại khu vực đào tạo.
        </p>
        <Link className="market-button" href="/ktv/dao-tao">
          Theo dõi đào tạo
          <ArrowUpRight size={17} />
        </Link>
        <p className="market-notice">
          Hồ sơ được duyệt chưa tự động mở nhận lịch. Điều kiện chuyên môn, khu vực và lịch phục vụ
          cần được xác minh riêng.
        </p>
        <OwnProviderPlanning />
        <OwnServiceReadiness />
      </aside>
    </div>
  );
}

function ApplicationForm() {
  const { user, authFetch } = useAuth();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const mutation = useMutation({
    mutationFn: (body: {
      publicName: string;
      introduction: string;
      serviceArea: string;
      applicationConsentVersion: string;
    }) =>
      authFetch<Application>("/provider-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      }),
    onSuccess: (data) =>
      queryClient.setQueryData(["private", user?.id, "provider-application"], data),
  });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const form = new FormData(event.currentTarget);
    if (form.get("consent") !== "on") {
      setNotice("Vui lòng đọc và chọn đồng ý sử dụng thông tin để xét duyệt hồ sơ.");
      return;
    }
    const body = {
      publicName: String(form.get("publicName") || "").trim(),
      introduction: String(form.get("introduction") || "").trim(),
      serviceArea: String(form.get("serviceArea") || "").trim(),
      applicationConsentVersion: "provider-consent-v1",
    };
    if (body.publicName.length < 2 || !body.introduction || !body.serviceArea) {
      setNotice("Vui lòng điền đầy đủ tên, kinh nghiệm và khu vực mong muốn phục vụ.");
      return;
    }
    setNotice("");
    try {
      await mutation.mutateAsync(body);
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? error.message
          : "Chưa gửi được hồ sơ. Vui lòng kiểm tra kết nối và thử lại.",
      );
    }
  }
  return (
    <div className="market-two-column">
      <section className="market-panel">
        <h2>Bắt đầu hành trình cùng Mộc</h2>
        <form onSubmit={submit} className="market-form">
          <label>
            Tên hiển thị mong muốn
            <input
              name="publicName"
              defaultValue={user?.displayName}
              required
              minLength={2}
              maxLength={160}
              autoComplete="name"
            />
          </label>
          <label>
            Khu vực mong muốn phục vụ
            <input
              name="serviceArea"
              required
              maxLength={160}
              placeholder="Quận/huyện, tỉnh/thành phố"
            />
          </label>
          <label>
            Giới thiệu kinh nghiệm
            <textarea
              name="introduction"
              required
              maxLength={500}
              placeholder="Chia sẻ kinh nghiệm, lĩnh vực bạn quan tâm và mong muốn đồng hành cùng Mộc."
            />
            <small>
              Chỉ chia sẻ thông tin cần cho ứng tuyển. Không nhập CCCD, hồ sơ y tế hay thông tin
              khách hàng.
            </small>
          </label>
          <label className="market-check">
            <input type="checkbox" name="consent" required />
            Tôi đồng ý để Mộc Maria sử dụng thông tin ứng tuyển, kinh nghiệm và liên hệ để xét
            duyệt, tổ chức đào tạo và đánh giá hồ sơ. Việc ứng tuyển không tự cấp quyền hành nghề
            hoặc nhận lịch.
          </label>
          {notice && (
            <p className="market-notice" role="alert">
              {notice}
            </p>
          )}
          <button className="market-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Đang gửi hồ sơ..." : "Gửi hồ sơ ứng tuyển"}
            <ArrowUpRight size={17} />
          </button>
        </form>
      </section>
      <aside className="market-panel">
        <h2>Đồng hành bằng sự tận tâm</h2>
        <p>
          Mộc xem xét từng hồ sơ, hướng dẫn đào tạo và đánh giá tay nghề trước khi duyệt chuyên
          viên.
        </p>
        <ol className="market-process">
          <li>Gửi thông tin và kinh nghiệm của bạn.</li>
          <li>Trao đổi, xác minh hồ sơ cùng Mộc.</li>
          <li>Tham gia đào tạo và đánh giá được chỉ định.</li>
          <li>Hoàn tất điều kiện phục vụ từng dịch vụ.</li>
        </ol>
        <p className="market-notice">
          Chứng nhận tại đây là chứng nhận đào tạo nội bộ Mộc Maria. Các dịch vụ chuyên ngành có yêu
          cầu pháp lý cần được xác minh riêng.
        </p>
      </aside>
    </div>
  );
}

export function TrainingPortal() {
  return (
    <RequireAuth>
      <TrainingContent />
    </RequireAuth>
  );
}

function TrainingContent() {
  const { user, authFetch } = useAuth();
  const application = useApplication();
  const training = useQuery({
    queryKey: ["private", user?.id, "provider-training"],
    queryFn: () => authFetch<Training>("/provider-applications/me/training", { cache: "no-store" }),
    enabled: !!user && !!application.data,
    retry: false,
  });
  if (application.isPending) return <p role="status">Đang tải hồ sơ...</p>;
  if (application.isError || training.isError)
    return (
      <EmptyState title="Chưa tải được thông tin đào tạo" error>
        <button
          className="market-button"
          onClick={() => {
            void application.refetch();
            void training.refetch();
          }}
        >
          Thử lại
        </button>
      </EmptyState>
    );
  if (!application.data)
    return (
      <EmptyState title="Bạn chưa gửi hồ sơ ứng tuyển">
        <p>Gửi hồ sơ để Mộc có thể trao đổi và chỉ định khóa học phù hợp.</p>
        <Link href="/ktv/ho-so">Gửi hồ sơ của bạn</Link>
      </EmptyState>
    );
  if (training.isPending) return <p role="status">Đang tải đào tạo & chứng nhận...</p>;
  return (
    <>
      <PortalNavigation />
      <OwnTrainingSessions />
      <div className="market-two-column">
        <section>
          <h2 className="market-subtitle">Khóa học được chỉ định</h2>
          {training.data.enrollments.length ? (
            training.data.enrollments.map(({ enrollment, course }) => (
              <article className="market-panel mb-6" key={enrollment.id}>
                <span className="market-badge">
                  <GraduationCap size={15} />
                  {(
                    {
                      ENROLLED: "Đã ghi danh",
                      IN_PROGRESS: "Đang học",
                      COMPLETED: "Đã hoàn thành",
                      FAILED: "Cần đào tạo thêm",
                    } as Record<string, string>
                  )[enrollment.status] || enrollment.status}
                </span>
                <h2 className="mt-5!">{course?.title || "Khóa học được chỉ định"}</h2>
                <p>{course?.description}</p>
                <dl className="market-definition">
                  <div>
                    <dt>Tham gia đào tạo</dt>
                    <dd>{enrollment.currentAttendancePercent ?? enrollment.attendancePercent}%</dd>
                  </div>
                  <div>
                    <dt>Đánh giá tay nghề</dt>
                    <dd>
                      {!enrollment.assessedAt
                        ? "Chưa đánh giá"
                        : enrollment.evidenceCurrent
                          ? "Đạt, còn hiệu lực"
                          : enrollment.assessmentPassed
                            ? "Cần rà soát lại kết quả"
                            : "Cần cải thiện"}
                    </dd>
                  </div>
                </dl>
              </article>
            ))
          ) : (
            <EmptyState title="Chưa có khóa học được chỉ định">
              <p>Mộc sẽ cập nhật khóa học phù hợp sau khi xem xét hồ sơ của bạn.</p>
            </EmptyState>
          )}
        </section>
        <section>
          <h2 className="market-subtitle">Chứng nhận nội bộ</h2>
          {training.data.certificates.length ? (
            training.data.certificates.map((certificate) => {
              const valid = certificate.isValid;
              return (
                <article className="market-panel mb-6" key={certificate.id}>
                  <span className="market-badge">
                    {valid ? <ShieldCheck size={15} /> : <CheckCircle2 size={15} />}
                    {certificate.revokedAt
                      ? "Đã thu hồi"
                      : valid
                        ? "Còn hiệu lực"
                        : "Chưa đủ điều kiện hiệu lực"}
                  </span>
                  <h2 className="mt-5!">{certificate.title}</h2>
                  <dl className="market-definition">
                    <div>
                      <dt>Số chứng nhận</dt>
                      <dd>{certificate.certificateNumber}</dd>
                    </div>
                    <div>
                      <dt>Ngày cấp</dt>
                      <dd>{new Date(certificate.issuedAt).toLocaleDateString("vi-VN")}</dd>
                    </div>
                    <div>
                      <dt>Ngày hết hạn</dt>
                      <dd>
                        {certificate.expiresAt
                          ? new Date(certificate.expiresAt).toLocaleDateString("vi-VN")
                          : "Không ghi ngày hết hạn"}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })
          ) : (
            <EmptyState title="Chưa có chứng nhận">
              <p>
                Chứng nhận được cấp bởi người có thẩm quyền khi bạn hoàn thành và đạt đánh giá khóa
                học.
              </p>
            </EmptyState>
          )}
          <p className="market-notice">
            Chứng nhận đào tạo nội bộ không thay thế giấy phép hành nghề chuyên ngành do cơ quan có
            thẩm quyền cấp.
          </p>
        </section>
      </div>
    </>
  );
}
