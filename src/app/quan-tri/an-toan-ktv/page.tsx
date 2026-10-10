import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { MobileHeader, MobileNavigation } from "@/features/mobile/experience";
import { AdminSafety } from "@/features/safety/admin-safety";
import "@/features/mobile/account.css";
import "@/features/safety/safety.css";
export default function Page() {
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-account-main">
        <span className="mm-overline">MỘC MARIA · QUẢN TRỊ AN TOÀN</span>
        <h1>An toàn kỹ thuật viên</h1>
        <RequireAuth>
          <AdminSafety />
        </RequireAuth>
      </main>
      <MobileNavigation active="account" />
    </div>
  );
}
