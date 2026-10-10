import services from "./demo-services.json";
import { findNamedProfile } from "./provider-slugs";
export function publicProviderParam(id: string): string {
  return findNamedProfile(id)?.urlSlug || id;
}
export function internalProviderParam(id?: string): string | undefined {
  return id ? findNamedProfile(id)?.id || id : undefined;
}
export function publicServiceSlug(slug: string): string {
  return services.some((s) => s.service.slug === slug) ? slug.replace(/-demo$/, "") : slug;
}
export function publicServiceParam(id: string): string {
  const s = services.find(
    (s) => s.service.id === id || s.service.slug === id || publicServiceSlug(s.service.slug) === id,
  );
  return s ? publicServiceSlug(s.service.slug) : id;
}
export function internalServiceParam(id?: string): string | undefined {
  if (!id) return undefined;
  const s = services.find(
    (s) => s.service.id === id || s.service.slug === id || publicServiceSlug(s.service.slug) === id,
  );
  return s?.service.id || id;
}
export function publicVariantParam(id: string): string {
  for (const s of services) {
    const v = s.variants.find((v) => v.id === id);
    if (v) return publicServiceSlug(s.service.slug) + "-" + v.durationMinutes;
  }
  return id;
}
export function internalVariantParam(id?: string): string | undefined {
  if (!id) return undefined;
  for (const s of services) {
    const v = s.variants.find(
      (v) => publicServiceSlug(s.service.slug) + "-" + v.durationMinutes === id,
    );
    if (v) return v.id;
  }
  return id;
}
export function cleanPublicQuery(
  query: Record<string, string | string[] | undefined>,
): string | null {
  const out = new URLSearchParams();
  let changed = false;
  for (const [key, raw] of Object.entries(query)) {
    if (raw === undefined) continue;
    for (const value of Array.isArray(raw) ? raw : [raw]) {
      const clean =
        key === "provider"
          ? publicProviderParam(value)
          : key === "service"
            ? publicServiceParam(value)
            : key === "variant"
              ? publicVariantParam(value)
              : value;
      changed ||= clean !== value;
      out.append(key, clean);
    }
  }
  return changed ? out.toString() : null;
}
