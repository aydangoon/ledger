export type DataPoint = {
  label: string;
  projected: number;
  actual?: number;
};

export type PaymentDate = {
  label: string;
  date: Date;
};

const RENT = 2000;
const MAX_DATES = 48;

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatLabel(d: Date): string {
  return `${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function countMonthStartsBetween(after: Date, upTo: Date): number {
  let count = 0;
  let y = after.getFullYear();
  let m = after.getMonth();

  // advance to next month's 1st
  m++;
  if (m > 11) { m = 0; y++; }

  while (new Date(y, m, 1) <= upTo) {
    count++;
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return count;
}

export function generatePaymentDates(): PaymentDate[] {
  let current = new Date(2026, 1, 20);
  const dates: PaymentDate[] = [];

  for (let i = 0; i < MAX_DATES; i++) {
    dates.push({ label: formatLabel(current), date: new Date(current) });
    current = addDays(current, 14);
  }
  return dates;
}

export function calculateDebt(
  startDebt: number,
  monthlyPayment: number,
  actualPayments: Record<string, number>,
): DataPoint[] {
  const biweeklyPayment = monthlyPayment / 2;
  const paymentDates = generatePaymentDates();

  const startDate = new Date(2026, 1, 21);
  const points: DataPoint[] = [
    { label: "Feb 21, 2026", projected: startDebt, actual: startDebt },
  ];

  let projDebt = startDebt;
  let actDebt = startDebt;
  let prevDate = startDate;
  let hasActuals = true;

  for (const pd of paymentDates) {
    const rentMonths = countMonthStartsBetween(prevDate, pd.date);
    const rentCharge = rentMonths * RENT;

    // Projected
    projDebt += rentCharge;
    projDebt -= biweeklyPayment;
    if (projDebt < 0) projDebt = 0;

    // Actual
    const actualVal = actualPayments[pd.label];
    if (hasActuals && actualVal !== undefined) {
      actDebt += rentCharge;
      actDebt -= actualVal;
      if (actDebt < 0) actDebt = 0;
    } else {
      hasActuals = false;
    }

    const point: DataPoint = {
      label: pd.label,
      projected: Math.round(projDebt * 100) / 100,
    };
    if (hasActuals) point.actual = Math.round(actDebt * 100) / 100;
    points.push(point);

    prevDate = pd.date;

    if (projDebt <= 0 && (!hasActuals || actDebt <= 0)) break;
  }

  return points;
}

export function getDebtFreeDate(points: DataPoint[]): string | null {
  const last = points[points.length - 1];
  if (last && last.projected <= 0) {
    return last.label;
  }
  return null;
}
