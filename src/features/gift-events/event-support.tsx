"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Headset,
  LockKeyhole,
  MessageCircle,
  Search,
  ShieldCheck,
  UserRoundPlus,
  X,
} from "lucide-react";
import type { ChatProvider } from "@/features/marketplace/types";
import { chatHref } from "@/features/mobile/links";
import "./event-support.css";

const CHAT_RETURN = encodeURIComponent("/tin-nhan");

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** The entry point uses the existing private KTV chat, not a parallel support inbox. */
export function EventSupport({
  status,
  user,
  authFetch,
}: {
  status: string;
  user: { id: string } | null;
  authFetch: <T>(path: string, init?: RequestInit) => Promise<T>;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const authenticated = status === "authenticated" && !!user;
  const providers = useQuery({
    queryKey: ["event-support-providers", user?.id],
    queryFn: () => authFetch<ChatProvider[]>("/ktv-chat/providers", { cache: "no-store" }),
    enabled: open && authenticated,
    staleTime: 60_000,
    retry: 1,
  });
  const matches = (providers.data ?? []).filter((provider) =>
    [provider.publicName, provider.title, provider.serviceArea ?? ""]
      .join(" ")
      .toLocaleLowerCase("vi")
      .includes(search.trim().toLocaleLowerCase("vi")),
  );

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <aside className="mm-ev-support" aria-label="Hỗ trợ khách hàng Mộc Maria">
      {open && (
        <section
          id="mm-event-support-content"
          className="mm-ev-support-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="mm-ev-support-title"
        >
          <header className="mm-ev-support-head">
            <div className="mm-ev-support-symbol">
              <Headset size={23} />
            </div>
            <div>
              <span>MỘC MARIA · CHĂM SÓC KHÁCH HÀNG</span>
              <h2 id="mm-ev-support-title">Mộc luôn sẵn lòng lắng nghe</h2>
            </div>
            <button
              className="mm-ev-support-close"
              type="button"
              aria-label="Đóng hỗ trợ"
              ref={closeRef}
              onClick={() => setOpen(false)}
            >
              <X size={19} />
            </button>
          </header>
          <div className="mm-ev-support-content">
            {status === "loading" ? (
              <p role="status">Đang kiểm tra tài khoản của bạn…</p>
            ) : !authenticated ? (
              <div className="mm-ev-support-signin">
                <div className="mm-ev-support-lock">
                  <LockKeyhole size={24} />
                </div>
                <h3>Bạn cần hỗ trợ?</h3>
                <p>
                  Đăng nhập hoặc đăng ký nhanh để chọn KTV, hỏi về voucher, dịch vụ và lịch hẹn.
                </p>
                <Link className="mm-ev-support-primary" href={"/dang-nhap?returnTo=" + CHAT_RETURN}>
                  Đăng nhập <ArrowRight size={17} />
                </Link>
                <Link className="mm-ev-support-secondary" href={"/dang-ky?returnTo=" + CHAT_RETURN}>
                  <UserRoundPlus size={17} /> Đăng ký nhanh
                </Link>
                <small>Đăng nhập xong, bạn sẽ được chuyển đến trang chọn KTV và nhắn tin.</small>
              </div>
            ) : (
              <div className="mm-ev-support-directory">
                <p>Chọn kỹ thuật viên để tư vấn riêng về quà tặng, dịch vụ hoặc đặt lịch.</p>
                <label className="mm-ev-support-search">
                  <Search size={16} />
                  <span className="sr-only">Tìm kỹ thuật viên</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm tên KTV..."
                    aria-label="Tìm kỹ thuật viên"
                  />
                </label>
                {providers.isPending && <p role="status">Đang tải danh sách KTV…</p>}
                {providers.isError && (
                  <p role="alert">Chưa tải được KTV. Bạn vẫn có thể mở trang trò chuyện.</p>
                )}
                {providers.isSuccess && matches.length === 0 && (
                  <p>
                    {search ? "Không tìm thấy KTV phù hợp." : "Chưa có KTV nhận tin nhắn lúc này."}
                  </p>
                )}
                <div className="mm-ev-support-providers">
                  {matches.map((provider) => (
                    <Link
                      key={provider.id}
                      className="mm-ev-support-provider"
                      href={chatHref(provider.id)}
                      aria-label={"Nhắn tin với " + provider.publicName}
                    >
                      <span className="mm-ev-support-avatar" aria-hidden="true">
                        {initials(provider.publicName)}
                      </span>
                      <span className="mm-ev-support-provider-info">
                        <strong>{provider.publicName}</strong>
                        <small>{provider.title || "Kỹ thuật viên Mộc Maria"}</small>
                      </span>
                      <MessageCircle size={19} />
                    </Link>
                  ))}
                </div>
                <Link className="mm-ev-support-chat-link" href="/tin-nhan">
                  Xem các cuộc trò chuyện <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
          <footer className="mm-ev-support-foot">
            <ShieldCheck size={15} /> Hội thoại riêng tư trong tài khoản Mộc Maria
          </footer>
        </section>
      )}
      <button
        type="button"
        className="mm-ev-support-launcher"
        aria-label={open ? "Đóng hỗ trợ online" : "Mở hỗ trợ online"}
        aria-expanded={open}
        aria-controls={open ? "mm-event-support-content" : undefined}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={23} /> : <Headset size={23} />}
        <span>{open ? "Đóng hỗ trợ" : "Hỗ trợ online"}</span>
      </button>
    </aside>
  );
}
