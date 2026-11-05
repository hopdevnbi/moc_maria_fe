"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCheck, LoaderCircle, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { defaultStatusNote, inquiryStatusLabels } from "@/shared/booking/inquiry-status";
import type { AdminAppointmentRequest, RequestStatus } from "./appointment-requests-admin";
import { mutationMessage } from "./private-api";
import {
  bulkTargetAllowed,
  updateBulkStatuses,
  type BulkResult,
} from "./appointment-request-bulk-data";
import "./appointment-request-bulk.css";

const statuses = Object.keys(inquiryStatusLabels) as RequestStatus[];
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const appointmentTime = (value: string) =>
  Number.isFinite(Date.parse(value)) ? dateFormat.format(new Date(value)) : "Chưa có thời gian";
type Snapshot = { records: AdminAppointmentRequest[]; status: RequestStatus; scope: string };
type Selection = {
  records: AdminAppointmentRequest[];
  chosen: AdminAppointmentRequest[];
  busy: boolean;
  toggle: (id: string) => void;
  all: () => void;
  clear: () => void;
  begin: (status: RequestStatus) => void;
};
const BulkContext = createContext<Selection | null>(null);
const selectable = (record: AdminAppointmentRequest) =>
  !record.archivedAt && !!record.allowedActions?.length;

