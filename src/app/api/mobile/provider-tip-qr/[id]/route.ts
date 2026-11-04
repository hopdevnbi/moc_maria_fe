import { publicRead } from "@/features/marketplace/public-api";

const headers = {
  "Cache-Control": "no-store, max-age=0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
const pngEnd = [0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130];
const maxBytes = 5 * 1024 * 1024;

function failure(message: string, status: number) {
  return Response.json({ message }, { status, headers });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const version = searchParams.get("v");
  if (!uuid.test(id) || !version || !/^\d{1,10}$/.test(version)) {
    return failure("Thông tin ảnh QR không hợp lệ.", 400);
  }
  const config = await publicRead<{ version: number; qrUrl: string | null }>(
    `/provider-tips/${id}/config`,
  );
  if (!config.ok) return failure("Chưa tải được thông tin QR.", config.status === 404 ? 404 : 503);
  // Do not pair a newly changed QR with bank details from an older client snapshot.
  if (config.data.version !== Number(version)) {
    return failure("Thông tin nhận tip đã cập nhật. Vui lòng tải lại mã QR.", 409);
  }
  const url = config.data.qrUrl;
  if (!url) return failure("Kỹ thuật viên chưa công bố mã QR.", 404);
  const prefix = `https://giangxa-media-cdn.b-cdn.net/moc-maria/provider-tips/qr/${id}/`;
  if (!url.startsWith(prefix) || !/^[0-9a-f-]{36}\.png$/i.test(url.slice(prefix.length))) {
    return failure("Chưa tải được ảnh QR của hồ sơ này.", 502);
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const upstream = await fetch(url, {
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal: AbortSignal.timeout(4000),
        headers: { Accept: "image/png", "Cache-Control": "no-cache" },
      });
      if (!upstream.ok) {
        await upstream.body?.cancel();
        if (attempt === 0 && (upstream.status >= 500 || [408, 429].includes(upstream.status))) {
          continue;
        }
        return failure("Chưa tải được ảnh QR. Bạn có thể thử lại.", 502);
      }
      if (
        upstream.status !== 200 ||
        !upstream.headers.get("Content-Type")?.toLowerCase().startsWith("image/png") ||
        Number(upstream.headers.get("Content-Length")) > maxBytes
      ) {
        await upstream.body?.cancel();
        return failure("Ảnh QR chưa tải đầy đủ. Bạn có thể thử lại.", 502);
      }
      const body = await upstream.arrayBuffer();
      const bytes = new Uint8Array(body);
      const declaredLength = upstream.headers.get("Content-Length");
      if (
        bytes.length > maxBytes ||
        !pngSignature.every((value, index) => bytes[index] === value) ||
        !pngEnd.every((value, index) => bytes[bytes.length - pngEnd.length + index] === value) ||
        (declaredLength !== null && Number(declaredLength) !== bytes.length)
      ) {
        return failure("Ảnh QR chưa tải đầy đủ. Bạn có thể thử lại.", 502);
      }
      return new Response(body, {
        headers: {
          ...headers,
          "Content-Type": "image/png",
          "Content-Length": String(bytes.length),
          "Content-Disposition":
            searchParams.get("download") === "1"
              ? 'attachment; filename="ktv-qr.png"'
              : 'inline; filename="ktv-qr.png"',
        },
      });
    } catch {
      if (attempt === 1) return failure("Chưa tải được ảnh QR. Bạn có thể thử lại.", 502);
    }
  }
  return failure("Chưa tải được ảnh QR. Bạn có thể thử lại.", 502);
}
