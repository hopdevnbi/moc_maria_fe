"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Crown,
  Gift,
  Heart,
  Leaf,
  LogOut,
  LockKeyhole,
  MapPin,
  Navigation,
  UserRound,
  ShieldCheck,
  Sparkles,
  Ticket,
  WalletCards,
} from "lucide-react";
import { apiRequest, parseApiResponse } from "@/features/auth/auth-api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { AuthResponse } from "@/features/auth/auth.types";
import { BookingAccountDialog } from "@/features/mobile/booking-account-dialog";
import { GiftBookingNextStep, giftBookingDirectoryOptions } from "./gift-booking-next-step";
import { WalletQr } from "./wallet-qr";
import { EventSupport } from "./event-support";
import {
  boxImages,
  eligibilityCopy,
  statusLabels,
  type CurrentEvent,
  type EventCampaign,
  type EventMe,
  type WalletGift,
} from "./types";
import type { GiftOpenResult } from "./types";
import "./gift-event-landing.css";
import "./gift-event-christmas.css";
import "@/features/mobile/booking-quick-signup.css";

const christmasBoxes: Record<(typeof boxImages)[number], { name: string; wish: string }> = {
  1: { name: "Thông Xanh An Lành", wish: "Gửi bạn một mùa bình yên" },
  2: { name: "Chuông Vàng May Mắn", wish: "Ngân vang những niềm vui" },
  3: { name: "Tuyết Trắng Dịu Êm", wish: "Một khoảng lặng ấm áp" },
  4: { name: "Điều Ước Đêm Đông", wish: "Ấp ôm điều bạn mong chờ" },
  5: { name: "Túi Quà Ông Noel", wish: "Gói ghém ngàn thương mến" },
  6: { name: "Ngôi Sao Hy Vọng", wish: "Thắp sáng những ngày mới" },
};

const publicCurrent = async (): Promise<CurrentEvent> =>
  parseApiResponse<CurrentEvent>(await apiRequest("/gift-events/current", { cache: "no-store" }));

const formatLocal = (date: string | null | undefined): string => {
  if (!date) return "Đang cập nhật";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
};

function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (num: number) => String(num).padStart(2, "0");
  return (days > 0 ? days + " ngày " : "") + pad(hours) + ":" + pad(minutes) + ":" + pad(secs);
}

const statusLabel = (status: WalletGift["status"]): string =>
  ({
    ISSUED: "Chưa sử dụng",
    REDEEMED: "Đã nhận quà",
    EXPIRED: "Đã hết hạn",
    VOIDED: "Đã hủy",
  })[status];

