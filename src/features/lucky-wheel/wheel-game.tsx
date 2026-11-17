"use client";
import { newRequestId, withDeadline } from "./compat";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react";
import { Coins, ShieldCheck, Timer, Gamepad2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useI18n } from "./messages";
import type { MessageKey } from "./messages";
import {
  nextWheelRotation,
  resultColor,
  verifyWheelProof,
  wheelAcceptanceSchema,
  matchesWheelRequest,
  displayedWheelBalance,
  wheelEntryWindow,
  wheelStateSchema,
  type WheelBetInput,
  type WheelColor,
  type WheelState,
} from "./lucky-wheel";
import { type WheelTransport } from "./wheel-transport";
import styles from "./lucky-wheel.module.css";

const colors: WheelColor[] = ["RED", "BLACK", "GREEN"];
const colorKey = { RED: "wheel.red", BLACK: "wheel.black", GREEN: "wheel.green" } as const;
const fills = { RED: "#d13d57", BLACK: "#202435", GREEN: "#079c77" };
// Stable SVG coordinates across Node/Chrome math implementations during SSR hydration.
const coordinate = (value: number) => Number(value.toFixed(3));
const sectors = Array.from({ length: 15 }, (_, number) => {
  const start = ((-102 + number * 24) * Math.PI) / 180,
    end = start + (24 * Math.PI) / 180,
    mid = (start + end) / 2;
  return {
    number,
    path: `M200 200 L${coordinate(200 + 174 * Math.cos(start))} ${coordinate(200 + 174 * Math.sin(start))} A174 174 0 0 1 ${coordinate(200 + 174 * Math.cos(end))} ${coordinate(200 + 174 * Math.sin(end))} Z`,
    x: coordinate(200 + 133 * Math.cos(mid)),
    y: coordinate(200 + 133 * Math.sin(mid)),
  };
});
const WheelGraphic = memo(function WheelGraphic({
  rotation,
  animate,
  locale,
}: {
  rotation: number;
  animate: boolean;
  locale: string;
}) {
  const n = new Intl.NumberFormat(locale);
  return (
    <div className={styles.wheelFrame}>
      <span className={styles.pointer} />
      <svg
        className={styles.rotor}
        data-wheel-rotor
        viewBox="0 0 400 400"
        aria-hidden="true"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animate ? "transform 4.2s cubic-bezier(.12,.8,.2,1)" : "none",
        }}
      >
        <circle cx="200" cy="200" r="184" fill="#e9c779" />
        {sectors.map((s) => (
          <g key={s.number}>
            <path
              d={s.path}
              fill={fills[resultColor(s.number)]}
              stroke="#f9eac64d"
              strokeWidth="1"
            />
            <text
              x={s.x}
              y={s.y}
              fill="#fff"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="22"
              fontWeight="650"
            >
              {n.format(s.number)}
            </text>
          </g>
        ))}
        <circle cx="200" cy="200" r="48" fill="#174b3a" stroke="#e9c779" strokeWidth="4" />
      </svg>
      <div className={styles.hub} aria-hidden="true">
        <Coins size={32} />
      </div>
    </div>
  );
});
// Only the countdown rerenders on clock ticks; the entry form and history
// update at the deadline/freshness boundary or when data actually changes.
const RoundCountdown = memo(function RoundCountdown({
  closesAt,
  offset,
}: {
  closesAt: string | undefined;
  offset: number;
}) {
  const { t, locale } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);
  const seconds = closesAt
    ? Math.max(0, Math.min(20, Math.ceil((Date.parse(closesAt) - now - offset) / 1000)))
    : 0;
  return (
    <>
      <strong data-wheel-countdown>
        {t("wheel.countdown", { seconds: new Intl.NumberFormat(locale).format(seconds) })}
      </strong>
    </>
  );
});
const RoundProgress = memo(function RoundProgress({
  closesAt,
  offset,
}: {
  closesAt: string | undefined;
  offset: number;
}) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(timer);
  }, []);
  const seconds = closesAt
    ? Math.max(0, Math.min(20, Math.ceil((Date.parse(closesAt) - now - offset) / 1000)))
    : 0;
  return (
    <div
      className={styles.progress}
      role="progressbar"
      aria-label={t("wheel.countdownLabel")}
      aria-valuemin={0}
      aria-valuemax={20}
      aria-valuenow={seconds}
    >
      <span style={{ width: (seconds / 20) * 100 + "%" }} />
    </div>
  );
});
function subscribeOnline(fn: () => void) {
  window.addEventListener("online", fn);
  window.addEventListener("offline", fn);
  return () => {
    window.removeEventListener("online", fn);
    window.removeEventListener("offline", fn);
  };
}
const errorKeys: Record<string, MessageKey> = {
  WHEEL_ROUND_CLOSED: "wheel.closed",
  WHEEL_ALREADY_BET: "wheel.alreadyBet",
  WHEEL_INSUFFICIENT_COINS: "wheel.insufficient",
  WHEEL_REQUEST_CONFLICT: "wheel.requestConflict",
};

