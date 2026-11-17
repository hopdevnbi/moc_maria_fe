// @vitest-environment node
import { describe, it, expect } from "vitest";
import { GuestWheel, GUEST_WHEEL_STORAGE, vietnamDay } from "./guest-wheel";
import {
  verifyWheelProof,
  wheelStateSchema,
  wheelAcceptanceSchema,
  displayedWheelBalance,
  matchesWheelRequest,
  wheelEntryWindow,
} from "./lucky-wheel";

const signal = () => new AbortController().signal;
function fixture(ms = Date.parse("2026-11-17T03:00:05Z"), draw = 0) {
  const map = new Map<string, string>();
  const storage = () => ({
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  });
  const clock = { now: ms };
  const engine = new GuestWheel(
    storage,
    () => clock.now,
    () => draw,
  );
  const state = async (target = engine) =>
    wheelStateSchema.parse(await (await target.read(signal())).json());
  return { map, storage, clock, engine, state };
}
describe("guest wheel lifecycle is separate from account coins", () => {
  it("starts at zero, permits self-set balance, survives same-tab reload and exposes no future outcome", async () => {
    const f = fixture();
    expect((await f.state()).wallet.balance).toBe(0);
    await f.engine.setBalance(1000);
    const first = await f.state();
    expect(first.wallet.balance).toBe(1000);
    expect(first.round).not.toHaveProperty("number");
    expect(first.round).not.toHaveProperty("key");
    const reloaded = new GuestWheel(f.storage, () => f.clock.now);
    expect((await f.state(reloaded)).round).toEqual(first.round);
    expect((await f.state(reloaded)).wallet.balance).toBe(1000);
    expect([...f.map.keys()]).toEqual([GUEST_WHEEL_STORAGE]);
    const newTab = fixture();
    expect((await newTab.state()).wallet.balance).toBe(0);
  });
  it("reserves displayed coins immediately, reconciles the returned wallet and never subtracts twice", async () => {
    const f = fixture();
    await f.engine.setBalance(100);
    const before = await f.state();
    const input = {
      roundId: before.round.id,
      requestId: crypto.randomUUID(),
      color: "RED" as const,
      stake: 10,
    };
    expect(displayedWheelBalance(before, input)).toBe(90);
    expect(before.wallet.balance).toBe(100);
    expect(displayedWheelBalance(before, null)).toBe(100);
    const accepted = wheelAcceptanceSchema.parse(
      await (await f.engine.place(input, signal())).json(),
    );
    expect(matchesWheelRequest(accepted.bet, input)).toBe(true);
    expect(matchesWheelRequest(accepted.bet, { ...input, stake: 11 })).toBe(false);
    expect(accepted.wallet.balance).toBe(90);
    const after = await f.state();
    expect(displayedWheelBalance(after, input)).toBe(90);
    expect(displayedWheelBalance(after, null)).toBe(90);
    const replay = wheelAcceptanceSchema.parse(
      await (await f.engine.place(input, signal())).json(),
    );
    expect(replay.wallet.balance).toBe(90);
    const clock = { offset: 0, lastGood: f.clock.now };
    expect(wheelEntryWindow(before, clock, f.clock.now)).toBe(true);
    expect(wheelEntryWindow(before, clock, f.clock.now + 6500)).toBe(false);
    const end = Date.parse(before.round.closesAt);
    expect(wheelEntryWindow(before, { offset: 0, lastGood: end - 800 }, end - 701)).toBe(true);
    expect(wheelEntryWindow(before, { offset: 0, lastGood: end - 800 }, end - 700)).toBe(false);
  });
  it("writes a valid guest entry once and keeps read/reload recovery", async () => {
    const f = fixture();
    let writes = 0;
    const engine = new GuestWheel(
      () => ({
        ...f.storage(),
        setItem: (k, v) => {
          writes++;
          f.map.set(k, v);
        },
      }),
      () => f.clock.now,
    );
    await engine.setBalance(50);
    const before = await f.state(engine);
    writes = 0;
    const res = await engine.place(
      { roundId: before.round.id, requestId: crypto.randomUUID(), color: "RED", stake: 5 },
      signal(),
    );
    expect(res.status).toBe(200);
    expect(writes).toBe(1);
    expect((await f.state(new GuestWheel(f.storage, () => f.clock.now))).wallet.balance).toBe(45);
  });
  it("serializes duplicate entries and credits green14x only once after a reload", async () => {
    const f = fixture();
    await f.engine.setBalance(100);
    const input = {
      roundId: (await f.state()).round.id,
      requestId: crypto.randomUUID(),
      color: "GREEN" as const,
      stake: 5,
    };
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => f.engine.place(input, signal())),
    );
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect((await f.state()).wallet.balance).toBe(95);
    const reloaded = new GuestWheel(
      f.storage,
      () => f.clock.now,
      () => 14,
    );
    f.clock.now += 20000;
    const result = await f.state(reloaded);
    expect(result.wallet.balance).toBe(165);
    expect(result.myBets[0]?.payout).toBe(70);
    expect(result.results[0]?.number).toBe(0);
    expect(await verifyWheelProof(result.organizationId, result.results[0]!)).toBe(true);
    expect((await f.state(reloaded)).wallet.balance).toBe(165);
    expect((await f.state(reloaded)).results).toHaveLength(1);
  });
  it("rejects insufficient, fractional, extra, conflicting and multiple-round entries without overdraw", async () => {
    const f = fixture();
    await f.engine.setBalance(3);
    const input = {
      roundId: (await f.state()).round.id,
      requestId: crypto.randomUUID(),
      color: "RED" as const,
      stake: 4,
    };
    expect((await f.engine.place(input, signal())).status).toBe(409);
    expect((await f.engine.place({ ...input, stake: 1.5 }, signal())).status).toBe(400);
    expect(
      (await f.engine.place({ ...input, stake: 1, extra: 1 } as typeof input, signal())).status,
    ).toBe(400);
    expect((await f.engine.place({ ...input, stake: 1 }, signal())).status).toBe(200);
    expect((await f.engine.place({ ...input, stake: 2 }, signal())).status).toBe(409);
    expect(
      (await f.engine.place({ ...input, stake: 1, requestId: crypto.randomUUID() }, signal()))
        .status,
    ).toBe(409);
    expect((await f.state()).wallet.balance).toBe(2);
    f.clock.now += 20000;
    const state = await f.state();
    expect(state.wallet.balance).toBe(2); // Green result, red lost.
    expect(state.myBets[0]?.status).toBe("LOST");
    expect(
      (await f.engine.place({ ...input, requestId: crypto.randomUUID(), stake: 1 }, signal()))
        .status,
    ).toBe(409);
  });
  it("expires at Vietnam midnight before pending winnings and resets history/proof to a fresh session", async () => {
    const f = fixture(Date.parse("2026-11-17T16:59:55Z"));
    expect(vietnamDay(f.clock.now)).toBe("2026-11-17");
    await f.engine.setBalance(100);
    const before = await f.state(),
      session = f.engine.getSnapshot();
    await f.engine.place(
      { roundId: before.round.id, requestId: crypto.randomUUID(), color: "GREEN", stake: 5 },
      signal(),
    );
    f.clock.now = Date.parse("2026-11-17T17:00:01Z");
    expect(vietnamDay(f.clock.now)).toBe("2026-11-18");
    const next = await f.state();
    expect(next.wallet).toEqual({ balance: 0, totalEarned: 0 });
    expect(next.myBets).toEqual([]);
    expect(next.results).toEqual([]);
    expect(f.engine.getSnapshot()).not.toBe(session);
    const restored = new GuestWheel(f.storage, () => f.clock.now);
    expect((await f.state(restored)).wallet.balance).toBe(0);
  });
  it("ending/restarting a session clears pending entries, and abort never debits", async () => {
    const f = fixture();
    await f.engine.setBalance(30);
    const input = {
      roundId: (await f.state()).round.id,
      requestId: crypto.randomUUID(),
      color: "RED" as const,
      stake: 1,
    };
    const controller = new AbortController();
    controller.abort();
    await expect(f.engine.place(input, controller.signal)).rejects.toThrow();
    expect((await f.state()).wallet.balance).toBe(30);
    await f.engine.place(input, signal());
    await f.engine.setBalance(0);
    expect((await f.state()).myBets).toHaveLength(0);
    expect((await f.state()).wallet.balance).toBe(0);
    expect((await f.engine.place(input, signal())).status).toBe(409);
    for (const invalid of [-1, 1.5, NaN, Infinity, 1000001])
      await expect(f.engine.setBalance(invalid)).rejects.toThrow();
  });
  it("handles disabled/corrupt storage and backwards clock safely with no other persistence", async () => {
    const f = fixture();
    f.map.set(GUEST_WHEEL_STORAGE, "not json");
    expect((await f.state()).wallet.balance).toBe(0);
    await f.engine.setBalance(50);
    f.clock.now -= 5000;
    expect((await f.state()).wallet.balance).toBe(0);
    const noStorage = () => {
      throw Error("blocked");
    };
    const memory = new GuestWheel(noStorage, () => f.clock.now);
    await memory.setBalance(80);
    expect((await f.state(memory)).wallet.balance).toBe(80);
    expect((await f.state(new GuestWheel(noStorage, () => f.clock.now))).wallet.balance).toBe(0);
  });
  it("fails closed on a tampered local encrypted outcome rather than inventing a payout", async () => {
    const f = fixture();
    await f.engine.setBalance(90);
    const raw = JSON.parse(f.map.get(GUEST_WHEEL_STORAGE)!);
    raw.round.sealed = "ab".repeat(100);
    f.map.set(GUEST_WHEEL_STORAGE, JSON.stringify(raw));
    f.clock.now += 20000;
    const reload = new GuestWheel(f.storage, () => f.clock.now);
    expect((await f.state(reload)).wallet.balance).toBe(0);
  });
});
