import { LoadingState } from "@/shared/loading/loading-state";

export default function Loading() {
  return (
    <div className="moc-loading-page">
      <LoadingState shape="cards" />
    </div>
  );
}
