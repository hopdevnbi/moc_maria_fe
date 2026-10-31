import { ArrowUpRight, Gift, Snowflake } from "lucide-react";
import Image from "next/image";

export function ChristmasWelcome() {
  return (
    <aside className="christmas-welcome" aria-label="Mùa Giáng sinh tại Mộc Maria">
      <Image src="/christmas/santa-face.svg" width={22} height={24} alt="" />
      <Snowflake size={13} aria-hidden="true" />
      <span>Một mùa an lành, ngàn lời thương mến</span>
      <a href="https://event.mocmaria.com/">
        <Gift size={14} aria-hidden="true" /> Mở quà Noel{" "}
        <ArrowUpRight size={13} aria-hidden="true" />
      </a>
    </aside>
  );
}
