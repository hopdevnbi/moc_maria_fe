import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Flower2,
  HandHeart,
  Leaf,
  Menu,
  Sprout,
  Waves,
} from "lucide-react";
import { AccountNav } from "@/features/auth/components/AccountNav";
import "./home.css";

const FACEBOOK_URL = "https://www.facebook.com/mocmariads";
const navigation = [
  { href: "#ve-moc", label: "Về Mộc Maria" },
  { href: "#dich-vu", label: "Dịch vụ" },
  { href: "#khong-gian", label: "Không gian" },
  { href: "#lien-he", label: "Liên hệ" },
];
const services = [
  {
    number: "01",
    icon: Sprout,
    title: "Chăm sóc cổ vai gáy",
    tag: "THẢ LỎNG & NGHỈ NGƠI",
    description:
      "Dành thời gian thả lỏng vùng cổ, vai và lưng sau những giờ làm việc dài. Để cơ thể được nghỉ ngơi theo cách thật nhẹ nhàng.",
  },
  {
    number: "02",
    icon: Waves,
    title: "Thư giãn toàn thân",
    tag: "CÂN BẰNG & THƯ GIÃN",
    description:
      "Tạm gác những bận rộn, lắng nghe cơ thể và tận hưởng một khoảng thời gian chăm sóc dành riêng cho chính mình.",
  },
  {
    number: "03",
    icon: Flower2,
    title: "Chăm sóc da",
    tag: "NÂNG NIU & CHĂM SÓC",
    description:
      "Một chút nâng niu cho làn da, một chút bình yên cho tâm trí. Khám phá trải nghiệm chăm sóc phù hợp với nhu cầu của bạn.",
  },
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
              <a
                href={FACEBOOK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="moc-button"
              >
                Hẹn một khoảng thư giãn
                <ArrowUpRight size={18} />
              </a>
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
          <div className="moc-service-list">
            {services.map(({ number, icon: Icon, title, description, tag }) => (
              <article className="moc-service" key={number}>
                <div className="moc-service-top">
                  <span>{number}</span>
                  <Icon size={35} strokeWidth={1.1} aria-hidden="true" />
                </div>
                <p className="moc-service-tag">{tag}</p>
                <h3>{title}</h3>
                <p className="moc-service-description">{description}</p>
                <a href={FACEBOOK_URL} target="_blank" rel="noopener noreferrer">
                  <span>Tìm hiểu & tư vấn</span>
                  <ArrowUpRight size={20} aria-hidden="true" />
                  <span className="sr-only"> về {title.toLocaleLowerCase("vi")}</span>
                </a>
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
