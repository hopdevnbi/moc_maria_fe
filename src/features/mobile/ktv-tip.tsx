"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCheck,
  CircleHelp,
  Copy,
  CreditCard,
  Gift,
  Heart,
  HeartHandshake,
  ImagePlus,
  LoaderCircle,
  MessageCircle,
  Pencil,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { mutationMessage, usePrivateData } from "@/features/marketplace/private-api";
import { resolveApiBaseUrl } from "@/shared/config/environment";
import { KtvTipQr } from "./ktv-tip-qr";
import "./ktv-tip.css";

type TipSettings = {
  version: number;
  bankName: string;
  bankAccount: string;
  accountHolder: string;
  qrUrl: string | null;
  updatedAt: string | null;
};

type TipIntent = {
  id: string;
  token: string;
  amountVnd: number;
  status: "INTENT" | "SELF_REPORTED";
};

type TipStep = "amount" | "payment" | "keepsake";
const presets = [20_000, 50_000, 100_000, 200_000];
const emptySettings: TipSettings = {
  version: 0,
  bankName: "",
  bankAccount: "",
  accountHolder: "",
  qrUrl: null,
  updatedAt: null,
};
const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + "đ";

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const reply = await fetch(resolveApiBaseUrl() + path, {
    cache: "no-store",
    credentials: "omit",
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init,
  });
  if (!reply.ok) {
    const body = await reply.json().catch(() => null);
    throw new Error(
      body && typeof body.message === "string"
        ? body.message
        : "Đường truyền chưa ổn định. Bạn vui lòng thử lại.",
    );
  }
  return (await reply.json()) as T;
}

async function copyText(value: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function formatAccount(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 25);
}

