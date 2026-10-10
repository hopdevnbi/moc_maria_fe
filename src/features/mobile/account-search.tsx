"use client";
import { providerProfileHref } from "./provider-slugs";
import { publicServiceSlug } from "./public-route-ids";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
type Directory = {
  providers: Array<{
    id: string;
    publicName: string;
    serviceArea: string | null;
    services: string[];
  }>;
  services: Array<{ id: string; name: string; slug: string }>;
};
const normalize = (s: string) =>
  s
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
export function AccountSearch() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Directory | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/mobile/directory", { signal: c.signal })
      .then(async (r) => {
        if (!r.ok) throw Error();
        setData(await r.json());
      })
      .catch(() => {
        if (!c.signal.aborted) setFailed(true);
      });
    return () => c.abort();
  }, []);
  const q = normalize(query.trim());
  const providers =
    data?.providers
      .filter((p) => normalize([p.publicName, p.serviceArea, ...p.services].join(" ")).includes(q))
      .slice(0, 4) || [];
  const services = data?.services.filter((s) => normalize(s.name).includes(q)).slice(0, 4) || [];
  return (
    <section className="mm-account-profile">
      <h2>Tìm nhanh KTV & dịch vụ</h2>
      <label className="mm-searchbar">
        <Search size={18} />
        <input
          aria-label="Tìm nhanh KTV và dịch vụ"
          placeholder="Tên KTV, massage cổ vai gáy, khu vực..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {q && (
        <div className="mm-quick-results">
          {!data && !failed ? (
            <p>Đang tải gợi ý...</p>
          ) : !providers.length && !services.length ? (
            <p>Chưa có kết quả. Thử tên KTV hoặc tên dịch vụ khác.</p>
          ) : (
            <>
              {providers.map((p) => (
                <Link key={p.id} href={providerProfileHref(p)}>
                  <strong>{p.publicName}</strong>
                  <small>Kỹ thuật viên · {p.serviceArea || "Hà Nội"}</small>
                </Link>
              ))}
              {services.map((s) => (
                <Link key={s.id} href={"/dich-vu/" + publicServiceSlug(s.slug)}>
                  <strong>{s.name}</strong>
                  <small>Xem dịch vụ & lựa chọn KTV</small>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
      {failed && (
        <p>
          Chưa tải được gợi ý. <Link href="/chuyen-vien">Xem danh sách KTV</Link> hoặc{" "}
          <Link href="/dich-vu">dịch vụ</Link>.
        </p>
      )}
    </section>
  );
}
