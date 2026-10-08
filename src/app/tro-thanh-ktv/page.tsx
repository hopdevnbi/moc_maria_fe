import Link from "next/link";
import type { Metadata } from "next";
import { GraduationCap, Leaf, ShieldCheck } from "lucide-react";
import { MarketShell } from "@/features/marketplace/components";

export const metadata: Metadata = {
  title: "Trở thành KTV Mộc Maria",
  description: "Ứng tuyển chuyên viên, đồng hành cùng Mộc Maria qua đào tạo và đánh giá tay nghề.",
  alternates: { canonical: "/tro-thanh-ktv" },
};
export default function ApplyPage() {
  return (
    <MarketShell
      title="Cùng Mộc, chăm sóc bằng sự tận tâm."
      eyebrow="ĐỒNG HÀNH CÙNG MỘC"
      description="Một hành trình bắt đầu từ sự lắng nghe, tiếp nối bằng học hỏi và trách nhiệm trong từng trải nghiệm chăm sóc."
    >
      <div className="market-grid">
        {[
          {
            icon: Leaf,
            title: "Chia sẻ câu chuyện của bạn",
            description:
              "Giới thiệu kinh nghiệm, khu vực mong muốn phục vụ và lý do bạn muốn đồng hành cùng Mộc.",
          },
          {
            icon: GraduationCap,
            title: "Học hỏi & thực hành",
            description:
              "Tham gia khóa học được chỉ định, hoàn thành đào tạo và đánh giá tay nghề.",
          },
          {
            icon: ShieldCheck,
            title: "Phục vụ với trách nhiệm",
            description:
              "Hoàn tất xác minh và phê duyệt cho từng dịch vụ trước khi mở lịch chăm sóc.",
          },
        ].map((item) => (
          <article className="market-panel" key={item.title}>
            <item.icon size={30} strokeWidth={1.4} />
            <h2 className="mt-6!">{item.title}</h2>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
      <section className="market-panel market-section">
        <h2>Bạn đã sẵn sàng đồng hành?</h2>
        <p>
          Đăng nhập hoặc tạo tài khoản để gửi hồ sơ. Nếu đã ứng tuyển, bạn có thể theo dõi trạng
          thái ngay trong hồ sơ của mình.
        </p>
        <Link className="market-button" href="/ktv/ho-so">
          Ứng tuyển / Xem hồ sơ của tôi
        </Link>
        <p className="market-notice">
          Đào tạo tại Mộc cấp chứng nhận nội bộ. Quyền cung cấp dịch vụ cần đáp ứng đầy đủ điều kiện
          chuyên môn và các yêu cầu pháp lý tương ứng.
        </p>
      </section>
    </MarketShell>
  );
}