function WalletPanel({
  gifts,
  loading,
  failed,
  authFetch,
}: {
  gifts: WalletGift[] | undefined;
  loading: boolean;
  failed: boolean;
  authFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
}) {
  const [detail, setDetail] = useState<string | null>(null);
  const item = gifts?.find((gift) => gift.id === detail) ?? null;
  return (
    <section className="mm-ev-wallet" id="vi-qua" aria-labelledby="mm-ev-wallet-title">
      <div className="mm-ev-section-heading">
        <span className="mm-ev-overline">MÓN QUÀ ĐÃ ĐƯỢC GỬI TRAO</span>
        <h2 id="mm-ev-wallet-title">Ví quà của tôi</h2>
        <p>
          Mỗi món quà được lưu cùng điều kiện và hạn sử dụng tại thời điểm cấp. Không cần mở lại.
        </p>
      </div>
      {loading && (
        <p role="status" className="mm-ev-notice">
          Đang tải ví quà an toàn…
        </p>
      )}
      {failed && (
        <p role="alert" className="mm-ev-notice">
          Không thể tải ví quà lúc này. Hãy thử tải lại trang.
        </p>
      )}
      {!loading && !failed && !gifts?.length && (
        <div className="mm-ev-empty-wallet">
          <WalletCards size={30} />
          <strong>Ví quà đang chờ kỷ niệm đầu tiên</strong>
          <p>Khi có quà được cấp thành công, bạn sẽ thấy tại đây.</p>
        </div>
      )}
      <div className="mm-ev-wallet-grid">
        {gifts?.map((gift) => (
          <button
            type="button"
            key={gift.id}
            className="mm-ev-wallet-card"
            onClick={() => setDetail(gift.id === detail ? null : gift.id)}
            aria-expanded={detail === gift.id}
          >
            <span className="mm-ev-wallet-icon">
              <Ticket size={21} />
            </span>
            <span className="mm-ev-wallet-copy">
              <strong>{gift.name}</strong>
              <small>
                {statusLabel(gift.status)} · Hạn {formatLocal(gift.expiresAt)}
              </small>
            </span>
            <ChevronDown size={17} className={detail === gift.id ? "mm-ev-flipped" : ""} />
          </button>
        ))}
      </div>
      {item && (
        <div className="mm-ev-gift-details" role="region" aria-label={"Chi tiết " + item.name}>
          <div>
            <span>THÔNG TIN PHẦN QUÀ</span>
            <h3>{item.name}</h3>
          </div>
          <p>{item.description || "Món quà tri ân từ Mộc Maria."}</p>
          <dl>
            <dt>Trạng thái</dt>
            <dd>{statusLabel(item.status)}</dd>
            <dt>Ngày nhận</dt>
            <dd>{formatLocal(item.issuedAt)}</dd>
            <dt>Hạn cuối</dt>
            <dd>{formatLocal(item.expiresAt)}</dd>
            <dt>Cơ sở áp dụng</dt>
            <dd>{item.allowedBranchIds.length + " cơ sở được chỉ định khi cấp quà"}</dd>
          </dl>
          <p className="mm-ev-wallet-warning">
            <LockKeyhole size={16} /> Chỉ mở QR trước mặt nhân viên. Đừng chia sẻ ảnh mã cho người
            khác; nhân viên sẽ xác minh trạng thái trực tiếp với máy chủ.
          </p>
          <WalletQr key={item.id} gift={item} authFetch={authFetch} />
        </div>
      )}
    </section>
  );
}

