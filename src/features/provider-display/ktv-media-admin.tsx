"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { mutationMessage, usePrivateData } from "@/features/marketplace/private-api";
import type { KtvShowcase, KtvShowcaseMedia } from "@/features/mobile/ktv-showcase-types";
import { Film, ImagePlus, LoaderCircle, Save, Star, Trash2 } from "lucide-react";
import "./ktv-create-admin.css";

const mediaConsentVersion = "PUBLIC_PROFILE_MEDIA_V1";
const maxImages = 8;
const maxVideos = 1;
const endpoint = (id: string) => `/provider-showcase/${id}`;

export function KtvMediaAdmin({ providerId }: { providerId: string }) {
  const { authFetch } = useAuth();
  const query = usePrivateData<KtvShowcase>(endpoint(providerId) + "/editor");
  const [removed, setRemoved] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const media = (query.data?.media ?? []).filter((entry) => !removed.includes(entry.id));

  async function submit() {
    if (busy || !query.data) return;
    setError("");
    setNotice("");
    if ((photoFiles.length || videoFile) && !consent) {
      setError("Bạn cần xác nhận quyền sử dụng và công khai ảnh/video trước khi tải lên.");
      return;
    }
    const imageCount = media.filter((item) => item.kind === "IMAGE").length + photoFiles.length;
    const videoCount = media.filter((item) => item.kind === "VIDEO").length + Number(!!videoFile);
    if (imageCount > maxImages || videoCount > maxVideos) {
      setError("Mỗi hồ sơ được tối đa 8 ảnh và 1 video. Hãy xóa bớt trước khi lưu.");
      return;
    }
    const files = [...photoFiles, ...(videoFile ? [videoFile] : [])];
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
      const newAvatar = uploaded.find((item) => item.kind === "IMAGE");
      if (newAvatar) {
        try {
          await authFetch(`/admin/provider-display/${providerId}/avatar`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaId: newAvatar.id }),
            cache: "no-store",
          });
        } catch {
          setNotice("Media đã lưu, nhưng ảnh đại diện chưa cập nhật. Có thể chọn lại bên dưới.");
        }
      }
      setRemoved([]);
      setPhotoFiles([]);
      setVideoFile(null);
      await query.refetch();
      setNotice((current) => current || "Đã lưu ảnh/video trên CDN và cập nhật hồ sơ công khai.");
    } catch (caught) {
      setError(mutationMessage(caught) + " Nếu đã tải file lên, hãy kiểm tra lại trước khi thử.");
    } finally {
      setBusy(false);
    }
  }

  async function setAvatar(mediaId: string) {
    setBusy(true);
    setError("");
    try {
      await authFetch(`/admin/provider-display/${providerId}/avatar`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaId }),
      });
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
        <strong>Ảnh & video hồ sơ</strong>
        <span>8 ảnh WebP / 1 video MP4 · lưu trên Bunny CDN</span>
      </div>
      {media.length > 0 && (
        <div className="ktv-create-media-items">
          {media.map((item, index) => (
            <div className="ktv-create-media-item" key={item.id}>
              <span>{item.kind === "VIDEO" ? <Film size={18} /> : <ImagePlus size={18} />}</span>
              <div>
                <strong>{item.kind === "VIDEO" ? "Video giới thiệu" : `Ảnh ${index + 1}`}</strong>
                <small>{item.caption || "Ảnh/video đã công khai"}</small>
              </div>
              {item.kind === "IMAGE" && (
                <button type="button" disabled={busy} onClick={() => void setAvatar(item.id)}>
                  <Star size={15} /> Đại diện
                </button>
              )}
              <button
                type="button"
                disabled={busy}
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
        <ImagePlus size={19} /> Chọn ảnh (tối đa 8 MB/ảnh)
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
        />
      </label>
      {photoFiles.length > 0 && <small>Đã chọn {photoFiles.length} ảnh</small>}
      <label className="ktv-create-file">
        <Film size={19} /> Chọn video MP4 (tối đa 40 MB)
        <input
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
