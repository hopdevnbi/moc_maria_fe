import { publicProviderParam, publicServiceParam, publicVariantParam } from "./public-route-ids";
export function bookingHref(params: { provider?: string; service?: string; variant?: string }) {
  const query = new URLSearchParams();
  if (params.provider) query.set("provider", publicProviderParam(params.provider));
  if (params.service) query.set("service", publicServiceParam(params.service));
  if (params.variant) query.set("variant", publicVariantParam(params.variant));
  const suffix = query.toString();
  return "/dat-lich" + (suffix ? "?" + suffix : "");
}

export function chatHref(provider: string, service?: string) {
  const query = new URLSearchParams({ provider: publicProviderParam(provider) });
  if (service) query.set("service", publicServiceParam(service));
  return "/tin-nhan?" + query.toString();
}
