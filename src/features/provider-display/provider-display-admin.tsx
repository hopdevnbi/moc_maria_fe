"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  LayoutList,
  Pencil,
  RotateCcw,
  Save,
  Search,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { mutationMessage, usePrivateData } from "@/features/marketplace/private-api";
import {
  moveProvider,
  type DisplayRow,
  type DisplaySnapshot,
  type DisplayVisibility,
} from "./display-policy";
import "./provider-display.css";

const path = "/admin/provider-display";
const labels: Record<DisplayVisibility, string> = {
  VISIBLE: "Đang hiển thị",
  HIDDEN: "Tạm ẩn",
  ARCHIVED: "Đã xóa",
};
const normalize = (s: string) =>
  s
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
type OrderDraft = { ids: string[]; allIds: string[]; version: number };
const emptyRows: DisplayRow[] = [];

export function ProviderDisplayAdmin() {
  const { user, authFetch } = useAuth();
  const client = useQueryClient();
  const query = usePrivateData<DisplaySnapshot>(path);
  const [draft, setDraft] = useState<OrderDraft | null>(null);
  const [filter, setFilter] = useState<"ALL" | DisplayVisibility>("VISIBLE");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<DisplayRow | null>(null);
  const [archiving, setArchiving] = useState<DisplayRow | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!editing && !archiving) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        setEditing(null);
        setArchiving(null);
        setError("");
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not(:disabled),input,textarea,select",
        ) ?? [],
      );
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    if (archiving) dialog.current?.querySelector<HTMLElement>(".pd-undo")?.focus();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [editing, archiving, pending]);
  const data = query.data;
  const rows = data?.rows ?? emptyRows;
  const visible = rows.filter((row) => row.visibility === "VISIBLE" && row.publishable);
  const ids = draft?.ids ?? visible.map((row) => row.id);
  const dirty = !!draft && draft.ids.join(",") !== visible.map((row) => row.id).join(",");
  const rendered = useMemo(() => {
    const ranks = new Map(ids.map((id, i) => [id, i]));
    return [...rows]
      .sort((a, b) => (ranks.get(a.id) ?? 99999) - (ranks.get(b.id) ?? 99999))
      .filter(
        (row) =>
          (filter === "ALL" || row.visibility === filter) &&
          normalize(`${row.publicName} ${row.serviceArea || ""}`).includes(normalize(search)),
      );
  }, [rows, ids, filter, search]);

  function move(id: string, position: number) {
    if (!data || pending) return;
    setDraft({
      ids: moveProvider(ids, id, position),
      allIds: draft?.allIds ?? rows.map((row) => row.id),
      version: draft?.version ?? data.version,
    });
    setNotice("");
    setError("");
  }

  async function mutate(url: string, method: string, body: unknown, message: string) {
    setPending(true);
    setError("");
    setNotice("");
    try {
      const snapshot = await authFetch<DisplaySnapshot>(url, {
        method,
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      client.setQueryData(["private", user?.id, path], snapshot);
      setDraft(null);
      setEditing(null);
      setArchiving(null);
      setNotice(message);
    } catch (err) {
      setError(mutationMessage(err));
    } finally {
      setPending(false);
    }
  }

  function changeVisibility(row: DisplayRow, visibility: DisplayVisibility) {
    void mutate(
      `${path}/${row.id}`,
      "PATCH",
      { expectedVersion: data!.version, visibility },
      visibility === "ARCHIVED"
        ? `Đã xóa ${row.publicName} khỏi danh sách hiển thị. Bạn có thể khôi phục bên dưới.`
        : visibility === "HIDDEN"
          ? `Đã tạm ẩn ${row.publicName} trên trang chủ.`
          : `Đã bật hiển thị ${row.publicName}.`,
    );
  }

  function saveInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const text = (key: string) => String(values.get(key) || "").trim();
    const number = (key: string) => (text(key) === "" ? null : Number(text(key)));
    void mutate(
      `${path}/${editing!.id}`,
      "PATCH",
      {
        expectedVersion: data!.version,
        publicName: text("publicName"),
        serviceArea: text("serviceArea"),
        title: text("title"),
        introduction: text("introduction"),
        age: number("age"),
        yearsExperience: number("yearsExperience"),
      },
      "Đã cập nhật thông tin hiển thị của KTV.",
    );
  }

  if (query.isPending)
    return (
      <div className="pd-state" role="status">
        Đang tải danh sách hiển thị...
      </div>
    );
  if (query.isError || !data)
    return (
      <div className="pd-state" role="alert">
        Chưa tải được danh sách hiển thị.{" "}
        <button onClick={() => void query.refetch()}>Thử lại</button>
      </div>
    );

  return (
    <section className="pd-console" aria-labelledby="pd-title">
      <header className="pd-intro">
        <div>
          <span className="pd-eyebrow">SẮP XẾP & NỘI DUNG</span>
          <h2 id="pd-title">KTV trên trang chủ</h2>
          <p>Chọn người xuất hiện đầu tiên. Quản lý thông tin và hiển thị trong cùng một nơi.</p>
        </div>
        <Link href="/" target="_blank" className="pd-link">
          <ExternalLink size={16} /> Xem trang chủ
        </Link>
      </header>
      <div className="pd-stats">
        <div>
          <LayoutList size={19} />
          <span>Tổng hồ sơ</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <Eye size={19} />
          <span>Đang hiển thị</span>
          <strong>{visible.length}</strong>
        </div>
        <div>
          <EyeOff size={19} />
          <span>Tạm ẩn</span>
          <strong>{rows.filter((r) => r.visibility === "HIDDEN").length}</strong>
        </div>
        <div>
          <Trash2 size={19} />
          <span>Có thể khôi phục</span>
          <strong>{rows.filter((r) => r.visibility === "ARCHIVED").length}</strong>
        </div>
      </div>
      {notice && (
        <p className="pd-notice" role="status">
          <Check size={17} />
          {notice}
        </p>
      )}
      {error && (
        <p className="pd-error" role="alert">
          {error}{" "}
          <button
            disabled={pending}
            onClick={() => {
              setDraft(null);
              void query.refetch();
            }}
          >
            Tải lại danh sách
          </button>
        </p>
      )}
      <div className="pd-panel">
        <div className="pd-tools">
          <div className="pd-tabs" aria-label="Trạng thái hiển thị">
            {(["VISIBLE", "HIDDEN", "ARCHIVED", "ALL"] as const).map((value) => (
              <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {value === "ALL" ? "Tất cả" : labels[value]}
              </button>
            ))}
          </div>
          <label className="pd-search">
            <Search size={17} />
            <input
              aria-label="Tìm KTV theo tên hoặc khu vực"
              placeholder="Tìm tên, khu vực..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="pd-list-heading">
          <span>Thứ tự & kỹ thuật viên</span>
          <span>Hiển thị và quản lý</span>
        </div>
        <div className="pd-list">
          {rendered.length === 0 ? (
            <div className="pd-empty">Chưa có KTV phù hợp với bộ lọc này.</div>
          ) : (
            rendered.map((row) => {
              const position = ids.indexOf(row.id) + 1;
              const canMove = row.visibility === "VISIBLE" && row.publishable;
              return (
                <article
                  className={`pd-row${dragged === row.id ? " is-dragging" : ""}`}
                  key={row.id}
                  draggable={canMove && !pending}
                  onDragStart={() => setDragged(row.id)}
                  onDragEnd={() => setDragged(null)}
                  onDragOver={(e) => {
                    if (canMove && dragged) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragged && canMove) move(dragged, position);
                    setDragged(null);
                  }}
                >
                  <div className="pd-person">
                    <span className="pd-grip" title="Kéo để đổi thứ tự">
                      <GripVertical size={17} />
                    </span>
                    <span className={`pd-rank${!canMove ? " is-muted" : ""}`}>
                      {canMove ? position : "–"}
                    </span>
                    <span className="pd-avatar">
                      {row.avatarUrl ? (
                        <Image src={row.avatarUrl} alt="" width={44} height={50} unoptimized />
                      ) : (
                        row.publicName.slice(0, 1)
                      )}
                    </span>
                    <div>
                      <strong>{row.publicName}</strong>
                      <span>{row.serviceArea || "Chưa cập nhật khu vực"}</span>
                      <span className={`pd-status is-${row.visibility.toLowerCase()}`}>
                        {row.visibility === "VISIBLE" && !row.publishable
                          ? "Chưa đủ điều kiện hiển thị"
                          : labels[row.visibility]}
                      </span>
                    </div>
                  </div>
                  <div className="pd-row-actions">
                    {canMove && (
                      <div className="pd-order">
                        <button
                          aria-label={`Đưa ${row.publicName} lên một vị trí`}
                          disabled={pending || position === 1}
                          onClick={() => move(row.id, position - 1)}
                        >
                          <ArrowUp size={17} />
                        </button>
                        <label>
                          <span className="pd-sr">Vị trí của {row.publicName}</span>
                          <select
                            aria-label={`Vị trí của ${row.publicName}`}
                            value={position}
                            disabled={pending}
                            onChange={(e) => move(row.id, Number(e.target.value))}
                          >
                            {ids.map((_, i) => (
                              <option key={i} value={i + 1}>
                                #{i + 1}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          aria-label={`Đưa ${row.publicName} xuống một vị trí`}
                          disabled={pending || position === ids.length}
                          onClick={() => move(row.id, position + 1)}
                        >
                          <ArrowDown size={17} />
                        </button>
                      </div>
                    )}
                    <div className="pd-controls">
                      {row.visibility === "ARCHIVED" ? (
                        <button
                          className="pd-restore"
                          disabled={pending || dirty}
                          onClick={() => changeVisibility(row, "HIDDEN")}
                        >
                          <RotateCcw size={16} /> Khôi phục
                        </button>
                      ) : (
                        <>
                          <button
                            className="pd-visibility"
                            disabled={pending || dirty}
                            aria-label={`${row.visibility === "VISIBLE" ? "Tạm ẩn" : "Hiển thị"} ${row.publicName}`}
                            onClick={() =>
                              changeVisibility(
                                row,
                                row.visibility === "VISIBLE" ? "HIDDEN" : "VISIBLE",
                              )
                            }
                          >
                            {row.visibility === "VISIBLE" ? (
                              <EyeOff size={17} />
                            ) : (
                              <Eye size={17} />
                            )}
                            <span>{row.visibility === "VISIBLE" ? "Ẩn" : "Hiện"}</span>
                          </button>
                          <button
                            aria-label={`Sửa thông tin ${row.publicName}`}
                            disabled={pending || dirty}
                            onClick={() => {
                              setError("");
                              setEditing(row);
                            }}
                          >
                            <Pencil size={17} />
                            <span>Sửa</span>
                          </button>
                          <button
                            className="pd-delete"
                            aria-label={`Xóa ${row.publicName} khỏi danh sách`}
                            disabled={pending || dirty}
                            onClick={() => {
                              setError("");
                              setArchiving(row);
                            }}
                          >
                            <Trash2 size={17} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
        <footer className="pd-save">
          <div>
            <strong>{dirty ? "Có thứ tự mới chưa lưu" : "Thứ tự đang được áp dụng"}</strong>
            <span>
              {dirty
                ? "Lưu thứ tự trước khi sửa hoặc ẩn KTV."
                : "Kéo thả trên máy tính hoặc dùng nút lên/xuống và chọn vị trí."}
            </span>
          </div>
          <div>
            {dirty && (
              <button className="pd-undo" disabled={pending} onClick={() => setDraft(null)}>
                <RotateCcw size={16} /> Hoàn tác
              </button>
            )}
            <button
              className="pd-primary"
              disabled={!dirty || pending}
              onClick={() =>
                void mutate(
                  `${path}/order`,
                  "PUT",
                  {
                    expectedVersion: draft!.version,
                    providerIds: [
                      ...draft!.ids,
                      ...draft!.allIds.filter((id) => !draft!.ids.includes(id)),
                    ],
                  },
                  "Đã lưu thứ tự hiển thị trên trang chủ.",
                )
              }
            >
              <Save size={17} />
              {pending ? "Đang lưu..." : "Lưu thứ tự"}
            </button>
          </div>
        </footer>
      </div>
      <p className="pd-help">
        Ẩn KTV sẽ dừng hiển thị trong danh sách công khai. Xóa có thể khôi phục và giữ lịch sử chat,
        lịch hẹn. Trạng thái đào tạo và điều kiện nhận lịch được quản lý tại mục hồ sơ bên dưới.
      </p>
      {(editing || archiving) && (
        <div className="pd-backdrop">
          <div
            className="pd-modal"
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pd-modal-title"
          >
            <header>
              <div>
                <span className="pd-eyebrow">
                  {editing ? "THÔNG TIN CÔNG KHAI" : "QUẢN LÝ DANH SÁCH"}
                </span>
                <h3 id="pd-modal-title">
                  {editing ? "Cập nhật KTV" : `Xóa ${archiving!.publicName}?`}
                </h3>
              </div>
              <button
                aria-label="Đóng cửa sổ"
                disabled={pending}
                onClick={() => {
                  setEditing(null);
                  setArchiving(null);
                  setError("");
                }}
              >
                <X size={20} />
              </button>
            </header>
            {error && (
              <p className="pd-error" role="alert">
                {error}
              </p>
            )}
            {editing ? (
              <form onSubmit={saveInfo}>
                <label>
                  Tên hiển thị
                  <input
                    name="publicName"
                    defaultValue={editing.publicName}
                    required
                    maxLength={160}
                    autoFocus
                  />
                </label>
                <label>
                  Chức danh
                  <input name="title" defaultValue={editing.title || ""} maxLength={160} />
                </label>
                <div className="pd-form-pair">
                  <label>
                    Tuổi
                    <input
                      name="age"
                      type="number"
                      min={18}
                      max={100}
                      defaultValue={editing.age ?? ""}
                    />
                  </label>
                  <label>
                    Số năm kinh nghiệm
                    <input
                      name="yearsExperience"
                      type="number"
                      min={0}
                      max={80}
                      defaultValue={editing.yearsExperience ?? ""}
                    />
                  </label>
                </div>
                <label>
                  Khu vực
                  <input
                    name="serviceArea"
                    defaultValue={editing.serviceArea || ""}
                    maxLength={160}
                  />
                </label>
                <label>
                  Giới thiệu
                  <textarea
                    name="introduction"
                    rows={4}
                    maxLength={500}
                    defaultValue={editing.introduction || ""}
                  />
                </label>
                <div className="pd-modal-actions">
                  <Link href={`/quan-tri/ktv/${editing.id}`}>
                    Mở hồ sơ đầy đủ <ExternalLink size={14} />
                  </Link>
                  <button className="pd-primary" disabled={pending}>
                    <Save size={17} />
                    {pending ? "Đang lưu..." : "Lưu thông tin"}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p>
                  KTV này sẽ được đưa vào mục <strong>Đã xóa</strong> và không hiển thị trên trang
                  chủ. Bạn có thể khôi phục khi cần; lịch sử chat và lịch hẹn được giữ lại.
                </p>
                <div className="pd-modal-actions">
                  <button className="pd-undo" disabled={pending} onClick={() => setArchiving(null)}>
                    Giữ lại
                  </button>
                  <button
                    className="pd-danger"
                    disabled={pending}
                    onClick={() => changeVisibility(archiving!, "ARCHIVED")}
                  >
                    {pending ? "Đang xử lý..." : "Xóa khỏi danh sách"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
