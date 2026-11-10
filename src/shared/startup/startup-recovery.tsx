import "./startup-recovery.css";

// This is server-rendered deliberately: the escape route must still work when
// an app chunk cannot load/parse and React never starts on an older iPhone.
export function StartupRecovery() {
  return (
    <aside className="moc-startup-recovery" aria-label="Hỗ trợ mở ứng dụng">
      <div className="moc-startup-generic">
        <strong>Trang vẫn chưa mở được?</strong>
        <p>Bạn có thể mở công cụ khôi phục để tải lại Mộc và kiểm tra trình duyệt.</p>
      </div>
      <div className="moc-startup-old-ios">
        <strong>Hãy cập nhật iOS để mở Mộc</strong>
        <p>
          Máy đang dùng iOS cũ hơn 16.4. Vào Cài đặt → Cài đặt chung → Cập nhật phần mềm, rồi mở lại
          Mộc.
        </p>
      </div>
      <a href="/pwa/recover.html">Khôi phục ứng dụng</a>
    </aside>
  );
}
