import { describe, expect, it, vi } from "vitest";
import type { AdminAppointmentRequest } from "./appointment-requests-admin";
import { bulkTargetAllowed, updateBulkStatuses } from "./appointment-request-bulk-data";

const record: AdminAppointmentRequest = {
  id: "a",
  customerId: "customer",
  customerName: "Khách kiểm tra A",
  providerId: "provider",
  providerName: "KTV kiểm tra",
  serviceName: "Dịch vụ kiểm tra",
  requestedAt: "2026-11-03T08:00:00Z",
  createdAt: "2026-11-02T08:00:00Z",
  updatedAt: "2026-11-02T09:00:00Z",
  status: "PENDING",
  allowedActions: ["CONTACTED", "COMPLETED"],
  appointmentVersion: 4,
  location: "AT_BRANCH",
  address: "Cơ sở kiểm tra",
  notes: "",
};
const reason = "Đã liên hệ và xác nhận thông tin với khách.";
const errorMessage = (error: unknown) => (error as Error).message;

describe("guarded bulk appointment status updates", () => {
  it("only offers targets valid for every selected record and skips records already at that target", async () => {
    const already = {
      ...record,
      id: "b",
      status: "CONTACTED" as const,
      allowedActions: ["COMPLETED" as const],
    };
    expect(bulkTargetAllowed([record, already], "CONTACTED")).toBe(true);
    expect(bulkTargetAllowed([record, { ...already, status: "CONFIRMED" }], "CONTACTED")).toBe(
      false,
    );
    expect(bulkTargetAllowed([already], "CONTACTED")).toBe(false);
    const update = vi.fn().mockResolvedValue(undefined);
    const results = await updateBulkStatuses({
      records: [record, already, record],
      status: "CONTACTED",
      reason,
      performed: false,
      update,
      errorMessage,
      progress: vi.fn(),
    });
    expect(update).toHaveBeenCalledTimes(1);
    expect(results.map((result) => result.outcome)).toEqual(["updated", "unchanged"]);
  });

  it("retains each record's own version and expected timestamp when one update conflicts", async () => {
    const second = { ...record, id: "b", updatedAt: "2026-11-03T01:00:00Z", appointmentVersion: 9 };
    const update = vi.fn().mockImplementation(async (item) => {
      if (item.id === "b") throw new Error("Lịch đã được người khác thay đổi.");
    });
    const results = await updateBulkStatuses({
      records: [record, second],
      status: "COMPLETED",
      reason,
      performed: true,
      update,
      errorMessage,
      progress: vi.fn(),
    });
    expect(
      update.mock.calls.map(([item, body]) => [
        item.id,
        body.expectedUpdatedAt,
        body.expectedAppointmentVersion,
        body.servicePerformedConfirmed,
      ]),
    ).toEqual([
      ["a", record.updatedAt, 4, true],
      ["b", second.updatedAt, 9, true],
    ]);
    expect(results.map((result) => result.outcome)).toEqual(["updated", "unconfirmed"]);
    expect(results[1].error).toContain("người khác");
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("rejects missing completion confirmation and never sends archived or forbidden records", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    await expect(
      updateBulkStatuses({
        records: [record],
        status: "COMPLETED",
        reason,
        performed: false,
        update,
        errorMessage,
        progress: vi.fn(),
      }),
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
    const results = await updateBulkStatuses({
      records: [
        { ...record, archivedAt: record.updatedAt },
        { ...record, id: "b", allowedActions: [] },
      ],
      status: "CONTACTED",
      reason,
      performed: false,
      update,
      errorMessage,
      progress: vi.fn(),
    });
    expect(results.every((result) => result.outcome === "unconfirmed")).toBe(true);
    expect(update).not.toHaveBeenCalled();
  });

  it("limits concurrent writes to two and reports progress for every record", async () => {
    const release: Array<() => void> = [];
    let active = 0;
    let peak = 0;
    const update = vi.fn(async () => {
      peak = Math.max(peak, ++active);
      await new Promise<void>((resolve) => release.push(resolve));
      active--;
    });
    const progress = vi.fn();
    const done = updateBulkStatuses({
      records: [record, { ...record, id: "b" }, { ...record, id: "c" }],
      status: "CONTACTED",
      reason,
      performed: false,
      update,
      errorMessage,
      progress,
    });
    expect(update).toHaveBeenCalledTimes(2);
    release[0]();
    await vi.waitFor(() => expect(update).toHaveBeenCalledTimes(3));
    release[1]();
    release[2]();
    const results = await done;
    expect(peak).toBe(2);
    expect(results.every((result) => result.outcome === "updated")).toBe(true);
    expect(progress.mock.calls.map(([count]) => count)).toEqual([1, 2, 3]);
  });
});
