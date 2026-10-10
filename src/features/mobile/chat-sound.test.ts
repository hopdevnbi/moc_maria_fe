import { act, cleanup, fireEvent, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CHAT_SOUND_URL, IncomingChatTracker, useChatSound } from "./chat-sound";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

it("ignores initial unread backlog and active-thread counts, detects new inbox arrivals once", () => {
  const tracker = new IncomingChatTracker();
  expect(
    tracker.inbox(
      [
        { id: "a", unread_count: 2 },
        { id: "b", unread_count: 5 },
      ],
      "a",
    ),
  ).toBe(false);
  expect(
    tracker.inbox(
      [
        { id: "a", unread_count: 3 },
        { id: "b", unread_count: 5 },
      ],
      "a",
    ),
  ).toBe(false);
  expect(
    tracker.inbox(
      [
        { id: "a", unread_count: 0 },
        { id: "b", unread_count: 6 },
      ],
      "a",
    ),
  ).toBe(true);
  expect(tracker.inbox([{ id: "b", unread_count: 6 }], null)).toBe(false);
  expect(
    tracker.inbox(
      [
        { id: "b", unread_count: 6 },
        { id: "new", unread_count: 1 },
      ],
      null,
    ),
  ).toBe(true);
});
it("does not sound for history, own sends or duplicate polls; detects a new peer reply", () => {
  const tracker = new IncomingChatTracker();
  const old = { id: "old", sender_user_id: "peer" };
  const own = { id: "own", sender_user_id: "me" };
  const reply = { id: "reply", sender_user_id: "peer" };
  expect(tracker.history("a", [old], "me")).toBe(false);
  expect(tracker.history("a", [old, own], "me")).toBe(false);
  expect(tracker.history("a", [old, own, reply], "me")).toBe(true);
  expect(tracker.history("a", [old, own, reply], "me")).toBe(false);
  expect(tracker.history("b", [reply], "me")).toBe(false);
});
it("ignores an old unread snapshot arriving after the read marker", () => {
  const tracker = new IncomingChatTracker();
  const old = { id: "a", unread_count: 1, updated_at: "2026-10-10T01:00:00Z" };
  expect(tracker.inbox([old], "a")).toBe(false);
  expect(tracker.inbox([{ ...old, unread_count: 0 }], "a")).toBe(false);
  expect(tracker.inbox([old], null)).toBe(false);
  expect(
    tracker.inbox([{ ...old, unread_count: 2, updated_at: "2026-10-10T01:01:00Z" }], null),
  ).toBe(true);
});
it("unlocks on interaction, fetches once, plays buffered audio and respects persisted mute", async () => {
  const start = vi.fn();
  const close = vi.fn(async () => {});
  const fetch = vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }));
  const context = {
    state: "suspended",
    resume: vi.fn(async () => {
      context.state = "running";
    }),
    close,
    decodeAudioData: vi.fn(async () => ({})),
    destination: {},
    createBufferSource: () => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      start,
      buffer: null,
      onended: null,
    }),
    createGain: () => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }),
  };
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal(
    "AudioContext",
    class {
      constructor() {
        return context;
      }
    },
  );
  const { result, unmount } = renderHook(() => useChatSound("me"));
  result.current.play();
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.pointerDown(window);
  fireEvent.keyDown(window, { key: "a" });
  await waitFor(() => expect(context.decodeAudioData).toHaveBeenCalled());
  expect(fetch).toHaveBeenCalledExactlyOnceWith(CHAT_SOUND_URL);
  act(() => result.current.play());
  await waitFor(() => expect(start).toHaveBeenCalledTimes(1));
  act(() => result.current.toggle());
  expect(localStorage.getItem("mocmaria.chat.sound.me")).toBe("off");
  result.current.play();
  expect(start).toHaveBeenCalledTimes(1);
  unmount();
  expect(close).toHaveBeenCalledOnce();
  const remount = renderHook(() => useChatSound("me"));
  expect(remount.result.current.muted).toBe(true);
});
