"use client";
import { useState } from "react";
import { AdminForm, type AdminField } from "./admin-form";
import { usePrivateData } from "./private-api";
import type { Branch } from "./types";
interface Setting {
  id: string;
  variantId: string;
  branchId: string;
  mode: "AT_BRANCH" | "AT_HOME";
  isEnabled: boolean;
  slotStepMinutes: number;
  leadMinutes: number;
  horizonDays: number;
  requestTtlMinutes: number;
  resourceRequirements: Array<{ kind: "ROOM" | "EQUIPMENT"; quantity: number }>;
  reviewedAt: string;
}
export function BookingSettingsAdmin({ variantId }: { variantId: string }) {
  const branches = usePrivateData<Branch[]>("/admin/branches");
  const settings = usePrivateData<Setting[]>("/admin/booking-settings");
  const [branchId, setBranchId] = useState("");
  if (branches.isPending || settings.isPending)
    return <p role="status">Đang tải cấu hình đặt lịch...</p>;
  if (branches.isError || settings.isError)
    return (
      <p role="alert">
        Chưa tải được cấu hình đặt lịch.{" "}
        <button
          type="button"
          onClick={() => {
            void branches.refetch();
            void settings.refetch();
          }}
        >
          Thử lại
        </button>
      </p>
    );
  const current = settings.data.find(
    (s) => s.variantId === variantId && s.branchId === branchId && s.mode === "AT_BRANCH",
  );
  const fields: AdminField[] = [
    {
      name: "slotStepMinutes",
      label: "Khoảng cách giữa các giờ bắt đầu (phút)",
      type: "number",
      required: true,
      min: 5,
      max: 60,
      value: current?.slotStepMinutes,
    },
    {
      name: "leadMinutes",
      label: "Đặt trước tối thiểu (phút)",
      type: "number",
      required: true,
      min: 0,
      max: 43200,
      value: current?.leadMinutes,
    },
    {
      name: "horizonDays",
      label: "Cho xem lịch trước tối đa (ngày)",
      type: "number",
      required: true,
      min: 1,
      max: 90,
      value: current?.horizonDays,
    },
    {
      name: "requestTtlMinutes",
      label: "Thời hạn yêu cầu và xác nhận báo giá (phút)",
      type: "number",
      required: true,
      min: 5,
      max: 120,
      value: current?.requestTtlMinutes,
    },
    {
      name: "rooms",
      label: "Số chỗ phòng cần cho một lịch",
      type: "number",
      required: true,
      min: 0,
      max: 100,
      value: current
        ? (current.resourceRequirements.find((r) => r.kind === "ROOM")?.quantity ?? 0)
        : undefined,
      help: "Nhập 0 khi gói thực sự không cần phòng. Tài nguyên được quản lý tại trang Cơ sở.",
    },
    {
      name: "equipment",
      label: "Số thiết bị cần cho một lịch",
      type: "number",
      required: true,
      min: 0,
      max: 100,
      value: current
        ? (current.resourceRequirements.find((r) => r.kind === "EQUIPMENT")?.quantity ?? 0)
        : undefined,
    },
    {
      name: "isEnabled",
      label: "Bật cấu hình lịch tại cơ sở này",
      type: "checkbox",
      value: current?.isEnabled,
    },
    {
      name: "configurationConfirmed",
      label: "Tôi đã kiểm tra thời hạn và nhu cầu tài nguyên thực tế của gói.",
      type: "checkbox",
      required: true,
    },
    { name: "reason", label: "Lý do xác nhận hoặc điều chỉnh", required: true, maxLength: 500 },
  ];
  return (
    <details className="market-admin-details">
      <summary>Điều kiện đặt lịch tại cơ sở</summary>
      <p className="market-notice">
        Lịch trống còn phụ thuộc người phục vụ đủ điều kiện, ca làm, ngày nghỉ và tài nguyên. Yêu
        cầu đặt lịch và xác nhận báo giá đang được hoàn thiện.
      </p>
      <label className="market-form">
        Cơ sở áp dụng
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
          <option value="">Chọn cơ sở đã liên kết dịch vụ...</option>
          {branches.data.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
              {branch.isActive ? "" : " · Tạm ngưng"}
            </option>
          ))}
        </select>
      </label>
      {branchId && (
        <AdminForm
          key={branchId + (current?.reviewedAt || "new")}
          path="/admin/booking-settings"
          fields={fields}
          label="Lưu điều kiện đặt lịch"
          transform={(body) => {
            const { rooms, equipment, ...settingsBody } = body;
            return {
              ...settingsBody,
              variantId,
              branchId,
              mode: "AT_BRANCH",
              resourceRequirements: [
                ...(Number(rooms) > 0 ? [{ kind: "ROOM", quantity: Number(rooms) }] : []),
                ...(Number(equipment) > 0
                  ? [{ kind: "EQUIPMENT", quantity: Number(equipment) }]
                  : []),
              ],
            };
          }}
        />
      )}
    </details>
  );
}
