"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AlertChartBucket = {
  time: number;
  label: string;
  count: number;
};

export const ALERT_COLORS = {
  CRITICAL: "#ef4444",
  WARNING: "#f59e0b",
  INFO: "#38bdf8",
  /** @deprecated display labels — prefer BE severity keys */
  Critical: "#ef4444",
  Warning: "#f59e0b",
  Info: "#38bdf8",
};

export default function AlertsChart({ data }: { data: AlertChartBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={88}>
      <BarChart data={data} barCategoryGap={1} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="rgba(148,176,214,0.08)" />
        <XAxis dataKey="time" hide />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: "#10192b",
            border: "1px solid rgba(148,176,214,0.16)",
            borderRadius: 10,
            fontSize: 12,
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
        />
        <Bar dataKey="count" fill="#f87171" maxBarSize={22} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
