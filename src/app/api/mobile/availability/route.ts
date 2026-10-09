import { NextRequest, NextResponse } from "next/server";
import { resolveApiBaseUrl } from "@/shared/config/environment";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Live appointment inventory must never enter a shared or browser cache.
export async function GET(request: NextRequest) {
  const fields = request.nextUrl.searchParams;
  const variantId = fields.get("variantId") ?? "";
  const branchId = fields.get("branchId") ?? "";
  const providerApplicationId = fields.get("providerApplicationId") ?? "";
  const date = fields.get("date") ?? "";
  if (
    !UUID.test(variantId) ||
    !UUID.test(branchId) ||
    !DATE.test(date) ||
    (providerApplicationId && !UUID.test(providerApplicationId))
  ) {
    return NextResponse.json(
      { message: "Dữ liệu tìm lịch không hợp lệ." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const query = new URLSearchParams({ variantId, branchId, date });
  if (providerApplicationId) query.set("providerApplicationId", providerApplicationId);
  try {
    const response = await fetch(resolveApiBaseUrl() + "/availability?" + query, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { message: "Chưa kết nối được lịch trống." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
