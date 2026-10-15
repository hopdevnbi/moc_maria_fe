import { MobileHeader, MobileNavigation } from "@/features/mobile/experience";
import { LoadingState } from "./loading-state";

export function PublicPageLoading({
  title,
  description,
  page = "home",
}: {
  title?: string;
  description?: string;
  page?: "home" | "services" | "providers" | "chat" | "booking";
}) {
  return (
    <div className="mobile-experience">
      <MobileHeader />
      <main className="moc-loading-page" id="main">
        <LoadingState
          title={title}
          description={description}
          shape={page === "chat" ? "messages" : page === "booking" ? "form" : "cards"}
        />
      </main>
      <MobileNavigation active={page} />
    </div>
  );
}
