"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Crown,
  HeartHandshake,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import "./customer-account-profile.css";

export type CustomerSelfProfile = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  customer: { id: string; birthday: string | null; avatarUrl: string | null };
  membership: { tier: "VIP" | "STANDARD"; expiresAt: string | null; startedAt: string | null };
  avatarUploadEnabled: boolean;
};

export const isActiveVip = (profile: CustomerSelfProfile | null | undefined): boolean =>
  !!profile &&
  profile.membership.tier === "VIP" &&
  (!profile.membership.expiresAt ||
    (Number.isFinite(Date.parse(profile.membership.expiresAt)) &&
      Date.parse(profile.membership.expiresAt) > Date.now()));

export function useCustomerSelfProfile() {
  const { user, authFetch } = useAuth();
  return useQuery({
    queryKey: ["customer", "self", user?.id],
    queryFn: () => authFetch<CustomerSelfProfile>("/customers/me", { cache: "no-store" }),
    enabled: !!user?.permissions.includes("customer.portal"),
    retry: false,
    staleTime: 30_000,
  });
}

function displayDate(value: string | null): string {
  if (!value) return "Không giới hạn";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Đang cập nhật"
    : new Intl.DateTimeFormat("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
}

const isValidAvatarUrl = (value: string | null) => !!value && /^https:\/\/[^\s]+$/i.test(value);

function CustomerPhoto({
  profile,
  onUpdate,
}: {
  profile: CustomerSelfProfile;
  onUpdate: (next: CustomerSelfProfile) => void;
}) {
  const { authFetch } = useAuth();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Chọn ảnh JPG, PNG hoặc WebP không quá 5 MB.");
      return;
    }
    setError("");
    setDone(false);
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function savePhoto() {
    if (!photo || busy) return;
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const data = new FormData();
      data.append("file", photo);
      const result = await authFetch<CustomerSelfProfile>("/customers/me/avatar", {
        method: "POST",
        body: data,
        cache: "no-store",
      });
      onUpdate(result);
      setPhoto(null);
      setPreview(null);
      setDone(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Chưa tải được ảnh lên. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mm-customer-photo-area">
      <div className={isActiveVip(profile) ? "mm-customer-photo is-vip" : "mm-customer-photo"}>
        {preview || isValidAvatarUrl(profile.customer.avatarUrl) ? (
          <Image
            unoptimized
            src={preview || profile.customer.avatarUrl!}
            alt={`Ảnh đại diện ${profile.displayName}`}
            width={184}
            height={184}
            sizes="(max-width: 650px) 112px, 160px"
          />
        ) : (
          <span aria-label="Chưa có ảnh đại diện">
            {profile.displayName.trim().charAt(0).toLocaleUpperCase("vi-VN") || "M"}
          </span>
        )}
        {isActiveVip(profile) && (
          <span className="mm-customer-photo-crown" aria-label="Hội viên VIP">
            <Crown size={19} fill="currentColor" />
          </span>
        )}
      </div>
      {profile.avatarUploadEnabled ? (
        <>
          <label className="mm-customer-photo-upload" htmlFor="customer-avatar-input">
            <Camera size={16} />
            {photo ? "Chọn ảnh khác" : "Thay ảnh đại diện"}
          </label>
          <input
            id="customer-avatar-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={chooseImage}
            disabled={busy}
          />
          {photo && (
            <div className="mm-customer-photo-actions">
              <button type="button" onClick={() => void savePhoto()} disabled={busy}>
                <Save size={14} />
                {busy ? "Đang tải..." : "Lưu ảnh"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPreview(null);
                }}
                disabled={busy}
                aria-label="Hủy chọn ảnh"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <small>Ảnh sẽ được cắt vuông, tối ưu WebP 384px và lưu trên CDN.</small>
        </>
      ) : (
        <small>Tính năng tải ảnh đang tạm bảo trì. Bạn vẫn có thể chỉnh thông tin cá nhân.</small>
      )}
      {done && (
        <p className="mm-customer-photo-ok" role="status">
          <CheckCircle2 size={14} />
          Đã cập nhật ảnh đại diện.
        </p>
      )}
      {error && (
        <p className="mm-customer-photo-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function CustomerProfileContent({
  profile,
  onUpdate,
}: {
  profile: CustomerSelfProfile;
  onUpdate: (next: CustomerSelfProfile) => void;
}) {
  const { authFetch, refresh } = useAuth();
  const [name, setName] = useState(profile.displayName);
  const [phone, setPhone] = useState(profile.phone || "");
  const [birthday, setBirthday] = useState(profile.customer.birthday?.slice(0, 10) || "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const vip = isActiveVip(profile);

  const changed =
    name.trim() !== profile.displayName ||
    phone.trim() !== (profile.phone || "") ||
    birthday !== (profile.customer.birthday?.slice(0, 10) || "");

  async function saveInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !changed || name.trim().length < 2) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await authFetch<CustomerSelfProfile>("/customers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim(),
          phone: phone.trim() || null,
          birthday: birthday || null,
        }),
        cache: "no-store",
      });
      onUpdate(next);
      await refresh();
      setNotice("Đã lưu thông tin cá nhân.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Chưa lưu được thông tin. Vui lòng thử lại.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={vip ? "mm-customer-overview is-vip" : "mm-customer-overview"}
      id="thong-tin-tai-khoan"
      aria-label="Hồ sơ khách hàng"
    >
      <div className="mm-customer-identity">
        <span className="mm-customer-eyebrow">
          <Sparkles size={14} /> HỒ SƠ CÁ NHÂN
        </span>
        <CustomerPhoto profile={profile} onUpdate={onUpdate} />
        <h2>{profile.displayName}</h2>
        {vip ? (
          <div className="mm-customer-vip-mark">
            <Crown size={18} fill="currentColor" /> HỘI VIÊN VIP <BadgeCheck size={16} />
          </div>
        ) : (
          <div className="mm-customer-normal-mark">
            <HeartHandshake size={16} /> Thành viên Mộc Maria
          </div>
        )}
        <p className="mm-customer-identity-desc">
          {vip
            ? "Cảm ơn bạn đã đồng hành cùng Mộc Maria. Đặc quyền hội viên của bạn đang được ghi nhận."
            : "Mỗi trải nghiệm chăm sóc bắt đầu từ một hồ sơ thật riêng, thật chu đáo."}
        </p>
        <div className={vip ? "mm-customer-membership is-vip" : "mm-customer-membership"}>
          <span>{vip ? <Crown size={20} fill="currentColor" /> : <ShieldCheck size={19} />}</span>
          <div>
            <strong>{vip ? "Hội viên VIP đang hiệu lực" : "Thành viên tiêu chuẩn"}</strong>
            <small>
              {vip
                ? `Thời hạn: ${displayDate(profile.membership.expiresAt)}`
                : "Thông tin hội viên được cập nhật theo hồ sơ của bạn"}
            </small>
          </div>
          <CheckCircle2 size={17} />
        </div>
        <Link href="/hoi-vien" className="mm-customer-membership-link">
          Khám phá chương trình hội viên <ArrowUpRight size={16} />
        </Link>
      </div>

      <div className="mm-customer-details">
        <div className="mm-customer-detail-heading">
          <div>
            <span className="mm-customer-eyebrow">TÀI KHOẢN CỦA BẠN</span>
            <h2>Thông tin cá nhân</h2>
            <p>Giữ hồ sơ đầy đủ để việc đặt lịch và chăm sóc được thuận tiện hơn.</p>
          </div>
          <span className="mm-customer-detail-icon">
            <UserRound size={22} />
          </span>
        </div>
        <form className="mm-customer-profile-form" onSubmit={(event) => void saveInfo(event)}>
          <label>
            <span>
              <UserRound size={15} /> Họ và tên
            </span>
            <input
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={160}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            <span>
              <Phone size={15} /> Số điện thoại
            </span>
            <input
              type="tel"
              autoComplete="tel"
              maxLength={32}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Số điện thoại liên hệ"
            />
          </label>
          <label>
            <span>
              <CalendarDays size={15} /> Ngày sinh (tùy chọn)
            </span>
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={birthday}
              onChange={(event) => setBirthday(event.target.value)}
            />
          </label>
          <label>
            <span>
              <Mail size={15} /> Email đăng nhập
            </span>
            <input
              type="email"
              value={profile.email || "Chưa cập nhật"}
              readOnly
              aria-readonly="true"
            />
          </label>
          <p className="mm-customer-readonly">
            <ShieldCheck size={15} /> Email đăng nhập được bảo vệ; cần xác minh riêng trước khi thay
            đổi.
          </p>
          <button
            className="mm-customer-save"
            disabled={busy || !changed || name.trim().length < 2}
            type="submit"
          >
            <Save size={17} />
            {busy ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
          {notice && (
            <p className="mm-customer-success" role="status">
              <CheckCircle2 size={17} />
              {notice}
            </p>
          )}
          {error && (
            <p className="mm-customer-error" role="alert">
              {error}
            </p>
          )}
        </form>
        <div className="mm-customer-safety">
          <Clock3 size={17} /> Thông tin chỉ dành cho tài khoản của bạn. Ảnh đại diện đã được tối ưu
          để tải nhanh trên điện thoại.
        </div>
      </div>
    </section>
  );
}

export function CustomerAccountProfile() {
  const profile = useCustomerSelfProfile();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  if (profile.isPending)
    return (
      <div className="mm-customer-overview mm-customer-loading" role="status">
        Đang tải hồ sơ và hạng hội viên của bạn...
      </div>
    );
  if (profile.isError || !profile.data)
    return (
      <div className="mm-customer-overview mm-customer-loading" role="alert">
        Chưa tải được hồ sơ khách hàng.{" "}
        <button type="button" onClick={() => void profile.refetch()}>
          Thử lại
        </button>
      </div>
    );
  function update(next: CustomerSelfProfile) {
    queryClient.setQueryData(["customer", "self", user?.id], next);
    void queryClient.invalidateQueries({ queryKey: ["private", user?.id] });
  }
  return (
    <CustomerProfileContent
      key={[
        profile.data.id,
        profile.data.displayName,
        profile.data.phone,
        profile.data.customer.birthday,
      ].join("|")}
      profile={profile.data}
      onUpdate={update}
    />
  );
}
