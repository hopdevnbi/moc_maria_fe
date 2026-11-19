import { PublicPageLoading } from "@/shared/loading/public-page-loading";

export default function Loading() {
  return (
    <PublicPageLoading
      page="services"
      titleKey="loading.service"
      descriptionKey="loading.serviceDesc"
    />
  );
}
