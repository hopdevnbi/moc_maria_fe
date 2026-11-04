import { afterEach, beforeEach, expect, it, vi } from "vitest";
const socket = vi.hoisted(() => ({ on: vi.fn(), disconnect: vi.fn() }));
vi.mock("socket.io-client", () => ({ io: vi.fn(() => socket) }));
import { io } from "socket.io-client";
import { subscribeCatalogRevision } from "./catalog-revision-watch";

const cleanups: Array<() => void> = [];
const response = (revision: string, pollAfterMs = 5000) =>
  new Response(JSON.stringify({ revision, pollAfterMs }));
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
});
afterEach(() => {
  for (const stop of cleanups.splice(0)) stop();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("shares one socket and poller, refreshes once per change and stops after the last subscriber", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response("a".repeat(24)))
    .mockResolvedValueOnce(response("b".repeat(24)));
  vi.stubGlobal("fetch", fetcher);
  const refresh = vi.fn();
  const one = subscribeCatalogRevision(refresh);
  const two = subscribeCatalogRevision(refresh);
  cleanups.push(one, two);
  await vi.advanceTimersByTimeAsync(0);
  expect(io).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(refresh).toHaveBeenCalledTimes(1); // First enabled check closes the SSR/subscription race.
  const prior = refresh.mock.calls.length;
  one();
  await vi.advanceTimersByTimeAsync(5000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(refresh.mock.calls.length).toBe(prior + 1);
  expect(socket.disconnect).not.toHaveBeenCalled();
  two();
  cleanups.length = 0;
  expect(socket.disconnect).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(10000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("treats relay messages as hints and skips hidden-tab reads", async () => {
  const fetcher = vi.fn().mockImplementation(async () => response("c".repeat(24)));
  vi.stubGlobal("fetch", fetcher);
  const refresh = vi.fn();
  cleanups.push(subscribeCatalogRevision(refresh));
  await vi.advanceTimersByTimeAsync(0);
  refresh.mockClear();
  const event = socket.on.mock.calls.find(([name]) => name === "moc-maria:catalog-changed")![1];
  event({ revision: "d".repeat(24) });
  await vi.advanceTimersByTimeAsync(0);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(refresh).not.toHaveBeenCalled();
  Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
  await vi.advanceTimersByTimeAsync(5000);
  expect(fetcher).toHaveBeenCalledTimes(2);
  Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
  await vi.advanceTimersByTimeAsync(0);
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it("keeps the legacy 90 second cadence when the backend cache is disabled", async () => {
  const fetcher = vi.fn().mockImplementation(async () => response("e".repeat(24), 90000));
  vi.stubGlobal("fetch", fetcher);
  cleanups.push(subscribeCatalogRevision(vi.fn()));
  await vi.advanceTimersByTimeAsync(5000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(85000);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
