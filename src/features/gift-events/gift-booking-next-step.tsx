"use client";

import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Check, ChevronRight, Leaf, WalletCards } from "lucide-react";
import "./gift-booking-next-step.css";

export type EventBookingProvider = {
  id: string;
  publicName: string;
  serviceArea: string | null;
  avatarUrl: string | null;
  services: string[];
  bookingHref: string;
};

export function eventBookingHref(value: string) {
  try {
    const url = new URL(value, "https://mocmaria.com");
    if (url.origin === "https://mocmaria.com" && url.pathname === "/dat-lich")
      return url.toString();
  } catch {
    /* Use the official booking entry if a directory link is unavailable. */
  }
  return "https://mocmaria.com/dat-lich";
}

export const giftBookingDirectoryOptions = {
  queryKey: ["gift-event", "booking-providers"] as const,
  queryFn: async ({ signal }: { signal: AbortSignal }) => {
    const response = await fetch("/api/mobile/directory", {
      cache: "no-store",
      credentials: "omit",
      signal,
    });
    if (!response.ok) throw new Error("DIRECTORY_UNAVAILABLE");
    const data = (await response.json()) as { providers: EventBookingProvider[] };
    if (!Array.isArray(data.providers)) throw new Error("DIRECTORY_UNAVAILABLE");
    return data.providers;
  },
  staleTime: 60_000,
  refetchOnWindowFocus: false,
  retry: 1,
};

export function GiftBookingNextStep({ rewardName }: { rewardName: string }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const directory = useQuery(giftBookingDirectoryOptions);
  const providers = directory.data ?? [];
  const selected = providers.find((provider) => provider.id === selectedId);
  return (
    <section
      id="mm-ev-booking-next"
      className="mm-ev-booking-next"
      aria-labelledby="mm-ev-booking-heading"
    >
      <span className="mm-ev-booking-saved">
        <WalletCards size={15} /> Đã lưu vào ví quà của bạn
      </span>
      <div className="mm-ev-booking-intro">
        <span className="mm-ev-overline">MỘT MÓN QUÀ, THÊM MỘT KHOẢNG THẢNH THƠI</span>
        <h2 id="mm-ev-booking-heading">
          Hẹn một buổi chăm sóc <em>cho riêng bạn.</em>
        </h2>
        <p>
          Bạn đã nhận <strong>{rewardName}</strong>. Chọn KTV bạn yêu thích để tiếp tục đặt lịch.
        </p>
      </div>
      {directory.isPending ? (
        <div className="mm-ev-booking-loading" role="status">
          <Leaf size={20} /> Đang chuẩn bị những gương mặt thân quen…
        </div>
      ) : directory.isError ? (
        <div className="mm-ev-booking-loading" role="alert">
          <p>Chưa tải được danh sách KTV. Quà của bạn vẫn được giữ trong ví.</p>
          <button type="button" onClick={() => void directory.refetch()}>
            Tải lại danh sách
          </button>
          <a href="https://mocmaria.com/dat-lich">
            Đến trang đặt lịch <ArrowRight size={16} />
          </a>
        </div>
      ) : !providers.length ? (
        <p className="mm-ev-booking-loading">
          Mộc đang cập nhật danh sách KTV.{" "}
          <a href="https://mocmaria.com/dat-lich">Đến trang đặt lịch</a>
        </p>
      ) : (
        <>
          <div className="mm-ev-booking-pick-hint">
            <span>Chọn người đồng hành cùng bạn</span>
            <small>
              Vuốt để xem thêm <ChevronRight size={13} />
            </small>
          </div>
          <div
            className="mm-ev-booking-roster"
            role="group"
            aria-label="Chọn kỹ thuật viên để đặt lịch"
          >
            {providers.map((provider) => (
              <button
                className={
                  "mm-ev-booking-person" + (selectedId === provider.id ? " is-selected" : "")
                }
                key={provider.id}
                type="button"
                aria-label={`Chọn KTV ${provider.publicName}`}
                aria-pressed={selectedId === provider.id}
                onClick={() => setSelectedId(provider.id)}
              >
                <span className="mm-ev-booking-portrait">
                  {provider.avatarUrl ? (
                    <Image
                      src={provider.avatarUrl}
                      width={320}
                      height={360}
                      sizes="(max-width: 600px) 45vw, 260px"
                      alt={provider.publicName}
                      unoptimized
                    />
                  ) : (
                    <span className="mm-ev-booking-initials">
                      {provider.publicName
                        .split(/\s+/)
                        .slice(-2)
                        .map((word) => word[0])
                        .join("")}
                    </span>
                  )}
                  <span className="mm-ev-booking-person-check" aria-hidden="true">
                    {selectedId === provider.id ? <Check size={16} /> : <span />}
                  </span>
                </span>
                <span className="mm-ev-booking-person-copy">
                  <strong>{provider.publicName}</strong>
                  <small>{provider.serviceArea || "Mộc Maria"}</small>
                  <span>{provider.services.slice(0, 2).join(" · ")}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mm-ev-booking-continue">
            <p>
              <CalendarDays size={18} />
              {selected ? (
                <>
                  Bạn đã chọn <strong>{selected.publicName}</strong>
                </>
              ) : (
                "Chạm vào ảnh để chọn KTV bạn mến"
              )}
            </p>
            {selected ? (
              <a className="mm-ev-primary" href={eventBookingHref(selected.bookingHref)}>
                Đặt lịch với {selected.publicName} <ArrowRight size={17} />
              </a>
            ) : (
              <button type="button" className="mm-ev-primary" disabled>
                Chọn KTV để đặt lịch <ArrowRight size={17} />
              </button>
            )}
          </div>
        </>
      )}
      <p className="mm-ev-booking-note">
        Bạn chọn dịch vụ và giờ hẹn ở bước tiếp theo. Quà được áp dụng theo điều kiện trong ví và
        cần KTV xác nhận lịch.
      </p>
    </section>
  );
}
