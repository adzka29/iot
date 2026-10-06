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

type Level = "Uplink" | "Mesh" | "Telemetry" | "Beacon" | "System" | "Special";

const COLORS: Record<Level, string> = {
  Mesh: "#a78bfa",
  Telemetry: "#38bdf8",
  Beacon: "#eab308",
  System: "#22d3ee",
  Special: "#4ade80",
  Uplink: "#f59e0b",
};

const STACK: Level[] = ["Mesh", "Telemetry", "Beacon", "System", "Special", "Uplink"];

export type ChartBucket = {
  time: number;
  label: string;
  Mesh: number;
  Telemetry: number;
  Beacon: number;
  System: number;
  Special: number;
  Uplink: number;
};

export default function ExplorerChart({ data }: { data: ChartBucket[] }) {
  return (
    <ResponsiveContainer width="100%" height={88}>
      <BarChart data={data} barCategoryGap={0} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
        {STACK.map((level) => (
          <Bar key={level} dataKey={level} stackId="records" fill={COLORS[level]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export { COLORS, STACK };
