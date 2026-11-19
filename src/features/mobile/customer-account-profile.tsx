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
import { useLocale } from "@/shared/i18n/locale-provider";
import type { Locale } from "@/shared/i18n/locale";
import type { MessageKey } from "@/shared/i18n/messages";
import { translate } from "@/shared/i18n/messages";
import { vipLabel } from "@/features/membership/vip-level";
import "./customer-account-profile.css";

export type CustomerSelfProfile = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  roles: string[];
  customer: { id: string; birthday: string | null; avatarUrl: string | null };
  membership: {
    tier: "VIP" | "STANDARD";
    level?: number | null;
    expiresAt: string | null;
    startedAt: string | null;
  };
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
  const hasPosition = user?.roles.some((role) =>
    [
      "SUPER_ADMIN",
      "ADMIN",
      "BRANCH_MANAGER",
      "RECEPTIONIST",
      "THERAPIST",
      "DOCTOR_CONSULTANT",
    ].includes(role),
  );
  return useQuery({
    queryKey: ["customer", "self", user?.id],
    queryFn: () => authFetch<CustomerSelfProfile>("/customers/me", { cache: "no-store" }),
    enabled: !!user?.isActive && (user.permissions.includes("customer.portal") || !hasPosition),
    retry: false,
    staleTime: 30_000,
  });
}

