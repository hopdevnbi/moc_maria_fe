import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, MapPin } from "lucide-react";
import { publicRead } from "./public-api";
import type { Category, ServiceDetail, ServiceItem } from "./types";
import { EmptyState, ServiceCard } from "./components";
import { formatPrice } from "./format";

export async function ServiceResults({
  searchParams,
  preview = false,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
  preview?: boolean;
}) {
  const query = searchParams ? await searchParams : {};
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 160) : "";
  const category = typeof query.category === "string" ? query.category : "";
  const [services, categories] = await Promise.all([
    publicRead<ServiceItem[]>("/services"),
    publicRead<Category[]>("/service-categories"),
  ]);
  if (!services.ok)
    return (
      <EmptyState title="Chưa tải được danh mục dịch vụ" error>
        <p>Kết nối đang gián đoạn. Bạn có thể thử lại hoặc liên hệ Mộc để được hỗ trợ.</p>
        <Link href="/dich-vu">Thử tải lại danh mục</Link>
      </EmptyState>
    );
  const items = services.data.filter(
    (item) =>
      (!q ||
        (item.service.name + " " + (item.service.description || ""))
          .toLocaleLowerCase("vi")
          .includes(q.toLocaleLowerCase("vi"))) &&
      (!category || item.service.categoryId === category),
  );
  return (
    <>
      {!preview && (
        <form action="/dich-vu" className="market-search">
          <label>
            Bạn muốn chăm sóc điều gì?
            <input name="q" defaultValue={q} placeholder="Tìm tên dịch vụ..." maxLength={160} />
          </label>
          <label>
            Danh mục
            <select name="category" defaultValue={category}>
              <option value="">Tất cả danh mục</option>
              {categories.ok &&
                categories.data.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
          <button className="market-button" type="submit">
            Tìm trải nghiệm
            <ArrowUpRight size={17} />
          </button>
        </form>
      )}
      {items.length ? (
        <div className="market-grid">
          {(preview ? items.slice(0, 3) : items).map((item) => (
            <ServiceCard key={item.service.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            q || category
              ? "Chưa tìm thấy trải nghiệm phù hợp"
              : "Những trải nghiệm mới đang được chuẩn bị"
          }
        >
          <p>
            {q || category
              ? "Thử một tên dịch vụ hoặc danh mục khác để tìm lựa chọn phù hợp với bạn."
              : "Mộc đang cập nhật các gói chăm sóc và bảng giá chính thức. Khi một gói được công bố, bạn sẽ thấy đầy đủ thời lượng và giá ngay tại đây."}
          </p>
          {q || category ? (
            <Link href="/dich-vu">Xem tất cả dịch vụ</Link>
          ) : (
            <a href="https://www.facebook.com/mocmariads" target="_blank" rel="noopener noreferrer">
              Liên hệ Mộc để được tư vấn
            </a>
          )}
        </EmptyState>
      )}
    </>
  );
}

export async function PriceResults() {
  const result = await publicRead<ServiceItem[]>("/services");
  if (!result.ok)
    return (
      <EmptyState title="Chưa tải được bảng giá" error>
        <Link href="/bang-gia">Thử tải lại</Link>
      </EmptyState>
    );
  const rows = result.data.flatMap((item) =>
    item.variants.map((variant) => ({ service: item.service, variant })),
  );
  if (!rows.length)
    return (
      <EmptyState title="Bảng giá chính thức đang được cập nhật">
        <p>Các gói có giá công khai sẽ xuất hiện tại đây sau khi Mộc công bố.</p>
        <Link href="/dich-vu">Khám phá danh mục dịch vụ</Link>
      </EmptyState>
    );
  return (
    <>
      <div className="market-table-wrap">
        <table className="market-table">
          <thead>
            <tr>
              <th>Gói chăm sóc</th>
              <th>Thời lượng</th>
              <th>Giá niêm yết</th>
              <th>Thông tin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ service, variant }) => (
              <tr key={variant.id}>
                <td>
                  <strong>{service.name}</strong>
                  <p>{variant.name}</p>
                </td>
                <td>{variant.durationMinutes} phút</td>
                <td>
                  <strong>{formatPrice(variant.priceVnd)}</strong>
                </td>
                <td>
                  <Link href={`/dich-vu/${encodeURIComponent(service.slug)}`}>
                    Xem gói
                    <ArrowUpRight size={15} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="market-notice">
        Giá niêm yết của từng gói được công bố bởi Mộc Maria. Mọi phụ phí cần được thể hiện trong
        báo giá và được bạn chấp thuận trước khi xác nhận lịch.
      </p>
    </>
  );
}

export async function ServiceDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await publicRead<ServiceDetail>(`/services/${encodeURIComponent(slug)}`);
  if (!result.ok) {
    if (result.status === 404) notFound();
    return (
      <EmptyState title="Chưa tải được thông tin gói" error>
        <Link href="/dich-vu">Trở về danh mục</Link>
      </EmptyState>
    );
  }
  const { service, variants, branches } = result.data;
  return (
    <div className="market-two-column">
      <section className="market-panel">
        <p className="moc-eyebrow">GÓI CHĂM SÓC TẠI MỘC</p>
        <h2>{service.name}</h2>
        <p className="whitespace-pre-line">
          {service.description || "Thông tin chi tiết đang được Mộc cập nhật."}
        </p>
        <h3 className="mt-8 mb-4 text-lg font-semibold">Những lựa chọn dành cho bạn</h3>
        {variants.length ? (
          variants.map((variant) => (
            <div key={variant.id} className="market-variant">
              <div>
                <strong>{variant.name}</strong>
                <p>{variant.durationMinutes} phút</p>
              </div>
              <strong>{formatPrice(variant.priceVnd)}</strong>
            </div>
          ))
        ) : (
          <p>Gói và thời lượng đang được cập nhật.</p>
        )}
        <p className="market-notice">
          Bạn sẽ được xem báo giá gồm gói chăm sóc và phụ phí áp dụng trước khi xác nhận lịch. Mộc
          không tự thay đổi giá đã được bạn chấp thuận.
        </p>
        <Link href="/chuyen-vien" className="market-button">
          Khám phá chuyên viên
          <ArrowUpRight size={17} />
        </Link>
      </section>
      <aside className="market-panel">
        <h2>Cơ sở cung cấp</h2>
        {branches.length ? (
          branches.map(({ branch, priceOverrideVnd }) => (
            <div key={branch.id} className="market-branch">
              <h3>
                <MapPin size={17} />
                {branch.name}
              </h3>
              <p>{branch.address}</p>
              {branch.phone && (
                <a href={`tel:${branch.phone.replace(/[^+\d]/g, "")}`}>{branch.phone}</a>
              )}
              {priceOverrideVnd !== null && (
                <p className="market-notice">
                  Cơ sở có chính sách giá riêng. Vui lòng xem báo giá của lịch hẹn trước khi xác
                  nhận.
                </p>
              )}
            </div>
          ))
        ) : (
          <p>Thông tin cơ sở cung cấp gói này đang được cập nhật.</p>
        )}
      </aside>
    </div>
  );
}
