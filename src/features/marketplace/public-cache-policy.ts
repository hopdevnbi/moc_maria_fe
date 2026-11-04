const stablePaths = new Set([
  "/services",
  "/service-categories",
  "/branches",
  "/provider-display",
  "/provider-presentation",
  "/provider-presentation/profiles",
]);

// Availability, approvals, slots, tip/bank data and authenticated reads stay live.
export function isPublicCachePath(path: string): boolean {
  return (
    stablePaths.has(path) ||
    /^\/services\/[a-z0-9][a-z0-9-]{0,119}$/.test(path) ||
    /^\/provider-showcase\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      path,
    )
  );
}
