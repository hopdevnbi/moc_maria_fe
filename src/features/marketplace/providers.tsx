import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck, MapPin } from "lucide-react";
import { publicRead } from "./public-api";
import type { Provider } from "./types";
import { EmptyState, ProviderCard } from "./components";

export async function ProviderResults({ preview = false }: { preview?: boolean }) {
  const result = await publicRead<Provider[]>("/providers");
  if (!result.ok)
    return (
      <EmptyState title="Chưa tải được danh sách chuyên viên" error>
        <Link href="/chuyen-vien">Thử tải lại</Link>
      </EmptyState>
    );
  if (!result.data.length)
    return (
      <EmptyState title="Những người đồng hành cùng Mộc">
        <p>
          Hồ sơ chuyên viên sẽ được công bố khi hoàn tất đào tạo nội bộ, có chứng nhận hợp lệ và
          được Mộc phê duyệt.
        </p>
        <Link href="/tro-thanh-ktv">Trở thành KTV Mộc Maria</Link>
      </EmptyState>
    );
  return (
    <div className="market-grid">
      {(preview ? result.data.slice(0, 3) : result.data).map((provider) => (
        <ProviderCard key={provider.id} provider={provider} />
      ))}
    </div>
  );
}

export async function ProviderDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const result = await publicRead<Provider>(`/providers/${encodeURIComponent(id)}`);
  if (!result.ok) {
    if (result.status === 404 || result.status === 400) notFound();
    return (
      <EmptyState title="Chưa tải được hồ sơ chuyên viên" error>
        <Link href="/chuyen-vien">Trở về danh sách</Link>
      </EmptyState>
    );
  }
  const provider = result.data;
  return (
    <div className="market-two-column">
      <section className="market-panel">
        <span className="market-badge">
          <ShieldCheck size={15} />
          Đã hoàn thành đào tạo nội bộ
        </span>
        <h2 className="mt-5!">{provider.publicName}</h2>
        <p className="whitespace-pre-line">
          {provider.introduction || "Phần giới thiệu đang được cập nhật."}
        </p>
        <p className="market-card-meta">
          <MapPin size={17} />
          {provider.serviceArea || "Khu vực phục vụ đang được cập nhật"}
        </p>
        <p className="market-notice">
          Chứng nhận đào tạo nội bộ Mộc Maria xác nhận kết quả đào tạo tại Mộc, không thay thế giấy
          phép hành nghề chuyên ngành do cơ quan có thẩm quyền cấp.
        </p>
      </section>
      <aside className="market-panel">
        <h2>Trải nghiệm phù hợp</h2>
        <p>
          Gói chăm sóc và lịch phục vụ được công bố khi chuyên viên đáp ứng điều kiện của từng dịch
          vụ.
        </p>
        <Link className="market-button" href="/dich-vu">
          Khám phá gói chăm sóc
        </Link>
      </aside>
    </div>
  );
}
