import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareAttendanceSelfie, MAX_SELFIE_UPLOAD_BYTES } from "./selfie-image";

const mocks = vi.hoisted(() => ({ prepare: vi.fn() }));
vi.mock("@/features/mobile/chat-image", async (original) => {
  const actual = await original<typeof import("@/features/mobile/chat-image")>();
  return { ...actual, prepareChatImage: mocks.prepare };
});

beforeEach(() => mocks.prepare.mockReset());

describe("attendance selfie mobile preparation", () => {
  it("uploads a normal-sized JPEG without canvas to avoid blank iOS selfies", async () => {
    const header = new Uint8Array(32);
    header.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x0b, 0xb8, 0x0f, 0xa0]);
    const jpeg = new File([header], "iphone-photo.jpg", { type: "image/jpeg" }); // 4000 x 3000
    // jsdom's Blob does not implement arrayBuffer; browser File.slice does.
    vi.spyOn(jpeg, "slice").mockReturnValue({ arrayBuffer: async () => header.buffer } as Blob);
    const prepared = await prepareAttendanceSelfie(jpeg);
    expect(prepared.type).toBe("image/jpeg");
    expect(prepared.name).toBe("selfie.jpg");
    expect(mocks.prepare).not.toHaveBeenCalled();
  });

  it("forces downsampling for a JPEG declaring 48 MP despite its small byte size", async () => {
    const header = new Uint8Array(32);
    header.set([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x17, 0xa0, 0x1f, 0x80]);
    const jpeg = new File([header], "iphone-48mp.jpg", { type: "image/jpeg" }); // 8064 x 6048
    vi.spyOn(jpeg, "slice").mockReturnValue({ arrayBuffer: async () => header.buffer } as Blob);
    mocks.prepare.mockResolvedValue(new File(["small"], "photo.webp", { type: "image/webp" }));
    await prepareAttendanceSelfie(jpeg);
    expect(mocks.prepare).toHaveBeenCalledWith(jpeg, { forceResize: true });
  });

  it("forces downscaling before sending camera photos to the stricter 5 MB API", async () => {
    const source = new File(["camera"], "IMG_1201.JPG", { type: "image/jpeg" });
    mocks.prepare.mockResolvedValue(
      new File(["converted"], "chat-image.webp", { type: "image/webp" }),
    );
    const file = await prepareAttendanceSelfie(source);
    expect(mocks.prepare).toHaveBeenCalledWith(source, { forceResize: true });
    expect(file).toMatchObject({ name: "selfie.webp", type: "image/webp" });
  });

  it("accepts iPhone HEIC only after actual conversion to JPEG", async () => {
    const source = new File(["photo"], "IMG_1202.HEIC", { type: "image/heic" });
    mocks.prepare.mockResolvedValue(
      new File(["converted"], "converted.jpg", { type: "image/jpeg" }),
    );
    expect((await prepareAttendanceSelfie(source)).type).toBe("image/jpeg");
    mocks.prepare.mockResolvedValue(null);
    await expect(prepareAttendanceSelfie(source)).rejects.toThrow("HEIC/HEIF");
  });

  it("does not upload a picture above 5 MB even when chat allows it", async () => {
    const converted = new File(["not small enough"], "image.jpg", { type: "image/jpeg" });
    Object.defineProperty(converted, "size", { value: MAX_SELFIE_UPLOAD_BYTES + 1 });
    mocks.prepare.mockResolvedValue(converted);
    await expect(
      prepareAttendanceSelfie(new File(["camera"], "image.jpg", { type: "image/jpeg" })),
    ).rejects.toThrow("5 MB");
  });

  it("rejects invalid files before trying to decode on the phone", async () => {
    await expect(
      prepareAttendanceSelfie(new File(["x"], "notes.txt", { type: "text/plain" })),
    ).rejects.toThrow("Chỉ hỗ trợ ảnh");
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
});
