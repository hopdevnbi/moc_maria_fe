"use client";

import Image from "next/image";
import { useState, type ComponentProps } from "react";
import { MOC_MARIA_LOGO_URL, MOC_MARIA_LOGO_FALLBACK_URL } from "./brand";

export function BrandLogo(props: Omit<ComponentProps<typeof Image>, "src" | "onError">) {
  const [fallback, setFallback] = useState(false);
  return (
    <Image
      {...props}
      alt={props.alt}
      src={fallback ? MOC_MARIA_LOGO_FALLBACK_URL : MOC_MARIA_LOGO_URL}
      unoptimized
      onError={() => setFallback(true)}
    />
  );
}