export function WheelGame({
  transport,
  guest = false,
  controls,
}: {
  transport: WheelTransport;
  guest?: boolean;
  controls?: ReactNode;
}) {
  const { t, locale } = useI18n(),
    n = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  const [data, setData] = useState<WheelState | null>(null),
    [readError, setReadError] = useState(false),
    [error, setError] = useState<MessageKey | null>(null),
    [notice, setNotice] = useState<MessageKey | null>(null),
    [attempt, setAttempt] = useState(0);
  const [stake, setStake] = useState("1"),
    [choice, setChoice] = useState<WheelColor>("RED"),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<WheelBetInput | null>(null),
    [rotation, setRotation] = useState(0),
    [spinning, setSpinning] = useState(false),
    [shown, setShown] = useState<WheelState["results"][number] | null>(null),
    [proof, setProof] = useState(false);
  const [clockSync, setClockSync] = useState({ offset: 0, lastGood: 0 });
  const [entryOpen, setEntryOpen] = useState(false);
  const sendLock = useRef(false);
  const lastResult = useRef<string | null>(null),
    initialized = useRef(false),
    angle = useRef(0),
    spinTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    pendingBet = useRef<WheelBetInput | null>(null),
    mutationVersion = useRef(0),
    mounted = useRef(true),
    postController = useRef<AbortController | null>(null),
    commitments = useRef(new Map<string, string>());
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (spinTimer.current) clearTimeout(spinTimer.current);
      postController.current?.abort();
    };
  }, []);
  useEffect(() => {
    let stopped = false,
      inFlight = false,
      timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const poll = async () => {
      if (stopped || inFlight) return;
      if (document.visibilityState === "hidden") {
        timer = setTimeout(() => void poll(), 4000);
        return;
      }
      inFlight = true;
      const version = mutationVersion.current,
        start = Date.now();
      try {
        const response = await withDeadline(
          (signal) => transport.read(signal),
          controller.signal,
          10000,
        );
        if (!response.ok) throw Error("read");
        const next = wheelStateSchema.parse(await response.json());
        if (stopped || version !== mutationVersion.current) return;
        const serverOffset = new Date(next.serverTime).getTime() - (start + Date.now()) / 2;
        setClockSync({ offset: serverOffset, lastGood: Date.now() });
        const previousCommitment = commitments.current.get(next.round.id);
        if (previousCommitment && previousCommitment !== next.round.commitment) {
          setError("wheel.proofMismatch");
          setReadError(true);
          return;
        }
        commitments.current.set(next.round.id, next.round.commitment);
        if (commitments.current.size > 64)
          commitments.current.delete(commitments.current.keys().next().value!);
        setData(next);
        setReadError(false);
        const waiting = pendingBet.current;
        if (
          waiting &&
          ((next.bet && matchesWheelRequest(next.bet, waiting)) ||
            next.myBets.some((b) => matchesWheelRequest(b, waiting)))
        ) {
          pendingBet.current = null;
          setPending(null);
          setNotice("wheel.accepted");
          setError(null);
        }
        const latest = next.results[0];
        if (latest && lastResult.current !== latest.id) {
          const remembered = commitments.current.get(latest.id);
          if (
            (remembered && remembered !== latest.commitment) ||
            latest.color !== resultColor(latest.number) ||
            !(await verifyWheelProof(next.organizationId, latest))
          ) {
            setError("wheel.proofMismatch");
            setProof(false);
            setReadError(true);
            return;
          }
          if (stopped) return;
          const animate =
            initialized.current &&
            !matchMedia("(prefers-reduced-motion: reduce)").matches &&
            Date.now() + serverOffset - new Date(latest.closesAt).getTime() < 6000;
          lastResult.current = latest.id;
          setProof(true);
          setError((previous) => (previous === "wheel.proofMismatch" ? null : previous));
          if (animate) {
            setSpinning(true);
            angle.current = nextWheelRotation(angle.current, latest.number);
            setRotation(angle.current);
            if (spinTimer.current) clearTimeout(spinTimer.current);
            spinTimer.current = setTimeout(() => {
              if (mounted.current) {
                setShown(latest);
                setSpinning(false);
              }
            }, 4200);
          } else {
            angle.current = (360 - latest.number * 24) % 360;
            setRotation(angle.current);
            setShown(latest);
            setSpinning(false);
          }
        }
        initialized.current = true;
      } catch {
        if (!stopped) setReadError(true);
      } finally {
        inFlight = false;
        if (!stopped) timer = setTimeout(() => void poll(), 2000);
      }
    };
    const wake = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        void poll();
      }
    };
    void poll();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
    };
  }, [transport, attempt]);
  useEffect(() => {
    const update = () => setEntryOpen(wheelEntryWindow(data, clockSync, Date.now()));
    const timer = setInterval(update, 100);
    // Run outside effect synchronously to avoid a cascading render.
    const first = setTimeout(update, 0);
    return () => {
      clearInterval(timer);
      clearTimeout(first);
    };
  }, [data, clockSync]);
  const amount = Number(stake);
  const balance = data ? displayedWheelBalance(data, pending) : 0;
  const canBet =
    !!data &&
    !data.bet &&
    !pending &&
    !busy &&
    (guest || online) &&
    !readError &&
    entryOpen &&
    Number.isInteger(amount) &&
    amount >= 1 &&
    amount <= data.rules.maxStake &&
    amount <= data.wallet.balance;
  async function send(input: WheelBetInput) {
    if (sendLock.current || (!guest && !online)) return;
    const retry = pendingBet.current !== null;
    sendLock.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    pendingBet.current = input;
    setPending(input);
    mutationVersion.current++;
    const controller = new AbortController();
    postController.current = controller;
    try {
      const response = await withDeadline(
        (signal) => transport.place(input, signal),
        controller.signal,
        15000,
      );
      if (!mounted.current || pendingBet.current?.requestId !== input.requestId) return;
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        if (!mounted.current || pendingBet.current?.requestId !== input.requestId) return;
        // An auth/transport error on a retry is not proof the initial request failed.
        // Only a stable rejection from the entry endpoint clears a first request.
        const key = errorKeys[body.message];
        if (response.status >= 500 || !key || (retry && body.message !== "WHEEL_ROUND_CLOSED"))
          throw Error("uncertain");
        pendingBet.current = null;
        setPending(null);
        setError(key);
        return;
      }
      const accepted = wheelAcceptanceSchema.parse(await response.json());
      if (!matchesWheelRequest(accepted.bet, input)) throw Error("uncertain");
      if (!mounted.current || pendingBet.current?.requestId !== input.requestId) return;
      pendingBet.current = null;
      setPending(null);
      setNotice("wheel.accepted");
      setData((previous) =>
        previous
          ? {
              ...previous,
              wallet: accepted.wallet,
              bet: previous.round.id === accepted.bet.roundId ? accepted.bet : previous.bet,
            }
          : previous,
      );
    } catch {
      if (mounted.current && pendingBet.current?.requestId === input.requestId)
        setError("wheel.uncertain");
    } finally {
      sendLock.current = false;
      mutationVersion.current++;
      if (mounted.current) {
        setBusy(false);
        setAttempt((x) => x + 1);
      }
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (canBet && data && !pendingBet.current && wheelEntryWindow(data, clockSync, Date.now()))
      void send({
        roundId: data.round.id,
        requestId: newRequestId(),
        color: choice,
        stake: amount,
      });
  }
  return (
    <section className={styles.game} data-lucky-wheel>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>
            <Gamepad2 size={16} />
            {t(guest ? "guest.mode" : "wheel.subtitle")}
          </p>
          <h2 tabIndex={-1}>{t("wheel.title")}</h2>
        </div>
        <div className={styles.wallet}>
          <Coins size={22} />
          <span>
            <small>{t(guest ? "guest.balance" : "worker.balance")}</small>
            <strong data-wheel-balance>
              {data ? n.format(balance) : "—"} {t("worker.coinUnit")}
            </strong>
            {pending && <small>{t("wheel.reserved")}</small>}
          </span>
        </div>
      </header>
      {controls}
      <div className={styles.layout}>
        <div className={styles.stage}>
          <div className={styles.roundTop}>
            <span>
              <Timer size={16} />
              {t("wheel.roundLabel")} <b>{data ? data.round.id.slice(0, 8) : "—"}</b>
            </span>
            <RoundCountdown closesAt={data?.round.closesAt} offset={clockSync.offset} />
          </div>
          <RoundProgress closesAt={data?.round.closesAt} offset={clockSync.offset} />
          <div role="img" aria-label={t("wheel.wheelLabel")}>
            <WheelGraphic rotation={rotation} animate={spinning} locale={locale} />
          </div>
          <div className={styles.result} aria-live="polite" data-wheel-result>
            {spinning ? (
              t("wheel.spinning")
            ) : shown ? (
              <>
                <span className={styles.resultDot} style={{ background: fills[shown.color] }}>
                  {n.format(shown.number)}
                </span>
                {t(colorKey[shown.color])}
                <ShieldCheck size={17} />
              </>
            ) : (
              t("wheel.waitingResult")
            )}
          </div>
          <div className={styles.colorLegend}>
            <span>{t("wheel.red")} ×2</span>
            <span>{t("wheel.black")} ×2</span>
            <span>{t("wheel.green")} ×14</span>
          </div>
        </div>
        <div className={styles.playPanel}>
          <form onSubmit={submit}>
            <h3>{t("wheel.placeTitle")}</h3>
            <p className={styles.helper}>{t("wheel.grossHelp")}</p>
            <fieldset
              disabled={
                !data ||
                busy ||
                !!pending ||
                !!data.bet ||
                (!guest && !online) ||
                readError ||
                !entryOpen
              }
            >
              <legend>{t("wheel.chooseColor")}</legend>
              <div className={styles.choices}>
                {colors.map((c) => (
                  <button
                    type="button"
                    key={c}
                    data-wheel-color={c}
                    aria-pressed={choice === c}
                    onClick={() => setChoice(c)}
                  >
                    <i style={{ background: fills[c] }} aria-hidden="true" />
                    <span>{t(colorKey[c])}</span>
                    <b>×{c === "GREEN" ? 14 : 2}</b>
                  </button>
                ))}
              </div>
              <label className={styles.amount}>
                {t("wheel.stake")}
                <input
                  data-wheel-stake
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  step={1}
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  required
                />
              </label>
              <div className={styles.presets}>
                {[1, 5, 10].map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={amount === value}
                    disabled={value > (data?.wallet.balance ?? 0)}
                    onClick={() => setStake(String(value))}
                  >
                    {n.format(value)} {t("worker.coinUnit")}
                  </button>
                ))}
              </div>
            </fieldset>
            <button data-wheel-submit className={styles.submit} disabled={!canBet}>
              {busy
                ? t("wheel.sending")
                : pending
                  ? t("wheel.checkingEntry")
                  : data?.bet
                    ? t("wheel.confirmedEntry")
                    : t("wheel.confirmBet")}
            </button>
          </form>
          <div className={styles.messages} aria-live="polite">
            {data && amount > data.wallet.balance && !data.bet && !pending && (
              <p>{t("wheel.insufficient")}</p>
            )}
            {!guest && !online && <p role="alert">{t("wheel.offline")}</p>}
            {readError && (
              <p role="alert">
                {t("wheel.readError")}{" "}
                <button type="button" onClick={() => setAttempt((x) => x + 1)}>
                  {t("today.refresh")}
                </button>
              </p>
            )}
            {pending && (
              <p className={styles.reserved} role="status" data-wheel-pending>
                {t("wheel.reserveDetail", {
                  stake: n.format(pending.stake),
                  color: t(colorKey[pending.color]),
                })}{" "}
                · {t(busy ? "wheel.sending" : "wheel.checkingEntry")}
              </p>
            )}
            {data?.bet && (
              <p className={styles.accepted}>
                {t("wheel.currentBet", {
                  color: t(colorKey[data.bet.color]),
                  stake: n.format(data.bet.stake),
                })}
              </p>
            )}
            {notice && <p role="status">{t(notice)}</p>}
            {error && <p role="alert">{t(error)}</p>}
            {pending && !busy && (
              <button
                className={styles.retry}
                type="button"
                onClick={() => {
                  if (pendingBet.current) void send(pendingBet.current);
                }}
              >
                {t("wheel.retrySame")}
              </button>
            )}
          </div>
          <div className={styles.ruleNote}>
            <ShieldCheck size={18} />
            <p>{t(guest ? "guest.policy" : "wheel.coinPolicy")}</p>
          </div>
          <p className={styles.helper}>{t("wheel.roundHelp")}</p>
        </div>
      </div>
      <div className={styles.historyGrid}>
        <section className={styles.history}>
          <h3>{t("wheel.recentResults")}</h3>
          <div className={styles.resultsRow}>
            {data?.results.map((r) => (
              <span key={r.id} title={t(colorKey[r.color])} style={{ background: fills[r.color] }}>
                {n.format(r.number)}
              </span>
            ))}
          </div>
          {!data?.results.length && <p>{t("wheel.noResults")}</p>}
          <details className={styles.proof}>
            <summary>
              <ShieldCheck size={16} />
              {t("wheel.proofTitle")}
            </summary>
            <p>{t(guest ? "guest.proofHelp" : "wheel.proofHelp")}</p>
            <dl>
              <dt>{t("wheel.currentCommitment")}</dt>
              <dd>{data?.round.commitment ?? "—"}</dd>
              {shown && (
                <>
                  <dt>{t("wheel.revealedNonce")}</dt>
                  <dd>{shown.nonce}</dd>
                  <dt>{t("wheel.verification")}</dt>
                  <dd>{proof ? t("wheel.verified") : t("wheel.waitingResult")}</dd>
                </>
              )}
            </dl>
          </details>
        </section>
        <section className={styles.history}>
          <h3>{t("wheel.myHistory")}</h3>
          {!data?.myBets.length && <p>{t("wheel.noBets")}</p>}
          <div className={styles.bets}>
            {data?.myBets.map((b) => (
              <article key={b.id}>
                <span
                  className={styles.betDot}
                  style={{ background: fills[b.color] }}
                  aria-hidden="true"
                />
                <div>
                  <strong>
                    {t(colorKey[b.color])} · {n.format(b.stake)} {t("worker.coinUnit")}
                  </strong>
                  <small>
                    {new Intl.DateTimeFormat(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(new Date(b.createdAt))}{" "}
                    · {b.number === null ? "—" : n.format(b.number)}
                  </small>
                </div>
                <b className={b.status === "WON" ? styles.won : undefined}>
                  {b.status === "PENDING"
                    ? t("wheel.pending")
                    : b.status === "WON"
                      ? "+" + n.format(b.payout)
                      : t("wheel.lost")}
                </b>
              </article>
            ))}
          </div>
        </section>
      </div>
      <Link href={guest ? "/" : "/tai-khoan"} className={styles.back}>
        <ArrowLeft size={16} />
        {guest ? t("nav.home") : "Tài khoản của tôi"}
      </Link>
    </section>
  );
}
