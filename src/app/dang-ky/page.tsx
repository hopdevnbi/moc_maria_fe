import { Suspense } from "react";
import { LocalizedRegistration } from "@/features/auth/components/LocalizedRegistration";
import { safeReturnTo } from "@/features/auth/return-to";
import { LocalizedText } from "@/shared/i18n/localized-text";
import { normalizeReferralCode } from "@/features/referrals/referral-cookie";

type RegisterPageProps = { searchParams: Promise<{ returnTo?: string; ref?: string }> };

export default function RegisterPage(props: RegisterPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl px-6 py-20" role="status">
          <LocalizedText message="common.loading" />
        </div>
      }
    >
      <RegisterContent {...props} />
    </Suspense>
  );
}

async function RegisterContent({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo, "/chuyen-vien");
  return <LocalizedRegistration returnTo={returnTo} code={normalizeReferralCode(params.ref)} />;
}
