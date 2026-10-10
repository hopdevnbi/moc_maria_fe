"use client";

import Image from "next/image";
import { useState } from "react";
import { initialsForName } from "./ktv-admin-utils";

export function KtvAvatar({
  name,
  src,
  size = "small",
  illustrative = false,
}: {
  name: string;
  src?: string | null;
  size?: "small" | "large";
  illustrative?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const usable =
    !!src &&
    (/^https:\/\//i.test(src) || /^\/media\/ktv\/[a-z0-9._-]+\.webp$/i.test(src)) &&
    !src.includes("..");
  return (
    <span className={"mm-ktv-avatar mm-ktv-avatar-" + size}>
      {usable && !failed ? (
        <Image
          src={src}
          alt={(illustrative ? "Ảnh minh họa hoạt động chăm sóc của " : "Ảnh đại diện ") + name}
          width={size === "large" ? 90 : 48}
          height={size === "large" ? 90 : 48}
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-label={"Chưa có ảnh đại diện của " + name}>{initialsForName(name)}</span>
      )}
    </span>
  );
}