function displayDate(value: string | null, locale: Locale): string {
  if (!value) return translate(locale, "cp.unlimited");
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? translate(locale, "cp.updating")
    : new Intl.DateTimeFormat(locale, {
        timeZone: "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
}

const isValidAvatarUrl = (value: string | null) => !!value && /^https:\/\/[^\s]+$/i.test(value);

export function CustomerPhoto({
  profile,
  onUpdate,
}: {
  profile: CustomerSelfProfile;
  onUpdate: (next: CustomerSelfProfile) => void;
}) {
  const { authFetch } = useAuth();
  const { t, locale } = useLocale();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<MessageKey | "">("");
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
      setError("cp.avatarInvalid");
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
    } catch {
      setError("cp.uploadError");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mm-customer-photo-area" lang={locale}>
      <div className={isActiveVip(profile) ? "mm-customer-photo is-vip" : "mm-customer-photo"}>
        {preview || isValidAvatarUrl(profile.customer.avatarUrl) ? (
          <Image
            unoptimized
            src={preview || profile.customer.avatarUrl!}
            alt={t("cp.avatar", { name: profile.displayName })}
            width={184}
            height={184}
            sizes="(max-width: 650px) 112px, 160px"
          />
        ) : (
          <span aria-label={t("cp.noAvatar")}>
            {profile.displayName.trim().charAt(0).toLocaleUpperCase("vi-VN") || "M"}
          </span>
        )}
        {isActiveVip(profile) && (
          <span className="mm-customer-photo-crown" aria-label={t("cp.vip")}>
            <Crown size={19} fill="currentColor" />
          </span>
        )}
      </div>
      {profile.avatarUploadEnabled ? (
        <>
          <label className="mm-customer-photo-upload" htmlFor="customer-avatar-input">
            <Camera size={16} />
            {photo ? t("cp.otherPhoto") : t("cp.changePhoto")}
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
                {busy ? t("common.loading") : t("cp.savePhoto")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPreview(null);
                }}
                disabled={busy}
                aria-label={t("cp.cancelPhoto")}
              >
                <X size={14} />
              </button>
            </div>
          )}
          <small>{t("cp.photoHint")}</small>
        </>
      ) : (
        <small>{t("cp.photoMaintenance")}</small>
      )}
      {done && (
        <p className="mm-customer-photo-ok" role="status">
          <CheckCircle2 size={14} />
          {t("cp.photoSaved")}
        </p>
      )}
      {error && (
        <p className="mm-customer-photo-error" role="alert">
          {t(error)}
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
  const { t, locale } = useLocale();
  const [name, setName] = useState(profile.displayName);
  const [phone, setPhone] = useState(profile.phone || "");
  const [birthday, setBirthday] = useState(profile.customer.birthday?.slice(0, 10) || "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<MessageKey | "">("");
  const [error, setError] = useState<MessageKey | "">("");
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
      setNotice("cp.saved");
    } catch {
      setError("cp.saveError");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={vip ? "mm-customer-overview is-vip" : "mm-customer-overview"}
      id="thong-tin-tai-khoan"
      aria-label={t("cp.profile")}
      lang={locale}
    >
      <div className="mm-customer-identity">
        <span className="mm-customer-eyebrow">
          <Sparkles size={14} /> {t("cp.eyebrow")}
        </span>
        <CustomerPhoto profile={profile} onUpdate={onUpdate} />
        <h2>{profile.displayName}</h2>
        {vip ? (
          <div className="mm-customer-vip-mark">
            <Crown size={18} fill="currentColor" />{" "}
            {t("cp.vipMark", { level: vipLabel(profile.membership.level) })}{" "}
            <BadgeCheck size={16} />
          </div>
        ) : (
          <div className="mm-customer-normal-mark">
            <HeartHandshake size={16} /> {t("account.member")}
          </div>
        )}
        <p className="mm-customer-identity-desc">
          {vip ? t("cp.vipThanks") : t("cp.standardIntro")}
        </p>
        <div className={vip ? "mm-customer-membership is-vip" : "mm-customer-membership"}>
          <span>{vip ? <Crown size={20} fill="currentColor" /> : <ShieldCheck size={19} />}</span>
          <div>
            <strong>
              {vip
                ? t("auth.vipActive", { level: vipLabel(profile.membership.level) })
                : t("cp.standard")}
            </strong>
            <small>
              {vip
                ? t("cp.expiry", { date: displayDate(profile.membership.expiresAt, locale) })
                : t("cp.membershipHint")}
            </small>
          </div>
          <CheckCircle2 size={17} />
        </div>
        <Link href="/hoi-vien" className="mm-customer-membership-link">
          {t("cp.discover")} <ArrowUpRight size={16} />
        </Link>
      </div>

      <div className="mm-customer-details">
        <div className="mm-customer-detail-heading">
          <div>
            <span className="mm-customer-eyebrow">{t("account.kicker")}</span>
            <h2>{t("cp.personal")}</h2>
            <p>{t("cp.personalHint")}</p>
          </div>
          <span className="mm-customer-detail-icon">
            <UserRound size={22} />
          </span>
        </div>
        <form className="mm-customer-profile-form" onSubmit={(event) => void saveInfo(event)}>
          <label>
            <span>
              <UserRound size={15} /> {t("account.fullName")}
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
              <Phone size={15} /> {t("account.phone")}
            </span>
            <input
              type="tel"
              autoComplete="tel"
              maxLength={32}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={t("cp.contactPhone")}
            />
          </label>
          <label>
            <span>
              <CalendarDays size={15} /> {t("cp.birthday")}
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
              <Mail size={15} /> {t("cp.email")}
            </span>
            <input
              type="email"
              value={profile.email || t("account.missing")}
              readOnly
              aria-readonly="true"
            />
          </label>
          <p className="mm-customer-readonly">
            <ShieldCheck size={15} /> {t("cp.emailProtected")}
          </p>
          <button
            className="mm-customer-save"
            disabled={busy || !changed || name.trim().length < 2}
            type="submit"
          >
            <Save size={17} />
            {busy ? t("loading.saving") : t("cp.saveChanges")}
          </button>
          {notice && (
            <p className="mm-customer-success" role="status">
              <CheckCircle2 size={17} />
              {t(notice)}
            </p>
          )}
          {error && (
            <p className="mm-customer-error" role="alert">
              {t(error)}
            </p>
          )}
        </form>
        <div className="mm-customer-safety">
          <Clock3 size={17} /> {t("cp.privacy")}
        </div>
      </div>
    </section>
  );
}

export function CustomerAccountProfile() {
  const { t, locale } = useLocale();
  const profile = useCustomerSelfProfile();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  if (profile.isPending)
    return (
      <div className="mm-customer-overview mm-customer-loading" role="status" lang={locale}>
        {t("cp.loading")}
      </div>
    );
  if (profile.isError || !profile.data)
    return (
      <div className="mm-customer-overview mm-customer-loading" role="alert" lang={locale}>
        {t("cp.loadError")}{" "}
        <button type="button" onClick={() => void profile.refetch()}>
          {t("common.retry")}
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
