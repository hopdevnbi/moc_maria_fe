export function bookingHref(params: { provider?: string; service?: string; variant?: string }) {
  const query = new URLSearchParams();
  if (params.provider) query.set("provider", params.provider);
  if (params.service) query.set("service", params.service);
  if (params.variant) query.set("variant", params.variant);
  const suffix = query.toString();
  return "/dat-lich" + (suffix ? "?" + suffix : "");
}

export function chatHref(provider: string, service?: string) {
  const query = new URLSearchParams({ provider });
  if (service) query.set("service", service);
  return "/tin-nhan?" + query.toString();
}
