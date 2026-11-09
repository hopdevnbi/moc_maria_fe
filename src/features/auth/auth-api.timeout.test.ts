import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthRequestTimeoutError, withAuthRequestDeadline } from "./auth-api";

afterEach(() => {
  vi.useRealTimers();
});

describe("Safari-safe authentication deadline", () => {
  it("aborts and rejects even if the underlying request never settles", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const result = withAuthRequestDeadline((requestSignal) => {
      signal = requestSignal;
      return new Promise<string>(() => undefined);
    }, 1_000);
    const assertion = expect(result).rejects.toBeInstanceOf(AuthRequestTimeoutError);
    await vi.advanceTimersByTimeAsync(1_000);
    await assertion;
    expect(signal?.aborted).toBe(true);
  });

  it("returns successful responses without aborting later", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const result = await withAuthRequestDeadline((requestSignal) => {
      signal = requestSignal;
      return Promise.resolve("ok");
    }, 1_000);
    expect(result).toBe("ok");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(signal?.aborted).toBe(false);
  });
});
