import { MobileHeader, MobileNavigation } from "@/features/mobile/experience";
import { LoadingState } from "./loading-state";
import type { LoadingKey } from "@/shared/i18n/loading-messages";

export function PublicPageLoading({
  titleKey,
  descriptionKey,
  page = "home",
}: {
  titleKey?: LoadingKey;
  descriptionKey?: LoadingKey;
  page?: "home" | "services" | "providers" | "chat" | "booking";
}) {
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="moc-loading-page" id="main">
        <LoadingState
          titleKey={titleKey}
          descriptionKey={descriptionKey}
          shape={page === "chat" ? "messages" : page === "booking" ? "form" : "cards"}
        />
      </main>
      <MobileNavigation active={page} />
    </div>
  );
}
