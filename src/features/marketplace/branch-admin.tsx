"use client";
import { useState, type FormEvent } from "react";
import { AdminForm, type AdminField } from "./admin-form";
import { usePrivateData, usePrivateMutation, mutationMessage } from "./private-api";
import { EmptyState } from "./components";
import { formatPrice } from "./format";
import type { Branch, Service } from "./types";
interface Resource {
  id: string;
  code: string;
  name: string;
  kind: string;
  capacity: number;
  isActive: boolean;
}
interface Hours {
  weekday: number;
  opensAtMinute: number;
  closesAtMinute: number;
}
interface Exception {
  id: string;
  date: string;
  isClosed: boolean;
  opensAtMinute: number | null;
  closesAtMinute: number | null;
  note: string | null;
}
interface Mapping {
  serviceId: string;
  isActive: boolean;
  priceOverrideVnd: string | null;
}
const weekdays = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
function clock(minute: number) {
  return (
    String(Math.floor(minute / 60)).padStart(2, "0") + ":" + String(minute % 60).padStart(2, "0")
  );
}
function minutes(value: unknown) {
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}
function branchFields(branch?: Branch): AdminField[] {
  return [
    { name: "name", label: "Tên cơ sở", required: true, maxLength: 160, value: branch?.name },
    {
      name: "code",
      label: "Mã cơ sở",
      required: true,
      maxLength: 64,
      pattern: "[a-z0-9]+(-[a-z0-9]+)*",
      value: branch?.code,
    },
    {
      name: "address",
      label: "Địa chỉ",
      type: "textarea",
      required: true,
      maxLength: 500,
      value: branch?.address,
    },
    { name: "phone", label: "Điện thoại liên hệ", maxLength: 32, value: branch?.phone },
    {
      name: "isActive",
      label: "Cơ sở đang hoạt động",
      type: "checkbox",
      value: branch?.isActive || !branch,
    },
  ];
}
export function BranchAdmin() {
  const branches = usePrivateData<Branch[]>("/admin/branches");
  const [selected, setSelected] = useState("");
  if (branches.isPending) return <p role="status">Đang tải cơ sở...</p>;
  if (branches.isError)
    return (
      <EmptyState title="Chưa tải được cơ sở" error>
        <button className="market-button" onClick={() => void branches.refetch()}>
          Thử lại
        </button>
      </EmptyState>
    );
  const branch = branches.data.find((item) => item.id === selected);
  return (
    <>
      <div className="market-two-column">
        <section>
          <h2 className="market-subtitle">Cơ sở Mộc Maria</h2>
          {branches.data.length ? (
            branches.data.map((item) => (
              <article className="market-panel mb-6" key={item.id}>
                <span className="market-badge">
                  {item.isActive ? "Đang hoạt động" : "Tạm ngưng"}
                </span>
                <h2 className="mt-4!">{item.name}</h2>
                <p>{item.address}</p>
                <button
                  className="market-button market-button-secondary"
                  onClick={() => setSelected(item.id)}
                >
                  Quản lý cơ sở
                </button>
              </article>
            ))
          ) : (
            <EmptyState title="Chưa có cơ sở">
              <p>Nhập địa chỉ và thông tin cơ sở thực tế của Mộc Maria.</p>
            </EmptyState>
          )}
        </section>
        <article className="market-panel">
          <AdminForm
            title="Thêm cơ sở"
            path="/admin/branches"
            fields={branchFields()}
            label="Tạo cơ sở"
          />
        </article>
      </div>
      {branch && <BranchDetails key={branch.id} branch={branch} />}
    </>
  );
}
function BranchDetails({ branch }: { branch: Branch }) {
  const resources = usePrivateData<Resource[]>(`/admin/branches/${branch.id}/resources`);
  const hours = usePrivateData<Hours[]>(`/admin/branches/${branch.id}/hours`);
  const exceptions = usePrivateData<Exception[]>(`/admin/branches/${branch.id}/exceptions`);
  const services = usePrivateData<Service[]>("/admin/services");
  const mappings = usePrivateData<Mapping[]>(`/admin/branches/${branch.id}/services`);
  return (
    <section className="market-section">
      <h2 className="market-subtitle">Quản lý {branch.name}</h2>
      <div className="market-two-column">
        <section>
          <article className="market-panel mb-6">
            <AdminForm
              key={branch.name + branch.isActive}
              title="Thông tin cơ sở"
              path={`/admin/branches/${branch.id}`}
              method="PATCH"
              fields={branchFields(branch)}
            />
          </article>
          <article className="market-panel mb-6">
            <h2>Lịch mở cửa</h2>
            {hours.isPending ? (
              <p>Đang tải...</p>
            ) : hours.isError ? (
              <button onClick={() => void hours.refetch()}>Thử tải lại lịch</button>
            ) : (
              <HoursForm branchId={branch.id} hours={hours.data} />
            )}
          </article>
          <article className="market-panel">
            <h2>Ngày nghỉ & giờ ngoại lệ</h2>
            {exceptions.isError ? (
              <button onClick={() => void exceptions.refetch()}>Thử tải lại ngày ngoại lệ</button>
            ) : (
              exceptions.data?.map((item) => (
                <p key={item.id}>
                  {item.date} ·{" "}
                  {item.isClosed
                    ? "Đóng cửa"
                    : clock(item.opensAtMinute || 0) + " – " + clock(item.closesAtMinute || 0)}
                  {item.note ? " · " + item.note : ""}
                </p>
              ))
            )}
            <AdminForm
              path={`/admin/branches/${branch.id}/exceptions`}
              method="PUT"
              label="Lưu ngày ngoại lệ"
              fields={[
                { name: "date", label: "Ngày", type: "date", required: true },
                { name: "isClosed", label: "Đóng cửa trong ngày", type: "checkbox", value: true },
                { name: "opens", label: "Giờ mở (khi không đóng cửa)", type: "time" },
                { name: "closes", label: "Giờ đóng (khi không đóng cửa)", type: "time" },
                { name: "note", label: "Ghi chú", maxLength: 240 },
              ]}
              transform={(body) => ({
                date: body.date,
                isClosed: body.isClosed,
                note: body.note,
                opensAtMinute: body.isClosed ? null : minutes(body.opens),
                closesAtMinute: body.isClosed ? null : minutes(body.closes),
              })}
            />
          </article>
        </section>
        <section>
          <article className="market-panel mb-6">
            <h2>Phòng & thiết bị</h2>
            {resources.isError ? (
              <button onClick={() => void resources.refetch()}>Thử tải lại tài nguyên</button>
            ) : (
              resources.data?.map((resource) => (
                <ResourceForm
                  key={resource.id + resource.isActive + resource.capacity}
                  branchId={branch.id}
                  resource={resource}
                />
              ))
            )}
            <ResourceForm branchId={branch.id} />
          </article>
          <article className="market-panel">
            <h2>Dịch vụ tại cơ sở</h2>
            {services.isError || mappings.isError ? (
              <p role="alert">
                Chưa tải được dịch vụ.{" "}
                <button
                  onClick={() => {
                    void services.refetch();
                    void mappings.refetch();
                  }}
                >
                  Thử lại
                </button>
              </p>
            ) : (
              <>
                {mappings.data?.map((mapping) => (
                  <p key={mapping.serviceId}>
                    {services.data?.find((service) => service.id === mapping.serviceId)?.name ||
                      "Dịch vụ"}{" "}
                    · {mapping.isActive ? "Cung cấp" : "Tạm ngưng"}
                    {mapping.priceOverrideVnd
                      ? " · Chính sách giá riêng: " + formatPrice(mapping.priceOverrideVnd)
                      : ""}
                  </p>
                ))}
                <AdminForm
                  path={`/admin/branches/${branch.id}/services`}
                  label="Lưu dịch vụ tại cơ sở"
                  fields={[
                    {
                      name: "serviceId",
                      label: "Dịch vụ",
                      type: "select",
                      required: true,
                      options: services.data?.map((service) => ({
                        value: service.id,
                        label: service.name,
                      })),
                    },
                    { name: "isActive", label: "Đang cung cấp", type: "checkbox", value: true },
                  ]}
                />
                <p className="market-notice">
                  Giá niêm yết được quản lý theo từng gói. Chính sách giá riêng tại cơ sở sẽ được xử
                  lý trong báo giá chính thức.
                </p>
              </>
            )}
          </article>
        </section>
      </div>
    </section>
  );
}
function ResourceForm({ branchId, resource }: { branchId: string; resource?: Resource }) {
  return (
    <details className="market-admin-details" open={!resource}>
      <summary>
        {resource
          ? `${resource.name} · ${resource.capacity} chỗ · ${resource.isActive ? "Đang dùng" : "Tạm ngưng"}`
          : "+ Thêm phòng / thiết bị"}
      </summary>
      <AdminForm
        path={`/admin/branches/${branchId}/resources` + (resource ? "/" + resource.id : "")}
        method={resource ? "PATCH" : "POST"}
        fields={[
          {
            name: "name",
            label: "Tên tài nguyên",
            required: true,
            maxLength: 160,
            value: resource?.name,
          },
          {
            name: "code",
            label: "Mã tài nguyên",
            required: true,
            maxLength: 40,
            pattern: "[a-z0-9]+(-[a-z0-9]+)*",
            value: resource?.code,
          },
          {
            name: "kind",
            label: "Loại",
            type: "select",
            required: true,
            value: resource?.kind,
            options: [
              { value: "ROOM", label: "Phòng" },
              { value: "EQUIPMENT", label: "Thiết bị" },
            ],
          },
          {
            name: "capacity",
            label: "Sức chứa",
            type: "number",
            required: true,
            min: 1,
            max: 100,
            value: resource?.capacity,
          },
          {
            name: "isActive",
            label: "Đang hoạt động",
            type: "checkbox",
            value: resource?.isActive || !resource,
          },
        ]}
      />
    </details>
  );
}
function HoursForm({ branchId, hours }: { branchId: string; hours: Hours[] }) {
  const mutation = usePrivateMutation();
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = weekdays.flatMap((_, weekday) =>
      data.get(`active-${weekday}`) === "on"
        ? [
            {
              weekday,
              opensAtMinute: minutes(data.get(`opens-${weekday}`)),
              closesAtMinute: minutes(data.get(`closes-${weekday}`)),
            },
          ]
        : [],
    );
    if (
      next.some(
        (item) =>
          !Number.isInteger(item.opensAtMinute) ||
          !Number.isInteger(item.closesAtMinute) ||
          item.closesAtMinute <= item.opensAtMinute,
      )
    ) {
      setNotice("Vui lòng nhập giờ mở và đóng hợp lệ cho những ngày hoạt động.");
      return;
    }
    try {
      await mutation.mutateAsync({
        path: `/admin/branches/${branchId}/hours`,
        method: "PUT",
        body: { hours: next },
      });
      setNotice("Đã cập nhật lịch mở cửa.");
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  return (
    <form className="market-form" onSubmit={submit}>
      {weekdays.map((name, weekday) => {
        const hour = hours.find((item) => item.weekday === weekday);
        return (
          <div className="market-hours-row" key={weekday}>
            <label className="market-check">
              <input name={`active-${weekday}`} type="checkbox" defaultChecked={!!hour} />
              {name}
            </label>
            <label>
              Giờ mở
              <input
                name={`opens-${weekday}`}
                type="time"
                defaultValue={hour ? clock(hour.opensAtMinute) : ""}
              />
            </label>
            <label>
              Giờ đóng
              <input
                name={`closes-${weekday}`}
                type="time"
                defaultValue={hour ? clock(hour.closesAtMinute) : ""}
              />
            </label>
          </div>
        );
      })}
      <p className="market-notice">
        Bỏ chọn một ngày để đóng cửa trong ngày đó. Giờ được ghi theo múi giờ Việt Nam.
      </p>
      {notice && (
        <p role="status" className="market-notice">
          {notice}
        </p>
      )}
      <button className="market-button" disabled={mutation.isPending}>
        {mutation.isPending ? "Đang lưu..." : "Lưu lịch mở cửa"}
      </button>
    </form>
  );
}
