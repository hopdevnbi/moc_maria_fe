"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { mutationMessage, usePrivateData } from "@/features/marketplace/private-api";
import type { KtvShowcase, KtvShowcaseMedia } from "@/features/mobile/ktv-showcase-types";
import { Film, ImagePlus, LoaderCircle, Save, Star, Trash2 } from "lucide-react";
import "./ktv-create-admin.css";

const mediaConsentVersion = "PUBLIC_PROFILE_MEDIA_V1";
const maxImages = 8;
const maxVideos = 1;
const endpoint = (id: string) => `/provider-showcase/${id}`;

export function KtvMediaAdmin({
  providerId,
  currentAvatarUrl,
  providerName,
  onAvatarChanged,
}: {
  providerId: string;
  currentAvatarUrl?: string | null;
  providerName?: string;
  onAvatarChanged?: (url: string) => void;
}) {
  const { authFetch } = useAuth();
  const query = usePrivateData<KtvShowcase>(endpoint(providerId) + "/editor");
  const [removed, setRemoved] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl ?? "");
  const [fileRevision, setFileRevision] = useState(0);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const media = (query.data?.media ?? []).filter((entry) => !removed.includes(entry.id));

  async function submit() {
    if (busy || !query.data) return;
    setError("");
    setNotice("");
    if ((avatarFile || photoFiles.length || videoFile) && !consent) {
      setError("Bạn cần xác nhận quyền sử dụng và công khai ảnh/video trước khi tải lên.");
      return;
    }
    const imageCount =
      media.filter((item) => item.kind === "IMAGE").length +
      photoFiles.length +
      Number(!!avatarFile);
    const videoCount = media.filter((item) => item.kind === "VIDEO").length + Number(!!videoFile);
    if (imageCount > maxImages || videoCount > maxVideos) {
      setError("Mỗi hồ sơ được tối đa 8 ảnh và 1 video. Hãy xóa bớt trước khi lưu.");
      return;
    }
    const files = [
      ...(avatarFile ? [avatarFile] : []),
      ...photoFiles,
      ...(videoFile ? [videoFile] : []),
    ];
    if (
      files.some(
        (file) =>
          !["image/jpeg", "image/png", "image/webp", "video/mp4"].includes(file.type) ||
          file.size > (file.type === "video/mp4" ? 40 : 8) * 1024 * 1024,
      )
    ) {
      setError("Ảnh phải là JPG/PNG/WebP tối đa 8 MB; video MP4 tối đa 40 MB.");
      return;
    }
    setBusy(true);
    try {
      const uploaded: KtvShowcaseMedia[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        form.append("consentVersion", mediaConsentVersion);
        uploaded.push(
          await authFetch<KtvShowcaseMedia>(endpoint(providerId) + "/media", {
            method: "POST",
            body: form,
            cache: "no-store",
          }),
        );
      }
      const next = [...media, ...uploaded];
      await authFetch<KtvShowcase>(endpoint(providerId), {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: query.data.version,
          headline: query.data.headline,
          biography: query.data.biography,
          scheduleNote: query.data.scheduleNote,
          weeklyHours: query.data.weeklyHours,
          media: next,
        }),
      });
      // An explicitly selected avatar wins. Gallery uploads do not overwrite an
      // existing avatar; a new profile without an avatar gets its first photo.
      const newAvatar = avatarFile
        ? uploaded[0]
        : !avatarUrl
          ? uploaded.find((item) => item.kind === "IMAGE")
          : undefined;
      if (newAvatar) {
        try {
          await authFetch(`/admin/provider-display/${providerId}/avatar`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaId: newAvatar.id }),
            cache: "no-store",
          });
          setAvatarUrl(newAvatar.url);
          onAvatarChanged?.(newAvatar.url);
        } catch {
          setNotice("Media đã lưu, nhưng ảnh đại diện chưa cập nhật. Có thể chọn lại bên dưới.");
        }
      }
      setRemoved([]);
      setAvatarFile(null);
      setPhotoFiles([]);
      setVideoFile(null);
      setFileRevision((value) => value + 1);
      await query.refetch();
      setNotice((current) => current || "Đã lưu ảnh/video trên CDN và cập nhật hồ sơ công khai.");
    } catch (caught) {
      setError(mutationMessage(caught) + " Nếu đã tải file lên, hãy kiểm tra lại trước khi thử.");
    } finally {
      setBusy(false);
    }
  }

  async function setAvatar(item: KtvShowcaseMedia) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await authFetch(`/admin/provider-display/${providerId}/avatar`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId: item.id }),
      });
      setAvatarUrl(item.url);
      onAvatarChanged?.(item.url);
      setNotice("Đã đổi ảnh đại diện của kỹ thuật viên.");
    } catch (caught) {
      setError(mutationMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  if (query.isPending) return <p role="status">Đang tải thư viện ảnh/video...</p>;
  if (query.isError || !query.data) return <p role="alert">Chưa thể tải media hồ sơ.</p>;
  return (
    <section className="ktv-create-media" aria-label="Quản lý ảnh và video KTV">
      <div className="ktv-create-media-heading">
        <strong>Ảnh đại diện & thư viện KTV</strong>
        <span>Avatar dùng trên danh sách KTV và trang cá nhân · ảnh/video lưu Bunny CDN</span>
      </div>
      <div className="ktv-create-avatar-preview">
        <div className="ktv-create-avatar-portrait">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={`Ảnh đại diện hiện tại của ${providerName || "KTV"}`}
              width={90}
              height={104}
              unoptimized
            />
          ) : (
            <span aria-label="Chưa có ảnh đại diện">{(providerName || "K").slice(0, 1)}</span>
          )}
        </div>
        <div>
          <strong>Ảnh đại diện đang hiển thị</strong>
          <small>
            {avatarUrl
              ? "Có thể thay bằng ảnh mới hoặc chọn một ảnh trong thư viện bên dưới."
              : "Chưa có avatar. Upload ảnh mới để hiển thị trên thẻ KTV và trang hồ sơ."}
          </small>
        </div>
      </div>
      <label className="ktv-create-file ktv-create-avatar-upload">
        <ImagePlus size={19} /> Upload ảnh đại diện mới
        <input
          key={`avatar-${fileRevision}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Upload ảnh đại diện mới"
          disabled={busy}
          onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
        />
      </label>
      {avatarFile && (
        <small>Avatar mới: {avatarFile.name} (sẽ áp dụng khi bấm Lưu ảnh/video)</small>
      )}
      <div className="ktv-create-media-subhead">
        <strong>Ảnh & video trên trang hồ sơ</strong>
        <small>Tối đa 8 ảnh và 1 video MP4</small>
      </div>
      {media.length > 0 && (
        <div className="ktv-create-media-items">
          {media.map((item, index) => (
            <div className="ktv-create-media-item" key={item.id}>
              <span className="ktv-create-media-thumb">
                {item.kind === "VIDEO" ? (
                  <Film size={20} aria-label="Video giới thiệu" />
                ) : (
                  <Image
                    src={item.url}
                    alt={`Ảnh thư viện KTV ${index + 1}`}
                    width={62}
                    height={66}
                    unoptimized
                  />
                )}
              </span>
              <div>
                <strong>{item.kind === "VIDEO" ? "Video giới thiệu" : `Ảnh ${index + 1}`}</strong>
                <small>
                  {item.url === avatarUrl
                    ? "Đang làm ảnh đại diện"
                    : item.caption || "Đã công khai"}
                </small>
              </div>
              {item.kind === "IMAGE" && (
                <button
                  type="button"
                  disabled={busy || item.url === avatarUrl}
                  onClick={() => void setAvatar(item)}
                  aria-label={`Đặt ảnh ${index + 1} làm đại diện`}
                >
                  <Star size={15} /> {item.url === avatarUrl ? "Đang dùng" : "Đại diện"}
                </button>
              )}
              <button
                type="button"
                disabled={busy || item.url === avatarUrl}
                aria-label={`Gỡ media ${index + 1}`}
                onClick={() => setRemoved((prev) => [...prev, item.id])}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <label className="ktv-create-file">
        <ImagePlus size={19} /> Thêm ảnh vào thư viện (tối đa 8 MB/ảnh)
        <input
          key={`photos-${fileRevision}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          aria-label="Thêm ảnh vào thư viện"
          onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
        />
      </label>
      {photoFiles.length > 0 && <small>Đã chọn {photoFiles.length} ảnh</small>}
      <label className="ktv-create-file">
        <Film size={19} /> Chọn video MP4 (tối đa 40 MB)
        <input
          key={`video-${fileRevision}`}
          type="file"
          accept="video/mp4"
          disabled={busy}
          onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
        />
      </label>
      {videoFile && <small>Đã chọn: {videoFile.name}</small>}
      <label className="ktv-create-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Tôi xác nhận có quyền sử dụng và công khai ảnh/video của khách và nhân viên xuất hiện
          trong tệp.
        </span>
      </label>
      <button className="pd-primary" type="button" onClick={() => void submit()} disabled={busy}>
        {busy ? <LoaderCircle size={17} /> : <Save size={17} />}
        {busy ? "Đang tải và lưu..." : "Lưu ảnh/video"}
      </button>
      {error && (
        <p className="pd-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="pd-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}
