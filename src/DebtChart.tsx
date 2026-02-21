import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { DataPoint } from "./calculateDebt";

interface DebtChartProps {
  data: DataPoint[];
}

function formatDollar(value: number): string {
  return `$${value.toLocaleString()}`;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "#1e1e2e",
        border: "1px solid #45475a",
        borderRadius: 8,
        padding: "8px 12px",
        color: "#cdd6f4",
        fontSize: 14,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} style={{ color: entry.color, marginTop: 2 }}>
          {entry.dataKey === "projected" ? "Projected" : "Actual"}:{" "}
          {formatDollar(entry.value)}
        </div>
      ))}
    </div>
  );
}

export default function DebtChart({ data }: DebtChartProps) {
  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
        <XAxis
          dataKey="label"
          tick={{ fill: "#a6adc8", fontSize: 12 }}
          tickLine={{ stroke: "#45475a" }}
          axisLine={{ stroke: "#45475a" }}
          interval="preserveStartEnd"
          angle={-35}
          textAnchor="end"
          height={60}
        />
        <YAxis
          domain={[0, 4000]}
          tickFormatter={formatDollar}
          tick={{ fill: "#a6adc8", fontSize: 12 }}
          tickLine={{ stroke: "#45475a" }}
          axisLine={{ stroke: "#45475a" }}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ color: "#a6adc8", fontSize: 13, paddingTop: 8 }}
        />
        <ReferenceLine y={0} stroke="#a6adc8" strokeDasharray="6 3" strokeWidth={1.5} />
        <Line
          name="Projected"
          type="monotone"
          dataKey="projected"
          stroke="#89b4fa"
          strokeWidth={2}
          strokeDasharray="6 3"
          dot={{ r: 4, fill: "#89b4fa", stroke: "#1e1e2e", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#89b4fa", stroke: "#1e1e2e", strokeWidth: 2 }}
        />
        <Line
          name="Actual"
          type="monotone"
          dataKey="actual"
          stroke="#a6e3a1"
          strokeWidth={2.5}
          dot={{ r: 5, fill: "#a6e3a1", stroke: "#1e1e2e", strokeWidth: 2 }}
          activeDot={{ r: 7, fill: "#cba6f7", stroke: "#1e1e2e", strokeWidth: 2 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
