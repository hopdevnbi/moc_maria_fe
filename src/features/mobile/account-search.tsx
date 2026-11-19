"use client";
import { providerProfileHref } from "./provider-slugs";
import { publicServiceSlug } from "./public-route-ids";

import Link from "next/link";
import { useLocale } from "@/shared/i18n/locale-provider";
import { menuName } from "@/shared/i18n/menu-names";
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
  const { t, locale } = useLocale();
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
      .filter((p) =>
        normalize(
          [
            p.publicName,
            p.serviceArea,
            ...p.services.flatMap((s) => [s, menuName(locale, s)]),
          ].join(" "),
        ).includes(q),
      )
      .slice(0, 4) || [];
  const services =
    data?.services
      .filter((s) => normalize(s.name + " " + menuName(locale, s.name)).includes(q))
      .slice(0, 4) || [];
  return (
    <section className="mm-account-profile">
      <h2>{t("cp.searchTitle")}</h2>
      <label className="mm-searchbar">
        <Search size={18} />
        <input
          aria-label={t("cp.searchLabel")}
          placeholder={t("cp.searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {q && (
        <div className="mm-quick-results">
          {!data && !failed ? (
            <p>{t("cp.suggestions")}</p>
          ) : !providers.length && !services.length ? (
            <p>{t("cp.noResults")}</p>
          ) : (
            <>
              {providers.map((p) => (
                <Link key={p.id} href={providerProfileHref(p)}>
                  <strong>{p.publicName}</strong>
                  <small>
                    {t("home.role")} · {p.serviceArea || "Hà Nội"}
                  </small>
                </Link>
              ))}
              {services.map((s) => (
                <Link key={s.id} href={"/dich-vu/" + publicServiceSlug(s.slug)}>
                  <strong>{menuName(locale, s.name)}</strong>
                  <small>{t("cp.viewService")}</small>
                </Link>
              ))}
            </>
          )}
        </div>
      )}
      {failed && (
        <p>
          {t("cp.searchError")} <Link href="/chuyen-vien">{t("cp.viewKtv")}</Link> ·{" "}
          <Link href="/dich-vu">{t("cp.viewServices")}</Link>.
        </p>
      )}
    </section>
  );
}
