import type { Metadata } from "next";
import AlertsView from "./components/alerts-view";
import "../dashboard/dashboard.css";
import "./alerts.css";

export const metadata: Metadata = {
  title: "Alerts — SYNAPSE-T",
  description: "Monitor and manage critical events from soldiers and system devices.",
};

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; soldier?: string; type?: string }>;
}) {
  const params = await searchParams;
  return (
    <AlertsView
      initialId={params.id ?? ""}
      initialSoldier={params.soldier ?? ""}
      initialType={params.type ?? ""}
    />
  );
}
