"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Ticket,
  WalletCards,
} from "lucide-react";
import { apiRequest, parseApiResponse } from "@/features/auth/auth-api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { WalletQr } from "./wallet-qr";
import {
  boxImages,
  eligibilityCopy,
  statusLabels,
  type CurrentEvent,
  type EventMe,
  type WalletGift,
} from "./types";
import "./gift-event-landing.css";

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
      "Hạng khách hàng được phép tham gia do Mộc Maria công bố theo từng sự kiện. Hạng VIP được kiểm tra chính xác, không tự mở rộng sang các hạng khác.",
    ],
    [
      "Mỗi người được mở bao nhiêu lần?",
      "Mỗi tài khoản đủ điều kiện được tối đa một lượt trong mỗi sự kiện. Nếu kết nối bị gián đoạn, hệ thống lưu kết quả để tra cứu lại, không cấp thêm lần nữa.",
    ],
    [
      "Chọn hộp có ảnh hưởng giải thưởng?",
      "Không. Mỗi hộp là một cách thể hiện lời tri ân. Khi chức năng mở chính thức được kích hoạt, quà sẽ do máy chủ quyết định theo cơ cấu và tồn kho hiện tại.",
    ],
    [
      "Nếu hết quà hoặc sự kiện tạm dừng?",
      "Bạn không mất lượt khi yêu cầu chưa cấp quà thành công. Các món quà đã được cấp vẫn hiển thị trong ví cá nhân.",
    ],
    [
      "Nhận quà ở đâu?",
      "Điều kiện từng quà, hạn dùng và cơ sở nhận quà sẽ được thể hiện trong ví. Quy trình xuất QR và xác nhận quà tại quầy được triển khai ở bước tiếp theo.",
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
  const { user, status, authFetch } = useAuth();
  const termsId = useId();
  const [boxId, setBoxId] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [ticker, setTicker] = useState(0);
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
  const tierLabels =
    event?.eligibleTiers.map((tier) => (tier === "STANDARD" ? "THƯỜNG" : tier)).join(" · ") ||
    "Đang cập nhật";

  return (
    <div className="mm-ev">
      <a className="mm-ev-skip" href="#mm-ev-main">
        Bỏ qua điều hướng
      </a>
      <div className="mm-ev-top-line" aria-hidden="true" />
      <header className="mm-ev-topbar">
        <Link href="/" className="mm-ev-logo" aria-label="Trở về trang chủ Mộc Maria">
          <span className="mm-ev-logo-symbol">✥</span>
          <span>
            <strong>Mộc Maria</strong>
            <small>WELLNESS LOUNGE</small>
          </span>
        </Link>
        <nav aria-label="Điều hướng sự kiện">
          <a href="#the-le">Thể lệ</a>
          <a href="#cau-hoi">Giải đáp</a>
          {status === "authenticated" ? (
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
          ) : (
            <Link className="mm-ev-wallet-shortcut" href="/dang-nhap?returnTo=%2Fevent">
              Đăng nhập <ArrowRight size={15} />
            </Link>
          )}
        </nav>
      </header>
      <main id="mm-ev-main">
        <section className="mm-ev-hero">
          <div className="mm-ev-hero-copy">
            <div className="mm-ev-overline">
              <span className="mm-ev-overline-dot" /> LỜI TRI ÂN · KHU VƯỜN AN NHIÊN
            </div>
            <span className="mm-ev-mini-stars" aria-hidden="true">
              ✦ &nbsp; ✧ &nbsp; ✦
            </span>
            <h1>
              Mở hộp quà.
              <br />
              <em>Nhận yêu thương.</em>
            </h1>
            <p className="mm-ev-hero-description">
              {event?.description ||
                "Một chút dịu dàng dành tặng những người đã tin yêu và đồng hành cùng Mộc Maria trên hành trình chăm sóc sức khỏe."}
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
                Khám phá vườn quà <ArrowRight size={18} />
              </a>
              <a className="mm-ev-secondary" href="#the-le">
                Xem thể lệ <ArrowRight size={16} />
              </a>
            </div>
            {isScheduled && (
              <p className="mm-ev-countdown">
                <Clock3 size={17} /> Còn <strong>{formatCountdown(countdownMs)}</strong> để bắt đầu
              </p>
            )}
          </div>
          <div className="mm-ev-hero-art" aria-label="Minh họa hộp quà An Nhiên">
            <div className="mm-ev-orbit orbit-one" />
            <div className="mm-ev-orbit orbit-two" />
            <span className="mm-ev-hero-art-caption">A GIFT OF SERENITY</span>
            <Image
              src="/event/gift-boxes/gift-1-640.webp"
              width={520}
              height={520}
              sizes="(max-width: 740px) 90vw, (max-width: 1150px) 45vw, 520px"
              priority
              alt="Hộp quà xanh rừng và nơ vàng champagne Mộc Maria"
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
              <span className="mm-ev-overline">MỘT KHOẢNH KHẮC DÀNH RIÊNG</span>
              <h2>Chọn hộp bạn yêu thích</h2>
              <p>Sáu sắc màu, một lời cảm ơn từ Mộc Maria.</p>
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
                  onClick={() => setBoxId(id)}
                  aria-pressed={boxId === id}
                >
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
                  <span className="mm-ev-box-caption">HỘP {String(id).padStart(2, "0")}</span>
                  {boxId === id && (
                    <span className="mm-ev-box-check">
                      <Check size={16} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <p className="mm-ev-garden-foot">
              <Sparkles size={15} /> Không hộp nào có cơ cấu giải riêng. Quà chỉ được quyết định khi
              máy chủ xác nhận lượt mở.
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
              {status === "anonymous" && event?.effectiveStatus === "LIVE" ? (
                <Link className="mm-ev-primary" href="/dang-nhap?returnTo=%2Fevent">
                  Đăng nhập để tham gia <ArrowRight size={16} />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mm-ev-primary"
                  title="Chức năng mở hộp sẽ được kích hoạt ở chặng tiếp theo sau nghiệm thu"
                >
                  <LockKeyhole size={16} />{" "}
                  {eligibleBox
                    ? boxId
                      ? "Đã chọn hộp số " + boxId
                      : "Chọn hộp để mở"
                    : me.data?.reason === "ALREADY_PLAYED"
                      ? "Đã dùng lượt"
                      : "Chưa thể mở hộp"}
                </button>
              )}
              <small>Trang này đang trong giai đoạn hoàn thiện trải nghiệm · Chưa phát quà.</small>
            </div>
          </div>
        </section>
        <section className="mm-ev-terms" id="the-le">
          <div className="mm-ev-section-heading">
            <span className="mm-ev-overline">MINH BẠCH TRONG TỪNG MÓN QUÀ</span>
            <h2>Thể lệ & thời gian</h2>
            <p>
              Tất cả điều kiện do ban tổ chức cấu hình và máy chủ kiểm tra tại thời điểm mở quà.
            </p>
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
              <p>Hạng khách được đối chiếu chính xác với hồ sơ hội viên.</p>
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
              <p>{event.termsText}</p>
            ) : (
              <p>
                Thể lệ chi tiết sẽ được công bố trước khi sự kiện bắt đầu. Khi chưa công bố, không
                có lượt quà nào được cấp.
              </p>
            )}
            {event && (
              <label className="mm-ev-agreement" htmlFor={termsId}>
                <input
                  type="checkbox"
                  id={termsId}
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                Tôi đã đọc và hiểu điều lệ phiên bản {event.termsVersion}. Việc xác nhận này chưa
                gửi yêu cầu mở hộp.
              </label>
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
        <section className="mm-ev-outro">
          <div aria-hidden="true">✥</div>
          <p>Một món quà nho nhỏ, một tình cảm thật lớn.</p>
          <strong>Mộc Maria</strong>
          <span>CHĂM SÓC BẰNG SỰ TẬN TÂM</span>
        </section>
      </main>
      <footer className="mm-ev-footer">
        <span>© 2026 Mộc Maria · Khu vườn quà An Nhiên</span>
        <nav aria-label="Liên kết cuối trang">
          <Link href="/">
            <ArrowLeft size={14} /> Trang chủ
          </Link>
          <Link href="/hoi-vien">
            <Heart size={14} /> Hội viên
          </Link>
          <a href="#the-le">Thể lệ</a>
        </nav>
      </footer>
    </div>
  );
}
