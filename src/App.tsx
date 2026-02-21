import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { calculateDebt, getDebtFreeDate, generatePaymentDates } from "./calculateDebt";
import { loadPayments, savePayments } from "./api";
import DebtChart from "./DebtChart";
import "./App.css";

const START_DEBT = 2800;
const MIN_PAYMENT = 2000;
const MAX_PAYMENT = 4000;
const STEP = 100;
const SAVE_DEBOUNCE_MS = 800;

const paymentDates = generatePaymentDates();

type SyncStatus = "idle" | "loading" | "saving" | "saved" | "error";

function PinGate({ onUnlock }: { onUnlock: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setChecking(true);
    try {
      await loadPayments(pin);
      onUnlock(pin);
    } catch {
      setError("Wrong PIN. Try again.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="pin-gate">
      <div className="pin-card">
        <h1>Ledger</h1>
        <p>Enter PIN to continue</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN"
            autoFocus
          />
          <button type="submit" disabled={checking || !pin}>
            {checking ? "Checking..." : "Unlock"}
          </button>
        </form>
        {error && <p className="pin-error">{error}</p>}
      </div>
    </div>
  );
}

export default function App() {
  const [pin, setPin] = useState<string | null>(null);
  const [monthlyPayment, setMonthlyPayment] = useState(MIN_PAYMENT + 400);
  const [actualPayments, setActualPayments] = useState<Record<string, number>>({});
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [loaded, setLoaded] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const isInitialLoad = useRef(true);

  // Load payments from KV on unlock
  useEffect(() => {
    if (!pin) return;
    setSyncStatus("loading");
    loadPayments(pin)
      .then((data) => {
        setActualPayments(data);
        setLoaded(true);
        setSyncStatus("idle");
        isInitialLoad.current = true;
      })
      .catch(() => setSyncStatus("error"));
  }, [pin]);

  // Debounced save to KV whenever actualPayments changes
  const debouncedSave = useCallback(
    (payments: Record<string, number>) => {
      if (!pin) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSyncStatus("saving");
        try {
          await savePayments(pin, payments);
          setSyncStatus("saved");
          setTimeout(() => setSyncStatus((s) => (s === "saved" ? "idle" : s)), 1500);
        } catch {
          setSyncStatus("error");
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [pin],
  );

  useEffect(() => {
    if (!loaded) return;
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    debouncedSave(actualPayments);
  }, [actualPayments, debouncedSave, loaded]);

  const data = useMemo(
    () => calculateDebt(START_DEBT, monthlyPayment, actualPayments),
    [monthlyPayment, actualPayments],
  );

  const debtFreeDate = useMemo(() => getDebtFreeDate(data), [data]);

  const handlePaymentChange = (label: string, value: string) => {
    setActualPayments((prev) => {
      const next = { ...prev };
      if (value === "") {
        delete next[label];
      } else {
        next[label] = Number(value);
      }
      return next;
    });
  };

  if (!pin) return <PinGate onUnlock={setPin} />;
  if (!loaded) {
    return (
      <div className="pin-gate">
        <div className="pin-card"><p>Loading...</p></div>
      </div>
    );
  }

  const filledCount = Object.keys(actualPayments).length;

  const statusLabel: Record<SyncStatus, string> = {
    idle: "",
    loading: "Loading...",
    saving: "Saving...",
    saved: "Saved",
    error: "Sync error",
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Ledger</h1>
        <p className="subtitle">
          Combined debt to Aydan ($759) &amp; Zach ($2,041)
        </p>
        {syncStatus !== "idle" && (
          <span className={`sync-badge sync-${syncStatus}`}>
            {statusLabel[syncStatus]}
          </span>
        )}
      </header>

      <div className="controls">
        <label className="payment-label" htmlFor="payment">
          AJ's Monthly Payment (Projected)
        </label>
        <div className="payment-row">
          <input
            id="payment-range"
            type="range"
            min={MIN_PAYMENT}
            max={MAX_PAYMENT}
            step={STEP}
            value={monthlyPayment}
            onChange={(e) => setMonthlyPayment(Number(e.target.value))}
          />
          <div className="payment-input-wrap">
            <span className="dollar-sign">$</span>
            <input
              id="payment"
              type="number"
              min={MIN_PAYMENT}
              max={MAX_PAYMENT}
              step={STEP}
              value={monthlyPayment}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= MIN_PAYMENT && v <= MAX_PAYMENT) {
                  setMonthlyPayment(v);
                }
              }}
            />
          </div>
        </div>
        {monthlyPayment > MIN_PAYMENT && (
          <p className="extra-info">
            ${monthlyPayment - MIN_PAYMENT}/mo extra toward debt repayment
          </p>
        )}
      </div>

      <div className="chart-container">
        <DebtChart data={data} />
      </div>

      <div className="payment-log">
        <h2>Actual Payments</h2>
        <p className="payment-log-hint">
          Enter what AJ actually paid on each date. The green "Actual" line
          appears on the chart for consecutive dates filled in.
        </p>
        <div className="payment-grid">
          {paymentDates.slice(0, Math.max(filledCount + 4, 8)).map((pd) => (
            <div key={pd.label} className="payment-entry">
              <span className="payment-date">{pd.label}</span>
              <div className="payment-input-wrap small">
                <span className="dollar-sign">$</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="—"
                  value={actualPayments[pd.label] ?? ""}
                  onChange={(e) => handlePaymentChange(pd.label, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="summary">
        {debtFreeDate ? (
          <p>
            Debt-free by: <strong>{debtFreeDate}</strong>
          </p>
        ) : monthlyPayment <= MIN_PAYMENT ? (
          <p>
            At $2,000/mo AJ only covers rent — the $2,800 debt never decreases.
            Increase the monthly payment to start paying it off.
          </p>
        ) : (
          <p>
            At this rate, debt won't be fully repaid within 24 months. Increase
            the monthly payment.
          </p>
        )}
      </div>
    </div>
  );
}
