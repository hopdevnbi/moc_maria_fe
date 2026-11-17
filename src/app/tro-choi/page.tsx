import type { Metadata } from "next";
import { GamePage } from "@/features/lucky-wheel/game-page";
export const metadata: Metadata = {
  title: "Vòng xoay may mắn | Mộc Maria",
  description: "Chơi thử vòng xoay may mắn miễn phí, không cần tài khoản.",
};
export default function Page() {
  return <GamePage />;
}
