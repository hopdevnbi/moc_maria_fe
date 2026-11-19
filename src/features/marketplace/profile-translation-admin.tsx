"use client";
import { useState, type FormEvent } from "react";
import { useLocale } from "@/shared/i18n/locale-provider";
import type { Locale } from "@/shared/i18n/locale";
import type { ShowcaseText } from "@/shared/i18n/showcase-translation";
import { ApiError } from "@/features/auth/auth-api";
import { usePrivateData, usePrivateMutation } from "./private-api";
type Target = Exclude<Locale, "vi">;
type RecordData = {
  source: ShowcaseText;
  sourceFingerprint: string;
  version: number;
  translation: (ShowcaseText & { status: "DRAFT" | "PUBLISHED"; stale: boolean }) | null;
};
type Props = {
  id: string;
  target: Target;
  onDirty: (v: boolean) => void;
  onSaving: (v: boolean) => void;
};
const fields = [
  ["headline", "editor.headline", 240, 2],
  ["biography", "editor.biography", 4000, 8],
  ["scheduleNote", "editor.scheduleNote", 600, 3],
] as const;
export function ProfileTranslationLoader({ id, target, onDirty, onSaving }: Props) {
  const { t } = useLocale();
  const path = "/admin/provider-showcase-translations/" + encodeURIComponent(id) + "/" + target;
  const query = usePrivateData<RecordData>(path);
  const [revision, setRevision] = useState(0);
  if (query.isPending) return <p role="status">{t("common.loading")}</p>;
  if (!query.data)
    return (
      <p role="alert">
        {t("editor.error")}{" "}
        <button type="button" onClick={() => void query.refetch()}>
          {t("common.retry")}
        </button>
      </p>
    );
  return (
    <ProfileForm
      key={revision}
      initial={query.data}
      path={path}
      target={target}
      onDirty={onDirty}
      onSaving={onSaving}
      reload={async () => {
        const result = await query.refetch();
        if (result.isSuccess) {
          onDirty(false);
          setRevision((n) => n + 1);
        }
      }}
    />
  );
}
function ProfileForm({
  initial,
  path,
  target,
  onDirty,
  onSaving,
  reload,
}: Omit<Props, "id"> & { initial: RecordData; path: string; reload: () => Promise<void> }) {
  const { t } = useLocale();
  const [baseline, setBaseline] = useState(initial);
  const [values, setValues] = useState<ShowcaseText>({
    headline: initial.translation?.headline ?? "",
    biography: initial.translation?.biography ?? "",
    scheduleNote: initial.translation?.scheduleNote ?? "",
  });
  const [notice, setNotice] = useState<"saved" | "conflict" | "error" | null>(null);
  const mutation = usePrivateMutation<{ version: number; status: "DRAFT" | "PUBLISHED" }>();
  const available = fields.some(([key]) => baseline.source[key].trim());
  const canSave =
    available &&
    fields.some(([key]) => baseline.source[key].trim() && values[key].trim()) &&
    !mutation.isPending;
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSave) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const status = submitter?.value === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    const payload = Object.fromEntries(
      fields.map(([key]) => [key, baseline.source[key].trim() ? values[key].trim() : ""]),
    ) as unknown as ShowcaseText;
    setNotice(null);
    onSaving(true);
    try {
      const result = await mutation.mutateAsync({
        path,
        method: "PUT",
        body: {
          ...payload,
          status,
          sourceFingerprint: baseline.sourceFingerprint,
          expectedVersion: baseline.version,
        },
      });
      setBaseline({
        ...baseline,
        version: result.version,
        translation: { ...payload, status: result.status, stale: false },
      });
      setValues(payload);
      onDirty(false);
      setNotice("saved");
    } catch (error) {
      setNotice(error instanceof ApiError && error.status === 409 ? "conflict" : "error");
    } finally {
      onSaving(false);
    }
  }
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
      {!available && <p role="status">{t("editor.noSource")}</p>}
      {baseline.translation?.stale && (
        <p className="moc-translation-warning">{t("editor.stale")}</p>
      )}
      <div className="moc-translation-columns">
        <section>
          <h3>{t("editor.source")}</h3>
          {fields.map(([key, label, , rows]) => (
            <label key={key}>
              {t(label)}
              <textarea rows={rows} lang="vi" readOnly value={baseline.source[key]} />
            </label>
          ))}
        </section>
        <section>
          <h3>
            {t("editor.target")} · {target}
          </h3>
          {fields.map(([key, label, max, rows]) => (
            <label key={key}>
              {t(label)}
              <textarea
                rows={rows}
                maxLength={max}
                lang={target}
                disabled={!baseline.source[key].trim() || mutation.isPending}
                value={values[key]}
                onChange={(e) => {
                  setValues((v) => ({ ...v, [key]: e.target.value }));
                  onDirty(true);
                }}
              />
            </label>
          ))}
        </section>
      </div>
      <p>{t("editor.review")}</p>
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
        <button type="submit" value="DRAFT" disabled={!canSave}>
          {t("editor.draft")}
        </button>
        <button
          type="submit"
          value="PUBLISHED"
          className="moc-translation-publish"
          disabled={!canSave}
        >
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
