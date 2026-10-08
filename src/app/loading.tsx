export default function Loading() {
  return (
    <main className="min-h-screen px-6 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-9 w-52 rounded-full bg-[var(--moc-green-soft)]" />
        <div className="mt-8 h-16 max-w-4xl rounded-3xl bg-white/80" />
        <div className="mt-4 h-16 max-w-3xl rounded-3xl bg-white/80" />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-52 rounded-[1.75rem] border border-[var(--moc-border)] bg-white/70"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
