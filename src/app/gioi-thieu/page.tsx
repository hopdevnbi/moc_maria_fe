import { RequireAuth } from "@/features/auth/components/RequireAuth";
import { MobileHeader, MobileNavigation } from "@/features/mobile/experience";
import { ReferralCard } from "@/features/referrals/referrals";
export default function ReferralPage() {
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <RequireAuth>
        <main className="mm-container">
          <ReferralCard />
        </main>
      </RequireAuth>
      <MobileNavigation active="account" />
    </div>
  );
}
