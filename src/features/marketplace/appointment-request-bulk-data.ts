import type { AdminAppointmentRequest, RequestStatus } from "./appointment-requests-admin";

export type BulkResult = {
  record: AdminAppointmentRequest;
  outcome: "updated" | "unchanged" | "unconfirmed";
  error?: string;
};

export function bulkTargetAllowed(records: AdminAppointmentRequest[], status: RequestStatus) {
  return (
    records.length > 0 &&
    records.some((item) => item.status !== status) &&
    records.every(
      (item) =>
        !item.archivedAt && (item.status === status || item.allowedActions?.includes(status)),
    )
  );
}

export function bulkStatusBody(
  record: AdminAppointmentRequest,
  status: RequestStatus,
  reason: string,
  performed: boolean,
) {
  return {
    status,
    reason: reason.trim(),
    expectedStatus: record.status,
    expectedUpdatedAt: record.updatedAt,
    expectedAppointmentVersion: record.appointmentVersion ?? undefined,
    ...(status === "COMPLETED" ? { servicePerformedConfirmed: performed } : {}),
  };
}

/** Each server transaction stays authoritative; never retry a lost response automatically. */
export async function updateBulkStatuses({
  records,
  status,
  reason,
  performed,
  update,
  errorMessage,
  progress,
}: {
  records: AdminAppointmentRequest[];
  status: RequestStatus;
  reason: string;
  performed: boolean;
  update: (
    record: AdminAppointmentRequest,
    body: ReturnType<typeof bulkStatusBody>,
  ) => Promise<unknown>;
  errorMessage: (error: unknown) => string;
  progress: (finished: number) => void;
}): Promise<BulkResult[]> {
  if (reason.trim().length < 10 || (status === "COMPLETED" && !performed))
    throw new Error("Thiếu xác nhận hoặc ghi chú xử lý.");
  const snapshot = [...new Map(records.map((record) => [record.id, { ...record }])).values()];
  const results: BulkResult[] = new Array(snapshot.length);
  let next = 0;
  let finished = 0;
  const worker = async () => {
    while (next < snapshot.length) {
      const index = next++;
      const record = snapshot[index];
      if (
        record.archivedAt ||
        (record.status !== status && !record.allowedActions?.includes(status))
      ) {
        results[index] = {
          record,
          outcome: "unconfirmed",
          error: "Lịch không cho phép chuyển sang trạng thái này.",
        };
      } else if (record.status === status) {
        results[index] = { record, outcome: "unchanged" };
      } else {
        try {
          await update(record, bulkStatusBody(record, status, reason, performed));
          results[index] = { record, outcome: "updated" };
        } catch (error) {
          results[index] = { record, outcome: "unconfirmed", error: errorMessage(error) };
        }
      }
      progress(++finished);
    }
  };
  await Promise.all(Array.from({ length: Math.min(2, snapshot.length) }, worker));
  return results;
}
