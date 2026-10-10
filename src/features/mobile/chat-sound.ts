"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const CHAT_SOUND_URL = "/media/audio/chat-notification-053a2fe62791.mp3";

// Each snapshot advances the baseline even when muted or viewing this thread.
export class IncomingChatTracker {
  constructor(readonly userId?: string) {}
  private counts = new Map<string, number>();
  private timestamps = new Map<string, number>();
  private histories = new Map<string, Set<string>>();
  private initialized = false;
  inbox(
    threads: { id: string; unread_count?: number; updated_at?: string }[],
    activeId: string | null,
  ) {
    let incoming = false;
    for (const thread of threads) {
      const previous = this.counts.get(thread.id);
      const count = thread.unread_count ?? 0;
      const timestamp = thread.updated_at ? Date.parse(thread.updated_at) : undefined;
      const previousTimestamp = this.timestamps.get(thread.id);
      const newer =
        timestamp === undefined || previousTimestamp === undefined || timestamp > previousTimestamp;
      if (previous !== undefined && count > previous && newer && thread.id !== activeId)
        incoming = true;
      // A new thread after the initial inbox snapshot may already contain a new message.
      if (previous === undefined && this.initialized && count > 0 && thread.id !== activeId)
        incoming = true;
      this.counts.set(thread.id, count);
      if (timestamp !== undefined)
        this.timestamps.set(thread.id, Math.max(previousTimestamp ?? 0, timestamp));
    }
    this.initialized = true;
    return incoming;
  }
  history(id: string, messages: { id: string; sender_user_id: string }[], userId: string) {
    const previous = this.histories.get(id);
    const incoming =
      !!previous && messages.some((m) => !previous.has(m.id) && m.sender_user_id !== userId);
    const seen = previous ?? new Set<string>();
    for (const message of messages) seen.add(message.id);
    this.histories.set(id, seen);
    return incoming;
  }
}

export function useChatSound(userId?: string) {
  const [muted, setMuted] = useState(false);
  const audio = useRef<{ context: AudioContext; buffer: Promise<AudioBuffer> } | null>(null);
  const preference = useRef(false);
  const lastPlayed = useRef(0);
  useEffect(() => {
    if (!userId) return;
    const storageKey = `mocmaria.chat.sound.${userId}`;
    try {
      preference.current = localStorage.getItem(storageKey) === "off";
    } catch {}
    setMuted(preference.current);
    const unlock = () => {
      if (!audio.current) {
        try {
          const context = new AudioContext();
          const buffer = fetch(CHAT_SOUND_URL)
            .then((r) => {
              if (!r.ok) throw new Error("sound unavailable");
              return r.arrayBuffer();
            })
            .then((bytes) => context.decodeAudioData(bytes));
          void buffer.catch(() => {});
          const player = { context, buffer };
          audio.current = player;
          void buffer.catch(() => {
            if (audio.current === player) {
              audio.current = null;
              void context.close().catch(() => {});
            }
          });
        } catch {
          return;
        }
      }
      void audio.current.context.resume().catch(() => {});
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      void audio.current?.context.close().catch(() => {});
      audio.current = null;
    };
  }, [userId]);
  return {
    muted,
    toggle: useCallback(() => {
      const next = !preference.current;
      preference.current = next;
      setMuted(next);
      try {
        localStorage.setItem(`mocmaria.chat.sound.${userId}`, next ? "off" : "on");
      } catch {}
    }, [userId]),
    play: useCallback(() => {
      const player = audio.current;
      // Browser requires a user gesture; never queue old alerts for later playback.
      if (
        preference.current ||
        !player ||
        player.context.state !== "running" ||
        Date.now() - lastPlayed.current < 1200
      )
        return;
      lastPlayed.current = Date.now();
      void player.buffer
        .then((buffer) => {
          if (preference.current || audio.current !== player || player.context.state !== "running")
            return;
          const source = player.context.createBufferSource();
          const gain = player.context.createGain();
          gain.gain.value = 0.55;
          source.buffer = buffer;
          source.connect(gain);
          gain.connect(player.context.destination);
          source.onended = () => {
            source.disconnect();
            gain.disconnect();
          };
          source.start();
        })
        .catch(() => {});
    }, []),
  };
}
