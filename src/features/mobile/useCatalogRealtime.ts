"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { subscribeCatalogRevision } from "./catalog-revision-watch";

export function useCatalogRealtime() {
  const router = useRouter();
  useEffect(() => subscribeCatalogRevision(router.refresh), [router]);
}
