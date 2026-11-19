"use client";
import { useState, type FormEvent } from "react";
import { Languages, Save, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ApiError } from "@/features/auth/auth-api";
import { usePrivateData, usePrivateMutation } from "./private-api";
import { useLocale } from "@/shared/i18n/locale-provider";
import { LOCALES, type Locale } from "@/shared/i18n/locale";
import type { Category, Service, Variant } from "./types";
import { ProfileTranslationLoader } from "./profile-translation-admin";
import "./catalog-translation-admin.css";

type Kind = "category" | "service" | "variant" | "profile";
type TargetLocale = Exclude<Locale, "vi">;
type Translation = {
  entityId: string;
  kind: Kind;
  locale: TargetLocale;
  source: { name: string; description: string | null };
  sourceFingerprint: string;
  version: number;
  translation: {
    name: string;
    description: string | null;
    status: "DRAFT" | "PUBLISHED";
    updatedAt: string;
    stale: boolean;
  } | null;
};
const targets: Record<TargetLocale, string> = {
  en: "🇬🇧 English",
  ko: "🇰🇷 한국어",
  ja: "🇯🇵 日本語",
  "zh-CN": "🇨🇳 简体中文",
  ru: "🇷🇺 Русский",
};
export function CatalogTranslationAdmin() {
  const { user } = useAuth();
  const { t } = useLocale();
  if (!user?.roles.includes("SUPER_ADMIN")) return <p role="alert">{t("editor.onlyAdmin")}</p>;
  return <TranslationWorkspace />;
}
function TranslationWorkspace() {
  const { t, locale } = useLocale();
  const categories = usePrivateData<Category[]>("/admin/service-categories");
  const services = usePrivateData<Service[]>("/admin/services");
  const [kind, setKind] = useState<Kind>("service");
  const [parent, setParent] = useState("");
  const [id, setId] = useState("");
  const [target, setTarget] = useState<TargetLocale>("en");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const providers = usePrivateData<{
    rows: { id: string; publicName: string; accountActive: boolean }[];
  }>("/admin/provider-display", kind === "profile");
  const variants = usePrivateData<Variant[]>(
    "/admin/services/" + encodeURIComponent(parent) + "/variants",
    kind === "variant" && !!parent,
  );
  const items =
    kind === "profile"
      ? providers.data?.rows
          ?.filter((p) => p.accountActive)
          .map((p) => ({ id: p.id, name: p.publicName }))
      : kind === "category"
        ? categories.data
        : kind === "service"
          ? services.data
          : variants.data;
  const choose = (action: () => void) => {
    if (dirty && !window.confirm(t("editor.unsaved"))) return;
    setDirty(false);
    action();
  };
  const entity = items?.find((x) => x.id === id);
  const query = [
    categories,
    services,
    ...(kind === "variant" && parent ? [variants] : []),
    ...(kind === "profile" ? [providers] : []),
  ];
  return (
    <div className="moc-translation-admin" lang={locale}>
      <section className="moc-translation-intro">
        <Languages aria-hidden="true" size={28} />
        <div>
          <h2>{t("editor.title")}</h2>
          <p>{t("editor.intro")}</p>
        </div>
      </section>
      <section className="moc-translation-select">
        <label>
          {t("editor.kind")}
          <select
            disabled={saving}
            value={kind}
            onChange={(e) =>
              choose(() => {
                setKind(e.target.value as Kind);
                setParent("");
                setId("");
              })
            }
          >
            <option value="category">{t("editor.category")}</option>
            <option value="service">{t("editor.service")}</option>
            <option value="variant">{t("editor.variant")}</option>
            <option value="profile">{t("editor.provider")}</option>
          </select>
        </label>
        {kind === "variant" && (
          <label>
            {t("editor.parent")}
            <select
              disabled={saving}
              value={parent}
              onChange={(e) =>
                choose(() => {
                  setParent(e.target.value);
                  setId("");
                })
              }
            >
              <option value="">{t("editor.select")}</option>
              {services.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {t("editor.select")}
          <select
            value={id}
            disabled={saving || !items?.length}
            onChange={(e) => choose(() => setId(e.target.value))}
          >
            <option value="">{t("editor.select")}</option>
            {items?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("editor.language")}
          <select
            disabled={saving}
            value={target}
            onChange={(e) => choose(() => setTarget(e.target.value as TargetLocale))}
          >
            {LOCALES.filter((l): l is TargetLocale => l !== "vi").map((l) => (
              <option key={l} value={l}>
                {targets[l]}
              </option>
            ))}
          </select>
        </label>
      </section>
      {query.some((q) => q.isError) && (
        <p role="alert">
          {t("editor.error")}{" "}
          <button type="button" onClick={() => query.forEach((q) => void q.refetch())}>
            {t("common.retry")}
          </button>
        </p>
      )}
      {query.some((q) => q.isFetching) && <p role="status">{t("common.loading")}</p>}
      {entity && kind === "profile" && (
        <ProfileTranslationLoader
          key={id + ":" + target}
          id={id}
          target={target}
          onDirty={setDirty}
          onSaving={setSaving}
        />
      )}
      {entity && kind !== "profile" && (
        <TranslationLoader
          key={kind + ":" + id + ":" + target}
          kind={kind}
          id={id}
          target={target}
          onDirty={setDirty}
          onSaving={setSaving}
        />
      )}
    </div>
  );
}
function TranslationLoader({
  kind,
  id,
  target,
  onDirty,
  onSaving,
}: {
  kind: Exclude<Kind, "profile">;
  id: string;
  target: TargetLocale;
  onDirty: (dirty: boolean) => void;
  onSaving: (saving: boolean) => void;
}) {
  const { t } = useLocale();
  const path = "/admin/catalog-translations/" + kind + "/" + encodeURIComponent(id) + "/" + target;
  const record = usePrivateData<Translation>(path);
  const [revision, setRevision] = useState(0);
  if (record.isPending) return <p role="status">{t("common.loading")}</p>;
  if (record.isError && !record.data)
    return (
      <p role="alert">
        {t("editor.error")}{" "}
        <button type="button" onClick={() => void record.refetch()}>
          {t("common.retry")}
        </button>
      </p>
    );
  if (!record.data) return null;
  return (
    <TranslationForm
      key={revision}
      initial={record.data}
      path={path}
      onDirty={onDirty}
      onSaving={onSaving}
      reload={async () => {
        const result = await record.refetch();
        if (result.isSuccess) {
          onDirty(false);
          setRevision((n) => n + 1);
        }
      }}
    />
  );
}
function TranslationForm({
  initial,
  path,
  onDirty,
  onSaving,
  reload,
}: {
  initial: Translation;
  path: string;
  onDirty: (dirty: boolean) => void;
  onSaving: (saving: boolean) => void;
  reload: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [baseline, setBaseline] = useState(initial);
  const [name, setName] = useState(initial.translation?.name ?? "");
  const [description, setDescription] = useState(initial.translation?.description ?? "");
  const [notice, setNotice] = useState<"saved" | "conflict" | "error" | null>(null);
  const mutation = usePrivateMutation<{ version: number; status: "DRAFT" | "PUBLISHED" }>();
  const hasDescription = initial.kind !== "variant";
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending || !name.trim()) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    setNotice(null);
    onSaving(true);
    try {
      const result = await mutation.mutateAsync({
        path,
        method: "PUT",
        body: {
          name: name.trim(),
          description: hasDescription ? description.trim() || null : null,
          status,
          expectedVersion: baseline.version,
          sourceFingerprint: baseline.sourceFingerprint,
        },
      });
      setBaseline({
        ...baseline,
        version: result.version,
        translation: {
          name: name.trim(),
          description: hasDescription ? description.trim() || null : null,
          status: result.status,
          updatedAt: new Date().toISOString(),
          stale: false,
        },
      });
      onDirty(false);
      setNotice("saved");
    } catch (error) {
      setNotice(error instanceof ApiError && error.status === 409 ? "conflict" : "error");
    } finally {
      onSaving(false);
    }
  };
  return (
    <form className="moc-translation-form" onSubmit={save}>
      <div className="moc-translation-status">
        <span>
          {baseline.translation
            ? t(
                baseline.translation.status === "PUBLISHED"
                  ? "editor.published"
                  : "editor.draftStatus",
              )
            : t("editor.empty")}
        </span>
        <small>{t("editor.version", { n: baseline.version })}</small>
      </div>
      {baseline.translation?.stale && (
        <p className="moc-translation-warning" role="status">
          {t("editor.stale")}
        </p>
      )}
      <div className="moc-translation-columns">
        <section>
          <h3>{t("editor.source")}</h3>
          <label>
            {t("editor.name")}
            <input lang="vi" readOnly value={baseline.source.name} />
          </label>
          {hasDescription && (
            <label>
              {t("editor.description")}
              <textarea lang="vi" readOnly rows={8} value={baseline.source.description ?? ""} />
            </label>
          )}
        </section>
        <section>
          <h3>
            {t("editor.target")} · {targets[initial.locale]}
          </h3>
          <label>
            {t("editor.name")}
            <input
              required
              maxLength={160}
              lang={initial.locale}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                onDirty(true);
              }}
              disabled={mutation.isPending}
            />
          </label>
          {hasDescription && (
            <label>
              {t("editor.description")}
              <textarea
                rows={8}
                maxLength={12000}
                lang={initial.locale}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  onDirty(true);
                }}
                disabled={mutation.isPending}
              />
            </label>
          )}
        </section>
      </div>
      <p className="moc-translation-review">{t("editor.review")}</p>
      <div className="moc-translation-actions">
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => {
            if (window.confirm(t("editor.unsaved"))) void reload();
          }}
        >
          {t("editor.reload")}
        </button>
        <button type="submit" value="DRAFT" disabled={mutation.isPending || !name.trim()}>
          <Save size={16} />
          {t("editor.draft")}
        </button>
        <button
          type="submit"
          value="PUBLISHED"
          className="moc-translation-publish"
          disabled={mutation.isPending || !name.trim()}
        >
          <CheckCircle2 size={16} />
          {t("editor.publish")}
        </button>
      </div>
      {notice && (
        <p role={notice === "saved" ? "status" : "alert"}>
          {t(
            notice === "saved"
              ? "editor.saved"
              : notice === "conflict"
                ? "editor.conflict"
                : "editor.error",
          )}
        </p>
      )}
    </form>
  );
}
