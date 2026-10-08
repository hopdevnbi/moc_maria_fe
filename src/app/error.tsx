"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[moc-maria-web] route error", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <section className="w-full max-w-xl rounded-[2rem] border border-[var(--moc-border)] bg-white/80 p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <AlertTriangle size={28} />
        </div>
        <h1 className="text-2xl font-semibold text-[var(--moc-green-deep)]">
          Mộc Maria đang cần một chút thời gian
        </h1>
        <p className="mt-3 leading-7 text-[var(--moc-muted)]">
          Trang này chưa thể tải hoàn chỉnh. Anh/chị có thể thử lại ngay.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--moc-green)] px-5 py-3 font-semibold text-white"
        >
          <RotateCcw size={18} />
          Thử lại
        </button>
      </section>
    </main>
  );
}
