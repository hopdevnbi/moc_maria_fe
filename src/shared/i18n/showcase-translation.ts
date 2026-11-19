import { catalogUuid } from "./catalog-translation";
import { normalizeLocale, type Locale } from "./locale";
export interface ShowcaseText {
  headline: string;
  biography: string;
  scheduleNote: string;
}
export interface ShowcaseTranslation {
  providerId: string;
  requestedLocale: Locale;
  locale: Locale;
  translation: ShowcaseText | null;
}
export function showcaseTranslationPath(id: unknown, locale: unknown): string | null {
  const normalized = normalizeLocale(locale);
  return typeof id === "string" && catalogUuid.test(id) && normalized
    ? "/provider-showcase-translations/" + id + "/" + normalized
    : null;
}
export function validShowcaseTranslation(
  data: unknown,
  id: string,
  locale: Locale,
): data is ShowcaseTranslation {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<ShowcaseTranslation>;
  if (d.providerId !== id || d.requestedLocale !== locale) return false;
  if (d.locale === "vi") return d.translation === null;
  return (
    d.locale === locale &&
    !!d.translation &&
    ["headline", "biography", "scheduleNote"].every(
      (k) => typeof d.translation?.[k as keyof ShowcaseText] === "string",
    )
  );
}
