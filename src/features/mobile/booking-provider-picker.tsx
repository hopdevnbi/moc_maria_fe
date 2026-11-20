"use client";

import Image from "next/image";
import { Check, MapPin, Search, UserRound, X } from "lucide-react";
import type { Provider } from "@/features/marketplace/types";
import { useLocale } from "@/shared/i18n/locale-provider";
import { providerTitle } from "@/shared/i18n/provider-titles";
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
  const { locale, t } = useLocale();
  return (
    <div className="mm-care-picker">
      {showSearch && (
        <>
          <div className="mm-care-picker-caption">
            <span>{t("rq.picker")}</span>
            <strong>{t("rq.count", { n: total })}</strong>
          </div>
          <div className="mm-care-picker-search">
            <Search size={19} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder={t("rq.search")}
              aria-label={t("rq.searchKtv")}
            />
            {query && (
              <button type="button" aria-label={t("rq.clear")} onClick={() => onQuery("")}>
                <X size={17} />
              </button>
            )}
          </div>
        </>
      )}
      <div className="mm-care-picker-grid" role="group" aria-label={t("rq.list")}>
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
                  {providerTitle(locale, provider.title) || t("home.role")}
                </span>
                <span className="mm-care-picker-area">
                  <MapPin size={12} aria-hidden="true" />{" "}
                  {!provider.serviceArea || provider.serviceArea === "Hà Nội"
                    ? t("rq.city")
                    : provider.serviceArea}
                </span>
                <span className="mm-care-picker-choice">
                  {selected ? t("rq.picked") : t("rq.pick")}
                </span>
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
          <strong>{t("rq.empty")}</strong>
          <p>{t("rq.emptyHint")}</p>
          {query && (
            <button type="button" onClick={() => onQuery("")}>
              {t("rq.all")}
            </button>
          )}
        </div>
      )}
      <p className="mm-care-picker-note">{t("rq.pickerHint")}</p>
    </div>
  );
}
