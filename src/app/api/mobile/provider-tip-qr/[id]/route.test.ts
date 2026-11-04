import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const fake = vi.hoisted(() => ({ read: vi.fn(), fetch: vi.fn() }));
vi.mock("@/features/marketplace/public-api", () => ({ publicRead: fake.read }));
const id = "a9bac445-926a-4bb6-9778-b4b599f6c2e2";
const qrUrl = `https://giangxa-media-cdn.b-cdn.net/moc-maria/provider-tips/qr/${id}/f95e51ca-ba64-4973-b62d-4dc45e7011e8.png`;
const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1cAAAAASUVORK5CYII=",
    "base64",
  ),
);
function imageResponse() {
  return new Response(png.slice().buffer, { headers: { "Content-Type": "image/png" } });
}
function request(version = 1) {
  return GET(new Request(`https://mocmaria.com/api/mobile/provider-tip-qr/${id}?v=${version}`), {
    params: Promise.resolve({ id }),
  });
}
beforeEach(() => {
  fake.read.mockReset().mockResolvedValue({ ok: true, data: { version: 1, qrUrl } });
  fake.fetch.mockReset().mockImplementation(async () => imageResponse());
  vi.stubGlobal("fetch", fake.fetch);
});
afterEach(() => vi.unstubAllGlobals());

describe("same-origin tip QR delivery", () => {
  it("delivers exact PNG bytes without caching config or image responses", async () => {
    const result = await request();
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toContain("no-store");
    expect(result.headers.get("Vercel-CDN-Cache-Control")).toBe("no-store");
    expect(result.headers.get("Content-Type")).toBe("image/png");
    expect(new Uint8Array(await result.arrayBuffer())).toEqual(png);
    expect(fake.read).toHaveBeenCalledWith(`/provider-tips/${id}/config`);
    expect(fake.fetch).toHaveBeenCalledWith(
      qrUrl,
      expect.objectContaining({ cache: "no-store", credentials: "omit", redirect: "error" }),
    );
  });

  it("rejects stale versions instead of mixing new QR with old account details", async () => {
    expect((await request(0)).status).toBe(409);
    expect(fake.fetch).not.toHaveBeenCalled();
  });

  it("recovers once from an upstream transient error", async () => {
    fake.fetch.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    expect((await request()).status).toBe(200);
    expect(fake.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not return a successful HTML error body as an image", async () => {
    fake.fetch.mockResolvedValue(
      new Response("<html>error</html>", { headers: { "Content-Type": "image/png" } }),
    );
    expect((await request()).status).toBe(502);
  });

  it("does not follow a removed, hidden or different provider QR", async () => {
    fake.read.mockResolvedValueOnce({ ok: false, status: 404 });
    expect((await request()).status).toBe(404);
    fake.read.mockResolvedValueOnce({ ok: true, data: { version: 1, qrUrl: null } });
    expect((await request()).status).toBe(404);
    fake.read.mockResolvedValueOnce({
      ok: true,
      data: { version: 1, qrUrl: qrUrl.replace(id, "other-provider") },
    });
    expect((await request()).status).toBe(502);
    expect(fake.fetch).not.toHaveBeenCalled();
  });

  it("bounds failed network retries", async () => {
    fake.fetch.mockRejectedValue(new Error("connection failed"));
    expect((await request()).status).toBe(502);
    expect(fake.fetch).toHaveBeenCalledTimes(2);
  });

  it("rejects truncated PNG responses even when their initial signature is valid", async () => {
    fake.fetch.mockResolvedValue(
      new Response(png.slice(0, 24).buffer, { headers: { "Content-Type": "image/png" } }),
    );
    expect((await request()).status).toBe(502);
  });
});