export function AppointmentBulkSelection({
  records,
  scope,
  disabled,
  className,
  children,
}: {
  records: AdminAppointmentRequest[];
  scope: string;
  disabled: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [selection, setSelection] = useState({ scope, ids: [] as string[] });
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [running, setRunning] = useState(false);
  // Reset only the selection when the view changes; do not remount the search input.
  if (selection.scope !== scope) setSelection({ scope, ids: [] });
  const eligible = records.filter(selectable);
  const chosen =
    selection.scope === scope ? eligible.filter((item) => selection.ids.includes(item.id)) : [];
  const busy = disabled || running;
  const clear = () => setSelection({ scope, ids: [] });
  const toggle = (id: string) => {
    if (busy) return;
    setSelection((old) => ({
      scope,
      ids: old.ids.includes(id) ? old.ids.filter((value) => value !== id) : [...old.ids, id],
    }));
  };
  const begin = (status: RequestStatus) => {
    if (busy || !bulkTargetAllowed(chosen, status)) return;
    setSnapshot({
      scope,
      status,
      records: chosen.map((item) => ({
        ...item,
        allowedActions: [...(item.allowedActions ?? [])],
      })),
    });
  };
  return (
    <BulkContext.Provider
      value={{
        records: eligible,
        chosen,
        busy,
        toggle,
        all: () => {
          if (!busy)
            setSelection({
              scope,
              ids: chosen.length === eligible.length ? [] : eligible.map((item) => item.id),
            });
        },
        clear,
        begin,
      }}
    >
      <div className={className}>{children}</div>
      {snapshot && snapshot.scope === scope && (
        <BulkConfirmation
          snapshot={snapshot}
          onRunning={setRunning}
          onClose={() => setSnapshot(null)}
          onDone={(results) => {
            setSelection({
              scope,
              ids: results
                .filter((item) => item.outcome === "unconfirmed")
                .map((item) => item.record.id),
            });
          }}
        />
      )}
    </BulkContext.Provider>
  );
}

export function AppointmentBulkCheckbox({ record }: { record: AdminAppointmentRequest }) {
  const state = useContext(BulkContext)!;
  return (
    <label className="mm-request-bulk-row-check">
      <input
        type="checkbox"
        checked={state.chosen.some((item) => item.id === record.id)}
        disabled={state.busy || !selectable(record)}
        onChange={() => state.toggle(record.id)}
        aria-label={`Chọn lịch của ${record.customerName}: ${record.serviceName} (${record.id})`}
      />
    </label>
  );
}

/** Detail actions must respect the checkbox selection, not silently update only the focused row. */
export function AppointmentBulkStatusAction({
  status,
  onSingle,
  className,
  ariaLabel,
  children,
}: {
  status: RequestStatus;
  onSingle: () => void;
  className: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  const selection = useContext(BulkContext)!;
  const count = selection.chosen.length;
  const allowed = count === 0 || bulkTargetAllowed(selection.chosen, status);
  return (
    <button
      type="button"
      className={className}
      aria-label={
        count
          ? status === "CANCELLED"
            ? `Hủy ${count} lịch đã chọn`
            : `Chuyển ${count} lịch sang ${inquiryStatusLabels[status]}`
          : ariaLabel
      }
      title={
        count && !allowed ? "Không thể chuyển tất cả lịch đã chọn sang trạng thái này." : undefined
      }
      disabled={selection.busy || !allowed}
      onClick={() => (count ? selection.begin(status) : onSingle())}
    >
      {children}
      {count > 0 && <span> ({count} lịch đã chọn)</span>}
    </button>
  );
}

export function AppointmentBulkSingleOnlyAction({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className: string;
  children: ReactNode;
}) {
  const selection = useContext(BulkContext)!;
  return (
    <button
      type="button"
      className={className}
      disabled={selection.busy || selection.chosen.length > 0}
      title={selection.chosen.length ? "Bỏ chọn lịch để thao tác riêng từng lịch." : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function AppointmentBulkToolbar() {
  const state = useContext(BulkContext)!;
  const [target, setTarget] = useState<RequestStatus | "">("");
  const allRef = useRef<HTMLInputElement>(null);
  const checked = !!state.records.length && state.chosen.length === state.records.length;
  useEffect(() => {
    if (allRef.current) allRef.current.indeterminate = !!state.chosen.length && !checked;
  }, [state.chosen.length, checked]);
  const allowed = target && bulkTargetAllowed(state.chosen, target);
  return (
    <div className="mm-request-bulk-toolbar" aria-label="Cập nhật nhiều lịch">
      <label className="mm-request-bulk-all">
        <input
          ref={allRef}
          type="checkbox"
          checked={checked}
          disabled={state.busy || !state.records.length}
          onChange={state.all}
          aria-label="Chọn tất cả lịch trên trang"
        />
        <span>
          {state.chosen.length ? `Đã chọn ${state.chosen.length} lịch` : "Chọn lịch trên trang"}
        </span>
      </label>
      {state.chosen.length > 0 && (
        <>
          <select
            aria-label="Trạng thái cập nhật hàng loạt"
            value={target}
            disabled={state.busy}
            onChange={(event) => setTarget(event.target.value as RequestStatus | "")}
          >
            <option value="">Chọn trạng thái…</option>
            {statuses.map((status) => (
              <option
                key={status}
                value={status}
                disabled={!bulkTargetAllowed(state.chosen, status)}
              >
                {inquiryStatusLabels[status]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="mm-request-bulk-apply"
            disabled={state.busy || !allowed}
            onClick={() => target && state.begin(target)}
          >
            <CheckCheck size={17} /> Cập nhật {state.chosen.length} lịch
          </button>
          {bulkTargetAllowed(state.chosen, "CANCELLED") && (
            <button
              type="button"
              className="mm-request-bulk-cancel"
              disabled={state.busy}
              onClick={() => state.begin("CANCELLED")}
            >
              <X size={16} /> Hủy {state.chosen.length} lịch đã chọn
            </button>
          )}
          <button
            type="button"
            className="mm-request-bulk-clear"
            disabled={state.busy}
            onClick={state.clear}
          >
            Bỏ chọn
          </button>
          <small>
            {statuses.some((status) => bulkTargetAllowed(state.chosen, status))
              ? "Chỉ xử lý các lịch đã chọn trên trang này."
              : "Các lịch đã chọn không có trạng thái chung được phép. Bỏ chọn bớt lịch để tiếp tục."}
          </small>
        </>
      )}
    </div>
  );
}

function BulkConfirmation({
  snapshot,
  onClose,
  onRunning,
  onDone,
}: {
  snapshot: Snapshot;
  onClose: () => void;
  onRunning: (running: boolean) => void;
  onDone: (results: BulkResult[]) => void;
}) {
  const { user, authFetch } = useAuth();
  const client = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const noteId = useId();
  const [reason, setReason] = useState(defaultStatusNote(snapshot.status));
  const [performed, setPerformed] = useState(false);
  const [running, setRunning] = useState(false);
  const sending = useRef(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BulkResult[] | null>(null);
  const [refreshError, setRefreshError] = useState(false);
  useEffect(() => {
    const element = dialogRef.current!;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      else
        document
          .querySelector<HTMLInputElement>(".mm-request-bulk-all input")
          ?.focus({ preventScroll: true });
    };
  }, []);
  const execute = async () => {
    if (
      sending.current ||
      results ||
      reason.trim().length < 10 ||
      !user ||
      (snapshot.status === "COMPLETED" && !performed)
    )
      return;
    sending.current = true;
    setRunning(true);
    onRunning(true);
    const completed = await updateBulkStatuses({
      records: snapshot.records,
      status: snapshot.status,
      reason,
      performed,
      progress: setProgress,
      update: (record, body) =>
        authFetch(`/admin/appointment-inquiries/${encodeURIComponent(record.id)}`, {
          method: "PATCH",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      errorMessage: mutationMessage,
    });
    setResults(completed);
    try {
      await client.invalidateQueries({ queryKey: ["private", user.id] }, { throwOnError: true });
    } catch {
      setRefreshError(true);
    }
    onDone(completed);
    sending.current = false;
    setRunning(false);
    onRunning(false);
  };
  const updated = results?.filter((item) => item.outcome === "updated").length ?? 0;
  const failed = results?.filter((item) => item.outcome === "unconfirmed") ?? [];
  const unchanged = snapshot.records.filter((item) => item.status === snapshot.status).length;
  return (
    <dialog
      ref={dialogRef}
      className="mm-request-bulk-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!sending.current) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void execute();
        }}
      >
        <header>
          <div>
            <span className="mm-request-overline">XỬ LÝ HÀNG LOẠT</span>
            <h3 id={titleId}>
              {results ? "Kết quả cập nhật" : `Cập nhật ${snapshot.records.length} lịch`}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Đóng cập nhật hàng loạt"
            disabled={running}
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </header>
        <p>
          Trạng thái đích: <strong>{inquiryStatusLabels[snapshot.status]}</strong>. Mỗi lịch được
          lưu ghi chú và lịch sử riêng.
        </p>
        {!results && (
          <>
            <ul className="mm-request-bulk-preview">
              {snapshot.records.map((record) => (
                <li key={record.id}>
                  <strong>{record.customerName}</strong>
                  <span>
                    {appointmentTime(record.requestedAt)} · {record.serviceName} ·{" "}
                    {record.providerName}
                  </span>
                  <small>{inquiryStatusLabels[record.status]}</small>
                </li>
              ))}
            </ul>
            {unchanged > 0 && <p>{unchanged} lịch đã ở trạng thái này sẽ được giữ nguyên.</p>}
            <label htmlFor={noteId}>Ghi chú chung cho các lịch (ít nhất 10 ký tự)</label>
            <textarea
              id={noteId}
              value={reason}
              rows={3}
              required
              minLength={10}
              maxLength={500}
              disabled={running}
              onChange={(event) => setReason(event.target.value)}
            />
            {snapshot.status === "COMPLETED" && (
              <label className="mm-request-bulk-attest">
                <input
                  type="checkbox"
                  checked={performed}
                  disabled={running}
                  onChange={(event) => setPerformed(event.target.checked)}
                />
                Tôi xác nhận tất cả các buổi chăm sóc được cập nhật lần này đã thực sự hoàn thành.
              </label>
            )}
          </>
        )}
        {running && (
          <div className="mm-request-bulk-progress" role="status">
            <LoaderCircle size={18} /> Đang xử lý {progress}/{snapshot.records.length} lịch. Vui
            lòng giữ cửa sổ này mở.
          </div>
        )}
        {results && (
          <div aria-live="polite" className="mm-request-bulk-results">
            <p>
              <strong>
                Đã cập nhật {updated}/{snapshot.records.length} lịch.
              </strong>
              {unchanged ? ` ${unchanged} lịch đã đúng trạng thái, không cần đổi.` : ""}
            </p>
            {failed.length > 0 && (
              <>
                <p role="alert">
                  {failed.length} lịch chưa xác nhận cập nhật. Kiểm tra dữ liệu mới nhất trước khi
                  thử lại; các lịch còn hiển thị trong danh sách được giữ chọn.
                </p>
                <ul>
                  {failed.map(({ record, error }) => (
                    <li key={record.id}>
                      <strong>
                        {record.customerName} · {record.serviceName}
                      </strong>
                      <span>
                        {appointmentTime(record.requestedAt)} · {record.providerName}
                      </span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {refreshError && (
              <p role="alert">
                Kết quả xử lý đã hiển thị, nhưng chưa tải lại được đầy đủ dữ liệu. Hãy làm mới danh
                sách trước khi xử lý tiếp.
              </p>
            )}
          </div>
        )}
        <footer>
          {!results && (
            <button type="button" disabled={running} onClick={onClose}>
              Quay lại
            </button>
          )}
          {results ? (
            <button
              type="button"
              className="mm-request-bulk-apply"
              disabled={running}
              onClick={onClose}
            >
              Đóng kết quả
            </button>
          ) : (
            <button
              type="submit"
              className="mm-request-bulk-apply"
              disabled={
                running ||
                reason.trim().length < 10 ||
                (snapshot.status === "COMPLETED" && !performed)
              }
            >
              Xác nhận cập nhật {snapshot.records.length} lịch
            </button>
          )}
        </footer>
      </form>
    </dialog>
  );
}
