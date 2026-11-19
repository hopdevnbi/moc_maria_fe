import { normalizeLocale, type Locale } from "./locale";
export type CatalogKind = "category" | "service" | "variant";
export interface CatalogTranslation {
  entityId: string;
  kind: CatalogKind;
  requestedLocale: Locale;
  locale: Locale;
  name: string;
  description: string | null;
}
export const catalogUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function catalogTranslationPath(kind: unknown, id: unknown, locale: unknown): string | null {
  const normalized = normalizeLocale(locale);
  if (
    !["category", "service", "variant"].includes(String(kind)) ||
    typeof id !== "string" ||
    !catalogUuid.test(id) ||
    !normalized
  )
    return null;
  return "/catalog-translations/" + kind + "/" + id + "/" + normalized;
}
export function validTranslation(
  data: unknown,
  kind: CatalogKind,
  id: string,
  locale: Locale,
): data is CatalogTranslation {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<CatalogTranslation>;
  return (
    d.entityId === id &&
    d.kind === kind &&
    d.requestedLocale === locale &&
    (d.locale === "vi" || d.locale === locale) &&
    typeof d.name === "string" &&
    (d.description === null || typeof d.description === "string")
  );
}
