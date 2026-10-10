import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { MobileHeader, MobileNavigation } from "@/features/mobile/experience";
import { PresentationReview } from "@/features/mobile/presentation-review";
import "@/features/mobile/account.css";
export default function Page() {
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="mm-container mm-account-main">
        <h1>Duyệt mô tả kỹ thuật viên</h1>
        <p>So sánh nội dung hiện tại với bản mới trước khi công bố.</p>
        <RequireAuth>
          <PresentationReview />
        </RequireAuth>
      </main>
      <MobileNavigation active="account" />
    </div>
  );
}
