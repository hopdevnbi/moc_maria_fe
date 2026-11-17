import { z } from "zod";
export const wheelColorSchema = z.enum(["RED", "BLACK", "GREEN"]);
export type WheelColor = z.infer<typeof wheelColorSchema>;
const roundSchema = z.object({
  id: z.string().uuid(),
  opensAt: z.string().datetime({ offset: true }),
  closesAt: z.string().datetime({ offset: true }),
  commitment: z.string().regex(/^[a-f0-9]{64}$/),
});
export const wheelBetSchema = z.object({
  id: z.string().uuid(),
  roundId: z.string().uuid(),
  requestId: z.string().uuid(),
  color: wheelColorSchema,
  stake: z.number().int().min(1).max(100),
  payout: z.number().int().nonnegative(),
  status: z.enum(["PENDING", "WON", "LOST"]),
  createdAt: z.string().datetime({ offset: true }),
});
export const wheelStateSchema = z.object({
  organizationId: z.string().uuid(),
  serverTime: z.string().datetime({ offset: true }),
  round: roundSchema,
  bet: wheelBetSchema.nullable(),
  wallet: z.object({ balance: z.number().int().safe(), totalEarned: z.number().int().safe() }),
  results: z.array(
    roundSchema.extend({
      number: z.number().int().min(0).max(14),
      color: wheelColorSchema,
      nonce: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  ),
  myBets: z.array(
    wheelBetSchema.extend({
      number: z.number().int().min(0).max(14).nullable(),
      nonce: z.string().nullable(),
      commitment: z.string(),
      opensAt: z.string(),
      closesAt: z.string(),
    }),
  ),
  rules: z.object({
    periodSeconds: z.literal(20),
    minStake: z.literal(1),
    maxStake: z.literal(100),
    red: z.literal(2),
    black: z.literal(2),
    green: z.literal(14),
    version: z.literal("wheel-v1"),
  }),
});
export type WheelState = z.infer<typeof wheelStateSchema>;
export type WheelBetInput = {
  roundId: string;
  requestId: string;
  color: WheelColor;
  stake: number;
};
export function resultColor(n: number): WheelColor {
  if (!Number.isInteger(n) || n < 0 || n > 14) throw Error("Invalid wheel number");
  return n === 0 ? "GREEN" : n % 2 ? "RED" : "BLACK";
}
export function nextWheelRotation(previous: number, number: number) {
  resultColor(number);
  return Math.ceil(previous / 360) * 360 + 1800 + ((360 - number * 24) % 360);
}
export async function wheelCommitment(
  organizationId: string,
  r: { id: string; opensAt: string; number: number; nonce: string },
) {
  const text = JSON.stringify([
    "moc-maria",
    "wheel-v1",
    organizationId,
    r.id,
    new Date(r.opensAt).toISOString(),
    r.number,
    r.nonce,
  ]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((v) => v.toString(16).padStart(2, "0")).join("");
}
export async function verifyWheelProof(
  organizationId: string,
  r: { id: string; opensAt: string; number: number; nonce: string; commitment: string },
) {
  return (
    (await wheelCommitment(organizationId, r)) === r.commitment &&
    resultColor(r.number) !== undefined
  );
}

export const wheelAcceptanceSchema = z.object({
  bet: wheelBetSchema,
  wallet: wheelStateSchema.shape.wallet,
});
export function matchesWheelRequest(bet: z.infer<typeof wheelBetSchema>, input: WheelBetInput) {
  return (
    bet.requestId === input.requestId &&
    bet.roundId === input.roundId &&
    bet.color === input.color &&
    bet.stake === input.stake
  );
}
export function displayedWheelBalance(data: WheelState, pending: WheelBetInput | null) {
  const confirmed =
    pending &&
    ((data.bet && matchesWheelRequest(data.bet, pending)) ||
      data.myBets.some((b) => matchesWheelRequest(b, pending)));
  return Math.max(0, data.wallet.balance - (pending && !confirmed ? pending.stake : 0));
}
export function wheelEntryWindow(
  data: WheelState | null,
  clock: { offset: number; lastGood: number },
  now: number,
) {
  return (
    !!data &&
    now - clock.lastGood < 6500 &&
    Date.parse(data.round.closesAt) - now - clock.offset > 700
  );
}
