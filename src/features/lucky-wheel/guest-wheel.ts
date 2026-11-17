import { newRequestId, checkAborted } from "./compat";
import { z } from "zod";
import {
  resultColor,
  wheelColorSchema,
  wheelCommitment,
  wheelStateSchema,
  type WheelBetInput,
  type WheelState,
} from "./lucky-wheel";
import type { WheelTransport } from "./wheel-transport";

export const GUEST_WHEEL_STORAGE = "mm-guest-wheel-v1";
export const GUEST_COIN_LIMIT = 1_000_000;
// Local simulation identity only. Never accepted by the account coin API.
const DEMO_ORG = "00000000-0000-4000-8000-000000000000";
const rules = {
  periodSeconds: 20,
  minStake: 1,
  maxStake: 100,
  red: 2,
  black: 2,
  green: 14,
  version: "wheel-v1",
} as const;
const hex = (bytes: Uint8Array) => [...bytes].map((v) => v.toString(16).padStart(2, "0")).join("");
const unhex = (value: string) => Uint8Array.from(value.match(/../g)!, (v) => parseInt(v, 16));
const roundSchema = wheelStateSchema.shape.round.extend({
  key: z.string().regex(/^[a-f0-9]{64}$/),
  iv: z.string().regex(/^[a-f0-9]{24}$/),
  sealed: z.string().regex(/^[a-f0-9]{80,1024}$/),
});
const storedSchema = z.object({
  version: z.literal(1),
  sessionId: z.string().uuid(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lastNow: z.number().int().nonnegative(),
  initialBalance: z.number().int().min(0).max(GUEST_COIN_LIMIT),
  wallet: wheelStateSchema.shape.wallet,
  round: roundSchema,
  results: wheelStateSchema.shape.results.max(12),
  myBets: wheelStateSchema.shape.myBets.max(15),
});
type Stored = z.infer<typeof storedSchema>;
const inputSchema = z
  .object({
    roundId: z.string().uuid(),
    requestId: z.string().uuid(),
    color: wheelColorSchema,
    stake: z.number().int().min(1).max(100),
  })
  .strict();

const vietnamFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
export function vietnamDay(ms: number) {
  const parts = vietnamFormatter.formatToParts(ms);
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function randomNumber() {
  const value = new Uint32Array(1),
    limit = Math.floor(0x100000000 / 15) * 15;
  do {
    crypto.getRandomValues(value);
  } while (value[0]! >= limit);
  return value[0]! % 15;
}
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });

/** Per-tab, freely resettable simulation. No fetch, cookie, auth token or account ledger.
 * AES and commitments only preserve a consistent local reveal; the browser owns the
 * demo key and balance. They are not a server fairness/security guarantee. */
