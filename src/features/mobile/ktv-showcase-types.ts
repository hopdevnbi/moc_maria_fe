/** Public presentation only. It never changes official eligibility, prices or booking slots. */
export interface KtvShowcaseMedia {
  id: string;
  kind: "IMAGE" | "VIDEO";
  url: string;
  caption?: string;
}

export interface KtvShowcaseHours {
  weekday: number;
  startsAt: string;
  endsAt: string;
}

export interface KtvShowcase {
  version: number;
  headline: string;
  biography: string;
  scheduleNote: string;
  weeklyHours: KtvShowcaseHours[];
  media: KtvShowcaseMedia[];
  updatedAt: string | null;
}

export const EMPTY_KTV_SHOWCASE: KtvShowcase = {
  version: 0,
  headline: "",
  biography: "",
  scheduleNote: "",
  weeklyHours: [],
  media: [],
  updatedAt: null,
};

export const KTV_WEEKDAYS = [
  "Chủ nhật",
  "Thứ hai",
  "Thứ ba",
  "Thứ tư",
  "Thứ năm",
  "Thứ sáu",
  "Thứ bảy",
] as const;
