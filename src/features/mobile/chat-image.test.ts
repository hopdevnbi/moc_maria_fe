import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_CHAT_IMAGE_BYTES,
  MAX_CHAT_UPLOAD_BYTES,
  chatImageMime,
  prepareChatImage,
} from "./chat-image";

describe("mobile camera and PWA chat image preparation", () => {
  const bitmap = {
    width: 3200,
    height: 2400,
    close: vi.fn(),
  };
  const fillRect = vi.fn();
  const drawImage = vi.fn();
  const originalImage = globalThis.Image;
  const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
  const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

  beforeEach(() => {
    bitmap.close.mockClear();
    fillRect.mockClear();
    drawImage.mockClear();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
      fillRect,
      fillStyle: "",
    } as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    globalThis.Image = originalImage;
    if (originalCreateObjectUrl)
      Object.defineProperty(URL, "createObjectURL", originalCreateObjectUrl);
    else Reflect.deleteProperty(URL, "createObjectURL");
    if (originalRevokeObjectUrl)
      Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectUrl);
    else Reflect.deleteProperty(URL, "revokeObjectURL");
  });

  it("compresses a large Android camera JPG into a supported WebP and closes the bitmap", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => {
      cb(new Blob(["small webp"], { type: "image/webp" }));
    });
    const source = new File(["camera photo"], "camera.jpg", { type: "image/jpeg" });
    Object.defineProperty(source, "size", { configurable: true, value: 14 * 1024 * 1024 });
    const result = await prepareChatImage(source);
    expect(result).not.toBeNull();
    expect(result?.type).toBe("image/webp");
    expect(result?.name).toBe("chat-image.webp");
    expect(result?.size).toBeLessThan(MAX_CHAT_UPLOAD_BYTES);
    expect(drawImage).toHaveBeenCalledTimes(1);
    expect(fillRect).toHaveBeenCalledTimes(1);
    expect(bitmap.close).toHaveBeenCalledTimes(1);
    expect(createImageBitmap).toHaveBeenCalledWith(
      source,
      expect.objectContaining({ resizeWidth: 2048 }),
    );
  });

  it("uses JPEG instead of silent PNG fallback when Safari cannot encode WebP", async () => {
    const formats: string[] = [];
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb, type) => {
      formats.push(type ?? "");
      cb(new Blob(["encoded"], { type: type === "image/webp" ? "image/png" : "image/jpeg" }));
    });
    const source = new File(["png"], "screenshot.png", { type: "image/png" });
    Object.defineProperty(source, "size", { configurable: true, value: 250 * 1024 });
    const result = await prepareChatImage(source);
    expect(result?.type).toBe("image/jpeg");
    expect(result?.name).toBe("chat-image.jpg");
    expect(formats).toEqual(["image/webp", "image/jpeg"]);
  });

  it("falls back to the HTMLImageElement decoder when Android createImageBitmap rejects", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("bitmap unsupported")));
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:android-photo"),
    });
    const revoke = vi.fn();
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revoke });
    class MobileImage {
      naturalWidth = 1024;
      naturalHeight = 768;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      set src(value: string) {
        if (value) queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", MobileImage);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => {
      cb(new Blob(["mobile"], { type: "image/webp" }));
    });
    const source = new File(["jpeg"], "camera.jpg", { type: "image/jpeg" });
    Object.defineProperty(source, "size", { configurable: true, value: 250 * 1024 });
    const result = await prepareChatImage(source);
    expect(result?.type).toBe("image/webp");
    expect(revoke).toHaveBeenCalledWith("blob:android-photo");
    expect(drawImage).toHaveBeenCalledTimes(1);
  });

  it("normalizes HEIC to JPEG when the browser can draw it (without uploading HEIC)", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb, type) => {
      cb(new Blob(["converted"], { type: type === "image/webp" ? "image/png" : "image/jpeg" }));
    });
    const image = new File(["heic"], "photo.heic", { type: "image/heic" });
    expect((await prepareChatImage(image))?.type).toBe("image/jpeg");
  });

  it("never sends unsupported HEIC unchanged if the phone cannot decode it", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:heic"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    class BrokenImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      set src(value: string) {
        if (value) queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal("Image", BrokenImage);
    expect(await prepareChatImage(new File(["heic"], "a.heic", { type: "image/heic" }))).toBeNull();
  });

  it("keeps small JPEG as a server-side fallback if the phone lacks a canvas", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const file = new File(["jpeg"], "photo.jpeg", { type: "image/jpeg" });
    expect(await prepareChatImage(file)).toBe(file);
  });

  it("does not block an upload forever when Android canvas.toBlob never completes", async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(() => undefined);
      const source = new File(["jpg"], "photo.jpg", { type: "image/jpeg" });
      Object.defineProperty(source, "size", { configurable: true, value: 250 * 1024 });
      const task = prepareChatImage(source);
      await vi.runAllTimersAsync();
      expect(await task).toBe(source);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rejects originals above 20 MB and does not leak large unsupported files to the server", async () => {
    const huge = new File(["large"], "huge.jpg", { type: "image/jpeg" });
    Object.defineProperty(huge, "size", { configurable: true, value: MAX_CHAT_IMAGE_BYTES + 1 });
    expect(await prepareChatImage(huge)).toBeNull();
    expect(createImageBitmap).not.toHaveBeenCalled();
    const tooLarge = new File(["large"], "picture.jpg", { type: "image/jpeg" });
    Object.defineProperty(tooLarge, "size", {
      configurable: true,
      value: MAX_CHAT_UPLOAD_BYTES + 1,
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(await prepareChatImage(tooLarge)).toBeNull();
  });

  it("recognizes camera files that are missing MIME but have valid extensions", () => {
    expect(chatImageMime(new File(["img"], "photo.JPG"))).toBe("image/jpeg");
    expect(chatImageMime(new File(["img"], "photo.PNG"))).toBe("image/png");
    expect(chatImageMime(new File(["img"], "photo.HEIF"))).toBe("image/heif");
    expect(chatImageMime(new File(["txt"], "photo.pdf", { type: "application/pdf" }))).toBeNull();
  });
});
