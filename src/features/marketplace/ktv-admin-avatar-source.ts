import demoProfiles from "@/features/mobile/demo-ktvs.json";
import type { Application } from "./types";

/** Illustrative marketing photos are fallback only for the owner's ten seeded preview records. */
export function resolveAdminKtvAvatar(application: Application): {
  src: string | null;
  illustrative: boolean;
} {
  if (application.avatarUrl?.trim()) {
    return { src: application.avatarUrl, illustrative: false };
  }
  const preview = demoProfiles.find(
    (demo) =>
      demo.publicName === application.publicName &&
      demo.serviceArea === application.serviceArea &&
      application.status === "APPLIED",
  );
  return preview?.avatarUrl
    ? { src: preview.avatarUrl, illustrative: true }
    : { src: null, illustrative: false };
}
