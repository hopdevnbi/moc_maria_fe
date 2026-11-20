import { NextRequest, NextResponse } from "next/server";
import { normalizeReferralCode, REFERRAL_COOKIE } from "@/features/referrals/referral-cookie";
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const code = normalizeReferralCode((await params).code);
  const url = new URL("/dang-ky", request.url);
  if (code) url.searchParams.set("ref", code);
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "private, no-store");
  if (code)
    response.cookies.set(REFERRAL_COOKIE, code, {
      path: "/",
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      maxAge: 30 * 86400,
    });
  return response;
}
