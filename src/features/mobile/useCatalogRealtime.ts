"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

type RevisionPayload = { revision: string };

const socketBase = "https://chat.giangxa.com/moc-maria-updates";
const intervalMs = 90_000;

export function useCatalogRealtime() {
  const router = useRouter();
  const lastRevision = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let inFlight = false;

    async function checkRevision() {
      if (!active || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/mobile/public-revision", {
          cache: "no-store",
          credentials: "omit",
        });
        if (!response.ok) return;
        const body = (await response.json()) as RevisionPayload;
        if (!/^[0-9a-f]{24}$/.test(body.revision)) return;
        const previous = lastRevision.current;
        lastRevision.current = body.revision;
        if (previous && previous !== body.revision) router.refresh();
      } catch {
        // Preserve last known view; reconnect and the low-frequency fallback recover.
      } finally {
        inFlight = false;
      }
    }

    const socket = io(socketBase, {
      transports: ["websocket", "polling"],
      withCredentials: false,
      reconnection: true,
      reconnectionDelayMax: 15_000,
      timeout: 7_000,
    });
    socket.on("connect", () => {
      void checkRevision();
    });
    socket.on("moc-maria:catalog-changed", (message: RevisionPayload) => {
      if (!/^[0-9a-f]{24}$/.test(message?.revision)) return;
      if (lastRevision.current !== message.revision) {
        lastRevision.current = message.revision;
        router.refresh();
      }
    });
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkRevision();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => void checkRevision(), intervalMs);
    void checkRevision();
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      socket.disconnect();
    };
  }, [router]);
}
