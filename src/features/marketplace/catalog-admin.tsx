"use client";
import { useState, type FormEvent } from "react";
import { Pencil, Plus } from "lucide-react";
import { usePrivateData, usePrivateMutation, mutationMessage } from "./private-api";
import { EmptyState } from "./components";
import { formatPrice } from "./format";
import type { Category, Service, Variant } from "./types";
import { BookingSettingsAdmin } from "./booking-settings";

export function CatalogAdmin() {
  const categories = usePrivateData<Category[]>("/admin/service-categories");
  const services = usePrivateData<Service[]>("/admin/services");
  const [selected, setSelected] = useState<Service | null>(null);
  const [creating, setCreating] = useState(false);
  if (categories.isPending || services.isPending) return <p role="status">Đang tải danh mục...</p>;
  if (categories.isError || services.isError)
    return (
      <EmptyState title="Chưa tải được danh mục" error>
        <button
          className="market-button"
          onClick={() => {
            void categories.refetch();
            void services.refetch();
          }}
        >
          Thử lại
        </button>
      </EmptyState>
    );
  return (
    <>
      <p className="market-notice">
        Chỉ nhập dịch vụ và giá chính thức của Mộc Maria. Dịch vụ ở trạng thái bản nháp sẽ chưa xuất
        hiện trên website.
      </p>
      <div className="market-two-column">
        <section>
          <div className="market-toolbar">
            <h2 className="market-subtitle">Gói chăm sóc</h2>
            <button
              className="market-button"
              onClick={() => {
                setCreating(true);
                setSelected(null);
              }}
              disabled={!categories.data.length}
            >
              <Plus size={17} />
              Thêm dịch vụ
            </button>
          </div>
          {creating || selected ? (
            <ServiceEditor
              key={selected?.id || "new"}
              service={selected}
              categories={categories.data}
              onClose={() => {
                setSelected(null);
                setCreating(false);
              }}
            />
          ) : null}
          {services.data.length ? (
            services.data.map((service) => (
              <article className="market-panel mb-6" key={service.id}>
                <span className="market-badge">
                  {service.isPublished ? "Đã công bố" : "Bản nháp"}
                </span>
                <h2 className="mt-4!">{service.name}</h2>
                <p>{service.description || "Chưa có mô tả"}</p>
                <button
                  className="market-button market-button-secondary"
                  onClick={() => {
                    setSelected(service);
                    setCreating(false);
                  }}
                >
                  <Pencil size={16} />
                  Chỉnh sửa & quản lý gói
                </button>
              </article>
            ))
          ) : (
            <EmptyState title="Chưa có dịch vụ">
              <p>Tạo danh mục, sau đó thêm dịch vụ và các gói thời lượng với giá chính thức.</p>
            </EmptyState>
          )}
        </section>
        <section>
          <h2 className="market-subtitle">Danh mục dịch vụ</h2>
          <CategoryEditor />
          {categories.data.map((category) => (
            <CategoryEditor key={category.id + category.updatedAt} category={category} />
          ))}
        </section>
      </div>
    </>
  );
}

