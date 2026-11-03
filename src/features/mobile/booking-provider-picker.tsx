"use client";

import Image from "next/image";
import { Check, MapPin, Search, UserRound, X } from "lucide-react";
import type { Provider } from "@/features/marketplace/types";
import "./booking-provider-picker.css";

export function BookingProviderPicker({
  providers,
  total,
  selectedId,
  onSelect,
  query,
  onQuery,
  showSearch,
}: {
  providers: Provider[];
  total: number;
  selectedId: string;
  onSelect: (provider: Provider) => void;
  query: string;
  onQuery: (query: string) => void;
  showSearch: boolean;
}) {
  return (
    <div className="mm-care-picker">
      {showSearch && (
        <>
          <div className="mm-care-picker-caption">
            <span>Chọn người đồng hành cùng bạn</span>
            <strong>{total} KTV</strong>
          </div>
          <div className="mm-care-picker-search">
            <Search size={19} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Tìm tên KTV, dịch vụ..."
              aria-label="Tìm kỹ thuật viên"
            />
            {query && (
              <button type="button" aria-label="Xóa tìm kiếm KTV" onClick={() => onQuery("")}>
                <X size={17} />
              </button>
            )}
          </div>
        </>
      )}
      <div className="mm-care-picker-grid" role="group" aria-label="Danh sách kỹ thuật viên">
        {providers.map((provider) => {
          const selected = selectedId === provider.id;
          return (
            <button
              type="button"
              key={provider.id}
              aria-pressed={selected}
              className={"mm-care-picker-card" + (selected ? " is-selected" : "")}
              onClick={() => onSelect(provider)}
            >
              <span className="mm-care-picker-portrait">
                {provider.avatarUrl ? (
                  <Image
                    src={provider.avatarUrl}
                    alt=""
                    fill
                    sizes="(max-width: 600px) 72px, 88px"
                    unoptimized
                  />
                ) : (
                  <UserRound size={30} />
                )}
              </span>
              <span className="mm-care-picker-info">
                <strong>{provider.publicName}</strong>
                <span className="mm-care-picker-specialty">
                  {provider.title || "Kỹ thuật viên Mộc Maria"}
                </span>
                <span className="mm-care-picker-area">
                  <MapPin size={12} aria-hidden="true" /> {provider.serviceArea || "Hà Nội"}
                </span>
                <span className="mm-care-picker-choice">{selected ? "Đã chọn" : "Chọn KTV"}</span>
              </span>
              <span className="mm-care-picker-check" aria-hidden="true">
                {selected && <Check size={14} />}
              </span>
            </button>
          );
        })}
      </div>
      {showSearch && providers.length === 0 && (
        <div className="mm-care-picker-empty" role="status">
          <Search size={24} />
          <strong>Chưa tìm thấy KTV</strong>
          <p>Thử tên khác hoặc xóa từ khóa để xem danh sách.</p>
          {query && (
            <button type="button" onClick={() => onQuery("")}>
              Xem tất cả KTV
            </button>
          )}
        </div>
      )}
      <p className="mm-care-picker-note">
        Chọn KTV bạn muốn gửi yêu cầu. KTV sẽ trao đổi và xác nhận dịch vụ, thời gian phù hợp với
        bạn.
      </p>
    </div>
  );
}