function Faq() {
  const faqs = [
    [
      "Ai được tham gia?",
      "Khách có tài khoản và đủ điều kiện của sự kiện. Hệ thống tự kiểm tra hạng hội viên.",
    ],
    [
      "Mỗi người được mở bao nhiêu lần?",
      "Mỗi tài khoản một lượt. Quà đã nhận luôn được lưu trong Ví quà của bạn.",
    ],
    [
      "Chọn hộp có ảnh hưởng giải thưởng?",
      "Không. Hộp là lời chúc Giáng Sinh; quà được chọn ngẫu nhiên theo quỹ còn lại.",
    ],
    [
      "Nếu hết quà hoặc sự kiện tạm dừng?",
      "Bạn không mất lượt nếu quà chưa được cấp thành công. Quà đã nhận vẫn còn trong Ví quà.",
    ],
    [
      "Dùng voucher như thế nào?",
      "Đặt lịch, đến Mộc Maria và đưa QR hoặc mã 6 số trong Ví quà cho nhân viên khi thanh toán.",
    ],
    [
      "Cần hỗ trợ thì làm sao?",
      "Nhấn Hỗ trợ ở góc dưới bên phải, đăng nhập rồi chọn KTV để trao đổi trực tiếp.",
    ],
  ];
  return (
    <section className="mm-ev-faq" id="cau-hoi">
      <div className="mm-ev-section-heading">
        <span className="mm-ev-overline">GIẢI ĐÁP NHỎ</span>
        <h2>Bạn có thể muốn biết</h2>
      </div>
      <div className="mm-ev-faq-list">
        {faqs.map(([question, answer]) => (
          <details key={question}>
            <summary>
              <CircleHelp size={17} /> {question}
              <ChevronDown size={16} />
            </summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function GiftEventLanding() {
  const { user, status, authFetch, logout } = useAuth();
  const client = useQueryClient();
  const termsId = useId();
  const [guestIntent, setGuestIntent] = useState<{
    campaign: EventCampaign;
    boxId: (typeof boxImages)[number];
  } | null>(null);
  const openingRef = useRef(false);
  const pending = useRef<{
    userId: string;
    eventId: string;
    boxId: number;
    termsVersion: number;
    key: string;
  } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const [boxId, setBoxId] = useState<(typeof boxImages)[number] | null>(null);
  const [agreed, setAgreed] = useState(true);
  const [showWallet, setShowWallet] = useState(false);
  const [ticker, setTicker] = useState(0);
  const [opening, setOpening] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{
    key: string;
    userId: string;
    eventId: string;
  } | null>(null);
  const [openError, setOpenError] = useState("");
  const [openedGift, setOpenedGift] = useState<GiftOpenResult | null>(null);
  const [skipEffect, setSkipEffect] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const current = useQuery({
    queryKey: ["gift-event", "current"],
    queryFn: publicCurrent,
    refetchInterval: 60_000,
    retry: 1,
  });
  const event = current.data?.campaign ?? null;
  const me = useQuery({
    queryKey: ["gift-event", "me", user?.id, event?.id],
    queryFn: () => authFetch<EventMe>("/gift-events/me", { cache: "no-store" }),
    enabled: status === "authenticated" && !!user && !!event,
    retry: false,
    refetchInterval: 60_000,
  });
  const wallet = useQuery({
    queryKey: ["gift-event", "wallet", user?.id],
    queryFn: () => authFetch<WalletGift[]>("/gift-events/me/rewards", { cache: "no-store" }),
    enabled: status === "authenticated" && !!user && showWallet,
    retry: false,
  });
  const timingAnchor = current.data?.serverNow;
  const clockReference = current.dataUpdatedAt;
  useEffect(() => {
    const timer = window.setInterval(() => setTicker(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const serverNow = useMemo(() => {
    const baseline = timingAnchor ? Date.parse(timingAnchor) : ticker;
    return new Date(baseline + (clockReference ? Math.max(0, ticker - clockReference) : 0));
  }, [timingAnchor, clockReference, ticker]);
  const countdownMs = event?.startAt ? new Date(event.startAt).getTime() - serverNow.getTime() : 0;
  const isScheduled = event?.effectiveStatus === "SCHEDULED" && countdownMs > 0;
  const state = eligibilityCopy(event, status, me.data);
  const eligibleBox =
    event?.effectiveStatus === "LIVE" && !!me.data?.canOpen && status === "authenticated";
  const eligibleTiers = event?.eligibleTiers ?? [];
  const allCustomersEligible =
    eligibleTiers.includes("STANDARD") &&
    Array.from({ length: 99 }, (_, i) => `VIP${i + 1}`).every((tier) =>
      eligibleTiers.includes(tier),
    );
  const tierLabels = allCustomersEligible
    ? "Tất cả khách hàng đều có thể tham gia"
    : event?.eligibleTiers.map((tier) => (tier === "STANDARD" ? "THƯỜNG" : tier)).join(" · ") ||
      "Đang cập nhật";

  const canRetry =
    !!pendingRequest && pendingRequest.userId === user?.id && pendingRequest.eventId === event?.id;
  useEffect(() => {
    if (openedGift) {
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView?.({ block: "center" });
    }
  }, [openedGift]);

  async function signOut() {
    if (logoutPending || openingRef.current) return;
    setLogoutPending(true);
    setLogoutError("");
    try {
      await logout();
      setOpenedGift(null);
      pending.current = null;
      setPendingRequest(null);
      setGuestIntent(null);
      setBoxId(null);
      setAgreed(true);
      setShowWallet(false);
    } catch {
      setLogoutError("Không thể đăng xuất lúc này. Vui lòng thử lại.");
    } finally {
      setLogoutPending(false);
    }
  }

  async function openSelectedBox(auth?: AuthResponse, intent = guestIntent) {
    const actor = auth?.user ?? user;
    let campaign = intent?.campaign ?? event;
    const selectedBox = intent?.boxId ?? boxId;
    if (!actor || !campaign || !selectedBox || !agreed || openingRef.current || openedGift) return;
    const retry =
      pending.current?.userId === actor.id && pending.current?.eventId === campaign.id
        ? pending.current
        : null;
    if (!auth && !eligibleBox && !retry) return;
    openingRef.current = true;
    setOpening(true);
    setOpenError("");
    let started = false;
    const request = async <T,>(path: string, init: RequestInit = {}): Promise<T> =>
      auth
        ? parseApiResponse<T>(await apiRequest(path, init, auth.accessToken))
        : authFetch<T>(path, init);
    try {
      if (auth && !retry) {
        // Never infer eligibility from signup. Recheck both the campaign and the
        // authenticated customer using the freshly returned session token.
        const [latest, eligibility] = await Promise.all([
          publicCurrent(),
          request<EventMe>("/gift-events/me", { cache: "no-store" }),
        ]);
        client.setQueryData(["gift-event", "current"], latest);
        client.setQueryData(["gift-event", "me", actor.id, latest.campaign?.id], eligibility);
        if (
          !latest.campaign ||
          latest.campaign.id !== campaign.id ||
          latest.campaign.effectiveStatus !== "LIVE"
        ) {
          setOpenError(
            "Sự kiện đã thay đổi hoặc tạm dừng. Bạn xem lại thông tin trước khi mở quà nhé.",
          );
          return;
        }
        if (latest.campaign.termsVersion !== campaign.termsVersion) {
          setAgreed(false);
          setOpenError(
            "Thể lệ vừa được cập nhật. Vui lòng đọc và đồng ý phiên bản mới trước khi mở quà.",
          );
          return;
        }
        if (eligibility.eventId !== campaign.id || !eligibility.canOpen) {
          setOpenError(eligibilityCopy(latest.campaign, "authenticated", eligibility).detail);
          if (eligibility.reason === "ALREADY_PLAYED") setShowWallet(true);
          return;
        }
        campaign = latest.campaign;
      }
      const storageKey = `moc-gift-open:${actor.id}:${campaign.id}`;
      let key = retry?.key;
      if (!key) {
        try {
          key = window.sessionStorage.getItem(storageKey) || crypto.randomUUID();
        } catch {
          key = crypto.randomUUID();
        }
      }
      const input = retry ?? {
        userId: actor.id,
        eventId: campaign.id,
        boxId: selectedBox,
        termsVersion: campaign.termsVersion,
        key,
      };
      pending.current = input;
      setPendingRequest({ key: input.key, userId: actor.id, eventId: campaign.id });
      try {
        window.sessionStorage.setItem(storageKey, input.key);
      } catch {
        /* Memory retry remains available. */
      }
      started = true;
      // Public roster loads alongside gift confirmation, so the next step is ready.
      void client.prefetchQuery(giftBookingDirectoryOptions);
      const result = await request<GiftOpenResult>(`/gift-events/${input.eventId}/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boxId: input.boxId,
          idempotencyKey: input.key,
          termsVersion: input.termsVersion,
          termsAccepted: true,
        }),
      });
      setOpenedGift(result);
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        /* blocked storage */
      }
      pending.current = null;
      setPendingRequest(null);
      void me.refetch();
      if (showWallet) void wallet.refetch();
    } catch {
      setOpenError(
        started
          ? "Chưa xác nhận được kết quả. Bấm thử lại để tra cứu cùng yêu cầu, không dùng thêm lượt."
          : "Chưa kiểm tra được lượt quà. Tài khoản của bạn đã sẵn sàng; vui lòng thử lại.",
      );
      void me.refetch();
    } finally {
      openingRef.current = false;
      setOpening(false);
    }
  }

  return (
    <>
      <div className="mm-ev mm-ev-christmas">
        <a className="mm-ev-skip" href="#mm-ev-main">
          Bỏ qua điều hướng
        </a>
        <div className="mm-ev-top-line" aria-hidden="true" />
        <header className="mm-ev-topbar">
          <a
            href="https://mocmaria.com/"
            className="mm-ev-logo"
            aria-label="Trở về trang chủ Mộc Maria"
          >
            <span className="mm-ev-logo-symbol">✥</span>
            <span>
              <strong>Mộc Maria</strong>
              <small>WELLNESS LOUNGE</small>
            </span>
          </a>
          <nav aria-label="Điều hướng sự kiện">
            <a href="#the-le">Thể lệ</a>
            <a href="#cau-hoi">Giải đáp</a>
            {status === "authenticated" ? (
              <>
                <button
                  type="button"
                  className="mm-ev-wallet-shortcut"
                  onClick={() => {
                    setShowWallet(true);
                    document
                      .getElementById("mm-ev-wallet-area")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <WalletCards size={16} /> Ví quà
                </button>
                <Link className="mm-ev-account-link" href="/tai-khoan" title="Quản lý tài khoản">
                  <UserRound size={16} /> <span>{user?.displayName || "Tài khoản"}</span>
                </Link>
                <button
                  className="mm-ev-logout"
                  type="button"
                  disabled={logoutPending || opening}
                  onClick={() => void signOut()}
                  aria-label="Đăng xuất khỏi tài khoản Mộc Maria"
                >
                  <LogOut size={16} /> <span>{logoutPending ? "Đang thoát..." : "Đăng xuất"}</span>
                </button>
              </>
            ) : status === "anonymous" ? (
              <>
                <Link className="mm-ev-account-link" href="/dang-ky?returnTo=%2Fevent">
                  Đăng ký
                </Link>
                <Link className="mm-ev-wallet-shortcut" href="/dang-nhap?returnTo=%2Fevent">
                  <UserRound size={16} /> Đăng nhập
                </Link>
              </>
            ) : (
              <span className="mm-ev-auth-loading" role="status">
                Đang kiểm tra tài khoản…
              </span>
            )}
          </nav>
          {logoutError && (
            <span className="mm-ev-auth-error" role="alert">
              {logoutError}
            </span>
          )}
        </header>
        <main id="mm-ev-main">
          <section className="mm-ev-hero">
            <div className="mm-ev-hero-copy">
              <div className="mm-ev-overline">
                <span className="mm-ev-overline-dot" /> MỘC MARIA · MÙA GIÁNG SINH 2026
              </div>
              <span className="mm-ev-mini-stars" aria-hidden="true">
                ✦ &nbsp; ✧ &nbsp; ✦
              </span>
              <h1>
                Giáng sinh an lành.
                <br />
                <em>Mở quà yêu thương.</em>
              </h1>
              <p className="mm-ev-hero-description">
                Chọn một hộp quà, nhận lời chúc an lành và khám phá ưu đãi dành riêng cho bạn tại
                Mộc Maria.
              </p>
              <div className="mm-ev-hero-tags">
                <span>
                  <Leaf size={16} /> Quà tặng được chăm chút
                </span>
                <span>
                  <ShieldCheck size={16} /> Quyền lợi minh bạch
                </span>
              </div>
              <div className="mm-ev-hero-action">
                <a className="mm-ev-primary" href="#vuon-qua">
                  Khám phá quà Noel <ArrowRight size={18} />
                </a>
                <a className="mm-ev-secondary" href="#the-le">
                  Xem thể lệ <ArrowRight size={16} />
                </a>
              </div>
              {isScheduled && (
                <p className="mm-ev-countdown">
                  <Clock3 size={17} /> Còn <strong>{formatCountdown(countdownMs)}</strong> để bắt
                  đầu
                </p>
              )}
            </div>
            <div className="mm-ev-hero-art" aria-label="Ông già Noel và cây thông tại Mộc Maria">
              <div className="mm-ev-orbit orbit-one" />
              <div className="mm-ev-orbit orbit-two" />
              <span className="mm-ev-hero-art-caption">GÓI AN LÀNH · GỬI YÊU THƯƠNG</span>
              <Image
                src="/christmas/santa-postcard.svg"
                width={600}
                height={560}
                sizes="(max-width: 740px) 90vw, (max-width: 1150px) 45vw, 520px"
                priority
                alt="Ông già Noel trao quà bên cây thông xanh, dưới những vì sao vàng"
              />
              <div className="mm-ev-art-flower flower-one" aria-hidden="true">
                ✽
              </div>
              <div className="mm-ev-art-flower flower-two" aria-hidden="true">
                ✧
              </div>
            </div>
          </section>
          <section className="mm-ev-garden-wrap" id="vuon-qua">
            <div className="mm-ev-garden-intro">
              <div>
                <span className="mm-ev-overline">XƯỞNG QUÀ NHỎ CỦA ÔNG NOEL</span>
                <h2>Một hộp quà, một lời chúc</h2>
                <p>Sáu lời chúc Giáng sinh. Bạn muốn gửi gắm điều gì?</p>
              </div>
              <span className="mm-ev-status" data-tone={state.tone}>
                <span /> {event ? statusLabels[event.effectiveStatus] : "Sắp công bố"}
              </span>
            </div>
            <div className="mm-ev-garden">
              <span className="mm-ev-garden-stars" aria-hidden="true">
                ✧ &nbsp; ✦ &nbsp; ✧
              </span>
              <div className="mm-ev-box-grid" role="group" aria-label="Sáu hộp quà Mộc Maria">
                {boxImages.map((id) => (
                  <button
                    className={"mm-ev-box" + (boxId === id ? " is-picked" : "")}
                    type="button"
                    key={id}
                    onClick={() => {
                      if (!openingRef.current && !openedGift && !pendingRequest) {
                        setBoxId(id);
                        if (status === "anonymous" && event?.effectiveStatus === "LIVE")
                          setGuestIntent({ campaign: event, boxId: id });
                      }
                    }}
                    disabled={opening || !!openedGift || !!pendingRequest}
                    aria-pressed={boxId === id}
                    aria-label={`Hộp ${String(id).padStart(2, "0")} · ${christmasBoxes[id].name}`}
                  >
                    <span className="mm-ev-box-number" aria-hidden="true">
                      NO. {String(id).padStart(2, "0")}
                    </span>
                    <span className="mm-ev-box-illustration">
                      <Image
                        src={"/event/gift-boxes/gift-" + id + "-320.webp"}
                        width={174}
                        height={174}
                        loading="lazy"
                        sizes="(max-width: 740px) 42vw, 160px"
                        alt=""
                      />
                    </span>
                    <span className="mm-ev-box-caption">{christmasBoxes[id].name}</span>
                    <span className="mm-ev-box-wish">{christmasBoxes[id].wish}</span>
                    {boxId === id && (
                      <span className="mm-ev-box-check">
                        <Check size={16} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="mm-ev-garden-foot">
                <Sparkles size={15} /> Không hộp nào có cơ cấu giải riêng. Quà chỉ được quyết định
                khi máy chủ xác nhận lượt mở.
              </p>
            </div>
            <div className="mm-ev-play-panel">
              <div className="mm-ev-play-icon">
                <Gift size={26} />
              </div>
              <div className="mm-ev-play-message" aria-live="polite">
                <strong>
                  {current.isPending
                    ? "Đang xem chương trình..."
                    : current.isError
                      ? "Chưa thể kết nối sự kiện"
                      : state.heading}
                </strong>
                <p>
                  {current.isError
                    ? "Đường truyền tới hệ thống chưa ổn định. Vui lòng tải lại sau."
                    : state.detail}
                </p>
                {me.isError && (
                  <small role="alert">
                    Chưa xác thực được lượt từ máy chủ. Bạn không bị trừ lượt.
                  </small>
                )}
              </div>
              <div className="mm-ev-play-cta">
                {eligibleBox && !openedGift && (
                  <label className="mm-ev-agreement mm-ev-agreement-inline" htmlFor={termsId}>
                    <input
                      type="checkbox"
                      id={termsId}
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                    />
                    <span>
                      Tôi đã đọc và đồng ý{" "}
                      <a href="#the-le" onClick={(e) => e.stopPropagation()}>
                        thể lệ sự kiện
                      </a>{" "}
                      (phiên bản {event?.termsVersion}) trước khi mở hộp.
                    </span>
                  </label>
                )}
                {status === "anonymous" && event?.effectiveStatus === "LIVE" ? (
                  <button
                    className="mm-ev-primary"
                    type="button"
                    disabled={!boxId || opening}
                    onClick={() => {
                      if (boxId) setGuestIntent({ campaign: event, boxId });
                    }}
                  >
                    {boxId ? "Đăng ký nhanh & mở quà" : "Chọn hộp quà bạn yêu thích"}{" "}
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={
                      (!eligibleBox && !canRetry) || !boxId || !agreed || opening || !!openedGift
                    }
                    className="mm-ev-primary"
                    onClick={() => void openSelectedBox()}
                  >
                    {opening
                      ? "Đang xác nhận quà..."
                      : openedGift
                        ? "Đã nhận quà"
                        : canRetry
                          ? "Tra cứu lại quà"
                          : eligibleBox && boxId
                            ? "Mở hộp · " + christmasBoxes[boxId].name
                            : me.data?.reason === "ALREADY_PLAYED"
                              ? "Đã dùng lượt"
                              : "Chọn hộp để mở"}
                  </button>
                )}
                {eligibleBox && !agreed && (
                  <small>Hãy tích ô đồng ý thể lệ ngay phía trên để mở hộp.</small>
                )}
                {opening && (
                  <small role="status">
                    Máy chủ đang xác nhận kết quả; không đóng trang hoặc mở lần nữa.
                  </small>
                )}
                {openError && <small role="alert">{openError}</small>}
                {openedGift && (
                  <div
                    className={"mm-ev-gift-details" + (skipEffect ? "" : " mm-ev-prize-reveal")}
                    ref={resultRef}
                    tabIndex={-1}
                    role="status"
                    aria-live="polite"
                  >
                    <strong>{skipEffect ? "Quà của bạn" : "Xin chúc mừng! Quà của bạn"}</strong>
                    <h3>{openedGift.reward.name}</h3>
                    <p>{openedGift.reward.description}</p>
                    <p>Hạn dùng: {formatLocal(openedGift.reward.expiresAt)}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowWallet(true);
                        document
                          .getElementById("mm-ev-wallet-area")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Xem quà trong ví
                    </button>
                    <button
                      className="mm-ev-primary mm-ev-reward-booking"
                      type="button"
                      onClick={() =>
                        document
                          .getElementById("mm-ev-booking-next")
                          ?.scrollIntoView({ block: "start" })
                      }
                    >
                      <CalendarDays size={17} /> Đặt lịch chăm sóc <ArrowRight size={16} />
                    </button>
                    {!skipEffect && (
                      <button type="button" onClick={() => setSkipEffect(true)}>
                        Bỏ qua hiệu ứng
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
          {openedGift && <GiftBookingNextStep rewardName={openedGift.reward.name} />}
          <section className="mm-ev-terms" id="the-le">
            <div className="mm-ev-section-heading">
              <span className="mm-ev-overline">MINH BẠCH TRONG TỪNG MÓN QUÀ</span>
              <h2>Thể lệ & thời gian</h2>
              <p>Những thông tin nhỏ giúp bạn an tâm nhận quà và sử dụng ưu đãi.</p>
            </div>
            <div className="mm-ev-info-grid">
              <article>
                <div className="mm-ev-info-icon">
                  <CalendarDays size={22} />
                </div>
                <span>THỜI GIAN</span>
                <h3>{event?.startAt ? formatLocal(event.startAt) : "Đang cập nhật"}</h3>
                <p>Kết thúc: {formatLocal(event?.endAt)}</p>
              </article>
              <article>
                <div className="mm-ev-info-icon">
                  <Crown size={22} />
                </div>
                <span>HẠNG THAM GIA</span>
                <h3>{tierLabels}</h3>
                {!allCustomersEligible && (
                  <p>Hạng khách được đối chiếu chính xác với hồ sơ hội viên.</p>
                )}
              </article>
              <article>
                <div className="mm-ev-info-icon">
                  <BadgeCheck size={22} />
                </div>
                <span>LƯỢT MỞ</span>
                <h3>Một lượt mỗi sự kiện</h3>
                <p>Quà đã cấp lưu trong ví. Không có lượt mở thử.</p>
              </article>
            </div>
            <div className="mm-ev-terms-text">
              <h3>
                <ShieldCheck size={18} /> Điều lệ chính thức
              </h3>
              {event?.termsText ? (
                <>
                  <p className="mm-ev-terms-intro">
                    {event.startAt && event.endAt
                      ? `Từ ${formatLocal(event.startAt)} đến ${formatLocal(event.endAt)}.`
                      : "Thời gian áp dụng theo công bố của chương trình."}
                  </p>
                  <ul className="mm-ev-terms-highlights">
                    <li>Mỗi tài khoản đủ điều kiện được mở hộp một lần.</li>
                    <li>Quà ngẫu nhiên theo quỹ còn lại, được lưu trong Ví quà.</li>
                    <li>Hạn dùng và dịch vụ áp dụng ghi rõ trên từng voucher.</li>
                    <li>Xuất trình QR hoặc mã 6 số tại quầy; không quy đổi thành tiền mặt.</li>
                  </ul>
                  <details className="mm-ev-full-terms">
                    <summary>
                      Xem điều lệ đầy đủ (phiên bản {event.termsVersion})
                      <ChevronDown size={17} />
                    </summary>
                    <p>{event.termsText}</p>
                  </details>
                </>
              ) : (
                <p>
                  Thể lệ chi tiết sẽ được công bố trước khi sự kiện bắt đầu. Khi chưa công bố, không
                  có lượt quà nào được cấp.
                </p>
              )}
              {event && (
                <p className="mm-ev-terms-confirmation">
                  Bạn xác nhận đồng ý điều lệ ngay cạnh nút Mở hộp. Lượt chỉ được tính khi quà được
                  cấp thành công.
                </p>
              )}
            </div>
          </section>
          {status === "authenticated" && (
            <section className="mm-ev-wallet-section" id="mm-ev-wallet-area">
              <div className="mm-ev-wallet-prompt">
                <div>
                  <WalletCards size={25} />
                  <span>Quà của bạn luôn được lưu riêng tư trong tài khoản.</span>
                </div>
                <button type="button" onClick={() => setShowWallet((value) => !value)}>
                  {showWallet ? "Thu gọn ví" : "Xem ví quà"} <ArrowRight size={17} />
                </button>
              </div>
              {showWallet && (
                <WalletPanel
                  gifts={wallet.data}
                  loading={wallet.isPending}
                  failed={wallet.isError}
                  authFetch={authFetch}
                />
              )}
            </section>
          )}
          <Faq />
          <section className="mm-ev-visit" id="dia-chi" aria-labelledby="mm-ev-visit-title">
            <div className="mm-ev-visit-icon" aria-hidden="true">
              <MapPin size={27} />
            </div>
            <div className="mm-ev-visit-copy">
              <span className="mm-ev-overline">MỘC MARIA · WELLNESS LOUNGE</span>
              <h2 id="mm-ev-visit-title">Ghé Mộc nhận quà yêu thương</h2>
              <p>Ô 12, LK2, KĐT Tân Tây Đô, Tân Lập, Đan Phương, Hà Nội, Việt Nam, 100000</p>
              <small>Hẹn gặp bạn tại không gian chăm sóc và thư giãn của Mộc Maria.</small>
            </div>
            <a
              className="mm-ev-visit-map"
              href="https://www.google.com/maps/search/?api=1&query=%C3%94%2012%2C%20LK2%2C%20K%C4%90T%20T%C3%A2n%20T%C3%A2y%20%C4%90%C3%B4%2C%20T%C3%A2n%20L%E1%BA%ADp%2C%20%C4%90an%20Ph%C6%B0%C6%A1ng%2C%20H%C3%A0%20N%E1%BB%99i"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation size={17} /> Xem đường đi <ArrowRight size={16} />
            </a>
          </section>
          <section className="mm-ev-outro">
            <div aria-hidden="true">✥</div>
            <p>Chúc bạn một Giáng sinh ấm áp, một mùa an lành.</p>
            <strong>Mộc Maria</strong>
            <span>CHĂM SÓC BẰNG SỰ TẬN TÂM</span>
          </section>
        </main>
        <footer className="mm-ev-footer">
          <span>© 2026 Mộc Maria · Giáng sinh an lành</span>
          <nav aria-label="Liên kết cuối trang">
            <a href="https://mocmaria.com/">
              <ArrowLeft size={14} /> Trang chủ
            </a>
            <Link href="/hoi-vien">
              <Heart size={14} /> Hội viên
            </Link>
            <a href="#the-le">Thể lệ</a>
          </nav>
        </footer>
        <EventSupport status={status} user={user} authFetch={authFetch} />
      </div>
      {guestIntent && !openedGift && (
        <BookingAccountDialog
          providerName={guestIntent.campaign.title}
          serviceName={christmasBoxes[guestIntent.boxId].name}
          when={`Một lượt mỗi sự kiện · Thể lệ v${guestIntent.campaign.termsVersion}`}
          gift={{
            boxId: guestIntent.boxId,
            termsVersion: guestIntent.campaign.termsVersion,
            termsText: guestIntent.campaign.termsText,
            accepted: agreed,
            onAcceptedChange: setAgreed,
          }}
          onDismiss={() => setGuestIntent(null)}
          onAuthenticated={async (auth) => {
            await openSelectedBox(auth, guestIntent);
            setGuestIntent(null);
          }}
        />
      )}
    </>
  );
}
