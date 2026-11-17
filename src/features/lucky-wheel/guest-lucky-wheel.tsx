"use client";
import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import { Coins, RotateCcw, LogIn, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useI18n } from "./messages";
import { GuestWheel, GUEST_COIN_LIMIT } from "./guest-wheel";
import { WheelGame } from "./wheel-game";
import styles from "./guest-lucky-wheel.module.css";

function GuestControls({
  engine,
  ready,
  available,
}: {
  engine: GuestWheel;
  ready: boolean;
  available: boolean;
}) {
  const { t, locale } = useI18n();
  const [value, setValue] = useState("1000"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [open, setOpen] = useState(!ready);
  async function configure(amount: number) {
    setBusy(true);
    setError(false);
    try {
      await engine.setBalance(amount);
      if (amount > 0)
        requestAnimationFrame(() => {
          document.querySelector<HTMLElement>("[data-lucky-wheel] h2")?.focus();
        });
    } catch {
      setError(true);
      setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void configure(Number(value));
  }
  return (
    <details
      className={styles.controls}
      data-guest-controls
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <Coins size={20} aria-hidden />
        <strong>{t("guest.free")}</strong>
        <ChevronDown size={18} aria-hidden />
      </summary>
      <div className={styles.notice}>
        <div>
          <p>{t("guest.expiry")}</p>
        </div>
      </div>
      <form onSubmit={submit}>
        <label>
          {t("guest.setLabel")}
          <input
            data-guest-coins
            type="number"
            inputMode="numeric"
            min={0}
            max={GUEST_COIN_LIMIT}
            step={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            disabled={busy || !available}
          />
        </label>
        <button data-guest-set disabled={busy || !available}>
          {t("guest.setAction")}
        </button>
        <button
          data-guest-end
          type="button"
          className={styles.end}
          disabled={busy || !available}
          onClick={() => void configure(0)}
        >
          <RotateCcw size={16} aria-hidden />
          {t("guest.end")}
        </button>
      </form>
      <p className={styles.help}>
        {t("guest.setHelp", { max: new Intl.NumberFormat(locale).format(GUEST_COIN_LIMIT) })}
      </p>
      {error && <p role="alert">{t("guest.setError")}</p>}
      <div className={styles.account}>
        <span>{t("guest.accountHelp")}</span>
        <Link href="/tro-choi/tai-khoan" data-guest-account>
          <LogIn size={16} aria-hidden />
          {t("guest.accountAction")}
        </Link>
      </div>
    </details>
  );
}
const serverSnapshot = () => "pending";
export function GuestLuckyWheel() {
  const engine = useMemo(() => new GuestWheel(), []);
  const epoch = useSyncExternalStore(engine.subscribe, engine.getSnapshot, serverSnapshot);
  return (
    <div className={styles.guest} data-guest-wheel>
      <WheelGame
        key={epoch}
        transport={engine}
        guest
        controls={
          <GuestControls
            engine={engine}
            ready={epoch.endsWith(":ready")}
            available={epoch !== "pending"}
          />
        }
      />
    </div>
  );
}
