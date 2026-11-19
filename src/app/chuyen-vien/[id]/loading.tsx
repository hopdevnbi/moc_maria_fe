import { PublicPageLoading } from "@/shared/loading/public-page-loading";

export default function Loading() {
  return (
    <PublicPageLoading
      page="providers"
      titleKey="loading.profile"
      descriptionKey="loading.profileDesc"
    />
  );
}
