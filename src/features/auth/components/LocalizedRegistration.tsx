"use client";
import Link from "next/link";
import { AuthShell } from "./AuthShell";
import { RegisterForm } from "./RegisterForm";
import { useLocale } from "@/shared/i18n/locale-provider";
export function LocalizedRegistration({ returnTo, code }: { returnTo: string; code?: string }) {
  const { t } = useLocale();
  return (
    <AuthShell
      eyebrow={t("ref.new")}
      title={t("ref.signup")}
      description={t("ref.signupHint")}
      footer={
        <>
          {t("ba.hasAccount")}{" "}
          <Link
            href={"/dang-nhap?returnTo=" + encodeURIComponent(returnTo)}
            className="font-semibold text-[var(--moc-green)]"
          >
            {t("ba.login")}
          </Link>
        </>
      }
    >
      <RegisterForm returnTo={returnTo} initialCode={code} />
    </AuthShell>
  );
}
