import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchSafetyLocation } from "./geolocation";
describe("Voluntary GPS lifecycle", () => {
  let success: PositionCallback;
  const clear = vi.fn();
  const geo = {
    watchPosition: vi.fn((s: PositionCallback) => {
      success = s;
      return 42;
    }),
    clearWatch: clear,
    getCurrentPosition: vi.fn(),
  } as unknown as Geolocation;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-10T06:00:00Z"));
    vi.clearAllMocks();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });
  afterEach(() => vi.useRealTimers());
  function point() {
    return {
      timestamp: Date.now(),
      coords: { latitude: 21, longitude: 105, accuracy: 20 },
    } as GeolocationPosition;
  }
  it("sends a fresh point immediately and rate-limits updates without retaining offline points", async () => {
    const send = vi.fn().mockResolvedValue(undefined),
      notice = vi.fn(),
      stop = watchSafetyLocation(geo, document, send, notice);
    success(point());
    await Promise.resolve();
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(1);
    success(point());
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({
      latitude: 21,
      longitude: 105,
      accuracy: 20,
      recordedAt: new Date().toISOString(),
    });
    stop();
  });
  it("stops watching while hidden and after unmount, and ignores late callbacks", () => {
    const send = vi.fn().mockResolvedValue(undefined),
      stop = watchSafetyLocation(geo, document, send, vi.fn());
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(clear).toHaveBeenCalledWith(42);
    success(point());
    expect(send).not.toHaveBeenCalled();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(geo.watchPosition).toHaveBeenCalledTimes(2);
    stop();
    success(point());
    expect(send).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not upload cached old GPS readings", () => {
    const send = vi.fn(),
      stop = watchSafetyLocation(geo, document, send, vi.fn());
    success({ ...point(), timestamp: Date.now() - 60000 });
    expect(send).not.toHaveBeenCalled();
    stop();
  });
});
