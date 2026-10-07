import type { Metadata } from "next";
import ExplorerView from "./components/explorer-view";
import "../dashboard/dashboard.css";
import "./explorer.css";

export const metadata: Metadata = {
  title: "Search / Explorer — SYNAPSE-T",
  description: "Search and inspect personnel telemetry records.",
};

export default async function ExplorerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  return <ExplorerView initialQuery={params.q ?? ""} />;
}
