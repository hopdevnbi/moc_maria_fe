"use client";
import { useLocale } from "./locale-provider";
import type { MessageKey } from "./messages";
import { menuName } from "./menu-names";
import { useCatalogTranslation } from "./use-catalog-translation";
import type { CatalogKind } from "./catalog-translation";

export function LocalizedText({
  message,
  values,
}: {
  message: MessageKey;
  values?: Record<string, string | number>;
}) {
  const { locale, t } = useLocale();
  return <span lang={locale}>{t(message, values)}</span>;
}
export function LocalizedMenuName({ name }: { name: string }) {
  const { locale } = useLocale();
  const translated = menuName(locale, name);
  return <span lang={translated === name ? "vi" : locale}>{translated}</span>;
}
export function LocalizedCatalogName({
  name,
  id,
  kind = "service",
}: {
  name: string;
  id?: string;
  kind?: CatalogKind;
}) {
  const { locale } = useLocale();
  const data = useCatalogTranslation(kind, id);
  const translated = data?.name ?? menuName(locale, name);
  return <span lang={translated === name ? "vi" : locale}>{translated}</span>;
}
export function LocalizedCatalogDescription({
  description,
  id,
}: {
  description: string | null;
  id: string;
}) {
  const { locale, t } = useLocale();
  const data = useCatalogTranslation("service", id);
  const value = data?.description ?? description;
  return value ? (
    <span lang={value === description ? "vi" : locale}>{value}</span>
  ) : (
    <span lang={locale}>{t("detail.updating")}</span>
  );
}