function CategoryEditor({ category }: { category?: Category }) {
  const mutation = usePrivateMutation();
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = {
      name: String(data.get("name")).trim(),
      slug: String(data.get("slug")).trim(),
      description: String(data.get("description") || "").trim() || undefined,
      sortOrder: Number(data.get("sortOrder")),
      isPublished: data.get("isPublished") === "on",
    };
    try {
      await mutation.mutateAsync({
        path: "/admin/service-categories" + (category ? "/" + category.id : ""),
        method: category ? "PATCH" : "POST",
        body,
      });
      setNotice("Đã lưu danh mục.");
      if (!category) form.reset();
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  return (
    <article className="market-panel mb-6">
      <h2>{category ? category.name : "Thêm danh mục"}</h2>
      <form className="market-form" onSubmit={submit}>
        <label>
          Tên danh mục
          <input name="name" defaultValue={category?.name} required minLength={2} maxLength={160} />
        </label>
        <label>
          Đường dẫn
          <input
            name="slug"
            defaultValue={category?.slug}
            required
            minLength={2}
            maxLength={100}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="cham-soc-co-the"
          />
          <small>Chữ thường không dấu, phân cách bằng dấu gạch ngang.</small>
        </label>
        <label>
          Mô tả
          <textarea
            name="description"
            defaultValue={category?.description || ""}
            maxLength={2000}
          />
        </label>
        <label>
          Thứ tự hiển thị
          <input
            name="sortOrder"
            type="number"
            defaultValue={category?.sortOrder || 0}
            min={0}
            max={1000000}
            required
          />
        </label>
        <label className="market-check">
          <input name="isPublished" type="checkbox" defaultChecked={category?.isPublished} />
          Công bố danh mục
        </label>
        {notice && (
          <p role="status" className="market-notice">
            {notice}
          </p>
        )}
        <button className="market-button" disabled={mutation.isPending}>
          {mutation.isPending ? "Đang lưu..." : "Lưu danh mục"}
        </button>
      </form>
    </article>
  );
}

function ServiceEditor({
  service,
  categories,
  onClose,
}: {
  service: Service | null;
  categories: Category[];
  onClose: () => void;
}) {
  const mutation = usePrivateMutation<Service>();
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await mutation.mutateAsync({
        path: "/admin/services" + (service ? "/" + service.id : ""),
        method: service ? "PATCH" : "POST",
        body: {
          name: String(data.get("name")).trim(),
          slug: String(data.get("slug")).trim(),
          categoryId: data.get("categoryId"),
          description: String(data.get("description") || "").trim() || undefined,
          isPublished: data.get("isPublished") === "on",
        },
      });
      setNotice("Đã lưu dịch vụ.");
      if (!service) onClose();
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  return (
    <article className="market-panel mb-6">
      <div className="market-toolbar">
        <h2>{service ? "Chỉnh sửa dịch vụ" : "Dịch vụ mới"}</h2>
        <button className="market-button market-button-secondary" onClick={onClose}>
          Đóng
        </button>
      </div>
      <form className="market-form" onSubmit={submit}>
        <label>
          Tên dịch vụ
          <input name="name" defaultValue={service?.name} required minLength={2} maxLength={160} />
        </label>
        <label>
          Đường dẫn
          <input
            name="slug"
            defaultValue={service?.slug}
            required
            minLength={2}
            maxLength={120}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
          />
        </label>
        <label>
          Danh mục
          <select name="categoryId" defaultValue={service?.categoryId} required>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isPublished ? "" : " (bản nháp)"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mô tả
          <textarea name="description" defaultValue={service?.description || ""} maxLength={4000} />
        </label>
        <label className="market-check">
          <input name="isPublished" type="checkbox" defaultChecked={service?.isPublished} />
          Công bố dịch vụ khi danh mục cũng được công bố
        </label>
        {notice && (
          <p className="market-notice" role="status">
            {notice}
          </p>
        )}
        <button className="market-button" disabled={mutation.isPending}>
          {mutation.isPending ? "Đang lưu..." : "Lưu dịch vụ"}
        </button>
      </form>
      {service && <VariantManager serviceId={service.id} />}
    </article>
  );
}

function VariantManager({ serviceId }: { serviceId: string }) {
  const variants = usePrivateData<Variant[]>(`/admin/services/${serviceId}/variants`);
  return (
    <section className="mt-10">
      <h2>Gói thời lượng & giá</h2>
      {variants.isError ? (
        <p role="alert">
          Chưa tải được gói. <button onClick={() => void variants.refetch()}>Thử lại</button>
        </p>
      ) : variants.isPending ? (
        <p role="status">Đang tải...</p>
      ) : (
        variants.data.map((variant) => (
          <VariantEditor
            key={variant.id + variant.updatedAt}
            serviceId={serviceId}
            variant={variant}
          />
        ))
      )}
      <VariantEditor serviceId={serviceId} />
    </section>
  );
}
function VariantEditor({ serviceId, variant }: { serviceId: string; variant?: Variant }) {
  const mutation = usePrivateMutation();
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await mutation.mutateAsync({
        path: `/admin/services/${serviceId}/variants` + (variant ? "/" + variant.id : ""),
        method: variant ? "PATCH" : "POST",
        body: {
          name: String(data.get("name")).trim(),
          durationMinutes: Number(data.get("durationMinutes")),
          priceVnd: Number(data.get("priceVnd")),
          bufferBeforeMinutes: Number(data.get("bufferBeforeMinutes")),
          bufferAfterMinutes: Number(data.get("bufferAfterMinutes")),
          isActive: data.get("isActive") === "on",
        },
      });
      setNotice("Đã lưu gói chăm sóc.");
      if (!variant) form.reset();
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  return (
    <details className="market-admin-details" open={!variant}>
      <summary>
        {variant
          ? variant.name +
            " · " +
            variant.durationMinutes +
            " phút · " +
            formatPrice(variant.priceVnd) +
            (variant.isActive ? "" : " · Tạm ngưng")
          : "+ Thêm gói thời lượng"}
      </summary>
      <form className="market-form" onSubmit={submit}>
        <label>
          Tên gói
          <input name="name" defaultValue={variant?.name} required minLength={2} maxLength={160} />
        </label>
        <div className="market-form-row">
          <label>
            Thời lượng (phút)
            <input
              name="durationMinutes"
              type="number"
              defaultValue={variant?.durationMinutes}
              required
              min={5}
              max={1440}
            />
          </label>
          <label>
            Giá niêm yết (VNĐ)
            <input
              name="priceVnd"
              type="number"
              defaultValue={variant?.priceVnd}
              required
              min={0}
              max={100000000000}
            />
          </label>
        </div>
        <div className="market-form-row">
          <label>
            Chuẩn bị trước (phút)
            <input
              name="bufferBeforeMinutes"
              type="number"
              defaultValue={variant?.bufferBeforeMinutes || 0}
              required
              min={0}
              max={240}
            />
          </label>
          <label>
            Chuẩn bị sau (phút)
            <input
              name="bufferAfterMinutes"
              type="number"
              defaultValue={variant?.bufferAfterMinutes || 0}
              required
              min={0}
              max={240}
            />
          </label>
        </div>
        <label className="market-check">
          <input name="isActive" type="checkbox" defaultChecked={variant?.isActive || !variant} />
          Gói đang hoạt động
        </label>
        {notice && (
          <p className="market-notice" role="status">
            {notice}
          </p>
        )}
        <button className="market-button" disabled={mutation.isPending}>
          {mutation.isPending ? "Đang lưu..." : "Lưu gói & giá"}
        </button>
      </form>
      {variant && <BookingSettingsAdmin variantId={variant.id} />}
    </details>
  );
}
