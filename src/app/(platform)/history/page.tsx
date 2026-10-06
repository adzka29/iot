import type { Metadata } from "next";
import HistoryView from "./components/history-view";
import "../dashboard/dashboard.css";
import "./history.css";

export const metadata: Metadata = {
  title: "History — SYNAPSE-T",
  description: "View historical activities, telemetry, movements, and system events from your unit.",
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ soldier?: string }>;
}) {
  const params = await searchParams;
  return <HistoryView initialSoldier={params.soldier ?? "104"} />;
}
