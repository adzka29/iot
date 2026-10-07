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

export type ChartBucket = {
  time: number;
  label: string;
  count: number;
};

export default function ExplorerChart({ data }: { data: ChartBucket[] }) {
  if (data.length === 0) {
    return <div className="ex-chart-empty">No telemetry in this range</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barCategoryGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke="rgba(148,176,214,0.1)" />
        <XAxis
          dataKey="label"
          interval="preserveStartEnd"
          minTickGap={28}
          tick={{ fill: "#7f92ab", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          width={28}
          tick={{ fill: "#7f92ab", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(56, 189, 248, 0.08)" }}
          contentStyle={{
            background: "#10192b",
            border: "1px solid rgba(148,176,214,0.16)",
            borderRadius: 10,
            fontSize: 12,
          }}
          labelFormatter={(label) => String(label)}
          formatter={(value) => [`${value ?? 0} records`, "Count"]}
        />
        <Bar dataKey="count" fill="#38bdf8" maxBarSize={18} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
