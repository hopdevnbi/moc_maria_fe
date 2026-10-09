"use client";
import { useState, type FormEvent } from "react";
import { mutationMessage, usePrivateMutation } from "./private-api";
export interface AdminField {
  name: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "time"
    | "datetime-local"
    | "checkbox"
    | "textarea"
    | "select";
  required?: boolean;
  value?: string | number | boolean | null;
  min?: number;
  max?: number;
  maxLength?: number;
  pattern?: string;
  options?: Array<{ value: string; label: string }>;
  help?: string;
}
export function AdminForm({
  title,
  path,
  method = "POST",
  fields,
  transform,
  label = "Lưu thông tin",
}: {
  title?: string;
  path: string;
  method?: string;
  fields: AdminField[];
  transform?: (body: Record<string, unknown>) => unknown;
  label?: string;
}) {
  const mutation = usePrivateMutation();
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const body: Record<string, unknown> = {};
    for (const field of fields) {
      const value = data.get(field.name);
      if (field.type === "checkbox") body[field.name] = value === "on";
      else if (field.type === "number") {
        if (value !== "" && value !== null) body[field.name] = Number(value);
      } else if (typeof value === "string" && value.trim()) body[field.name] = value.trim();
    }
    try {
      await mutation.mutateAsync({ path, method, body: transform ? transform(body) : body });
      setNotice("Đã lưu thông tin.");
      if (method === "POST") form.reset();
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  return (
    <form className="market-form" onSubmit={submit}>
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      {fields.map((field) => (
        <label key={field.name} className={field.type === "checkbox" ? "market-check" : undefined}>
          {field.type !== "checkbox" && field.label}
          {field.type === "select" ? (
            <select
              name={field.name}
              defaultValue={String(field.value ?? "")}
              required={field.required}
            >
              <option value="">Chọn...</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : field.type === "textarea" ? (
            <textarea
              name={field.name}
              defaultValue={String(field.value ?? "")}
              required={field.required}
              maxLength={field.maxLength}
            />
          ) : field.type === "checkbox" ? (
            <input
              name={field.name}
              type="checkbox"
              defaultChecked={!!field.value}
              required={field.required}
            />
          ) : (
            <input
              name={field.name}
              type={field.type || "text"}
              defaultValue={String(field.value ?? "")}
              required={field.required}
              min={field.min}
              max={field.max}
              maxLength={field.maxLength}
              pattern={field.pattern}
            />
          )}
          {field.type === "checkbox" && field.label}
          {field.help && <small>{field.help}</small>}
        </label>
      ))}
      {notice && (
        <p className="market-notice" role="status">
          {notice}
        </p>
      )}
      <button className="market-button" disabled={mutation.isPending}>
        {mutation.isPending ? "Đang lưu..." : label}
      </button>
    </form>
  );
}
