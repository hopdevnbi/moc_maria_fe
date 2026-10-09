import { NextRequest, NextResponse } from "next/server";
import { resolveApiBaseUrl } from "@/shared/config/environment";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{1,120}$/i.test(slug)) {
    return NextResponse.json({ message: "Dịch vụ không hợp lệ." }, { status: 400 });
  }
  try {
    const response = await fetch(resolveApiBaseUrl() + "/services/" + encodeURIComponent(slug), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": response.ok
          ? "public, max-age=30, s-maxage=60, stale-while-revalidate=60"
          : "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Chưa kết nối được dịch vụ." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
