"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Coins, Gift, LocateFixed, MapPin, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  formattedCheckInTime,
  hcmDate,
  isConfigured,
  metersBetween,
  staffBranches,
  type StaffAttendanceMe,
} from "./data";
import { customerCheckInDeviceId } from "./customer-device";
import "./customer-attendance.css";

function freshCustomerGps(position: GeolocationPosition): boolean {
  return Date.now() - position.timestamp >= -5_000 && Date.now() - position.timestamp <= 30_000;
}

export function CustomerAttendanceCard() {
  const { user, authFetch } = useAuth();
  const queryClient = useQueryClient();
  const [day, setDay] = useState(() => hcmDate());
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const query = useQuery({
    queryKey: ["customer-attendance", user?.id, day],
    queryFn: ({ signal }) =>
      authFetch<StaffAttendanceMe>("/customer-attendance/me", { signal, cache: "no-store" }),
    enabled: !!user?.isActive,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
  useEffect(() => {
    const timer = setInterval(() => {
      const date = hcmDate();
      setDay((previous) => (previous === date ? previous : date));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const data = query.data;
  const branches = staffBranches(data).filter((b) => isConfigured(b));
  const selected = branches.find((b) => b.id === branchId) ?? branches[0];

  async function checkIn() {
    if (busy || data?.today || !selected) return;
    setBusy(true);
    setError("");
    setMessage("Đang xin quyền GPS và xác nhận khoảng cách...");
    try {
      if (!navigator.geolocation || !globalThis.crypto?.randomUUID)
        throw new Error("Thiết bị chưa hỗ trợ GPS hoặc định danh trình duyệt bảo mật.");
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000,
        }),
      );
      const { latitude, longitude, accuracy } = position.coords;
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        !Number.isFinite(accuracy) ||
        accuracy > 50 ||
        accuracy < 0 ||
        !freshCustomerGps(position)
      )
        throw new Error("GPS chưa đủ chính xác (tối đa 50m). Hãy ra nơi thoáng và thử lại.");
      const distance = metersBetween(
        { latitude, longitude },
        { latitude: selected.latitude!, longitude: selected.longitude! },
      );
      if (distance > 100)
        throw new Error(
          `Bạn đang cách Mộc Maria khoảng ${Math.round(distance)}m, ngoài phạm vi 100m. Chưa trừ lượt check-in.`,
        );
      const deviceId = customerCheckInDeviceId(window.localStorage, () => crypto.randomUUID());
      const result = await authFetch<StaffAttendanceMe>("/customer-attendance/check-ins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: selected.id,
          latitude,
          longitude,
          accuracyMeters: accuracy,
          deviceId,
        }),
      });
      queryClient.setQueryData(["customer-attendance", user?.id, result.localDate], result);
      await queryClient.invalidateQueries({ queryKey: ["customer-attendance", user?.id] });
      setMessage(
        result.alreadyCheckedIn
          ? "Bạn đã check-in hôm nay rồi."
          : "Check-in thành công! Bạn được cộng 5 coin.",
      );
    } catch (e) {
      const code = (e as { code?: number }).code;
      setError(
        code === 1
          ? "Bạn cần cấp quyền vị trí trong Chrome hoặc Safari để nhận 5 coin."
          : code === 3
            ? "GPS phản hồi quá lâu. Hãy đến nơi thoáng và thử lại."
            : e instanceof Error
              ? e.message
              : "Không thể check-in. Vui lòng thử lại.",
      );
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mm-customer-att-card" aria-label="Check-in khách hàng Mộc Maria">
      <div className="mm-customer-att-head">
        <div className="mm-customer-att-heading">
          <span className="mm-customer-att-eyebrow">
            <Gift size={15} /> DÀNH CHO KHÁCH HÀNG
          </span>
          <h2>Ghé Mộc mỗi ngày, nhận 5 coin</h2>
          <p>Chỉ cần check-in trong phạm vi 100m tại cơ sở Mộc Maria.</p>
        </div>
        <div className="mm-customer-att-coins" aria-label="Số dư coin">
          <Coins size={19} />
          <strong>{data?.wallet.balance ?? 0}</strong>
          <span>coin</span>
        </div>
      </div>

      {query.isPending && (
        <p role="status" className="mm-customer-att-hint">
          Đang tải lượt check-in hôm nay...
        </p>
      )}
      {query.isError && (
        <div role="alert" className="mm-customer-att-error">
          Không tải được lượt check-in. {query.error?.message}
          <button type="button" onClick={() => void query.refetch()}>
            Thử lại
          </button>
        </div>
      )}
      {data && (
        <>
          {branches.length > 1 ? (
            <label className="mm-customer-att-branch">
              Cơ sở Mộc Maria
              <select value={selected?.id ?? ""} onChange={(e) => setBranchId(e.target.value)}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="mm-customer-att-location">
              <MapPin size={19} />
              <div>
                <strong>{selected?.name ?? "Cơ sở Mộc Maria"}</strong>
                <p>{selected?.address ?? "Đang cập nhật địa chỉ cơ sở"}</p>
              </div>
            </div>
          )}
          {data.today ? (
            <div className="mm-customer-att-success" role="status">
              <CheckCircle2 size={24} />
              <div>
                <strong>Bạn đã check-in hôm nay!</strong>
                <p>{formattedCheckInTime(data.today.createdAt ?? data.today.checkedInAt)}</p>
                <span>+{data.today.coinsEarned} coin · Hẹn gặp lại vào ngày mai</span>
              </div>
            </div>
          ) : (
            <>
              <div className="mm-customer-att-rule">
                <Clock3 size={17} /> Mỗi tài khoản và mỗi trình duyệt chỉ nhận 1 lượt/ngày theo giờ
                Việt Nam.
              </div>
              <button
                type="button"
                className="mm-customer-att-action"
                onClick={() => void checkIn()}
                disabled={busy || !selected}
              >
                <LocateFixed size={22} />{" "}
                {busy ? "Đang xác nhận GPS..." : "Check-in ngay · Nhận 5 coin"}
              </button>
            </>
          )}
          {message && (
            <p role="status" className="mm-customer-att-message">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="mm-customer-att-error">
              {error}
            </p>
          )}
        </>
      )}
      <p className="mm-customer-att-foot">
        <ShieldCheck size={15} />
        GPS phải đủ chính xác, dưới 50m sai số. Hệ thống ghi nhớ trình duyệt để hạn chế nhiều tài
        khoản check-in cùng ngày. Không theo dõi vị trí liên tục.
      </p>
    </section>
  );
}
