// Camera photos often exceed the server upload limit. Process them locally
// without assuming createImageBitmap or WebP canvas export works on iOS.
export const MAX_CHAT_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_CHAT_UPLOAD_BYTES = 12 * 1024 * 1024;
const TARGET_BYTES = 1_500 * 1024;
const DIRECT_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_SOURCE_PIXELS = 24_000_000;

export const CHAT_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function chatImageMime(file: File): string | null {
  const known = file.type.toLowerCase();
  if (CHAT_IMAGE_TYPES.has(known)) return known;
  if (known) return null;
  const extension = file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  return extension === "jpg" || extension === "jpeg"
    ? "image/jpeg"
    : extension === "png"
      ? "image/png"
      : extension === "webp"
        ? "image/webp"
        : extension === "heic"
          ? "image/heic"
          : extension === "heif"
            ? "image/heif"
            : null;
}

function fallback(file: File): File | null {
  const mime = chatImageMime(file);
  // Never pass HEIC/HEIF to an API that only supports JPEG, PNG and WebP.
  if (!mime || mime === "image/heic" || mime === "image/heif") return null;
  if (file.size > MAX_CHAT_UPLOAD_BYTES) return null;
  return file.type === mime ? file : new File([file], file.name, { type: mime });
}

type Decoded = {
  width: number;
  height: number;
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  release: () => void;
};

function decodeUsingImageElement(file: File): Promise<Decoded> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    let completed = false;
    const finish = (error?: Error) => {
      if (completed) return;
      completed = true;
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      if (error) {
        URL.revokeObjectURL(url);
        reject(error);
        return;
      }
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
        draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
        release: () => {
          image.src = "";
          URL.revokeObjectURL(url);
        },
      });
    };
    const timeout = setTimeout(() => finish(new Error("IMAGE_DECODE_TIMEOUT")), 12_000);
    image.onload = () => finish();
    image.onerror = () => finish(new Error("IMAGE_DECODE_FAILED"));
    image.src = url;
  });
}

async function decodeImage(file: File, forceResize = false): Promise<Decoded> {
  if (typeof createImageBitmap === "function") {
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // Request a reduced bitmap for large phone photos before allocating a
      // full 48MP+ decoded surface (often fatal in low-memory Android PWAs).
      const decoding =
        file.size > DIRECT_UPLOAD_BYTES || forceResize
          ? createImageBitmap(file, { resizeWidth: 2048, resizeQuality: "high" })
          : createImageBitmap(file);
      void decoding
        .then((late) => {
          if (timedOut) late.close();
        })
        .catch(() => undefined);
      const bitmap = await Promise.race([
        decoding,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(() => {
            timedOut = true;
            reject(new Error("IMAGE_BITMAP_TIMEOUT"));
          }, 10_000);
        }),
      ]);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (context, width, height) => context.drawImage(bitmap, 0, 0, width, height),
        release: () => bitmap.close(),
      };
    } catch {
      // Android Chrome and iOS standalone PWAs may decode through <img>
      // even when createImageBitmap rejects the same camera photo.
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  return decodeUsingImageElement(file);
}

async function canvasBlob(
  canvas: HTMLCanvasElement,
  format: "image/webp" | "image/jpeg",
  quality: number,
): Promise<Blob | null> {
  const result = await new Promise<Blob | null>((resolve) => {
    let complete = false;
    const finish = (blob: Blob | null) => {
      if (complete) return;
      complete = true;
      clearTimeout(timeout);
      resolve(blob);
    };
    // Some Android WebViews never call toBlob under memory pressure. The
    // upload must be retryable rather than showing "Đang gửi" indefinitely.
    const timeout = setTimeout(() => finish(null), 8000);
    try {
      canvas.toBlob(finish, format, quality);
    } catch {
      finish(null);
    }
  });
  // Safari can silently return PNG when requested to export WebP.
  return result?.type === format && result.size > 0 ? result : null;
}

export async function prepareChatImage(
  file: File,
  options: { forceResize?: boolean } = {},
): Promise<File | null> {
  const mime = chatImageMime(file);
  if (!mime || file.size > MAX_CHAT_IMAGE_BYTES || file.size === 0) return null;
  const original = fallback(file);
  if (original && file.size <= 64 * 1024 && !options.forceResize) return original;

  let decoded: Decoded;
  try {
    decoded = await decodeImage(original ?? file, options.forceResize === true);
  } catch {
    return original;
  }

  // The server already resizes and encodes these originals. Avoid drawing
  // them onto a phone canvas, which can export a valid but blank image.
  const { width, height } = decoded;
  if (
    original &&
    !options.forceResize &&
    file.size <= DIRECT_UPLOAD_BYTES &&
    width > 0 &&
    height > 0 &&
    width * height <= MAX_SOURCE_PIXELS
  ) {
    decoded.release();
    return original;
  }

  const canvas = document.createElement("canvas");
  try {
    // A 48 MP selfie can still be downscaled after HTMLImageElement decoding
    // when Safari does not implement createImageBitmap resize options.
    const maxPixels = options.forceResize ? 50_000_000 : MAX_SOURCE_PIXELS;
    if (!width || !height || width * height > maxPixels) return null;
    const context = canvas.getContext("2d");
    if (!context) return original;

    let best: Blob | null = null;
    for (const [maxEdge, quality] of [
      [2048, 0.86],
      [1600, 0.8],
      [1280, 0.73],
      [960, 0.67],
    ]) {
      const ratio = Math.min(1, maxEdge / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      // White background keeps transparent PNGs legible on Safari's JPEG fallback.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      decoded.draw(context, canvas.width, canvas.height);
      // All supported browsers can show WebP, but not all can encode it.
      const blob =
        (await canvasBlob(canvas, "image/webp", quality)) ??
        (await canvasBlob(canvas, "image/jpeg", quality));
      if (!blob) break;
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= TARGET_BYTES) break;
    }
    if (best && best.size <= MAX_CHAT_UPLOAD_BYTES) {
      return new File([best], best.type === "image/webp" ? "chat-image.webp" : "chat-image.jpg", {
        type: best.type,
      });
    }
    return original;
  } catch {
    return original;
  } finally {
    decoded.release();
    canvas.width = canvas.height = 0;
  }
}
