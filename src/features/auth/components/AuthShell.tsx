import Link from "next/link";
import type { ReactNode } from "react";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-screen px-6 py-10 sm:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2.25rem] border border-[var(--moc-border)] bg-white/80 shadow-xl shadow-emerald-950/5 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="bg-[var(--moc-green)] p-8 text-white sm:p-10">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            Mộc Maria
          </Link>
          <p className="mt-16 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-5 leading-7 text-emerald-50/90">{description}</p>
        </aside>
        <section className="p-8 sm:p-10">
          {children}
          <div className="mt-8 border-t border-[var(--moc-border)] pt-6 text-sm text-[var(--moc-muted)]">
            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}
