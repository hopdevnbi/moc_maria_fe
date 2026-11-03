export const MAX_CHAT_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const TARGET_BYTES = 800 * 1024;

export async function prepareChatImage(file: File): Promise<File | null> {
  if (typeof createImageBitmap !== "function") return file.size <= MAX_UPLOAD_BYTES ? file : null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // The server can decode some files the current browser cannot.
    return file.size <= MAX_UPLOAD_BYTES ? file : null;
  }

  const canvas = document.createElement("canvas");
  try {
    const edge = Math.max(bitmap.width, bitmap.height);
    if (edge <= 2048 && file.size <= TARGET_BYTES) return file;
    const context = canvas.getContext("2d");
    if (!context) return file.size <= MAX_UPLOAD_BYTES ? file : null;

    for (const [maxEdge, quality] of [
      [2048, 0.84],
      [1600, 0.78],
      [1280, 0.72],
    ]) {
      const ratio = Math.min(1, maxEdge / edge);
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const encode = (type: string) =>
        new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
      let blob = await encode("image/webp");
      if (blob?.type !== "image/webp" && file.type === "image/jpeg") {
        blob = await encode("image/jpeg");
      }
      if (!blob || blob.size > TARGET_BYTES) continue;
      if (edge <= 2048 && blob.size >= file.size && file.size <= MAX_UPLOAD_BYTES) return file;
      const extension =
        blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
      return new File([blob], `chat-image.${extension}`, { type: blob.type });
    }
    return file.size <= MAX_UPLOAD_BYTES ? file : null;
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 0;
  }
}
