import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Flower2,
  HandHeart,
  Leaf,
  Menu,
  Sprout,
} from "lucide-react";
import { AccountNav } from "@/features/auth/components/AccountNav";
import { CardSkeleton } from "@/features/marketplace/components";
import { ServiceResults } from "@/features/marketplace/catalog";
import { ProviderResults } from "@/features/marketplace/providers";
import "./home.css";

const FACEBOOK_URL = "https://www.facebook.com/mocmariads";
const navigation = [
  { href: "#ve-moc", label: "Về Mộc Maria" },
  { href: "/dich-vu", label: "Dịch vụ" },
  { href: "/chuyen-vien", label: "Chuyên viên" },
  { href: "/bang-gia", label: "Bảng giá" },
  { href: "#lien-he", label: "Liên hệ" },
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Mộc Maria — Trang chủ"
      className={light ? "moc-brand moc-brand-light" : "moc-brand"}
    >
      <Image src="/brand/moc-maria-mark.webp" alt="" width={64} height={44} />
      <span className="moc-brand-type">
        <span className="moc-brand-name">Mộc Maria</span>
        <span className="moc-brand-descriptor">WELLNESS LOUNGE</span>
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="wellness-home">
      <a href="#noi-dung" className="moc-skip-link">
        Đi đến nội dung
      </a>
      <div className="moc-topline">
        <span>Một khoảng lặng, dành riêng cho bạn.</span>
        <span className="moc-topline-right">TỰ NHIÊN. TẬN TÂM. AN YÊN.</span>
      </div>
      <header className="moc-header moc-container">
        <Brand />
        <nav aria-label="Điều hướng chính" className="moc-desktop-nav">
          {navigation.map(({ href, label }) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="moc-header-actions">
          <div className="moc-account-nav">
            <AccountNav />
          </div>
          <details className="moc-mobile-menu">
            <summary aria-label="Mở menu điều hướng">
              <Menu size={22} />
            </summary>
            <nav aria-label="Điều hướng trên điện thoại">
              {navigation.map(({ href, label }) => (
                <a key={href} href={href}>
                  {label}
                  <ArrowUpRight size={16} />
                </a>
              ))}
            </nav>
          </details>
        </div>
      </header>
      <main id="noi-dung">
        <section className="moc-hero moc-container" aria-labelledby="hero-title">
          <div className="moc-hero-copy">
            <p className="moc-eyebrow">
              <span className="moc-eyebrow-line" />
              NƠI GỬI TRAO SỨC KHỎE
            </p>
            <h1 id="hero-title">
              Chậm lại một chút.
              <br />
              <em>Thương mình</em>
              <br />
              nhiều hơn.
            </h1>
            <p className="moc-hero-description">
              Giữa nhịp sống vội vã, Mộc Maria là một khoảng lặng để bạn thả lỏng cơ thể, nuôi dưỡng
              tâm trí và tìm lại sự cân bằng từ bên trong.
            </p>
            <div className="moc-hero-actions">
              <Link href="/dich-vu" className="moc-button">
                Đặt lịch chăm sóc
                <ArrowUpRight size={18} />
              </Link>
              <a href="#dich-vu" className="moc-text-link">
                Khám phá dịch vụ
                <ArrowDown size={15} />
              </a>
            </div>
            <div className="moc-hero-note">
              <span className="moc-hero-note-icon">
                <Leaf size={21} strokeWidth={1.4} />
              </span>
              <p>
                Chăm sóc bằng sự lắng nghe.
                <br />
                Đồng hành bằng sự tận tâm.
              </p>
            </div>
          </div>
          <figure className="moc-hero-visual" id="khong-gian">
            <div className="moc-hero-image-wrap">
              <Image
                src="/images/wellness-sanctuary.webp"
                alt="Cảm hứng không gian wellness với ánh sáng tự nhiên, gỗ ấm và sắc xanh olive"
                fill
                priority
                sizes="(max-width: 760px) 100vw, (max-width: 1200px) 48vw, 570px"
                className="moc-hero-image"
              />
              <div className="moc-image-caption">
                <span>A LITTLE PAUSE, A LOT OF CARE.</span>
                <span>MỘC MARIA</span>
              </div>
            </div>
            <div className="moc-hero-seal" aria-hidden="true">
              <Sprout size={27} strokeWidth={1} />
              <span>VỀ VỚI</span>
              <em>an yên</em>
            </div>
            <figcaption>Hình ảnh minh họa cảm hứng không gian</figcaption>
          </figure>
        </section>
        <div className="moc-values" aria-label="Giá trị của Mộc Maria">
          <div className="moc-container">
            <span>Lắng nghe cơ thể</span>
            <Flower2 size={18} strokeWidth={1} aria-hidden="true" />
            <span>Nâng niu từng trải nghiệm</span>
            <Flower2 size={18} strokeWidth={1} aria-hidden="true" />
            <span>Chạm đến bình yên</span>
          </div>
        </div>
        <section
          id="dich-vu"
          className="moc-services moc-container"
          aria-labelledby="services-title"
        >
          <div className="moc-section-heading">
            <div>
              <p className="moc-eyebrow">TRẢI NGHIỆM TẠI MỘC</p>
              <h2 id="services-title">
                Một chút chăm sóc.
                <br />
                <em>Một ngày nhẹ hơn.</em>
              </h2>
            </div>
            <p>
              Mỗi cơ thể có một câu chuyện riêng.
              <br />
              Hãy để Mộc cùng bạn tìm trải nghiệm phù hợp.
            </p>
          </div>
          <form action="/dich-vu" className="market-search">
            <label>
              Bạn muốn chăm sóc điều gì?
              <input name="q" placeholder="Tìm gói chăm sóc phù hợp..." maxLength={160} />
            </label>
            <button type="submit" className="market-button">
              Tìm trải nghiệm
              <ArrowUpRight size={17} />
            </button>
          </form>
          <Suspense fallback={<CardSkeleton />}>
            <ServiceResults preview />
          </Suspense>
          <div className="mt-8">
            <Link href="/dich-vu" className="moc-text-link">
              Khám phá tất cả dịch vụ
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
        <section className="moc-container market-section" aria-labelledby="providers-title">
          <div className="market-section-heading">
            <div>
              <p className="moc-eyebrow">NHỮNG NGƯỜI ĐỒNG HÀNH</p>
              <h2 id="providers-title">Tận tâm trong từng trải nghiệm.</h2>
            </div>
            <Link href="/chuyen-vien">
              Gặp gỡ chuyên viên
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <Suspense fallback={<CardSkeleton />}>
            <ProviderResults preview />
          </Suspense>
        </section>
        <section className="moc-container market-section" aria-labelledby="journey-title">
          <div className="market-section-heading">
            <div>
              <p className="moc-eyebrow">HÀNH TRÌNH CHĂM SÓC</p>
              <h2 id="journey-title">An tâm từ bước đầu tiên.</h2>
            </div>
          </div>
          <div className="market-steps">
            {[
              {
                title: "Chọn trải nghiệm",
                description:
                  "Xem gói chăm sóc, thời lượng và giá niêm yết phù hợp với nhu cầu của bạn.",
              },
              {
                title: "Tìm người đồng hành",
                description: "Tìm hiểu hồ sơ, chuyên môn và khu vực phục vụ của chuyên viên.",
              },
              {
                title: "Xác nhận rõ ràng",
                description:
                  "Kiểm tra thời gian, địa điểm và báo giá. Mọi phụ phí cần được bạn chấp thuận.",
              },
              {
                title: "Dành thời gian cho mình",
                description:
                  "Thả lỏng và chia sẻ trải nghiệm của bạn sau buổi chăm sóc đã hoàn thành.",
              },
            ].map((step, index) => (
              <article className="market-step" key={step.title}>
                <span>0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="ve-moc" className="moc-story" aria-labelledby="story-title">
          <div className="moc-story-grid moc-container">
            <figure className="moc-story-visual">
              <Image
                src="/images/wellness-ritual.webp"
                alt="Ảnh minh họa tách trà thảo mộc, khăn linen và những vật liệu tự nhiên"
                fill
                sizes="(max-width: 760px) 100vw, 50vw"
              />
              <figcaption>MỘT TÁCH TRÀ. MỘT NHỊP THỞ. MỘT KHOẢNG LẶNG.</figcaption>
            </figure>
            <div className="moc-story-copy">
              <p className="moc-eyebrow">TINH THẦN MỘC MARIA</p>
              <h2 id="story-title">
                Chăm sóc từ những
                <br />
                <em>điều thật nhỏ.</em>
              </h2>
              <p>
                Chúng tôi tin rằng chăm sóc bản thân không cần là một điều xa xỉ. Đôi khi, đó chỉ là
                cho mình thời gian nghỉ ngơi, một không gian yên tĩnh và sự quan tâm đúng lúc.
              </p>
              <p>
                Tại Mộc Maria, sự mộc mạc và lòng tận tâm là điểm bắt đầu của mỗi trải nghiệm. Để
                khi bước ra, bạn mang theo một cảm giác nhẹ nhàng hơn.
              </p>
              <div className="moc-story-signature">
                <HandHeart size={28} strokeWidth={1.2} />
                <span>Mộc trong không gian. Tâm trong chăm sóc.</span>
              </div>
            </div>
          </div>
        </section>
        <section className="moc-container market-section" aria-labelledby="academy-title">
          <div className="market-panel market-two-column">
            <div>
              <p className="moc-eyebrow">ĐỒNG HÀNH CÙNG MỘC</p>
              <h2 id="academy-title">
                Từ đôi tay tận tâm,
                <br />
                đến hành trình vững vàng.
              </h2>
              <p>
                Mộc tìm kiếm những người muốn đồng hành trong việc chăm sóc khách hàng. Gửi hồ sơ,
                tham gia đào tạo và theo dõi kết quả đánh giá trong tài khoản của bạn.
              </p>
            </div>
            <div>
              <p className="market-notice">
                Đào tạo và chứng nhận nội bộ là một phần của quá trình xét duyệt chuyên viên. Hồ sơ
                chỉ được công bố khi được phê duyệt và đáp ứng điều kiện phục vụ.
              </p>
              <Link href="/tro-thanh-ktv" className="market-button">
                Trở thành KTV Mộc Maria
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
        </section>
        <section className="moc-container market-section" aria-labelledby="faq-title">
          <div className="market-section-heading">
            <div>
              <p className="moc-eyebrow">MỘC LẮNG NGHE BẠN</p>
              <h2 id="faq-title">Một vài điều bạn muốn biết.</h2>
            </div>
          </div>
          <div className="market-faq">
            {[
              {
                q: "Tôi xem giá dịch vụ ở đâu?",
                a: "Mỗi gói được công bố cùng thời lượng và giá niêm yết trong danh mục Dịch vụ và Bảng giá. Những thông tin chưa được công bố sẽ được ghi rõ là đang cập nhật.",
              },
              {
                q: "Chuyên viên được xét duyệt như thế nào?",
                a: "Hồ sơ cần được Mộc phê duyệt và có chứng nhận đào tạo nội bộ hợp lệ. Các điều kiện phục vụ còn được xét theo từng dịch vụ và lịch làm việc.",
              },
              {
                q: "Chứng nhận nội bộ có phải giấy phép hành nghề?",
                a: "Không. Chứng nhận nội bộ xác nhận kết quả đào tạo tại Mộc Maria, không thay thế giấy phép hành nghề chuyên ngành do cơ quan có thẩm quyền cấp.",
              },
              {
                q: "Làm thế nào để ứng tuyển KTV?",
                a: "Tạo tài khoản, gửi hồ sơ qua mục Trở thành KTV và theo dõi tiến trình xét duyệt, các khóa học được chỉ định trong khu vực KTV của bạn.",
              },
            ].map((faq) => (
              <details key={faq.q}>
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section id="lien-he" className="moc-contact moc-container" aria-labelledby="contact-title">
          <div className="moc-contact-flower" aria-hidden="true">
            <Flower2 size={54} strokeWidth={0.75} />
          </div>
          <p className="moc-eyebrow">DÀNH MỘT CHÚT THỜI GIAN CHO BẠN</p>
          <h2 id="contact-title">
            Hôm nay, bạn đã
            <br />
            <em>thương mình chưa?</em>
          </h2>
          <p>Nhắn tin cho Mộc để được tư vấn dịch vụ, lịch hẹn và thông tin cơ sở.</p>
          <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="moc-button">
            Kết nối với Mộc Maria
            <ArrowUpRight size={19} />
          </a>
          <span className="moc-contact-channel">Qua trang Facebook Mộc Maria Wellness Lounge</span>
        </section>
      </main>
      <footer className="moc-footer">
        <div className="moc-footer-top moc-container">
          <div>
            <Brand light />
            <p>Nơi gửi trao sức khỏe. Nơi tìm về an yên.</p>
          </div>
          <nav aria-label="Điều hướng chân trang">
            <a href="#ve-moc">Về Mộc Maria</a>
            <a href="#dich-vu">Dịch vụ</a>
            <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
              Facebook
              <ArrowUpRight size={14} />
            </a>
            <Link href="/dang-nhap">
              Tài khoản
              <ArrowRight size={14} />
            </Link>
          </nav>
        </div>
        <div className="moc-footer-bottom moc-container">
          <span>© 2026 Mộc Maria Wellness Lounge</span>
          <span>Chăm sóc bạn, bằng cả sự tận tâm.</span>
        </div>
      </footer>
    </div>
  );
}
