"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Gift,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ApiError } from "@/features/auth/auth-api";
import { GiftQrScanner } from "./gift-qr-scanner";
import "./gift-counter.css";

type Branch = { id: string; name: string };
type Verified = {
  rewardId: string;
  eventId: string;
  name: string;
  kind: string;
  allowedServiceIds: string[];
  discountPercent: number | null;
  expiresAt: string;
  branchId: string;
  status: "ISSUED";
};
type Redeemed = {
  rewardId: string;
  eventId: string;
  status: "REDEEMED";
  branchId: string;
  redeemedAt: string;
  alreadyProcessed: boolean;
};
type BranchService = {
  service: { id: string; name: string };
  variants: Array<{ id: string; name: string; priceVnd: string }>;
  priceOverrideVnd: string | null;
};
type Quote = { rewardId: string; subtotalVnd: number; discountVnd: number; payableVnd: number };
export function GiftCounter() {
  const { authFetch, user } = useAuth();
  const branches = useQuery({
    queryKey: ["event-counter-branches", user?.id],
    queryFn: () => authFetch<Branch[]>("/staff/gift-redemptions/branches", { cache: "no-store" }),
    retry: false,
  });
  const [branchId, setBranchId] = useState("");
  const [token, setToken] = useState("");
  const [inputMode, setInputMode] = useState<"CODE" | "QR">("CODE");
  const [verified, setVerified] = useState<Verified | null>(null);
  const [confirmed, setConfirmed] = useState<Redeemed | null>(null);
  const [key, setKey] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const selectedBranch = branchId || branches.data?.[0]?.id || "";
  const catalog = useQuery({
    queryKey: ["gift-counter-catalog", selectedBranch],
    queryFn: () =>
      authFetch<BranchService[]>(`/branches/${selectedBranch}/services`, { cache: "no-store" }),
    enabled: !!selectedBranch,
    retry: false,
  });
  const [variantId, setVariantId] = useState("");
  const [saleReference, setSaleReference] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const eligibleVariants =
    catalog.data
      ?.filter(
        (entry) =>
          verified?.kind !== "VOUCHER_PERCENT" ||
          (verified.allowedServiceIds ?? []).includes(entry.service.id),
      )
      .flatMap((entry) =>
        entry.variants.map((variant) => ({ ...variant, serviceName: entry.service.name })),
      ) ?? [];
  const chosenVariant =
    (variantId && eligibleVariants.some((item) => item.id === variantId) ? variantId : "") ||
    eligibleVariants[0]?.id ||
    "";
  const request = async <T,>(path: string, body: object): Promise<T> =>
    authFetch<T>(path, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  function changeToken(value: string) {
    setToken(value.trim());
    setVerified(null);
    setConfirmed(null);
    setError("");
    setKey("");
    setQuote(null);
    setSaleReference("");
  }
  function changeBranch(value: string) {
    setBranchId(value);
    setVerified(null);
    setConfirmed(null);
    setError("");
    setKey("");
    setQuote(null);
    setVariantId("");
  }
  async function verifyCredential(value: string, mode: "CODE" | "QR") {
    if (waiting || !selectedBranch || !value) return;
    setWaiting(true);
    setError("");
    setVerified(null);
    setConfirmed(null);
    try {
      const result = await request<Verified>(
        `/staff/gift-redemptions/${mode === "CODE" ? "verify-code" : "verify"}`,
        {
          ...(mode === "CODE" ? { code: value } : { token: value }),
          branchId: selectedBranch,
        },
      );
      setVerified(result);
      setQuote(null);
      setVariantId("");
      setKey(crypto.randomUUID() + "-redeem");
    } catch {
      setError("Mã không hợp lệ, đã hết hạn, đã đổi hoặc nhân viên chưa có quyền tại cơ sở này.");
    } finally {
      setWaiting(false);
    }
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    await verifyCredential(token, inputMode);
  }
  function scannedQr(value: string) {
    changeToken(value);
    setInputMode("QR");
    void verifyCredential(value, "QR");
  }
  async function calculate() {
    if (!verified || !chosenVariant || waiting) return;
    setWaiting(true);
    setError("");
    setQuote(null);
    try {
      const result = await request<Quote>(
        `/staff/gift-redemptions/${inputMode === "CODE" ? "quote-code" : "quote-qr"}`,
        {
          ...(inputMode === "CODE" ? { code: token } : { token }),
          branchId: selectedBranch,
          items: [{ variantId: chosenVariant, quantity: 1 }],
        },
      );
      if (result.rewardId !== verified.rewardId) throw new Error("VOUCHER_CHANGED");
      setQuote(result);
    } catch (error) {
      if (
        error instanceof Error &&
        [
          "QR_EXPIRED",
          "QR_REPLACED",
          "QR_NOT_FOUND",
          "REWARD_EXPIRED",
          "REWARD_NOT_REDEEMABLE",
        ].includes(error.message)
      ) {
        setVerified(null);
        setKey("");
        setError(
          "Mã nhận quà đã hết hạn hoặc không còn hiệu lực. Nhờ khách lấy mã mới rồi kiểm tra lại quyền lợi.",
        );
      } else if (error instanceof ApiError && error.status === 429) {
        setError("Bạn vừa kiểm tra nhiều lần. Vui lòng chờ một chút rồi thử lại.");
      } else {
        setError(
          "Chưa tính được tiền giảm. Kiểm tra dịch vụ áp dụng, kết nối mạng và thử lại. Nếu mã đã quá 5 phút, nhờ khách lấy mã mới.",
        );
      }
    } finally {
      setWaiting(false);
    }
  }
  async function redeem() {
    if (!verified || waiting || !key) return;
    setWaiting(true);
    setError("");
    try {
      const result = await request<Redeemed>(
        `/staff/gift-redemptions/${inputMode === "CODE" ? "redeem-code" : "redeem"}`,
        {
          ...(inputMode === "CODE" ? { code: token } : { token }),
          branchId: selectedBranch,
          idempotencyKey: key,
          ...(verified.kind === "VOUCHER_PERCENT" && quote
            ? {
                ...(saleReference.trim() ? { saleReference: saleReference.trim() } : {}),
                items: [{ variantId: chosenVariant, quantity: 1 }],
              }
            : {}),
        },
      );
      setConfirmed(result);
      setVerified(null);
      setToken(""); // never retain the claim token in the form after success
    } catch {
      setError(
        "Chưa thể xác nhận. Quà có thể đã được quầy khác nhận, mã hết hạn hoặc bạn đã mất quyền. Không tự phát quà khi còn lỗi.",
      );
    } finally {
      setWaiting(false);
    }
  }
  return (
    <main className="mm-gc">
      <div className="mm-gc-wrap">
        <Link href="/" className="mm-gc-back">
          <ArrowLeft size={16} /> Trang chủ
        </Link>
        <header>
          <span>GIFT COUNTER · MỘC MARIA</span>
          <h1>Quầy xác nhận quà</h1>
          <p>
            Chỉ giao quà sau khi máy chủ xác nhận thành công. Không dùng hình chụp QR hết hạn hay
            trạng thái xác minh thay cho trạng thái đã đổi.
          </p>
        </header>
        <div className="mm-gc-grid">
          <form onSubmit={(e) => void verify(e)} className="mm-gc-card">
            <h2>
              <ShieldCheck size={19} /> Bước 1 · Xác minh voucher
            </h2>
            {branches.isError && (
              <p role="alert" className="mm-gc-error">
                Tài khoản chưa được cấp quyền quầy, hoặc hệ thống chưa kích hoạt.
              </p>
            )}
            <label>
              Phương thức xác minh
              <select
                value={inputMode}
                onChange={(e) => {
                  setInputMode(e.target.value as "CODE" | "QR");
                  changeToken("");
                }}
                disabled={waiting}
              >
                <option value="CODE">Mã 6 số khách đọc tại quầy</option>
                <option value="QR">Máy quét QR</option>
              </select>
            </label>
            <label>
              Cơ sở nhận quà
              <select
                value={selectedBranch}
                onChange={(e) => changeBranch(e.target.value)}
                required
                disabled={!branches.data?.length || waiting}
              >
                {!branches.data?.length && <option value="">Chưa có cơ sở được cấp quyền</option>}
                {branches.data?.map((b) => (
                  <option value={b.id} key={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {inputMode === "CODE" ? "Mã voucher 6 số" : "Mã từ thiết bị quét QR"}
              <input
                autoComplete="off"
                spellCheck={false}
                value={token}
                maxLength={inputMode === "CODE" ? 6 : 43}
                minLength={inputMode === "CODE" ? 6 : 43}
                required
                inputMode={inputMode === "CODE" ? "numeric" : "text"}
                pattern={inputMode === "CODE" ? "[0-9]{6}" : "[A-Za-z0-9_-]{43}"}
                onChange={(e) => changeToken(e.target.value)}
                placeholder={inputMode === "CODE" ? "Ví dụ: 482916" : "Quét QR để nhập mã nhận quà"}
              />
            </label>
            {inputMode === "QR" && (
              <GiftQrScanner onRead={scannedQr} disabled={waiting || !selectedBranch} />
            )}
            <p>
              Mã 6 số và mã QR chỉ có hiệu lực tối đa 5 phút. Luôn xác minh online trước khi xác
              nhận.
            </p>
            <button
              type="submit"
              disabled={
                waiting ||
                !selectedBranch ||
                !(inputMode === "CODE" ? /^\d{6}$/ : /^[A-Za-z0-9_-]{43}$/).test(token)
              }
            >
              <ClipboardCheck size={17} />
              {waiting ? "Đang kiểm tra…" : "Kiểm tra quyền lợi"}
            </button>
            {error && (
              <p role="alert" className="mm-gc-error">
                {error}
              </p>
            )}
          </form>
          <section className="mm-gc-card mm-gc-right" aria-live="polite">
            <h2>
              <Gift size={19} /> Bước 2 · Đối chiếu & bàn giao
            </h2>
            {!verified && !confirmed && (
              <div className="mm-gc-placeholder">
                <LockKeyhole size={38} />
                <strong>Đang chờ kết quả kiểm tra</strong>
                <p>Chưa có thao tác giao quà được ghi nhận.</p>
              </div>
            )}
            {verified && (
              <div className="mm-gc-result">
                <span>PHIẾU CÒN HIỆU LỰC</span>
                <h3>{verified.name}</h3>
                {verified.kind === "VOUCHER_PERCENT" && !!verified.discountPercent && (
                  <strong className="mm-gc-discount">
                    Giảm {verified.discountPercent}% khi thanh toán
                  </strong>
                )}
                <p>
                  Hạn cuối:{" "}
                  {new Date(verified.expiresAt).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </p>
                <p>Xác nhận chỉ khi đã đối chiếu món quà và thực tế giao cho khách.</p>
                {verified.kind === "VOUCHER_PERCENT" && (
                  <div>
                    <p>
                      Chọn đúng dịch vụ khách sử dụng để tính giảm giá. Chỉ xác nhận sau khi đã đối
                      chiếu và thu tiền thực tế tại quầy.
                    </p>
                    <>
                      <label>
                        Sản phẩm hoặc gói dịch vụ đã bán
                        <select
                          value={chosenVariant}
                          onChange={(e) => {
                            setVariantId(e.target.value);
                            setQuote(null);
                          }}
                        >
                          {eligibleVariants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {variant.serviceName} - {variant.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {!eligibleVariants.length && (
                        <p role="alert">Không có sản phẩm phù hợp với voucher tại cơ sở này.</p>
                      )}
                      <label>
                        Mã đối soát nội bộ (không bắt buộc)
                        <input
                          value={saleReference}
                          onChange={(e) => setSaleReference(e.target.value)}
                          placeholder="Có thể để trống"
                          maxLength={100}
                        />
                      </label>
                      <p>
                        Không có mã vẫn xác nhận được. Hệ thống lưu nhân viên, cơ sở và thời điểm áp
                        dụng voucher để đối soát.
                      </p>
                      <button
                        type="button"
                        disabled={waiting || !chosenVariant}
                        onClick={() => void calculate()}
                      >
                        Tính giảm giá từ bảng giá hiện hành
                      </button>
                      {quote && (
                        <p role="status">
                          Giá gốc: {quote.subtotalVnd.toLocaleString("vi-VN")}đ · Giảm:{" "}
                          {quote.discountVnd.toLocaleString("vi-VN")}đ · Còn lại:{" "}
                          {quote.payableVnd.toLocaleString("vi-VN")}đ
                        </p>
                      )}
                    </>
                  </div>
                )}
                <button
                  type="button"
                  disabled={
                    waiting ||
                    (verified.kind === "VOUCHER_PERCENT" && (!quote || quote.discountVnd <= 0))
                  }
                  onClick={() => void redeem()}
                >
                  <CheckCircle2 size={17} />
                  {waiting
                    ? "Đang xác nhận…"
                    : verified.kind === "VOUCHER_PERCENT"
                      ? "Xác nhận áp dụng voucher"
                      : "Xác nhận đã giao quà"}
                </button>
              </div>
            )}
            {confirmed && (
              <div className="mm-gc-success" role="status">
                <CheckCircle2 size={34} />
                <h3>Đã xác nhận giao quà</h3>
                <p>
                  {new Date(confirmed.redeemedAt).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </p>
                <p>Mã giao dịch: {confirmed.rewardId}</p>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmed(null);
                    setError("");
                  }}
                >
                  Tiếp nhận khách tiếp theo
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
