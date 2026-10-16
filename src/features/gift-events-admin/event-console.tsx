"use client";
import { useEffect, useState } from "react";
import { Activity, ChartNoAxesCombined, ClipboardCheck, Gift, ShieldCheck, TicketPercent } from "lucide-react";
import { GiftEventAdmin } from "./event-admin";
import { GiftVouchersAdmin } from "./gift-vouchers-admin";
import { GiftReportAdmin } from "./gift-report-admin";
import { GiftOperationsAdmin } from "./gift-operations-admin";
import { GiftCounter } from "@/features/gift-events/gift-counter";
import "./event-console.css";

export const eventTabs = ["campaign", "counter", "vouchers", "report", "operations"] as const;
export type EventTab = (typeof eventTabs)[number];
const tabs = [
  { id: "campaign", name: "Chiến dịch", caption: "Thiết lập sự kiện và kho quà", Icon: Gift },
  { id: "counter", name: "Đổi quà tại quầy", caption: "Nhập mã hoặc quét QR", Icon: ClipboardCheck },
  { id: "vouchers", name: "Voucher", caption: "Tra cứu và quản lý", Icon: TicketPercent },
  { id: "report", name: "Đối soát", caption: "Số liệu và ngân sách", Icon: ChartNoAxesCombined },
  { id: "operations", name: "Vận hành", caption: "Theo dõi và thông báo", Icon: Activity },
] as const;
export function EventConsole({ initialTab = "campaign" }: { initialTab?: EventTab }) {
  const [active, setActive] = useState<EventTab>(initialTab);
  useEffect(() => {
    const onBack = () => {
      const candidate = new URLSearchParams(window.location.search).get("tab");
      setActive(eventTabs.includes(candidate as EventTab) ? (candidate as EventTab) : "campaign");
    };
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);
  const choose = (tab: EventTab) => {
    setActive(tab);
    const url = new URL(window.location.href);
    if (tab === "campaign") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    window.history.pushState(null, "", url.pathname + url.search);
  };
  return (
    <div className="mm-event-console">
      <header className="mm-event-console-hero">
        <div className="mm-event-console-hero-copy">
          <span className="mm-event-console-eyebrow"><Gift size={15} /> MỘC MARIA · EVENT STUDIO</span>
          <h2>Trung tâm sự kiện & quà tặng</h2>
          <p>Chiến dịch, ưu đãi, khách nhận quà và số liệu vận hành trong một không gian quản lý.</p>
        </div>
        <span className="mm-event-console-secure"><ShieldCheck size={15} /> Khu vực Super Admin</span>
      </header>
      <nav className="mm-event-console-tabs" aria-label="Chức năng quản trị sự kiện">
        {tabs.map(({ id, name, caption, Icon }) => (
          <button key={id} type="button" className={"mm-event-console-tab" + (active === id ? " active" : "")}
            onClick={() => choose(id)} aria-current={active === id ? "page" : undefined}>
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
            <span><strong>{name}</strong><small>{caption}</small></span>
          </button>
        ))}
      </nav>
      <section className="mm-event-console-content" aria-label={tabs.find((t) => t.id === active)?.name}>
        {active === "campaign" && <GiftEventAdmin />}
        {active === "counter" && <GiftCounter />}
        {active === "vouchers" && <GiftVouchersAdmin />}
        {active === "report" && <GiftReportAdmin />}
        {active === "operations" && <GiftOperationsAdmin />}
      </section>
    </div>
  );
}
