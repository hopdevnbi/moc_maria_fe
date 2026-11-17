import type { Metadata } from "next";
import { GamePage } from "@/features/lucky-wheel/game-page";
export const metadata: Metadata = {
  title: "Vòng xoay coin tài khoản | Mộc Maria",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <GamePage account />;
}
