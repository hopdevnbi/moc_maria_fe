import { ShieldCheck } from "lucide-react";

export function BookingReassurance() {
  return (
    <aside className="mm-booking-reassurance" aria-label="An tâm khi đặt lịch">
      <ShieldCheck size={22} aria-hidden="true" />
      <div>
        <strong>An tâm tận hưởng, tôn trọng lẫn nhau</strong>
        <p>
          Mộc Maria mang đến dịch vụ massage và chăm sóc lành mạnh, chuyên nghiệp. Để bảo vệ quyền
          lợi của khách hàng và KTV, mọi trải nghiệm cần sự tôn trọng và đồng thuận; các yêu cầu
          ngoài phạm vi dịch vụ sẽ không được tiếp nhận. Bạn và KTV đều có thể trao đổi hoặc dừng
          buổi chăm sóc khi cảm thấy không phù hợp.
        </p>
      </div>
    </aside>
  );
}
