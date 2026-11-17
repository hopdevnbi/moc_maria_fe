"use client";
import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { GuestLuckyWheel } from "./guest-lucky-wheel";
import { WheelGame } from "./wheel-game";
import { accountWheelTransport } from "./wheel-transport";
import styles from "./page.module.css";

export function GamePage({ account = false }: { account?: boolean }) {
  const { authFetch, status, user, retrySession } = useAuth();
  const transport = useMemo(() => accountWheelTransport(authFetch), [authFetch]);
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Điều hướng trò chơi">
        <Link href="/">
          <ArrowLeft size={17} /> Mộc Maria
        </Link>
        <Link href={account ? "/tro-choi" : "/tro-choi/tai-khoan"}>
          {account ? "Chơi thử miễn phí" : "Dùng coin tài khoản"}
        </Link>
      </nav>
      <header className={styles.intro}>
        <span>
          <Gamepad2 size={17} /> MỘC MARIA · KHOẢNH KHẮC THƯ GIÃN
        </span>
        <h1>
          Một vòng quay.
          <br />
          Thêm chút <em>may mắn.</em>
        </h1>
        <p>
          {account
            ? "Sử dụng coin check-in của bạn. Mỗi lượt là một lựa chọn, mọi kết quả đều được ghi nhận."
            : "Chơi vui không cần đăng nhập. Tự chọn số coin và làm quen với vòng quay 20 giây."}
        </p>
      </header>
      {!account ? (
        <GuestLuckyWheel />
      ) : status === "authenticated" && user && !user.mustChangePassword ? (
        <WheelGame key={user.id + ":" + user.sessionId} transport={transport} />
      ) : (
        <section className={styles.access}>
          <h2>
            {status === "loading"
              ? "Đang kiểm tra tài khoản…"
              : user?.mustChangePassword
                ? "Cập nhật mật khẩu trước khi chơi"
                : "Coin của bạn, trong tài khoản của bạn"}
          </h2>
          <p>
            Coin chơi thử luôn tách riêng và không chuyển vào ví tài khoản. Bạn có thể chơi thử
            ngay, hoặc đăng nhập để dùng coin đã tích lũy.
          </p>
          <Link
            href={
              user?.mustChangePassword
                ? "/tai-khoan#doi-mat-khau"
                : "/dang-nhap?returnTo=%2Ftro-choi%2Ftai-khoan"
            }
          >
            {user?.mustChangePassword ? "Đến tài khoản" : "Đăng nhập"}
          </Link>
          <Link href="/tro-choi">Chơi thử miễn phí</Link>
          {status === "unavailable" && (
            <button onClick={() => void retrySession()}>Thử lại kết nối tài khoản</button>
          )}
        </section>
      )}
    </main>
  );
}
