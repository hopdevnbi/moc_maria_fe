import type { KtvShowcase } from "./ktv-showcase-types";

/**
 * Owner supplied photo/video for Thanh Thanh's introduction-only profile.
 * When the KTV has a real account, the regular CDN-backed showcase editor owns
 * all media and must remain able to remove/reorder the media independently.
 */
const thanhThanhMedia: KtvShowcase = {
  version: 0,
  headline: "Kỹ thuật viên giải cơ sâu",
  biography:
    "Lực tay khỏe, kỹ năng giải cơ sâu tốt. Nhiệt tình, hiền hòa và tận tâm trong chăm sóc khách hàng. Sinh năm 1999.",
  scheduleNote: "",
  weeklyHours: [],
  media: [
    {
      id: "thanh-thanh-image-20261108",
      kind: "IMAGE",
      url: "/media/ktv/thanh-thanh-gallery-20261108.webp",
      caption: "Không gian chăm sóc tại Mộc Maria",
    },
    {
      id: "thanh-thanh-video-20261108",
      kind: "VIDEO",
      url: "/media/ktv/thanh-thanh-intro-20261108.mp4",
      caption: "Video giới thiệu hoạt động chăm sóc tại Mộc Maria",
    },
  ],
  updatedAt: null,
};

export function ownerProvidedKtvShowcase(alias: string): KtvShowcase | null {
  return alias === "ktv-thanh-thanh" ? thanhThanhMedia : null;
}
