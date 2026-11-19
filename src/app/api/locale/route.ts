import type { NextRequest } from "next/server";
import { LOCALE_COOKIE, resolveLocale } from "@/shared/i18n/locale";

export function GET(request: NextRequest) {
  const manual = request.cookies.get(LOCALE_COOKIE)?.value;
  const rawCountry = request.headers.get("x-vercel-ip-country");
  // Opt in only after verifying direct Vercel ingress for both public hosts.
  const country =
    process.env.VERCEL === "1" && process.env.MOC_I18N_GEO === "1" ? rawCountry : undefined;
  return Response.json(
    { locale: resolveLocale({ manual, country }) },
    {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    },
  );
}