export class GuestWheel implements WheelTransport {
  private state?: Stored;
  private loaded = false;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  constructor(
    private readonly storage: () => Pick<Storage, "getItem" | "setItem"> = () =>
      window.sessionStorage,
    private readonly now: () => number = () => Date.now(),
    private readonly draw: () => number = randomNumber,
  ) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getSnapshot = () =>
    this.state
      ? this.state.sessionId + (this.state.initialBalance > 0 ? ":ready" : ":empty")
      : "pending";
  private notify() {
    for (const fn of this.listeners) fn();
  }
  private serial<T>(fn: () => Promise<T>) {
    const run = this.queue.then(fn, fn);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
  private save() {
    if (!this.state) return;
    try {
      this.storage().setItem(GUEST_WHEEL_STORAGE, JSON.stringify(this.state));
    } catch {
      /* Private browsing/storage disabled: memory-only play. */
    }
  }
  private async createRound(now: number): Promise<Stored["round"]> {
    const opensAt = new Date(Math.floor(now / 20000) * 20000).toISOString(),
      id = newRequestId();
    const number = this.draw(),
      nonce = hex(crypto.getRandomValues(new Uint8Array(32)));
    resultColor(number);
    const key = crypto.getRandomValues(new Uint8Array(32)),
      iv = crypto.getRandomValues(new Uint8Array(12));
    const aes = await crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
    const aad = new TextEncoder().encode(JSON.stringify([DEMO_ORG, id, opensAt]));
    const sealed = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: aad },
      aes,
      new TextEncoder().encode(JSON.stringify({ number, nonce })),
    );
    return {
      id,
      opensAt,
      closesAt: new Date(new Date(opensAt).getTime() + 20000).toISOString(),
      commitment: await wheelCommitment(DEMO_ORG, { id, opensAt, number, nonce }),
      key: hex(key),
      iv: hex(iv),
      sealed: hex(new Uint8Array(sealed)),
    };
  }
  private async reset(balance: number, now: number) {
    this.state = {
      version: 1,
      sessionId: newRequestId(),
      day: vietnamDay(now),
      lastNow: now,
      initialBalance: balance,
      wallet: { balance, totalEarned: 0 },
      round: await this.createRound(now),
      results: [],
      myBets: [],
    };
    this.save();
    this.notify();
  }
  private async ensure(persist = true) {
    const now = this.now();
    if (!this.loaded) {
      this.loaded = true;
      try {
        const raw = this.storage().getItem(GUEST_WHEEL_STORAGE);
        if (raw && raw.length < 32000) {
          const parsed = storedSchema.safeParse(JSON.parse(raw));
          if (parsed.success) this.state = parsed.data;
        }
      } catch {
        /* Corrupt/unavailable storage starts with zero coins. */
      }
      if (this.state) this.notify();
    }
    // Expiry is checked BEFORE settling a pending bet: no yesterday winnings leak.
    if (!this.state || this.state.day !== vietnamDay(now) || now < this.state.lastNow - 1000)
      await this.reset(0, now);
    const s = this.state!;
    if (now >= new Date(s.round.closesAt).getTime()) {
      try {
        const r = s.round,
          aes = await crypto.subtle.importKey("raw", unhex(r.key), "AES-GCM", false, ["decrypt"]);
        const plain = await crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: unhex(r.iv),
            additionalData: new TextEncoder().encode(JSON.stringify([DEMO_ORG, r.id, r.opensAt])),
          },
          aes,
          unhex(r.sealed),
        );
        const secret = z
          .object({
            number: z.number().int().min(0).max(14),
            nonce: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .parse(JSON.parse(new TextDecoder().decode(plain)));
        if ((await wheelCommitment(DEMO_ORG, { ...r, ...secret })) !== r.commitment)
          throw Error("Corrupt local round");
        const color = resultColor(secret.number);
        const result = {
          id: r.id,
          opensAt: r.opensAt,
          closesAt: r.closesAt,
          commitment: r.commitment,
          ...secret,
          color,
        };
        s.results = [result, ...s.results].slice(0, 12);
        for (const bet of s.myBets)
          if (bet.roundId === r.id && bet.status === "PENDING") {
            bet.status = bet.color === color ? "WON" : "LOST";
            bet.payout = bet.status === "WON" ? bet.stake * (color === "GREEN" ? 14 : 2) : 0;
            bet.number = secret.number;
            bet.nonce = secret.nonce;
            s.wallet.balance += bet.payout;
            s.wallet.totalEarned += bet.payout;
          }
        s.round = await this.createRound(now);
      } catch {
        await this.reset(0, now);
      }
    }
    this.state!.lastNow = now;
    if (persist) this.save();
    return this.state!;
  }
  private publicState(s: Stored): WheelState {
    const { id, opensAt, closesAt, commitment } = s.round;
    return {
      organizationId: DEMO_ORG,
      serverTime: new Date(this.now()).toISOString(),
      round: { id, opensAt, closesAt, commitment },
      wallet: { ...s.wallet },
      bet: s.myBets.find((b) => b.roundId === id) ?? null,
      results: s.results,
      myBets: s.myBets,
      rules,
    };
  }
  read = (signal: AbortSignal) =>
    this.serial(async () => {
      checkAborted(signal);
      const s = await this.ensure();
      checkAborted(signal);
      return response(this.publicState(s));
    });
  place = (input: WheelBetInput, signal: AbortSignal) =>
    this.serial(async () => {
      checkAborted(signal);
      const parsed = inputSchema.safeParse(input);
      if (!parsed.success) return response({ message: "WHEEL_INVALID_BET" }, 400);
      const s = await this.ensure(false);
      try {
        checkAborted(signal);
        const replay = s.myBets.find((b) => b.requestId === input.requestId);
        if (replay)
          return replay.roundId === input.roundId &&
            replay.color === input.color &&
            replay.stake === input.stake
            ? response({ bet: replay, wallet: { ...s.wallet }, replayed: true })
            : response({ message: "WHEEL_REQUEST_CONFLICT" }, 409);
        if (s.round.id !== input.roundId || this.now() >= new Date(s.round.closesAt).getTime())
          return response({ message: "WHEEL_ROUND_CLOSED" }, 409);
        if (s.myBets.some((b) => b.roundId === input.roundId))
          return response({ message: "WHEEL_ALREADY_BET" }, 409);
        if (s.wallet.balance < input.stake)
          return response({ message: "WHEEL_INSUFFICIENT_COINS" }, 409);
        const bet: WheelState["myBets"][number] = {
          ...input,
          id: newRequestId(),
          payout: 0,
          status: "PENDING",
          createdAt: new Date(this.now()).toISOString(),
          number: null,
          nonce: null,
          commitment: s.round.commitment,
          opensAt: s.round.opensAt,
          closesAt: s.round.closesAt,
        };
        s.wallet.balance -= input.stake;
        s.myBets = [bet, ...s.myBets].slice(0, 15);
        return response({ bet, wallet: { ...s.wallet }, replayed: false });
      } finally {
        this.save();
      }
    });
  setBalance(balance: number) {
    return this.serial(async () => {
      if (!Number.isSafeInteger(balance) || balance < 0 || balance > GUEST_COIN_LIMIT)
        throw Error("Invalid trial balance");
      this.loaded = true;
      await this.reset(balance, this.now());
    });
  }
}
