"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleDashed,
  Eye,
  EyeOff,
  Layers3,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tags,
  X,
} from "lucide-react";
import { usePrivateData, usePrivateMutation, mutationMessage } from "./private-api";
import { EmptyState } from "./components";
import { formatPrice } from "./format";
import type { Category, Service, Variant } from "./types";
import { BookingSettingsAdmin } from "./booking-settings";
import "./catalog-admin.css";

type CatalogView = "services" | "categories";
type PublishFilter = "all" | "visible" | "draft";

export function CatalogAdmin() {
  const categories = usePrivateData<Category[]>("/admin/service-categories");
  const services = usePrivateData<Service[]>("/admin/services");
  const [view, setView] = useState<CatalogView>("services");
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [publishFilter, setPublishFilter] = useState<PublishFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newCategory, setNewCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  if (categories.isPending || services.isPending) {
    return (
      <div className="mm-cat-loading" role="status">
        <Sparkles size={23} aria-hidden="true" />
        Đang chuẩn bị không gian quản lý dịch vụ…
      </div>
    );
  }
  if (categories.isError || services.isError) {
    return (
      <EmptyState title="Chưa tải được danh mục dịch vụ" error>
        <button
          className="market-button"
          type="button"
          onClick={() => {
            void categories.refetch();
            void services.refetch();
          }}
        >
          Thử tải lại
        </button>
      </EmptyState>
    );
  }

  const categoryList = [...categories.data].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "vi"),
  );
  const categoryById = new Map(categoryList.map((category) => [category.id, category]));
  const allServices = [...services.data].sort((a, b) => a.name.localeCompare(b.name, "vi"));
  const isVisible = (service: Service) =>
    service.isPublished && categoryById.get(service.categoryId)?.isPublished === true;
  const liveCount = allServices.filter(isVisible).length;
  const draftCount = allServices.length - liveCount;
  const search = query.trim().toLocaleLowerCase("vi");
  const matchingServices = allServices.filter((service) => {
    const category = categoryById.get(service.categoryId);
    return (
      (!search ||
        [service.name, service.description || "", category?.name || ""]
          .join(" ")
          .toLocaleLowerCase("vi")
          .includes(search)) &&
      (categoryId === "all" || service.categoryId === categoryId) &&
      (publishFilter === "all" ||
        (publishFilter === "visible" ? isVisible(service) : !isVisible(service)))
    );
  });
  const selected = allServices.find((service) => service.id === selectedId) ?? null;
  const editorOpen = creating || !!selected;
  const resetFilters = () => {
    setQuery("");
    setCategoryId("all");
    setPublishFilter("all");
  };

  return (
    <div className="mm-cat">
      <section className="mm-cat-hero" aria-label="Tổng quan dịch vụ">
        <div className="mm-cat-hero-content">
          <span className="mm-cat-eyebrow">
            <Sparkles size={14} aria-hidden="true" /> CATALOG STUDIO · MỘC MARIA
          </span>
          <h2>Chăm sóc từng dịch vụ, chỉn chu từng mức giá.</h2>
          <p>
            Từ danh mục đến từng gói thời lượng, mọi thay đổi được quản lý tại một nơi.
          </p>
          <div className="mm-cat-hero-actions">
            <button
              type="button"
              className="mm-cat-action-primary"
              disabled={!categoryList.length}
              onClick={() => {
                setView("services");
                setCreating(true);
                setSelectedId(null);
              }}
            >
              <Plus size={18} aria-hidden="true" /> Thêm dịch vụ
            </button>
            <Link href="/dich-vu" target="_blank" rel="noopener noreferrer" className="mm-cat-action-ghost">
              Xem trang khách hàng <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="mm-cat-hero-decoration" aria-hidden="true">
          <span className="mm-cat-deco-small">MỘC</span>
          <Sparkles size={58} strokeWidth={1.1} />
          <span>WELLNESS · CARE</span>
        </div>
      </section>

      <div className="mm-cat-summary" aria-label="Thống kê danh mục">
        <div className="mm-cat-stat">
          <span className="mm-cat-stat-icon"><Layers3 size={19} /></span>
          <div><strong>{allServices.length}</strong><span>Tổng dịch vụ</span></div>
        </div>
        <div className="mm-cat-stat">
          <span className="mm-cat-stat-icon mm-cat-stat-icon-live"><Eye size={19} /></span>
          <div><strong>{liveCount}</strong><span>Đang hiển thị</span></div>
        </div>
        <div className="mm-cat-stat">
          <span className="mm-cat-stat-icon mm-cat-stat-icon-draft"><CircleDashed size={19} /></span>
          <div><strong>{draftCount}</strong><span>Chưa hiển thị</span></div>
        </div>
        <div className="mm-cat-stat">
          <span className="mm-cat-stat-icon"><Tags size={19} /></span>
          <div><strong>{categoryList.length}</strong><span>Danh mục</span></div>
        </div>
      </div>

      <div className="mm-cat-section-tabs" role="tablist" aria-label="Nội dung quản lý">
        <button
          type="button"
          role="tab"
          aria-selected={view === "services"}
          className={view === "services" ? "is-active" : ""}
          onClick={() => setView("services")}
        >
          <Layers3 size={18} /> Dịch vụ <span>{allServices.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "categories"}
          className={view === "categories" ? "is-active" : ""}
          onClick={() => setView("categories")}
        >
          <Tags size={18} /> Danh mục <span>{categoryList.length}</span>
        </button>
      </div>

      {view === "services" ? (
        <section className="mm-cat-workspace" aria-label="Quản lý dịch vụ">
          <div className="mm-cat-main-list">
            <div className="mm-cat-section-heading">
              <div>
                <h2>Danh sách dịch vụ</h2>
                <p>Tìm nhanh, chọn dịch vụ để sửa thông tin và bảng giá.</p>
              </div>
            </div>
            <div className="mm-cat-filters">
              <label className="mm-cat-search">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">Tìm dịch vụ</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  type="search"
                  placeholder="Tìm dịch vụ, mô tả, danh mục…"
                />
              </label>
              <label className="mm-cat-filter-select">
                <span className="sr-only">Lọc danh mục</span>
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                  <option value="all">Tất cả danh mục</option>
                  {categoryList.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label className="mm-cat-filter-select">
                <span className="sr-only">Lọc trạng thái</span>
                <select
                  value={publishFilter}
                  onChange={(event) => setPublishFilter(event.target.value as PublishFilter)}
                >
                  <option value="all">Mọi trạng thái</option>
                  <option value="visible">Đang hiển thị</option>
                  <option value="draft">Chưa hiển thị</option>
                </select>
              </label>
            </div>
            <div className="mm-cat-results">
              <span><SlidersHorizontal size={15} /> {matchingServices.length} / {allServices.length} dịch vụ</span>
              {(query || categoryId !== "all" || publishFilter !== "all") && (
                <button type="button" onClick={resetFilters}>Xóa bộ lọc <X size={14} /></button>
              )}
            </div>
            {matchingServices.length ? (
              <div className="mm-cat-service-list">
                {matchingServices.map((service, index) => {
                  const category = categoryById.get(service.categoryId);
                  const visible = isVisible(service);
                  const active = selectedId === service.id && !creating;
                  return (
                    <article key={service.id} className={"mm-cat-service-item" + (active ? " is-selected" : "")}>
                      <button
                        type="button"
                        className="mm-cat-service-trigger"
                        aria-pressed={active}
                        onClick={() => {
                          setSelectedId(service.id);
                          setCreating(false);
                        }}
                      >
                        <span className="mm-cat-service-number">{String(index + 1).padStart(2, "0")}</span>
                        <span className="mm-cat-service-content">
                          <span className="mm-cat-service-name">{service.name}</span>
                          <span className="mm-cat-service-category">{category?.name || "Chưa phân loại"}</span>
                          {service.description && (
                            <span className="mm-cat-service-description">{service.description}</span>
                          )}
                        </span>
                        <span className="mm-cat-service-end">
                          <span className={"mm-cat-status " + (visible ? "is-live" : "is-draft")}>
                            {visible ? <Eye size={13} /> : <EyeOff size={13} />}
                            {visible ? "Hiển thị" : service.isPublished ? "Danh mục ẩn" : "Bản nháp"}
                          </span>
                          <span className="mm-cat-service-edit">
                            {active ? "Đang chỉnh sửa" : "Sửa & bảng giá"}
                            <ChevronRight size={16} aria-hidden="true" />
                          </span>
                        </span>
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mm-cat-empty">
                <Search size={27} aria-hidden="true" />
                <h3>Không tìm thấy dịch vụ phù hợp</h3>
                <p>Thử tìm một tên khác hoặc xóa bộ lọc để xem lại toàn bộ dịch vụ.</p>
                <button type="button" className="market-button market-button-secondary" onClick={resetFilters}>
                  Xem tất cả dịch vụ
                </button>
              </div>
            )}
          </div>

          <aside className={"mm-cat-side-panel" + (editorOpen ? " is-editing" : "")} aria-label="Chi tiết dịch vụ">
            {editorOpen ? (
              <ServiceEditor
                key={selected?.id || "new"}
                service={selected}
                categories={categoryList}
                onClose={() => {
                  setSelectedId(null);
                  setCreating(false);
                }}
              />
            ) : (
              <div className="mm-cat-guidance">
                <div className="mm-cat-guidance-symbol"><Pencil size={27} strokeWidth={1.5} /></div>
                <span className="mm-cat-mini-label">QUẢN LÝ NHẸ NHÀNG HƠN</span>
                <h3>Mọi thứ bắt đầu từ một dịch vụ.</h3>
                <p>Chọn một dịch vụ bên trái để cập nhật tên, trạng thái và quản lý từng gói thời lượng.</p>
                <div className="mm-cat-guidance-steps">
                  <div><span>01</span> Chọn dịch vụ cần chỉnh sửa</div>
                  <div><span>02</span> Cập nhật thông tin, gói & giá</div>
                  <div><span>03</span> Lưu để đồng bộ lên hệ thống</div>
                </div>
                <div className="mm-cat-guidance-note">
                  <Check size={16} />
                  Dịch vụ chỉ xuất hiện với khách khi cả dịch vụ và danh mục đều được công bố.
                </div>
              </div>
            )}
          </aside>
        </section>
      ) : (
        <section className="mm-cat-categories" aria-label="Quản lý danh mục">
          <div className="mm-cat-category-heading">
            <div>
              <h2>Nhóm dịch vụ khoa học hơn</h2>
              <p>Chỉ mở biểu mẫu khi cần chỉnh sửa. Các nhóm giúp khách tìm đúng trải nghiệm chăm sóc.</p>
            </div>
            <button
              type="button"
              className="mm-cat-action-primary"
              onClick={() => {
                setNewCategory((current) => !current);
                setEditingCategory(null);
              }}
            >
              {newCategory ? <X size={18} /> : <Plus size={18} />}
              {newCategory ? "Đóng biểu mẫu" : "Thêm danh mục"}
            </button>
          </div>
          {newCategory && (
            <div className="mm-cat-category-form">
              <CategoryEditor onClose={() => setNewCategory(false)} />
            </div>
          )}
          {categoryList.length ? (
            <div className="mm-cat-category-list">
              {categoryList.map((category) => {
                const count = allServices.filter((service) => service.categoryId === category.id).length;
                const editing = editingCategory === category.id;
                return (
                  <article key={category.id} className={"mm-cat-category-card" + (editing ? " is-editing" : "")}>
                    <div className="mm-cat-category-card-top">
                      <span className="mm-cat-category-icon"><Tags size={20} /></span>
                      <div className="mm-cat-category-info">
                        <h3>{category.name}</h3>
                        <span>{count} dịch vụ · Thứ tự {category.sortOrder}</span>
                      </div>
                      <span className={"mm-cat-status " + (category.isPublished ? "is-live" : "is-draft")}>
                        {category.isPublished ? "Đã công bố" : "Bản nháp"}
                      </span>
                      <button
                        type="button"
                        className="mm-cat-category-edit"
                        aria-expanded={editing}
                        onClick={() => {
                          setEditingCategory(editing ? null : category.id);
                          setNewCategory(false);
                        }}
                      >
                        {editing ? <X size={17} /> : <Pencil size={17} />}
                        {editing ? "Đóng" : "Chỉnh sửa"}
                      </button>
                    </div>
                    {category.description && !editing && (
                      <p className="mm-cat-category-description">{category.description}</p>
                    )}
                    {editing && (
                      <div className="mm-cat-category-form">
                        <CategoryEditor
                          key={category.id + category.updatedAt}
                          category={category}
                          onClose={() => setEditingCategory(null)}
                        />
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mm-cat-empty">
              <Tags size={27} aria-hidden="true" />
              <h3>Chưa có danh mục nào</h3>
              <p>Hãy tạo danh mục đầu tiên để bắt đầu sắp xếp dịch vụ.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function CategoryEditor({
  category,
  onClose,
}: {
  category?: Category;
  onClose?: () => void;
}) {
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
      if (!category) {
        form.reset();
        onClose?.();
      }
    } catch (error) {
      setNotice(mutationMessage(error));
    }
  }
  return (
    <article className="mm-cat-editor-form">
      <div className="mm-cat-form-heading"><h3>{category ? "Cập nhật danh mục" : "Thêm danh mục mới"}</h3></div>
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
    <article className="mm-cat-editor-form">
      <div className="market-toolbar mm-cat-edit-header">
        <div>
          <span className="mm-cat-mini-label">CHI TIẾT & BẢNG GIÁ</span>
          <h2>{service ? service.name : "Tạo dịch vụ mới"}</h2>
        </div>
        <button
          type="button"
          className="mm-cat-close-editor"
          onClick={onClose}
          aria-label="Đóng trình chỉnh sửa"
        >
          <X size={18} />
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
    <details className="market-admin-details">
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
