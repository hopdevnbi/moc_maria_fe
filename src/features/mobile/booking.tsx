"use client";
import { DEFAULT_BOOKING_NOTE } from "@/shared/booking/inquiry-status";
import { useLocale } from "@/shared/i18n/locale-provider";
import { menuName } from "@/shared/i18n/menu-names";
import { providerTitle } from "@/shared/i18n/provider-titles";
import { useCatalogTranslations } from "@/shared/i18n/use-catalog-translation";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  House,
  MapPin,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatPrice } from "@/features/marketplace/format";
import type { Branch, Provider, ServiceDetail, ServiceItem } from "@/features/marketplace/types";
import {
  homeTerritories,
  isEligibleForMode,
  isPrimaryBranch,
  MOC_MARIA_MAP_URL,
  MOC_MARIA_PRIMARY_ADDRESS,
  type BookingLocationMode,
} from "./booking-location";
import { MobileHeader, MobileNavigation } from "./experience";
import { BookingReassurance } from "./booking-reassurance";
import "./mobile.css";
import "./booking-location.css";

type Slot = {
  startsAt: string;
  endsAt: string;
  providerApplicationId: string;
  providerName: string;
  totalVnd: string;
  priceVnd: string;
  travelFeeVnd: string;
};
type Availability = {
  timezone: string;
  date: string;
  reservation: false;
  requestEnabled: boolean;
  blockers: string[];
  slots: Slot[];
};
type BookingProps = {
  providers: Provider[];
  services: ServiceItem[];
  branches: Branch[];
  initial: { provider?: string; service?: string; variant?: string };
  unavailable?: boolean;
};

function vietnamToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (key: string) => parts.find((part) => part.type === key)?.value || "";
  return get("year") + "-" + get("month") + "-" + get("day");
}
function displayTime(date: string, locale: string = "vi") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function BookingWizard({
  providers,
  services,
  branches,
  initial,
  unavailable,
}: BookingProps) {
  const { user, status, authFetch } = useAuth();
  const { locale, t } = useLocale();
  const [locationMode, setLocationMode] = useState<BookingLocationMode>("AT_BRANCH");
  const [homeAddress, setHomeAddress] = useState("");
  const [homeTerritory, setHomeTerritory] = useState("");
  const [providerId, setProviderId] = useState(initial.provider || "");
  const [serviceId, setServiceId] = useState(initial.service || "");
  const [variantId, setVariantId] = useState(initial.variant || "");
  const [branchId, setBranchId] = useState("");
  const [day, setDay] = useState(() => vietnamToday());
  const [detail, setDetail] = useState<ServiceDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [notes, setNotes] = useState(DEFAULT_BOOKING_NOTE);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const requestIdentity = useRef<{ signature: string; key: string } | null>(null);

  const territories = homeTerritories(providers);
  const homeReady = !!homeTerritory && homeAddress.trim().length >= 12;
  const eligibleProviders = providers.filter((provider) =>
    isEligibleForMode(provider, locationMode, homeTerritory),
  );
  const chosenProvider = eligibleProviders.find((provider) => provider.id === providerId);
  const chosenService = services.find((item) => item.service.id === serviceId);
  const compatibleProviders = eligibleProviders.filter(
    (provider) => !serviceId || isEligibleForMode(provider, locationMode, homeTerritory, serviceId),
  );
  const compatibleServices =
    locationMode === "AT_HOME" && !homeReady
      ? []
      : chosenProvider
        ? services.filter((item) =>
            isEligibleForMode(chosenProvider, locationMode, homeTerritory, item.service.id),
          )
        : locationMode === "AT_HOME"
          ? services.filter((item) =>
              eligibleProviders.some((provider) =>
                isEligibleForMode(provider, locationMode, homeTerritory, item.service.id),
              ),
            )
          : services;
  const variants =
    detail?.service.id === serviceId
      ? detail.variants.filter((variant) => variant.isActive)
      : chosenService?.variants.filter((variant) => variant.isActive) || [];
  const serviceTranslations = useCatalogTranslations(
    "service",
    compatibleServices.map((item) => item.service.id),
  );
  const variantTranslations = useCatalogTranslations(
    "variant",
    variants.map((item) => item.id),
  );

  const serviceBranchIds = new Set(detail?.branches.map((entry) => entry.branch.id) || []);
  const allowedBranchIds = chosenProvider
    ? new Set(
        chosenProvider.eligibleServices
          ?.filter(
            (policy) =>
              policy.serviceId === serviceId &&
              policy.mode === "ON_SITE" &&
              serviceBranchIds.has(policy.branchId),
          )
          .map((policy) => policy.branchId) || [],
      )
    : serviceBranchIds;
  const availableBranches = branches.filter(
    (branch) => branch.isActive && allowedBranchIds.has(branch.id),
  );
  const effectiveBranchId =
    locationMode === "AT_BRANCH"
      ? availableBranches.find((branch) => branch.id === branchId)?.id ||
        availableBranches.find(isPrimaryBranch)?.id ||
        ""
      : "";
  const activeBranch = branches.find((branch) => branch.id === effectiveBranchId);
  const slots =
    availability?.slots.filter(
      (slot) => !providerId || slot.providerApplicationId === providerId,
    ) || [];

  useEffect(() => {
    if (!chosenService || locationMode !== "AT_BRANCH") return;
    const controller = new AbortController();
    fetch("/api/mobile/service/" + encodeURIComponent(chosenService.service.slug), {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Chưa tải được thông tin cơ sở phục vụ.");
        setDetail((await response.json()) as ServiceDetail);
        setDetailError("");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setDetail(null);
          setDetailError(error instanceof Error ? error.message : "Không tải được cơ sở.");
        }
      });
    return () => controller.abort();
  }, [chosenService, locationMode]);

  useEffect(() => {
    if (
      locationMode !== "AT_BRANCH" ||
      !variantId ||
      !effectiveBranchId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(day)
    )
      return;
    const controller = new AbortController();
    const query = new URLSearchParams({ variantId, branchId: effectiveBranchId, date: day });
    if (providerId) query.set("providerApplicationId", providerId);
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoadingSlots(true);
      setAvailability(null);
      setSelectedSlot(null);
      setAvailabilityError("");
    });
    fetch("/api/mobile/availability?" + query, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Chưa kiểm tra được lịch trống.");
        setAvailability((await response.json()) as Availability);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setAvailabilityError(error instanceof Error ? error.message : "Không tải được lịch.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
    return () => controller.abort();
  }, [locationMode, effectiveBranchId, variantId, day, providerId]);

  const clearChoice = () => {
    setProviderId("");
    setServiceId("");
    setVariantId("");
    setBranchId("");
    setDetail(null);
    setAvailability(null);
    setSelectedSlot(null);
    setSendError("");
  };
  const changeLocationMode = (mode: BookingLocationMode) => {
    if (mode !== locationMode) {
      clearChoice();
      setLocationMode(mode);
    }
  };
  const changeHomeTerritory = (code: string) => {
    setHomeTerritory(code);
    clearChoice();
  };
  const changeProvider = (id: string) => {
    setProviderId(id);
    const provider = providers.find((item) => item.id === id);
    if (
      id &&
      serviceId &&
      (!provider || !isEligibleForMode(provider, locationMode, homeTerritory, serviceId))
    ) {
      setServiceId("");
      setVariantId("");
      setBranchId("");
      setDetail(null);
    }
    setSelectedSlot(null);
    setAvailability(null);
  };
  const changeService = (id: string) => {
    setServiceId(id);
    setVariantId("");
    setBranchId("");
    setDetail(null);
    setSelectedSlot(null);
    setAvailability(null);
    const provider = providers.find((item) => item.id === providerId);
    if (id && provider && !isEligibleForMode(provider, locationMode, homeTerritory, id)) {
      setProviderId("");
    }
  };
  const requestBooking = async () => {
    if (
      locationMode !== "AT_BRANCH" ||
      !selectedSlot ||
      !variantId ||
      !effectiveBranchId ||
      !user ||
      !availability?.requestEnabled
    )
      return;
    setSending(true);
    setSendError("");
    try {
      const signature = [
        variantId,
        effectiveBranchId,
        selectedSlot.startsAt,
        selectedSlot.providerApplicationId,
        selectedSlot.totalVnd,
        notes.trim(),
      ].join("|");
      if (requestIdentity.current?.signature !== signature)
        requestIdentity.current = { signature, key: crypto.randomUUID().replace(/-/g, "") };
      await authFetch("/bookings/requests", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          branchId: effectiveBranchId,
          startsAt: selectedSlot.startsAt,
          providerApplicationId: selectedSlot.providerApplicationId,
          idempotencyKey: requestIdentity.current.key,
          expectedTotalVnd: selectedSlot.totalVnd,
          quoteAcknowledged: true,
          notes: notes.trim().slice(0, 500),
        }),
      });
      setSubmitted(true);
    } catch (error) {
      setSendError(
        error instanceof Error ? error.message : "Chưa gửi được yêu cầu. Vui lòng thử lại.",
      );
    } finally {
      setSending(false);
    }
  };
  const displayAddress =
    locationMode === "AT_BRANCH"
      ? activeBranch?.address || MOC_MARIA_PRIMARY_ADDRESS
      : homeAddress.trim() || t("rq.noAddress");

  return (
    <div className="mobile-experience mm-booking-page">
      <MobileHeader />
      <main className="mm-container mm-booking-main" lang={locale}>
        <Link href="/" className="mm-back">
          <ArrowLeft size={16} /> {t("booking.back")}
        </Link>
        <div className="mm-booking-heading">
          <span className="mm-overline">{t("booking.kicker")}</span>
          <h1>
            {t("booking.hero1")} <em>{t("booking.hero2")}</em>
          </h1>
          <p>{t("booking.intro")}</p>
        </div>
        <BookingReassurance />
        {submitted ? (
          <div className="mm-booking-success" role="status">
            <CheckCircle2 size={42} />
            <h2>{t("booking.sent")}</h2>
            <p>{t("booking.pending")}</p>
            <Link className="mm-primary-cta" href="/lich-hen">
              {t("booking.appointments")} <ArrowRight size={17} />
            </Link>
          </div>
        ) : unavailable ? (
          <div className="mm-empty" role="alert">
            {t("booking.unavailable")}
          </div>
        ) : (
          <div className="mm-booking-grid">
            <div className="mm-booking-steps">
              <section
                className="mm-booking-section mm-booking-place"
                aria-label={t("booking.where")}
              >
                <div className="mm-booking-step">
                  <span>01</span>
                  <div>
                    <h2>{t("booking.where")}</h2>
                    <p>{t("booking.whereHint")}</p>
                  </div>
                </div>
                <div className="mm-place-grid" role="group" aria-label={t("booking.location")}>
                  <button
                    type="button"
                    className={
                      "mm-place-option" + (locationMode === "AT_BRANCH" ? " selected" : "")
                    }
                    aria-pressed={locationMode === "AT_BRANCH"}
                    onClick={() => changeLocationMode("AT_BRANCH")}
                  >
                    <span className="mm-place-symbol">
                      <Building2 size={23} />
                    </span>
                    <span className="mm-place-body">
                      <span className="mm-place-tag">{t("booking.recommended")}</span>
                      <strong>{t("booking.branch")}</strong>
                      <small>{t("booking.branchInfo")}</small>
                    </span>
                    <CheckCircle2 size={19} className="mm-place-check" />
                  </button>
                  <button
                    type="button"
                    className={"mm-place-option" + (locationMode === "AT_HOME" ? " selected" : "")}
                    aria-pressed={locationMode === "AT_HOME"}
                    onClick={() => changeLocationMode("AT_HOME")}
                  >
                    <span className="mm-place-symbol">
                      <House size={23} />
                    </span>
                    <span className="mm-place-body">
                      <span className="mm-place-tag mm-place-muted-tag">
                        {t("booking.regional")}
                      </span>
                      <strong>{t("booking.home")}</strong>
                      <small>{t("booking.homeInfo")}</small>
                    </span>
                    <CheckCircle2 size={19} className="mm-place-check" />
                  </button>
                </div>
                {locationMode === "AT_BRANCH" ? (
                  <div className="mm-primary-location">
                    <span className="mm-primary-location-icon">
                      <MapPin size={21} />
                    </span>
                    <div>
                      <strong>{t("booking.primary")}</strong>
                      <p>{MOC_MARIA_PRIMARY_ADDRESS}</p>
                      <a href={MOC_MARIA_MAP_URL} target="_blank" rel="noopener noreferrer">
                        {t("booking.directions")} <ArrowRight size={14} />
                      </a>
                    </div>
                    <BadgeCheck size={20} className="mm-primary-location-check" />
                  </div>
                ) : (
                  <div className="mm-home-address">
                    <label className="mm-booking-field" htmlFor="mm-home-region">
                      {t("booking.region")}
                      <select
                        id="mm-home-region"
                        value={homeTerritory}
                        onChange={(e) => changeHomeTerritory(e.target.value)}
                      >
                        <option value="">{t("booking.chooseRegion")}</option>
                        {territories.map((area) => (
                          <option key={area.code} value={area.code}>
                            {area.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mm-booking-field" htmlFor="mm-home-address">
                      {t("booking.address")}
                      <input
                        id="mm-home-address"
                        type="text"
                        autoComplete="street-address"
                        value={homeAddress}
                        maxLength={300}
                        placeholder={t("booking.addressPlaceholder")}
                        onChange={(event) => setHomeAddress(event.target.value)}
                      />
                    </label>
                    <p className="mm-place-instruction">
                      {territories.length ? t("bv.addressHint") : t("bv.homeUnavailable")}
                    </p>
                  </div>
                )}
              </section>

              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>02</span>
                  <div>
                    <h2>{t("booking.therapist")}</h2>
                    <p>
                      {locationMode === "AT_HOME" ? t("bv.areaOnly") : t("booking.serviceFirst")}
                    </p>
                  </div>
                </div>
                <div className="mm-booking-options mm-compact-options">
                  <button
                    type="button"
                    className={!providerId ? "selected" : ""}
                    disabled={locationMode === "AT_HOME" && !homeReady}
                    onClick={() => changeProvider("")}
                  >
                    <Users size={18} /> {t("booking.anyTherapist")}
                  </button>
                  {compatibleProviders.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      className={providerId === provider.id ? "selected" : ""}
                      disabled={locationMode === "AT_HOME" && !homeReady}
                      onClick={() => changeProvider(provider.id)}
                    >
                      <UserRound size={18} />
                      <span>
                        <strong>{provider.publicName}</strong>
                        <small>
                          {provider.yearsExperience != null
                            ? t("home.experience", { n: provider.yearsExperience })
                            : providerTitle(locale, provider.title) || t("nav.therapists")}
                        </small>
                      </span>
                      {providerId === provider.id && <CheckCircle2 size={16} />}
                    </button>
                  ))}
                </div>
                {!compatibleProviders.length && (
                  <p className="mm-hint">
                    {locationMode === "AT_HOME"
                      ? homeReady
                        ? t("bv.noKtv")
                        : t("bv.chooseArea")
                      : t("bv.noPublished")}
                  </p>
                )}
              </section>

              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>03</span>
                  <div>
                    <h2>{t("booking.serviceDuration")}</h2>
                    <p>
                      {locationMode === "AT_HOME" ? t("bv.homeServices") : t("booking.chooseCare")}
                    </p>
                  </div>
                </div>
                {chosenProvider && !compatibleServices.length && (
                  <p className="mm-hint">{t("bv.noServices")}</p>
                )}
                <div className="mm-booking-options">
                  {compatibleServices.map((item) => (
                    <button
                      key={item.service.id}
                      type="button"
                      className={serviceId === item.service.id ? "selected" : ""}
                      onClick={() => changeService(item.service.id)}
                    >
                      <Sparkles size={18} />
                      <span>
                        <strong>
                          {serviceTranslations[item.service.id]?.name ??
                            menuName(locale, item.service.name)}
                        </strong>
                        <small>
                          {serviceTranslations[item.service.id]?.description ??
                            item.service.description ??
                            t("booking.chooseCare")}
                        </small>
                      </span>
                      {serviceId === item.service.id && <CheckCircle2 size={16} />}
                    </button>
                  ))}
                </div>
                {serviceId && (
                  <div className="mm-variant-list" aria-label={t("booking.durationPrice")}>
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        className={variantId === variant.id ? "selected" : ""}
                        onClick={() => {
                          setVariantId(variant.id);
                          setSelectedSlot(null);
                          setAvailability(null);
                        }}
                      >
                        <span>
                          {variantTranslations[variant.id]?.name ?? menuName(locale, variant.name)}{" "}
                          · {t("detail.minutes", { n: variant.durationMinutes })}
                        </span>
                        <strong>{formatPrice(variant.priceVnd)}</strong>
                      </button>
                    ))}
                  </div>
                )}
                {locationMode === "AT_HOME" && !homeReady && (
                  <p className="mm-hint">{t("bv.completeAddress")}</p>
                )}
              </section>

              <section className="mm-booking-section">
                <div className="mm-booking-step">
                  <span>04</span>
                  <div>
                    <h2>
                      {locationMode === "AT_BRANCH" ? t("booking.locationTime") : t("booking.date")}
                    </h2>
                    <p>{t("booking.actualSchedule")}</p>
                  </div>
                </div>
                {locationMode === "AT_BRANCH" && (
                  <>
                    {detailError && (
                      <p className="mm-hint" role="alert">
                        {locale === "vi" ? detailError : t("bv.detailError")}
                      </p>
                    )}
                    <label className="mm-booking-field">
                      {t("booking.serviceBranch")}
                      <select
                        value={effectiveBranchId}
                        disabled={!variantId}
                        onChange={(e) => {
                          setBranchId(e.target.value);
                          setSelectedSlot(null);
                          setAvailability(null);
                        }}
                      >
                        <option value="">{t("booking.chooseBranch")}</option>
                        {availableBranches.map((branch) => (
                          <option value={branch.id} key={branch.id}>
                            {branch.name} — {branch.address}
                          </option>
                        ))}
                      </select>
                    </label>
                    {variantId && !availableBranches.length && !detailError && (
                      <p className="mm-hint">{t("bv.branchUnavailable")}</p>
                    )}
                  </>
                )}
                {locationMode === "AT_HOME" && (
                  <div className="mm-home-pending">
                    <House size={21} />
                    <p>
                      <strong>{t("bv.homeConfirm")}</strong>
                      {t("bv.homePending")}
                    </p>
                  </div>
                )}
                <label className="mm-booking-field">
                  {t("booking.date")}
                  <input
                    type="date"
                    min={vietnamToday()}
                    value={day}
                    onChange={(e) => {
                      setDay(e.target.value);
                      setSelectedSlot(null);
                    }}
                  />
                </label>
                {locationMode === "AT_BRANCH" && effectiveBranchId && variantId && (
                  <div className="mm-slot-area">
                    <h3>
                      <Clock3 size={17} /> {t("booking.slots")}
                    </h3>
                    {loadingSlots ? (
                      <p role="status">{t("booking.checking")}</p>
                    ) : availabilityError ? (
                      <p role="alert" className="mm-hint">
                        {locale === "vi" ? availabilityError : t("bv.slotsError")}
                      </p>
                    ) : slots.length ? (
                      <div className="mm-slot-grid">
                        {slots.map((slot) => (
                          <button
                            type="button"
                            key={slot.providerApplicationId + slot.startsAt}
                            className={
                              selectedSlot?.startsAt === slot.startsAt &&
                              selectedSlot.providerApplicationId === slot.providerApplicationId
                                ? "selected"
                                : ""
                            }
                            onClick={() => setSelectedSlot(slot)}
                          >
                            <strong>{displayTime(slot.startsAt, locale)}</strong>
                            <small>{slot.providerName}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mm-hint">{t("booking.noSlots")}</p>
                    )}
                    {availability && !availability.requestEnabled && (
                      <p className="mm-hint">{t("bv.requestDisabled")}</p>
                    )}
                  </div>
                )}
              </section>
            </div>

            <aside className="mm-booking-summary">
              <span className="mm-overline">{t("booking.summary")}</span>
              <h2>{t("booking.yourTime")}</h2>
              <div className="mm-summary-lines">
                <p>
                  <MapPin size={17} />
                  <span>
                    <strong>
                      {locationMode === "AT_BRANCH" ? t("booking.atBranch") : t("booking.atHome")}
                    </strong>{" "}
                    · {displayAddress}
                  </span>
                </p>
                <p>
                  <Sparkles size={17} />
                  <span>
                    {chosenService
                      ? (serviceTranslations[chosenService.service.id]?.name ??
                        menuName(locale, chosenService.service.name))
                      : t("booking.noService")}
                  </span>
                </p>
                <p>
                  <UserRound size={17} />
                  <span>
                    {selectedSlot?.providerName ||
                      chosenProvider?.publicName ||
                      t("booking.anyTherapist")}
                  </span>
                </p>
                <p>
                  <CalendarDays size={17} />
                  <span>
                    {selectedSlot
                      ? displayTime(selectedSlot.startsAt, locale) + " · " + day
                      : t("booking.noTime", { day })}
                  </span>
                </p>
              </div>
              <div className="mm-summary-price">
                <span>
                  {locationMode === "AT_HOME" ? t("booking.travelPrice") : t("booking.estimated")}
                </span>
                <strong>
                  {locationMode === "AT_HOME"
                    ? t("booking.confirmTherapist")
                    : selectedSlot
                      ? formatPrice(selectedSlot.totalVnd)
                      : "—"}
                </strong>
              </div>
              <p className="mm-hint">
                {locationMode === "AT_HOME" ? t("bv.chatWarning") : t("bv.quote")}
              </p>
              {locationMode === "AT_BRANCH" && (
                <label className="mm-booking-field">
                  {t("booking.notes")}
                  <textarea
                    value={notes === DEFAULT_BOOKING_NOTE ? t("rq.defaultNote") : notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder={t("booking.notesPlaceholder")}
                  />
                </label>
              )}
              {locationMode === "AT_HOME" ? (
                chosenProvider && chosenService && homeReady ? (
                  <Link
                    className="mm-primary-cta mm-full-cta"
                    href={"/tin-nhan?provider=" + encodeURIComponent(chosenProvider.id)}
                  >
                    {t("booking.chat")} <ArrowRight size={17} />
                  </Link>
                ) : (
                  <p className="mm-hint mm-home-cta-hint">{t("bv.homeCta")}</p>
                )
              ) : status === "loading" ? (
                <p>{t("booking.checkAccount")}</p>
              ) : !user ? (
                <Link
                  className="mm-primary-cta mm-full-cta"
                  href={
                    "/dang-nhap?returnTo=" +
                    encodeURIComponent("/dat-lich" + (providerId ? "?provider=" + providerId : ""))
                  }
                >
                  {t("booking.login")} <ArrowRight size={17} />
                </Link>
              ) : (
                <button
                  type="button"
                  className="mm-primary-cta mm-full-cta"
                  disabled={
                    !user.permissions.includes("customer.portal") ||
                    !selectedSlot ||
                    !availability?.requestEnabled ||
                    sending
                  }
                  onClick={() => void requestBooking()}
                >
                  {sending ? t("booking.sending") : t("booking.send")} <ArrowRight size={17} />
                </button>
              )}
              {sendError && (
                <p role="alert" className="mm-booking-error">
                  {locale === "vi" ? sendError : t("rq.error")}
                </p>
              )}
              <p className="mm-privacy">
                <ShieldCheck size={15} />
                {locationMode === "AT_BRANCH"
                  ? t("booking.privacyBranch")
                  : t("booking.privacyHome")}
              </p>
            </aside>
          </div>
        )}
      </main>
      <MobileNavigation active="booking" />
    </div>
  );
}
