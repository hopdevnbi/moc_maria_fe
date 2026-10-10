"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  Crown,
  LockKeyhole,
  LogOut,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { ChangePasswordForm } from "@/features/auth/components/ChangePasswordForm";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { mutationMessage, usePrivateData } from "./private-api";
import type { AdminStaffProfile } from "./admin-profile-types";
import "./admin-profile.css";

function AdminAccountForm({ profile }: { profile: AdminStaffProfile }) {
  const { authFetch, user, refresh, logout, logoutAll } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [publicName, setPublicName] = useState(profile.staff.publicName);
  const [bio, setBio] = useState(profile.staff.bio ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState<"profile" | "avatar" | "logout" | "logout-all" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function syncProfile() {
    await queryClient.invalidateQueries({ queryKey: ["private", user?.id, "/staff/me"] });
    await refresh();
  }
  async function saveInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving("profile");
    setNotice("");
    setError("");
    try {
      await authFetch("/staff/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          publicName: publicName.trim(),
          bio: bio.trim() || null,
        }),
      });
      await syncProfile();
      setNotice("Đã lưu thông tin hồ sơ quản trị.");
    } catch (cause) {
      setError(mutationMessage(cause));
    } finally {
      setSaving(null);
    }
  }
  function selectAvatar(file: File | undefined) {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    if (!file) {
      setAvatarPreview(null);
      setPendingFile(null);
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Chọn ảnh JPG, PNG hoặc WebP có dung lượng tối đa 5MB.");
      setPendingFile(null);
      setAvatarPreview(null);
      return;
    }
    setError("");
    setPendingFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }
  async function uploadAvatar() {
    if (!pendingFile || saving) return;
    setSaving("avatar");
    setError("");
    setNotice("");
    try {
      const data = new FormData();
      data.append("file", pendingFile);
      await authFetch("/staff/me/avatar", { method: "POST", body: data });
      await syncProfile();
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
      setPendingFile(null);
      setNotice("Đã cập nhật ảnh đại diện. Hệ thống đã tối ưu ảnh để tải nhanh trên điện thoại.");
    } catch (cause) {
      setError(mutationMessage(cause));
    } finally {
      setSaving(null);
    }
  }
  async function signOut(all: boolean) {
    if (saving) return;
    setSaving(all ? "logout-all" : "logout");
    setError("");
    try {
      if (all) await logoutAll();
      else await logout();
      router.replace("/dang-nhap");
    } catch (cause) {
      setError(mutationMessage(cause));
      setSaving(null);
    }
  }
  const avatar = avatarPreview || profile.staff.avatarUrl;
  return (
    <div className="mm-admin-profile-layout">
      <section className="mm-admin-profile-panel mm-admin-avatar-panel">
        <span className="mm-admin-profile-eyebrow">HỒ SƠ CÁ NHÂN</span>
        <div className="mm-admin-profile-image">
          {avatar?.startsWith("https://") || avatarPreview ? (
            <Image
              src={avatar!}
              width={112}
              height={112}
              alt="Ảnh đại diện quản trị viên"
              unoptimized
            />
          ) : (
            <span>{profile.displayName.charAt(0).toUpperCase()}</span>
          )}
          {profile.avatarUploadEnabled && (
            <>
              <label
                htmlFor="mm-admin-upload-avatar"
                className="mm-admin-avatar-upload-button"
                title="Chọn ảnh đại diện"
              >
                <Camera size={18} />
                <span className="sr-only">Chọn ảnh đại diện</span>
              </label>
              <input
                id="mm-admin-upload-avatar"
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => selectAvatar(event.target.files?.[0])}
              />
            </>
          )}
        </div>
        <h2>{profile.displayName}</h2>
        <p className="mm-admin-profile-role">
          <Crown size={15} />
          {profile.roles.includes("SUPER_ADMIN") ? "Super Admin" : "Quản trị nội bộ"}
        </p>
        <p className="mm-admin-profile-hint">
          Chọn ảnh vuông hoặc ảnh chân dung rõ nét. Ảnh được cắt giữa, chuyển WebP kích thước 384px
          và lưu lên CDN.
        </p>
        {!profile.avatarUploadEnabled && (
          <p className="mm-admin-profile-hint">
            Tải ảnh lên CDN đang chờ kết nối kho lưu trữ an toàn. Các chức năng hồ sơ khác vẫn hoạt
            động.
          </p>
        )}
        {pendingFile && (
          <button
            className="mm-admin-profile-primary"
            type="button"
            onClick={() => void uploadAvatar()}
            disabled={!!saving}
          >
            <Camera size={16} />
            {saving === "avatar" ? "Đang tải ảnh..." : "Lưu ảnh đại diện"}
          </button>
        )}
        <div className="mm-admin-profile-contacts">
          <div>
            <Mail size={16} />
            <span>
              <small>Email đăng nhập</small>
              {profile.email || "Chưa cập nhật"}
            </span>
          </div>
          <div>
            <Phone size={16} />
            <span>
              <small>Số điện thoại</small>
              {profile.phone || "Chưa cập nhật"}
            </span>
          </div>
        </div>
        <p className="mm-admin-profile-hint">
          Email và số điện thoại đăng nhập cần được xác minh riêng trước khi thay đổi.
        </p>
      </section>

      <div className="mm-admin-profile-right">
        <form
          className="mm-admin-profile-panel mm-admin-profile-form"
          onSubmit={(event) => void saveInfo(event)}
        >
          <div className="mm-admin-profile-section-header">
            <span className="mm-admin-profile-section-icon">
              <UserRound size={20} />
            </span>
            <div>
              <h2>Thông tin quản trị viên</h2>
              <p>Thông tin dùng để hiển thị trong khu vực quản trị.</p>
            </div>
          </div>
          <label>
            Tên hiển thị tài khoản
            <input
              required
              minLength={2}
              maxLength={160}
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
          <label>
            Tên hồ sơ nhân viên
            <input
              required
              minLength={2}
              maxLength={160}
              value={publicName}
              onChange={(event) => setPublicName(event.target.value)}
            />
          </label>
          <label>
            Giới thiệu / ghi chú cá nhân
            <textarea
              maxLength={5000}
              rows={4}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Một vài dòng giới thiệu..."
            />
          </label>
          <button type="submit" className="mm-admin-profile-primary" disabled={!!saving}>
            <Save size={16} />
            {saving === "profile" ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
        <section className="mm-admin-profile-security">
          <div className="mm-admin-profile-section-header">
            <span className="mm-admin-profile-section-icon">
              <LockKeyhole size={20} />
            </span>
            <div>
              <h2>Bảo mật tài khoản</h2>
              <p>Thay đổi mật khẩu và kiểm soát phiên đăng nhập.</p>
            </div>
          </div>
          <ChangePasswordForm />
          <div className="mm-admin-profile-logout-row">
            <button type="button" disabled={!!saving} onClick={() => void signOut(false)}>
              <LogOut size={17} /> Đăng xuất
            </button>
            <button type="button" disabled={!!saving} onClick={() => void signOut(true)}>
              <UsersRound size={17} /> Đăng xuất mọi thiết bị
            </button>
          </div>
        </section>
        {notice && (
          <p role="status" className="mm-admin-profile-notice">
            <CheckCircle2 size={17} />
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mm-admin-profile-error">
            <ShieldCheck size={17} />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminProfile() {
  const { data, isPending, isError, refetch } = usePrivateData<AdminStaffProfile>("/staff/me");
  if (isPending)
    return (
      <p className="mm-admin-profile-loading" role="status">
        Đang tải hồ sơ quản trị viên...
      </p>
    );
  if (isError || !data)
    return (
      <div className="mm-admin-profile-error" role="alert">
        Không tải được hồ sơ quản trị.{" "}
        <button type="button" onClick={() => void refetch()}>
          Thử lại
        </button>
      </div>
    );
  return <AdminAccountForm key={data.staff.id} profile={data} />;
}
