const KEY = "mocmaria.customer-checkin.device.v1";

/**
 * Random identifier scoped to this browser installation. Not hardware identity:
 * removing site data or switching browsers changes it. Enforcement is server-side.
 */
export function customerCheckInDeviceId(
  storage: Pick<Storage, "getItem" | "setItem">,
  randomId: () => string,
): string {
  const stored = storage.getItem(KEY);
  if (
    stored &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(stored)
  )
    return stored;
  const created = randomId();
  storage.setItem(KEY, created);
  return created;
}
