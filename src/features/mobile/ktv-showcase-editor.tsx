"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Camera,
  Check,
  CircleHelp,
  Film,
  ImagePlus,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { mutationMessage, usePrivateData } from "@/features/marketplace/private-api";
import {
  KTV_WEEKDAYS,
  type KtvShowcase,
  type KtvShowcaseHours,
  type KtvShowcaseMedia,
} from "./ktv-showcase-types";

type EditorTab = "info" | "hours" | "media";
const consentVersion = "PUBLIC_PROFILE_MEDIA_V1";

function emptyRow(rows: KtvShowcaseHours[]): KtvShowcaseHours {
  const nextDay = [1, 2, 3, 4, 5, 6, 0].find((day) => !rows.some((row) => row.weekday === day));
  return { weekday: nextDay ?? 1, startsAt: "09:00", endsAt: "17:00" };
}

function cloneShowcase(source: KtvShowcase): KtvShowcase {
  return {
    ...source,
    media: source.media.map((item) => ({ ...item })),
    weeklyHours: source.weeklyHours.map((item) => ({ ...item })),
  };
}

export function KtvShowcaseEditorLauncher({
  providerId,
  initial,
  name,
}: {
  providerId: string;
  initial: KtvShowcase;
  name: string;
}) {
  const { user, authFetch } = useAuth();
  const router = useRouter();
  const isSuperAdmin = user?.roles.includes("SUPER_ADMIN") ?? false;
  const isKtv =
    user?.roles.some((role) => role === "THERAPIST" || role === "DOCTOR_CONSULTANT") ?? false;
  const ownApplication = usePrivateData<{ id: string } | null>(
    "/provider-applications/me",
    isKtv && !isSuperAdmin,
  );
  const canEdit = isSuperAdmin || (isKtv && ownApplication.data?.id === providerId);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EditorTab>("info");
  const [draft, setDraft] = useState<KtvShowcase>(() => cloneShowcase(initial));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !uploading && !saving) setOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onEscape);
    };
  }, [open, uploading, saving]);

  if (!canEdit) return null;

  async function openEditor() {
    setOpen(true);
    setTab("info");
    setError("");
    setNotice("");
    setConsent(false);
    setLoading(true);
    try {
      const latest = await authFetch<KtvShowcase>(`/provider-showcase/${providerId}/editor`, {
        cache: "no-store",
      });
      setDraft(cloneShowcase(latest));
    } catch (caught) {
      setError(mutationMessage(caught));
      setDraft(cloneShowcase(initial));
    } finally {
      setLoading(false);
    }
  }

  function updateHour(index: number, change: Partial<KtvShowcaseHours>) {
    setDraft((value) => ({
      ...value,
      weeklyHours: value.weeklyHours.map((row, i) => (i === index ? { ...row, ...change } : row)),
    }));
  }

  function updateMedia(index: number, change: Partial<KtvShowcaseMedia>) {
    setDraft((value) => ({
      ...value,
      media: value.media.map((row, i) => (i === index ? { ...row, ...change } : row)),
    }));
  }

  function moveMedia(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= draft.media.length) return;
    setDraft((value) => {
      const media = [...value.media];
      [media[index], media[target]] = [media[target], media[index]];
      return { ...value, media };
    });
  }

  async function uploadMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setNotice("");
    if (!consent) {
      setError("Hãy xác nhận quyền sử dụng và công khai ảnh/video trước khi tải lên.");
      return;
    }
    const isVideo = file.type === "video/mp4";
    const isPhoto = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (!isVideo && !isPhoto) {
      setError("Chỉ sử dụng ảnh JPG, PNG, WebP hoặc video MP4.");
      return;
    }
    if (file.size > (isVideo ? 40 : 8) * 1024 * 1024) {
      setError(isVideo ? "Video không vượt quá 40 MB." : "Ảnh không vượt quá 8 MB.");
      return;
    }
    if (
      draft.media.filter((item) => item.kind === (isVideo ? "VIDEO" : "IMAGE")).length >=
      (isVideo ? 1 : 8)
    ) {
      setError(
        isVideo
          ? "Mỗi hồ sơ có tối đa 1 video. Xóa video cũ trước khi thay."
          : "Mỗi hồ sơ có tối đa 8 hình ảnh.",
      );
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("consentVersion", consentVersion);
      const uploaded = await authFetch<KtvShowcaseMedia>(`/provider-showcase/${providerId}/media`, {
        method: "POST",
        body: form,
        cache: "no-store",
      });
      setDraft((value) => ({ ...value, media: [...value.media, uploaded] }));
      setNotice("Tệp đã lên CDN. Nhấn Lưu thay đổi để công khai trên trang.");
    } catch (caught) {
      setError(mutationMessage(caught));
    } finally {
      setUploading(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || saving || uploading) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await authFetch<KtvShowcase>(`/provider-showcase/${providerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: draft.version,
          headline: draft.headline.trim(),
          biography: draft.biography.trim(),
          scheduleNote: draft.scheduleNote.trim(),
          weeklyHours: draft.weeklyHours,
          media: draft.media,
        }),
        cache: "no-store",
      });
      setDraft(cloneShowcase(result));
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(mutationMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="ktv-showcase-edit-trigger"
        aria-label={`Tùy chỉnh trang cá nhân ${name}`}
        title={isSuperAdmin ? "Quản trị trang KTV" : "Tùy chỉnh trang của tôi"}
        onClick={() => void openEditor()}
      >
        <Pencil size={17} />
      </button>

      {open && (
        <div
          className="ktv-showcase-editor-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving && !uploading) setOpen(false);
          }}
        >
          <section
            className="ktv-showcase-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ktv-showcase-editor-title"
          >
            <header className="ktv-showcase-editor-header">
              <span className="ktv-showcase-editor-heading-icon">
                <Pencil size={19} />
              </span>
              <div>
                <span className="ktv-showcase-kicker">TRANG CÁ NHÂN MỘC MARIA</span>
                <h2 id="ktv-showcase-editor-title">Tùy chỉnh hồ sơ {name}</h2>
              </div>
              <button
                ref={closeRef}
                className="ktv-showcase-editor-close"
                type="button"
                aria-label="Đóng chỉnh sửa"
                disabled={saving || uploading}
                onClick={() => setOpen(false)}
              >
                <X size={22} />
              </button>
            </header>

            <nav className="ktv-showcase-editor-tabs" aria-label="Các phần chỉnh sửa">
              <button
                type="button"
                className={tab === "info" ? "is-selected" : ""}
                aria-current={tab === "info" ? "page" : undefined}
                onClick={() => setTab("info")}
              >
                <Pencil size={16} /> Giới thiệu
              </button>
              <button
                type="button"
                className={tab === "hours" ? "is-selected" : ""}
                aria-current={tab === "hours" ? "page" : undefined}
                onClick={() => setTab("hours")}
              >
                <CalendarClock size={16} /> Lịch
              </button>
              <button
                type="button"
                className={tab === "media" ? "is-selected" : ""}
                aria-current={tab === "media" ? "page" : undefined}
                onClick={() => setTab("media")}
              >
                <Camera size={16} /> Ảnh & video
              </button>
            </nav>

            <form className="ktv-showcase-editor-form" onSubmit={(event) => void save(event)}>
              <div className="ktv-showcase-editor-scroll">
                {loading ? (
                  <p role="status" className="ktv-showcase-editor-loading">
                    <LoaderCircle size={22} className="ktv-showcase-spin" /> Đang tải nội dung mới
                    nhất...
                  </p>
                ) : tab === "info" ? (
                  <div className="ktv-showcase-editor-content">
                    <p className="ktv-showcase-editor-guidance">
                      Viết lời giới thiệu chân thực, gần gũi để khách hàng hiểu thêm về phong cách
                      chăm sóc của bạn.
                    </p>
                    <label className="ktv-showcase-editor-field">
                      Dòng giới thiệu ngắn
                      <input
                        value={draft.headline}
                        onChange={(event) =>
                          setDraft((old) => ({ ...old, headline: event.target.value }))
                        }
                        maxLength={110}
                        placeholder="Ví dụ: Chăm sóc nhẹ nhàng, tận tâm"
                      />
                      <small>{draft.headline.length}/110 ký tự</small>
                    </label>
                    <label className="ktv-showcase-editor-field">
                      Giới thiệu bản thân
                      <textarea
                        rows={7}
                        value={draft.biography}
                        onChange={(event) =>
                          setDraft((old) => ({ ...old, biography: event.target.value }))
                        }
                        maxLength={2000}
                        placeholder="Chia sẻ kinh nghiệm thực tế, phong cách phục vụ và điều bạn muốn gửi gắm đến khách hàng..."
                      />
                      <small>{draft.biography.length}/2000 ký tự</small>
                    </label>
                    <p className="ktv-showcase-editor-hint">
                      <CircleHelp size={17} /> Tên, các dịch vụ chính thức, giá và đánh giá không
                      thay đổi ở đây để bảo đảm tính chính xác.
                    </p>
                  </div>
                ) : tab === "hours" ? (
                  <div className="ktv-showcase-editor-content">
                    <p className="ktv-showcase-editor-guidance">
                      Đây là khung giờ tham khảo hiển thị trên trang. Lịch nhận việc chính thức vẫn
                      do hệ thống đặt lịch xác nhận.
                    </p>
                    {draft.weeklyHours.map((row, index) => (
                      <div className="ktv-showcase-editor-hour-row" key={index}>
                        <label>
                          Ngày
                          <select
                            value={row.weekday}
                            onChange={(event) =>
                              updateHour(index, { weekday: Number(event.target.value) })
                            }
                          >
                            {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                              <option value={day} key={day}>
                                {KTV_WEEKDAYS[day]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Từ{" "}
                          <input
                            type="time"
                            value={row.startsAt}
                            onChange={(event) =>
                              updateHour(index, { startsAt: event.target.value })
                            }
                            required
                          />
                        </label>
                        <label>
                          Đến{" "}
                          <input
                            type="time"
                            value={row.endsAt}
                            onChange={(event) => updateHour(index, { endsAt: event.target.value })}
                            required
                          />
                        </label>
                        <button
                          type="button"
                          title="Xóa ca"
                          aria-label={`Xóa ca ${index + 1}`}
                          onClick={() =>
                            setDraft((old) => ({
                              ...old,
                              weeklyHours: old.weeklyHours.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    ))}
                    {draft.weeklyHours.length < 14 && (
                      <button
                        type="button"
                        className="ktv-showcase-editor-add"
                        onClick={() =>
                          setDraft((old) => ({
                            ...old,
                            weeklyHours: [...old.weeklyHours, emptyRow(old.weeklyHours)],
                          }))
                        }
                      >
                        <Plus size={18} /> Thêm ca làm việc
                      </button>
                    )}
                    {!draft.weeklyHours.length && (
                      <p className="ktv-showcase-editor-placeholder">
                        Chưa thêm ca nào. Trang vẫn hiển thị lời mời trao đổi thời gian phù hợp.
                      </p>
                    )}
                    <label className="ktv-showcase-editor-field">
                      Ghi chú về giờ làm việc
                      <textarea
                        rows={3}
                        value={draft.scheduleNote}
                        maxLength={300}
                        onChange={(event) =>
                          setDraft((old) => ({ ...old, scheduleNote: event.target.value }))
                        }
                        placeholder="Ví dụ: Vui lòng nhắn trước để sắp xếp ca phù hợp"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="ktv-showcase-editor-content">
                    <p className="ktv-showcase-editor-guidance">
                      Thêm ảnh hoạt động hoặc một video ngắn để trang cá nhân sinh động. Ảnh được
                      tối ưu WebP và lưu trên CDN; video MP4 phát trực tiếp trên Chrome/Safari.
                    </p>
                    <label className="ktv-showcase-editor-consent">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(event) => setConsent(event.target.checked)}
                      />
                      <span>
                        Tôi xác nhận có quyền sử dụng các hình ảnh/video này và đồng ý công khai
                        chúng trên trang KTV.
                      </span>
                    </label>
                    <div className="ktv-showcase-editor-upload-actions">
                      <button
                        type="button"
                        disabled={
                          uploading ||
                          !consent ||
                          draft.media.filter((item) => item.kind === "IMAGE").length >= 8
                        }
                        onClick={() => photoRef.current?.click()}
                      >
                        <ImagePlus size={19} /> Thêm hình ảnh <small>JPG/PNG/WebP · 8 MB</small>
                      </button>
                      <button
                        type="button"
                        disabled={
                          uploading || !consent || draft.media.some((item) => item.kind === "VIDEO")
                        }
                        onClick={() => videoRef.current?.click()}
                      >
                        <Film size={19} /> Thêm video <small>MP4 · 40 MB</small>
                      </button>
                    </div>
                    <input
                      ref={photoRef}
                      className="ktv-showcase-file-hidden"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      aria-label="Chọn hình ảnh KTV"
                      onChange={(event) => void uploadMedia(event)}
                    />
                    <input
                      ref={videoRef}
                      className="ktv-showcase-file-hidden"
                      type="file"
                      accept="video/mp4"
                      aria-label="Chọn video KTV"
                      onChange={(event) => void uploadMedia(event)}
                    />
                    {uploading && (
                      <p role="status" className="ktv-showcase-editor-uploading">
                        <LoaderCircle className="ktv-showcase-spin" size={18} /> Đang tối ưu và đẩy
                        tệp lên CDN...
                      </p>
                    )}
                    {draft.media.length ? (
                      <div className="ktv-showcase-editor-assets">
                        {draft.media.map((asset, index) => (
                          <div className="ktv-showcase-editor-asset" key={asset.id}>
                            <span className="ktv-showcase-editor-asset-icon">
                              {asset.kind === "VIDEO" ? <Film size={22} /> : <Camera size={22} />}
                            </span>
                            <label>
                              <strong>
                                {asset.kind === "VIDEO" ? "Video giới thiệu" : `Ảnh ${index + 1}`}
                              </strong>
                              <input
                                value={asset.caption ?? ""}
                                maxLength={120}
                                onChange={(event) =>
                                  updateMedia(index, { caption: event.target.value })
                                }
                                placeholder="Chú thích ảnh/video (không bắt buộc)"
                              />
                            </label>
                            <div className="ktv-showcase-editor-asset-actions">
                              <button
                                type="button"
                                aria-label="Chuyển lên"
                                title="Chuyển lên"
                                disabled={index === 0}
                                onClick={() => moveMedia(index, -1)}
                              >
                                <ArrowUp size={17} />
                              </button>
                              <button
                                type="button"
                                aria-label="Chuyển xuống"
                                title="Chuyển xuống"
                                disabled={index === draft.media.length - 1}
                                onClick={() => moveMedia(index, 1)}
                              >
                                <ArrowDown size={17} />
                              </button>
                              <button
                                type="button"
                                aria-label="Xóa khỏi trang"
                                title="Xóa khỏi trang"
                                onClick={() =>
                                  setDraft((old) => ({
                                    ...old,
                                    media: old.media.filter((_, i) => i !== index),
                                  }))
                                }
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="ktv-showcase-editor-placeholder">
                        Chưa có ảnh hoặc video. Hồ sơ hiện vẫn hiển thị đầy đủ avatar, giới thiệu và
                        dịch vụ.
                      </p>
                    )}
                    <p className="ktv-showcase-editor-hint">
                      <CircleHelp size={17} /> Tệp đã tải lên chỉ xuất hiện công khai sau khi bạn
                      nhấn “Lưu thay đổi”.
                    </p>
                  </div>
                )}
                {notice && (
                  <p className="ktv-showcase-editor-notice" role="status">
                    <Check size={17} />
                    {notice}
                  </p>
                )}
                {error && (
                  <p className="ktv-showcase-editor-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <footer className="ktv-showcase-editor-footer">
                <button
                  type="button"
                  className="ktv-showcase-editor-cancel"
                  disabled={saving || uploading}
                  onClick={() => setOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="ktv-showcase-editor-save"
                  disabled={loading || saving || uploading}
                >
                  <Save size={17} /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
