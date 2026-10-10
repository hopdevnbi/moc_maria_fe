import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { MobileHeader, MobileNavigation } from "@/features/mobile/experience";
import { ProviderSafety } from "@/features/safety/provider-safety";
import "@/features/mobile/account.css";
import "@/features/safety/safety.css";
export default function Page() {
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-account-main">
        <span className="mm-overline">MỘC MARIA · ĐỒNG HÀNH CÙNG KTV</span>
        <h1>Chế độ an toàn</h1>
        <RequireAuth>
          <ProviderSafety />
        </RequireAuth>
      </main>
      <MobileNavigation active="account" />
    </div>
  );
}
