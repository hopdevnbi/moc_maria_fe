import {
  chatImageMime,
  MAX_CHAT_IMAGE_BYTES,
  prepareChatImage,
} from "@/features/mobile/chat-image";

// The attendance endpoint has a stricter limit than chat. Never submit an
// original phone photo that exceeds its 5 MB multipart limit.
export const MAX_SELFIE_UPLOAD_BYTES = 5 * 1024 * 1024;
const supported = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SERVER_IMAGE_PIXELS = 20_000_000;

// Read dimensions from a small header rather than decoding a 48 MP photo to
// discover it exceeds Sharp's maximum. Keeping ordinary 12 MP originals also
// avoids iOS canvas exporters occasionally producing all-white selfies.
async function safeToUploadOriginal(file: File, mime: string): Promise<boolean> {
  if (file.size > MAX_SELFIE_UPLOAD_BYTES) return false;
  if (mime === "image/webp") return file.size <= 2 * 1024 * 1024;
  if (mime !== "image/jpeg" && mime !== "image/png") return false;

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
  } catch {
    return false;
  }
  let width = 0;
  let height = 0;
  if (
    mime === "image/png" &&
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71
  ) {
    const view = new DataView(bytes.buffer);
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else if (mime === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      let marker = bytes[++offset];
      while (marker === 0xff && offset + 1 < bytes.length) marker = bytes[++offset];
      offset++;
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      if (offset + 2 >= bytes.length) break;
      const size = (bytes[offset] << 8) | bytes[offset + 1];
      if (size < 2 || offset + size > bytes.length) break;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        height = (bytes[offset + 3] << 8) | bytes[offset + 4];
        width = (bytes[offset + 5] << 8) | bytes[offset + 6];
        break;
      }
      offset += size;
    }
  }
  return width > 0 && height > 0 && width * height <= MAX_SERVER_IMAGE_PIXELS;
}

export async function prepareAttendanceSelfie(original: File): Promise<File> {
  const mime = chatImageMime(original);
  if (!mime) throw new Error("Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc ảnh HEIC từ điện thoại.");
  if (original.size <= 0 || original.size > MAX_CHAT_IMAGE_BYTES)
    throw new Error("Ảnh gốc phải nhỏ hơn 20 MB. Hãy chụp lại với độ phân giải thấp hơn.");

  if (supported.has(mime) && (await safeToUploadOriginal(original, mime))) {
    const ext = mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg";
    return new File([original], `selfie.${ext}`, { type: mime });
  }

  // Force a smaller decoded surface for HEIC, large files or a compact 48 MP
  // camera JPEG. This avoids Sharp's pixel limit and reduces mobile memory use.
  const prepared = await prepareChatImage(original, { forceResize: true });
  if (!prepared || !supported.has(prepared.type)) {
    if (mime === "image/heic" || mime === "image/heif")
      throw new Error(
        "Điện thoại chưa chuyển được ảnh HEIC/HEIF. Hãy chụp selfie mới hoặc chọn ảnh JPG từ thư viện.",
      );
    throw new Error("Không xử lý được ảnh selfie. Hãy thử chụp ảnh mới hoặc chọn ảnh JPG khác.");
  }
  if (prepared.size > MAX_SELFIE_UPLOAD_BYTES)
    throw new Error("Ảnh vẫn vượt 5 MB sau khi xử lý. Hãy chụp ảnh nhỏ hơn rồi thử lại.");

  const extension =
    prepared.type === "image/webp" ? "webp" : prepared.type === "image/png" ? "png" : "jpg";
  return new File([prepared], `selfie.${extension}`, { type: prepared.type });
}
