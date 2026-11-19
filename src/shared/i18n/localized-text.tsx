"use client";
import { useLocale } from "./locale-provider";
import type { MessageKey } from "./messages";
import { menuName } from "./menu-names";

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