export function KtvTipPanel({
  providerId,
  name,
  chatHref,
}: {
  providerId: string;
  name: string;
  chatHref: string | null;
}) {
  const { user, authFetch } = useAuth();
  const isAdmin = user?.roles.includes("SUPER_ADMIN") ?? false;
  const isKtv =
    user?.roles.some((role) => role === "THERAPIST" || role === "DOCTOR_CONSULTANT") ?? false;
  const ownApplication = usePrivateData<{ id: string } | null>(
    "/provider-applications/me",
    isKtv && !isAdmin,
  );
  const canEdit = isAdmin || (isKtv && ownApplication.data?.id === providerId);

  const [settings, setSettings] = useState<TipSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TipSettings>(emptySettings);
  const [amountInput, setAmountInput] = useState("50000");
  const [step, setStep] = useState<TipStep>("amount");
  const [intent, setIntent] = useState<TipIntent | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [consent, setConsent] = useState(false);
  const [keepsake, setKeepsake] = useState<File | null>(null);
  const [keepsakeSaved, setKeepsakeSaved] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const qrFileRef = useRef<HTMLInputElement | null>(null);
  const receiptFileRef = useRef<HTMLInputElement | null>(null);
  const busy = pending || uploading || saving;
  const amount = Number(amountInput);
  const validAmount = Number.isSafeInteger(amount) && amount >= 10_000 && amount <= 10_000_000;
  const hasPaymentDetails = Boolean(settings.bankAccount || settings.qrUrl);

  useEffect(() => {
    let active = true;
    publicRequest<TipSettings>(`/provider-tips/${providerId}/config`)
      .then((result) => {
        if (active) setSettings(result);
      })
      .catch(() => {
        if (active) setSettings(emptySettings);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [providerId]);

  useEffect(() => {
    if (!modal && !editing) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setModal(false);
        setEditing(false);
      }
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
      document.body.style.overflow = originalOverflow;
    };
  }, [modal, editing, busy]);

  function openTip() {
    setStep("amount");
    setIntent(null);
    setAmountInput("50000");
    setError("");
    setNotice("");
    setConsent(false);
    setKeepsake(null);
    setKeepsakeSaved(false);
    setModal(true);
  }

  async function openEditor() {
    setError("");
    setNotice("");
    setEditing(true);
    setPending(true);
    try {
      const result = await authFetch<TipSettings>(`/provider-tips/${providerId}/config/editor`, {
        cache: "no-store",
      });
      setDraft(result);
    } catch (caught) {
      setError(mutationMessage(caught));
      setDraft(settings);
    } finally {
      setPending(false);
    }
  }

  async function beginTransfer() {
    if (!validAmount || pending || !hasPaymentDetails) return;
    setError("");
    setPending(true);
    try {
      const result = await publicRequest<TipIntent>(`/provider-tips/${providerId}/intents`, {
        method: "POST",
        body: JSON.stringify({ amountVnd: amount, clientRequestId: crypto.randomUUID() }),
      });
      setIntent(result);
      setStep("payment");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không tạo được lời cảm ơn.");
    } finally {
      setPending(false);
    }
  }

  async function markTransferred() {
    if (!intent || pending) return;
    setError("");
    setPending(true);
    try {
      await publicRequest(`/provider-tips/${providerId}/intents/${intent.id}/declare`, {
        method: "POST",
        body: JSON.stringify({ token: intent.token }),
      });
      setStep("keepsake");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Chưa cập nhật được lời cảm ơn.");
    } finally {
      setPending(false);
    }
  }

  function chooseReceipt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setError("");
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Ảnh kỷ niệm chỉ nhận JPG/PNG/WebP, tối đa 5 MB.");
      return;
    }
    setKeepsake(file);
  }

  async function saveKeepsake() {
    if (!intent || !keepsake || !consent || uploading) return;
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("token", intent.token);
      form.append("consentVersion", "PRIVATE_TIP_KEEPSAKE_V1");
      form.append("file", keepsake);
      await publicRequest(`/provider-tips/${providerId}/intents/${intent.id}/keepsake`, {
        method: "POST",
        body: form,
      });
      setKeepsakeSaved(true);
      setNotice("Ảnh kỷ niệm đã được lưu riêng tư cho KTV.");
      setKeepsake(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không lưu được ảnh kỷ niệm.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadQr(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setNotice("");
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("QR cần là JPG/PNG/WebP và không quá 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await authFetch<{ qrUrl: string }>(`/provider-tips/${providerId}/qr`, {
        method: "POST",
        body: form,
        cache: "no-store",
      });
      setDraft((old) => ({ ...old, qrUrl: result.qrUrl }));
      setNotice("QR đã tải lên. Nhấn Lưu để công khai.");
    } catch (caught) {
      setError(mutationMessage(caught));
    } finally {
      setUploading(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setSaving(true);
    try {
      const result = await authFetch<TipSettings>(`/provider-tips/${providerId}/config`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: draft.version,
          bankName: draft.bankName.trim(),
          bankAccount: formatAccount(draft.bankAccount),
          accountHolder: draft.accountHolder.trim(),
          qrUrl: draft.qrUrl,
        }),
      });
      setSettings(result);
      setDraft(result);
      setEditing(false);
    } catch (caught) {
      setError(mutationMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function onCopy(value: string, message: string) {
    setNotice(
      (await copyText(value)) ? message : "Không thể tự sao chép. Hãy chạm giữ để chọn nội dung.",
    );
  }

  return (
    <>
      <section className="ktv-tip-invite" aria-label="Gửi lời cảm ơn đến kỹ thuật viên">
        <div className="ktv-tip-invite-icon" aria-hidden="true">
          <HeartHandshake size={29} strokeWidth={1.5} />
        </div>
        <div className="ktv-tip-invite-copy">
          <span>GỬI MỘT CHÚT YÊU THƯƠNG</span>
          <h2>Gửi lời cảm ơn đến {name}</h2>
          <p>Một lời động viên nho nhỏ, hoàn toàn tự nguyện.</p>
        </div>
        <div className="ktv-tip-invite-actions">
          <button type="button" className="ktv-tip-invite-button" onClick={openTip}>
            <Heart size={18} fill="currentColor" /> Gửi tip <ArrowRight size={17} />
          </button>
          {canEdit && (
            <button
              type="button"
              className="ktv-tip-manage-button"
              onClick={() => void openEditor()}
              aria-label={`Chỉnh sửa tài khoản nhận tip của ${name}`}
              title="Chỉnh QR và tài khoản nhận tip"
            >
              <Pencil size={16} />
            </button>
          )}
        </div>
      </section>

      {modal && (
        <div
          className="ktv-tip-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setModal(false);
          }}
        >
          <section
            className="ktv-tip-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ktv-tip-dialog-title"
          >
            <header className="ktv-tip-dialog-header">
              <span className="ktv-tip-dialog-header-icon">
                <Heart size={21} />
              </span>
              <div>
                <span className="ktv-tip-label">MỘT LỜI CẢM ƠN TỪ TRÁI TIM</span>
                <h2 id="ktv-tip-dialog-title">Tip cho {name}</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="ktv-tip-dialog-close"
                aria-label="Đóng cửa sổ tip"
                disabled={busy}
                onClick={() => setModal(false)}
              >
                <X size={22} />
              </button>
            </header>
            <div className="ktv-tip-scroll">
              {step === "amount" && (
                <div className="ktv-tip-step">
                  <p className="ktv-tip-subtext">
                    Bạn muốn gửi đến {name} bao nhiêu? Đây là khoản cảm ơn tự nguyện, chuyển trực
                    tiếp cho kỹ thuật viên.
                  </p>
                  <span className="ktv-tip-field-caption">CHỌN SỐ TIỀN</span>
                  <div className="ktv-tip-presets" role="group" aria-label="Các mức tiền tip">
                    {presets.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={amount === value ? "is-selected" : ""}
                        onClick={() => setAmountInput(String(value))}
                        aria-pressed={amount === value}
                      >
                        {money(value)}
                      </button>
                    ))}
                  </div>
                  <label className="ktv-tip-amount-label" htmlFor="ktv-tip-amount">
                    Hoặc nhập số tiền khác
                  </label>
                  <div className="ktv-tip-amount-input">
                    <input
                      id="ktv-tip-amount"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={amountInput}
                      onChange={(event) =>
                        setAmountInput(event.target.value.replace(/\D/g, "").slice(0, 9))
                      }
                      placeholder="Ví dụ: 50000"
                    />
                    <span>VND</span>
                  </div>
                  <p className="ktv-tip-amount-preview">
                    {validAmount ? money(amount) : "Từ 10.000đ đến 10.000.000đ"}
                  </p>
                  {!loading && !hasPaymentDetails ? (
                    <div className="ktv-tip-missing">
                      <MessageCircle size={24} />
                      <div>
                        <strong>KTV chưa cập nhật QR hoặc số tài khoản</strong>
                        <p>
                          Bạn hãy nhắn tin trực tiếp với {name} để nhận thông tin chuyển khoản nhé.
                        </p>
                        {chatHref && (
                          <Link href={chatHref} onClick={() => setModal(false)}>
                            Chat trực tiếp với KTV <ArrowRight size={16} />
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="ktv-tip-primary"
                    disabled={loading || !hasPaymentDetails || !validAmount || pending}
                    onClick={() => void beginTransfer()}
                  >
                    {pending || loading ? (
                      <LoaderCircle size={19} className="ktv-tip-spin" />
                    ) : (
                      <Gift size={19} />
                    )}
                    Xem QR & thông tin chuyển khoản <ArrowRight size={17} />
                  </button>
                </div>
              )}
              {step === "payment" && (
                <div className="ktv-tip-step">
                  <div className="ktv-tip-amount-card">
                    <span>SỐ TIỀN BẠN MUỐN GỬI</span>
                    <strong>{money(amount)}</strong>
                    <button
                      type="button"
                      onClick={() => void onCopy(String(amount), "Đã sao chép số tiền.")}
                    >
                      <Copy size={15} /> Sao chép số tiền
                    </button>
                  </div>
                  {settings.qrUrl ? (
                    <div className="ktv-tip-qr-wrap">
                      <KtvTipQr
                        key={`${settings.version}:${settings.qrUrl}`}
                        providerId={providerId}
                        version={settings.version}
                        name={name}
                        onRefresh={async () => {
                          const latest = await publicRequest<TipSettings>(
                            `/provider-tips/${providerId}/config`,
                          );
                          setSettings(latest);
                        }}
                      />
                      <small>Quét QR bằng ứng dụng ngân hàng của bạn</small>
                    </div>
                  ) : null}
                  {settings.bankAccount && (
                    <div className="ktv-tip-bank-card">
                      <span>
                        <CreditCard size={18} /> THÔNG TIN NHẬN TIP
                      </span>
                      {settings.bankName && (
                        <p>
                          <small>Ngân hàng</small>
                          <strong>{settings.bankName}</strong>
                        </p>
                      )}
                      {settings.accountHolder && (
                        <p>
                          <small>Chủ tài khoản</small>
                          <strong>{settings.accountHolder}</strong>
                        </p>
                      )}
                      <p>
                        <small>Số tài khoản</small>
                        <strong className="ktv-tip-account">{settings.bankAccount}</strong>
                        <button
                          type="button"
                          aria-label="Sao chép số tài khoản"
                          onClick={() =>
                            void onCopy(settings.bankAccount, "Đã sao chép số tài khoản.")
                          }
                        >
                          <Copy size={18} />
                        </button>
                      </p>
                    </div>
                  )}
                  <p className="ktv-tip-note">
                    <CircleHelp size={17} /> QR do KTV cung cấp có thể chưa điền sẵn số tiền. Hãy
                    đối chiếu đúng tên, số tài khoản và số tiền trước khi chuyển.
                  </p>
                  <button
                    type="button"
                    className="ktv-tip-primary"
                    onClick={() => void markTransferred()}
                    disabled={pending}
                  >
                    {pending ? (
                      <LoaderCircle className="ktv-tip-spin" size={18} />
                    ) : (
                      <CheckCheck size={20} />
                    )}{" "}
                    Tôi đã chuyển khoản
                  </button>
                  <button
                    type="button"
                    className="ktv-tip-secondary"
                    onClick={() => setModal(false)}
                  >
                    Để sau / Đóng
                  </button>
                </div>
              )}
              {step === "keepsake" && (
                <div className="ktv-tip-step">
                  <div className="ktv-tip-thanks">
                    <span>
                      <Heart size={28} fill="currentColor" />
                    </span>
                    <h3>Cảm ơn tấm lòng của bạn!</h3>
                    <p>
                      Lời cảm ơn {money(amount)} đã được ghi nhận theo xác nhận của bạn. Việc chuyển
                      khoản thực tế chưa được hệ thống đối soát.
                    </p>
                  </div>
                  <div className="ktv-tip-keepsake">
                    <span className="ktv-tip-field-caption">LƯU MỘT KỶ NIỆM NHO NHỎ</span>
                    <h4>Bạn muốn lưu ảnh chuyển khoản không?</h4>
                    <p>
                      Hoàn toàn tự nguyện. Ảnh được mã hóa, không hiển thị công khai; bạn có thể bỏ
                      qua bước này.
                    </p>
                    {!keepsakeSaved && (
                      <>
                        <input
                          ref={receiptFileRef}
                          type="file"
                          className="ktv-tip-hidden-file"
                          accept="image/png,image/jpeg,image/webp"
                          aria-label="Chọn ảnh chuyển khoản"
                          onChange={chooseReceipt}
                        />
                        <button
                          type="button"
                          className="ktv-tip-add-image"
                          onClick={() => receiptFileRef.current?.click()}
                        >
                          <ImagePlus size={21} />{" "}
                          {keepsake ? keepsake.name : "Chọn ảnh kỷ niệm"}{" "}
                        </button>
                        {keepsake && (
                          <button
                            type="button"
                            className="ktv-tip-remove-image"
                            onClick={() => {
                              setKeepsake(null);
                              setConsent(false);
                            }}
                          >
                            <Trash2 size={15} /> Bỏ ảnh này
                          </button>
                        )}
                        {keepsake && (
                          <label className="ktv-tip-consent">
                            <input
                              type="checkbox"
                              checked={consent}
                              onChange={(event) => setConsent(event.target.checked)}
                            />
                            <span>
                              Tôi đồng ý lưu riêng tư ảnh này để KTV có thể xem lại; ảnh có thể chứa
                              thông tin giao dịch.
                            </span>
                          </label>
                        )}
                        {keepsake && (
                          <button
                            type="button"
                            className="ktv-tip-primary"
                            onClick={() => void saveKeepsake()}
                            disabled={!consent || uploading}
                          >
                            {uploading ? (
                              <LoaderCircle className="ktv-tip-spin" size={19} />
                            ) : (
                              <UploadCloud size={19} />
                            )}{" "}
                            Lưu ảnh kỷ niệm
                          </button>
                        )}
                      </>
                    )}
                    {keepsakeSaved && (
                      <p className="ktv-tip-success">
                        <BadgeCheck size={19} /> Ảnh đã được lưu riêng tư.
                      </p>
                    )}
                  </div>
                  <button type="button" className="ktv-tip-finish" onClick={() => setModal(false)}>
                    Hoàn tất <Check size={18} />
                  </button>
                </div>
              )}
              {notice && (
                <p className="ktv-tip-notice" role="status">
                  <Check size={17} />
                  {notice}
                </p>
              )}
              {error && (
                <p className="ktv-tip-error" role="alert">
                  {error}
                </p>
              )}
            </div>
            <footer className="ktv-tip-dialog-footer">
              <ShieldCheck size={15} />
              <span>
                Thanh toán trực tiếp với KTV. Mộc Maria không thu hộ và không tự xác minh giao dịch.
              </span>
            </footer>
          </section>
        </div>
      )}

      {editing && (
        <div
          className="ktv-tip-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setEditing(false);
          }}
        >
          <section
            className="ktv-tip-dialog ktv-tip-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ktv-tip-editor-title"
          >
            <header className="ktv-tip-dialog-header">
              <span className="ktv-tip-dialog-header-icon">
                <Pencil size={20} />
              </span>
              <div>
                <span className="ktv-tip-label">TÙY CHỈNH TRANG KTV</span>
                <h2 id="ktv-tip-editor-title">Tài khoản nhận tip</h2>
              </div>
              <button
                ref={closeRef}
                type="button"
                className="ktv-tip-dialog-close"
                aria-label="Đóng cấu hình nhận tip"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                <X size={22} />
              </button>
            </header>
            <form onSubmit={(event) => void saveSettings(event)}>
              <div className="ktv-tip-scroll ktv-tip-editor-fields">
                {pending ? (
                  <p className="ktv-tip-loading">
                    <LoaderCircle className="ktv-tip-spin" size={20} /> Đang lấy thông tin hiện
                    tại...
                  </p>
                ) : (
                  <>
                    <p className="ktv-tip-subtext">
                      Thông tin dưới đây sẽ hiển thị cho khách trên trang của {name}. Chỉ chủ KTV
                      hoặc SUPER_ADMIN được thay đổi.
                    </p>
                    <label>
                      Ngân hàng
                      <input
                        value={draft.bankName}
                        maxLength={90}
                        placeholder="Ví dụ: Vietcombank"
                        onChange={(event) =>
                          setDraft((old) => ({ ...old, bankName: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Tên chủ tài khoản
                      <input
                        value={draft.accountHolder}
                        maxLength={110}
                        placeholder="Tên in trên tài khoản ngân hàng"
                        onChange={(event) =>
                          setDraft((old) => ({ ...old, accountHolder: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      Số tài khoản
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={draft.bankAccount}
                        maxLength={25}
                        placeholder="Chỉ nhập các chữ số"
                        onChange={(event) =>
                          setDraft((old) => ({
                            ...old,
                            bankAccount: formatAccount(event.target.value),
                          }))
                        }
                      />
                    </label>
                    <div className="ktv-tip-editor-qr">
                      <span className="ktv-tip-field-caption">MÃ QR CHUYỂN KHOẢN CỦA BẠN</span>
                      {draft.qrUrl && (
                        <div className="ktv-tip-editor-qr-preview">
                          <Image
                            src={draft.qrUrl}
                            width={210}
                            height={210}
                            alt="QR đang cấu hình"
                            unoptimized
                          />
                        </div>
                      )}
                      <input
                        type="file"
                        className="ktv-tip-hidden-file"
                        ref={qrFileRef}
                        accept="image/jpeg,image/png,image/webp"
                        aria-label="Chọn ảnh QR tài khoản"
                        onChange={(event) => void uploadQr(event)}
                      />
                      <div className="ktv-tip-editor-qr-actions">
                        <button
                          type="button"
                          onClick={() => qrFileRef.current?.click()}
                          disabled={uploading}
                        >
                          <UploadCloud size={18} /> {draft.qrUrl ? "Thay QR" : "Tải QR lên"}
                        </button>
                        {draft.qrUrl && (
                          <button
                            type="button"
                            onClick={() => setDraft((old) => ({ ...old, qrUrl: null }))}
                          >
                            <Trash2 size={16} /> Xóa QR
                          </button>
                        )}
                      </div>
                      <p>
                        Mẹo: tải QR từ ứng dụng ngân hàng, ảnh rõ nét, không che phần mã. QR có thể
                        là mã chuyển khoản tĩnh.
                      </p>
                    </div>
                    <p className="ktv-tip-editor-hint">
                      <ShieldCheck size={17} /> Khi lưu, số tài khoản và QR sẽ được công khai cho
                      khách truy cập trang KTV. Bạn có thể xóa hoặc cập nhật bất cứ lúc nào.
                    </p>
                  </>
                )}
                {notice && (
                  <p className="ktv-tip-notice" role="status">
                    <Check size={17} />
                    {notice}
                  </p>
                )}
                {error && (
                  <p className="ktv-tip-error" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <footer className="ktv-tip-editor-footer">
                <button type="button" onClick={() => setEditing(false)} disabled={busy}>
                  Hủy
                </button>
                <button type="submit" disabled={busy}>
                  {saving ? (
                    <LoaderCircle className="ktv-tip-spin" size={18} />
                  ) : (
                    <Check size={18} />
                  )}{" "}
                  Lưu thông tin nhận tip
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
