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
import "./gift-counter.css";

type Branch = { id: string; name: string };
type Verified = {
  rewardId: string;
  eventId: string;
  name: string;
  kind: string;
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
export function GiftCounter() {
  const { authFetch, user } = useAuth();
  const branches = useQuery({
    queryKey: ["event-counter-branches", user?.id],
    queryFn: () => authFetch<Branch[]>("/staff/gift-redemptions/branches", { cache: "no-store" }),
    retry: false,
  });
  const [branchId, setBranchId] = useState("");
  const [token, setToken] = useState("");
  const [verified, setVerified] = useState<Verified | null>(null);
  const [confirmed, setConfirmed] = useState<Redeemed | null>(null);
  const [key, setKey] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState("");
  const selectedBranch = branchId || branches.data?.[0]?.id || "";
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
  }
  function changeBranch(value: string) {
    setBranchId(value);
    setVerified(null);
    setConfirmed(null);
    setError("");
    setKey("");
  }
  async function verify(e: FormEvent) {
    e.preventDefault();
    if (waiting || !selectedBranch || !token) return;
    setWaiting(true);
    setError("");
    setVerified(null);
    setConfirmed(null);
    try {
      const result = await request<Verified>("/staff/gift-redemptions/verify", {
        token,
        branchId: selectedBranch,
      });
      setVerified(result);
      setKey(crypto.randomUUID() + "-redeem");
    } catch {
      setError("Mã không hợp lệ, đã hết hạn, đã đổi hoặc nhân viên chưa có quyền tại cơ sở này.");
    } finally {
      setWaiting(false);
    }
  }
  async function redeem() {
    if (!verified || waiting || !key) return;
    setWaiting(true);
    setError("");
    try {
      const result = await request<Redeemed>("/staff/gift-redemptions/redeem", {
        token,
        branchId: selectedBranch,
        idempotencyKey: key,
      });
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
              <ShieldCheck size={19} /> Bước 1 · Xác minh QR
            </h2>
            {branches.isError && (
              <p role="alert" className="mm-gc-error">
                Tài khoản chưa được cấp quyền quầy, hoặc hệ thống chưa kích hoạt.
              </p>
            )}
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
              Mã từ thiết bị quét QR
              <input
                autoComplete="off"
                spellCheck={false}
                value={token}
                maxLength={43}
                minLength={43}
                required
                pattern="[A-Za-z0-9_-]{43}"
                onChange={(e) => changeToken(e.target.value)}
                placeholder="Quét QR để nhập mã nhận quà"
              />
            </label>
            <p>
              Máy quét QR loại bàn phím có thể nhập mã trực tiếp vào ô này. Camera tích hợp sẽ được
              kiểm thử riêng trước khi đưa vào vận hành.
            </p>
            <button
              type="submit"
              disabled={waiting || !selectedBranch || !/^[A-Za-z0-9_-]{43}$/.test(token)}
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
                <p>
                  Hạn cuối:{" "}
                  {new Date(verified.expiresAt).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </p>
                <p>Xác nhận chỉ khi đã đối chiếu món quà và thực tế giao cho khách.</p>
                <button type="button" disabled={waiting} onClick={() => void redeem()}>
                  <CheckCircle2 size={17} />
                  {waiting ? "Đang xác nhận…" : "Xác nhận đã giao quà"}
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
