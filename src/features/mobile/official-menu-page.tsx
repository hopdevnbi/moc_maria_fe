"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Coffee, Flower2, GlassWater, Heart, Leaf, Search, Sparkles } from "lucide-react";
import { formatPrice } from "@/features/marketplace/format";
import type { ServiceItem } from "@/features/marketplace/types";
import { bookingHref } from "./links";
import { MobileHeader, MobileNavigation } from "./experience";
import { careMenu, drinkMenu, type MenuItem } from "./official-menu";
import "./official-menu.css";

type Tab = "care" | "drinks";
function normalize(text: string) {
  return text.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function matches(item: MenuItem, search: string) {
  return !search || normalize(item.name + " " + item.description).includes(search);
}
const photoNames: Record<string, string> = {
  "cham-soc-co-vai-gay-chuyen-sau": "neck-ce87c1a1b5b9-960.webp",
  "cham-soc-co-vai-gay-lung-eo": "back-1d0452800a98-960.webp",
  "massage-chan": "foot-732ea1395b88-960.webp",
  "massage-body": "relaxation-c29795f81eb9-960.webp",
  "goi-dau-sach": "hair-be9ed1917a19-960.webp",
};

function CareCard({ item, real }: { item: MenuItem; real?: ServiceItem }) {
  const canBook = Boolean(real?.service.isPublished && real.variants.some(
    (v) => v.isActive && Number(v.priceVnd) === item.priceVnd,
  ));
  const photo = photoNames[item.slug];
  return (
    <article className="official-care-card">
      <div className="official-care-visual">
        {photo ? (
          <Image
            src={"https://giangxa-media-cdn.b-cdn.net/moc-maria/services/photos-v1/" + photo}
            alt={"Hình ảnh chăm sóc tại Mộc Maria: " + item.name}
            width={640} height={390} sizes="(max-width: 680px) 100vw, 33vw" unoptimized
          />
        ) : (
          <div className="official-care-placeholder"><Flower2 size={43} strokeWidth={1.15} /></div>
        )}
      </div>
      <div className="official-care-info">
        <span className="official-eyebrow">CHĂM SÓC SỨC KHỎE</span>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <div className="official-care-bottom">
          <div><small>Giá niêm yết</small><strong>{formatPrice(item.priceVnd)}</strong></div>
          <Link className="official-cta" href={canBook ? bookingHref({ service: real!.service.id }) : "/chuyen-vien"}>
            {canBook ? "Đặt lịch" : "Xem KTV"} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function OfficialMenuPage({ services }: { services: ServiceItem[] }) {
  const [tab, setTab] = useState<Tab>("care");
  const [query, setQuery] = useState("");
  const search = normalize(query.trim());
  const realBySlug = useMemo(() => new Map(services.map((s) => [s.service.slug, s])), [services]);
  const visibleCare = careMenu.filter((item) => matches(item, search));
  const visibleDrinks = drinkMenu.map((section) => ({
    ...section, items: section.items.filter((item) => matches(item, search)),
  })).filter((section) => section.items.length);
  const drinkCount = visibleDrinks.reduce((total, section) => total + section.items.length, 0);
  const count = tab === "care" ? visibleCare.length : drinkCount;

  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main id="noi-dung" className="mm-main mm-container official-menu">
        <header className="official-intro">
          <span className="official-eyebrow">MỘC MARIA · WELLNESS & CARE</span>
          <h1>Chọn điều <em>cơ thể cần.</em></h1>
          <p>Khám phá dịch vụ chăm sóc và thức uống Mộc Maria theo bảng giá chính thức.</p>
        </header>
        <div className="official-tabs" aria-label="Nhóm sản phẩm và dịch vụ">
          <button type="button" aria-pressed={tab === "care"} className={tab === "care" ? "selected" : ""}
            onClick={() => { setTab("care"); setQuery(""); }}>
            <Heart size={18} /> Dịch vụ chăm sóc <span>{careMenu.length}</span>
          </button>
          <button type="button" aria-pressed={tab === "drinks"} className={tab === "drinks" ? "selected" : ""}
            onClick={() => { setTab("drinks"); setQuery(""); }}>
            <Coffee size={18} /> Đồ uống <span>{drinkMenu.reduce((n, section) => n + section.items.length, 0)}</span>
          </button>
        </div>
        <div className="official-search"><Search size={19} /><input aria-label="Tìm trong bảng giá"
          placeholder={tab === "care" ? "Tìm dịch vụ chăm sóc..." : "Tìm trà, nước ép, detox..."}
          value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="official-result-heading">
          <div><span className="official-eyebrow">BẢNG GIÁ MỘC MARIA</span>
            <h2>{tab === "care" ? "Chăm sóc sức khỏe" : "Trà, nước ép & detox"}</h2></div>
          <span>{count} {tab === "care" ? "dịch vụ" : "thức uống"}</span>
        </div>
        {tab === "care" ? (
          <>
            <p className="official-note"><Sparkles size={16} /> Bảng giá chính thức. Đặt lịch trực tuyến chỉ khả dụng khi dịch vụ đã được kích hoạt trong hệ thống.</p>
            <div className="official-care-grid">
              {visibleCare.map((item) => <CareCard key={item.slug} item={item} real={realBySlug.get(item.slug)} />)}
            </div>
          </>
        ) : (
          <>
            <p className="official-note"><Leaf size={16} /> Đồ uống được giới thiệu riêng, không thuộc quy trình đặt lịch kỹ thuật viên.</p>
            {visibleDrinks.map((section) => (
              <section className="official-drink-section" key={section.id} aria-labelledby={section.id}>
                <div className="official-drink-heading"><GlassWater size={24} /><div><h3 id={section.id}>{section.title}</h3><p>{section.subtitle}</p></div></div>
                <div className="official-drink-grid">
                  {section.items.map((item) => <div className="official-drink-item" key={item.slug}>
                    <div className="official-drink-leaf"><Leaf size={20} /></div>
                    <div><h4>{item.name}</h4><p>{item.description}</p></div>
                    <strong>{formatPrice(item.priceVnd)}{section.id === "tra-thao-moc" ? "/ấm" : ""}</strong>
                  </div>)}
                </div>
              </section>
            ))}
          </>
        )}
        {!count && <p className="official-no-results">Không tìm thấy mục phù hợp. Hãy thử từ khóa khác.</p>}
      </main>
      <MobileNavigation active="services" />
    </div>
  );
}
