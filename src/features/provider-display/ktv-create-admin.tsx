"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Copy, Plus, UserRoundPlus, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { mutationMessage, usePrivateData } from "@/features/marketplace/private-api";
import { officialLegacyCareItem } from "@/features/mobile/official-ktv-offers";
import { KtvMediaAdmin } from "./ktv-media-admin";
import "./ktv-create-admin.css";

type CreatedKtv = {
  userId: string;
  providerId: string;
  alias: string;
  username: string;
  temporaryPassword: string;
  mustChangePassword: true;
};

const serviceIds = [
  "demo-relaxation",
  "demo-hot-stone",
  "demo-neck",
  "demo-foot",
  "demo-herbal",
  "demo-pressure",
  "demo-aroma",
  "demo-thai",
  "demo-back",
  "demo-hair",
] as const;

export function KtvCreateAdmin({ onCreated }: { onCreated: () => void }) {
  const { authFetch, user } = useAuth();
  const feature = usePrivateData<{ createKtv: boolean }>(
    "/admin/provider-display/ktv/capabilities",
  );
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedKtv | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [publicName, setPublicName] = useState("");
  const [title, setTitle] = useState("");
  const [serviceArea, setServiceArea] = useState("Hà Nội");
  const [introduction, setIntroduction] = useState("");
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;
  if (!isSuperAdmin) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || created) return;
    setSaving(true);
    setError("");
    try {
      const result = await authFetch<CreatedKtv>("/admin/provider-display/ktv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          publicName: publicName.trim(),
          title: title.trim(),
          serviceArea: serviceArea.trim(),
          introduction: introduction.trim(),
          serviceIds: selected,
        }),
      });
      setCreated(result);
      onCreated();
    } catch (caught) {
      setError(mutationMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  function close() {
    if (saving) return;
    setOpen(false);
    setError("");
    setCreated(null);
    setSelected([]);
    setPublicName("");
    setTitle("");
    setServiceArea("Hà Nội");
    setIntroduction("");
  }

  return (
    <>
      <button
        className="pd-primary ktv-create-trigger"
        type="button"
        onClick={() => setOpen(true)}
        disabled={feature.isPending || !feature.data?.createKtv}
        title={
          feature.data?.createKtv
            ? "Tạo tài khoản kỹ thuật viên mới"
            : "Chờ Backend kích hoạt chức năng"
        }
      >
        <UserRoundPlus size={17} /> Tạo mới KTV
      </button>
      {open && (
        <div className="ktv-create-backdrop">
          <div
            className="ktv-create-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ktv-create-title"
          >
            <header className="ktv-create-header">
              <div>
                <span className="pd-eyebrow">QUẢN TRỊ KỸ THUẬT VIÊN</span>
                <h3 id="ktv-create-title">
                  {created ? "Hoàn thiện hồ sơ KTV" : "Tạo kỹ thuật viên mới"}
                </h3>
                <p>
                  {created
                    ? "Lưu thông tin đăng nhập, tải ảnh/video rồi kiểm tra trang cá nhân."
                    : "Tạo tài khoản riêng, chọn dịch vụ và bổ sung media. Không tự duyệt đào tạo hoặc nhận lịch."}
                </p>
              </div>
              <button type="button" aria-label="Đóng tạo KTV" disabled={saving} onClick={close}>
                <X size={20} />
              </button>
            </header>
            <div className="ktv-create-body">
              {!created ? (
                <form className="ktv-create-form" onSubmit={(event) => void submit(event)}>
                  <div className="ktv-create-pair">
                    <label>
                      Tên KTV
                      <input
                        required
                        minLength={2}
                        maxLength={160}
                        value={publicName}
                        onChange={(e) => setPublicName(e.target.value)}
                        placeholder="Ví dụ: Thanh Thanh"
                      />
                    </label>
                    <label>
                      Chuyên môn / danh xưng
                      <input
                        maxLength={160}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ví dụ: Kỹ thuật viên giải cơ sâu"
                      />
                    </label>
                  </div>
                  <label>
                    Khu vực phục vụ
                    <input
                      maxLength={160}
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                    />
                  </label>
                  <label>
                    Giới thiệu
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={introduction}
                      onChange={(e) => setIntroduction(e.target.value)}
                      placeholder="Thế mạnh, phong cách chăm sóc và kinh nghiệm đã xác minh"
                    />
                  </label>
                  <fieldset className="ktv-create-services">
                    <legend>Danh sách dịch vụ hiển thị</legend>
                    <p>Chọn các dịch vụ thực tế KTV đảm nhận. Giá lấy từ bảng giá Mộc Maria.</p>
                    <div>
                      {serviceIds.map((id) => {
                        const item = officialLegacyCareItem(id);
                        return (
                          <label key={id}>
                            <input
                              type="checkbox"
                              checked={selected.includes(id)}
                              onChange={(event) =>
                                setSelected((list) =>
                                  event.target.checked
                                    ? [...list, id]
                                    : list.filter((value) => value !== id),
                                )
                              }
                            />
                            <span>{item?.name ?? id}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <p className="ktv-create-footnote">
                    Hệ thống tự tạo tên đăng nhập và mật khẩu mạnh. KTV phải đổi mật khẩu lần đầu.
                    Quyền đặt lịch và chứng nhận chuyên môn không được tự động cấp.
                  </p>
                  {error && (
                    <p className="pd-error" role="alert">
                      {error}
                    </p>
                  )}
                  <button
                    className="pd-primary"
                    type="submit"
                    disabled={saving || !publicName.trim()}
                  >
                    <Plus size={17} /> {saving ? "Đang tạo tài khoản..." : "Tạo tài khoản KTV"}
                  </button>
                </form>
              ) : (
                <div className="ktv-create-success">
                  <p className="ktv-create-success-title">
                    <CheckCircle2 size={20} /> Đã tạo hồ sơ và tài khoản đăng nhập riêng.
                  </p>
                  <p>
                    Hãy lưu ngay mật khẩu tạm. Hệ thống chỉ trả về một lần, không lưu hoặc hiển thị
                    lại mật khẩu trong trang quản trị.
                  </p>
                  <div className="ktv-create-credentials">
                    <div>
                      <small>Tài khoản</small>
                      <code>{created.username}</code>
                    </div>
                    <div>
                      <small>Mật khẩu tạm</small>
                      <code>{created.temporaryPassword}</code>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard?.writeText(
                          `Tài khoản: ${created.username}\nMật khẩu tạm: ${created.temporaryPassword}`,
                        )
                      }
                    >
                      <Copy size={16} /> Sao chép thông tin
                    </button>
                  </div>
                  <KtvMediaAdmin providerId={created.providerId} />
                  <div className="ktv-create-links">
                    <Link href={`/quan-tri/ktv/${created.providerId}`}>Quản lý hồ sơ</Link>
                    <Link href={`/chuyen-vien/${created.providerId}`} target="_blank">
                      Xem trang công khai
                    </Link>
                    <button type="button" onClick={close}>
                      Hoàn tất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
