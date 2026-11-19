"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Coins, Gift, LocateFixed, MapPin, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useLocale } from "@/shared/i18n/locale-provider";
import type { CustomerActivityKey } from "@/shared/i18n/customer-activity-messages";
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
  const { t, locale } = useLocale();
  const { user, authFetch } = useAuth();
  const queryClient = useQueryClient();
  const [day, setDay] = useState(() => hcmDate());
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<CustomerActivityKey | "">("");
  const [error, setError] = useState<{
    key: CustomerActivityKey;
    values?: Record<string, number>;
  } | null>(null);
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
    setError(null);
    setMessage("ci.gpsChecking");
    try {
      if (!navigator.geolocation || !globalThis.crypto?.randomUUID) {
        setError({ key: "ci.unsupported" });
        setMessage("");
        return;
      }
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
      ) {
        setError({ key: "ci.accuracy" });
        setMessage("");
        return;
      }
      const distance = metersBetween(
        { latitude, longitude },
        { latitude: selected.latitude!, longitude: selected.longitude! },
      );
      if (distance > 100) {
        setError({ key: "ci.outside", values: { distance: Math.round(distance) } });
        setMessage("");
        return;
      }
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
      setMessage(result.alreadyCheckedIn ? "ci.already" : "ci.success");
    } catch (e) {
      const code = (e as { code?: number }).code;
      setError({ key: code === 1 ? "ci.permission" : code === 3 ? "ci.timeout" : "ci.error" });
      setMessage("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mm-customer-att-card" aria-label={t("ci.label")} lang={locale}>
      <div className="mm-customer-att-head">
        <div className="mm-customer-att-heading">
          <span className="mm-customer-att-eyebrow">
            <Gift size={15} /> {t("ci.customer")}
          </span>
          <h2>{t("ci.title")}</h2>
          <p>{t("ci.hint")}</p>
        </div>
        <div className="mm-customer-att-coins" aria-label={t("ci.balance")}>
          <Coins size={19} />
          <strong>{data?.wallet.balance ?? 0}</strong>
          <span>{t("ci.coin")}</span>
        </div>
      </div>

      {query.isPending && (
        <p role="status" className="mm-customer-att-hint">
          {t("ci.loading")}
        </p>
      )}
      {query.isError && (
        <div role="alert" className="mm-customer-att-error">
          {t("ci.loadError")}
          <button type="button" onClick={() => void query.refetch()}>
            {t("common.retry")}
          </button>
        </div>
      )}
      {data && (
        <>
          {branches.length > 1 ? (
            <label className="mm-customer-att-branch">
              {t("ci.branch")}
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
                <strong>{selected?.name ?? t("ci.branch")}</strong>
                <p>{selected?.address ?? t("ci.addressUpdating")}</p>
              </div>
            </div>
          )}
          {data.today ? (
            <div className="mm-customer-att-success" role="status">
              <CheckCircle2 size={24} />
              <div>
                <strong>{t("ci.checked")}</strong>
                <p>
                  {formattedCheckInTime(data.today.createdAt ?? data.today.checkedInAt, locale)}
                </p>
                <span>{t("ci.reward", { n: data.today.coinsEarned })}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="mm-customer-att-rule">
                <Clock3 size={17} /> {t("ci.rule")}
              </div>
              <button
                type="button"
                className="mm-customer-att-action"
                onClick={() => void checkIn()}
                disabled={busy || !selected}
              >
                <LocateFixed size={22} /> {busy ? t("ci.checking") : t("ci.action")}
              </button>
            </>
          )}
          {message && (
            <p role="status" className="mm-customer-att-message">
              {t(message)}
            </p>
          )}
          {error && (
            <p role="alert" className="mm-customer-att-error">
              {t(error.key, error.values)}
            </p>
          )}
        </>
      )}
      <p className="mm-customer-att-foot">
        <ShieldCheck size={15} />
        {t("ci.privacy")}
      </p>
    </section>
  );
}
