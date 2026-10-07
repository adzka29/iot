import type { Metadata } from "next";
import ReportsView from "./components/reports-view";
import "../dashboard/dashboard.css";
import "./reports.css";

export const metadata: Metadata = {
  title: "Reports — SYNAPSE-T",
  description: "Generate and manage operational reports from personnel, operations, and system data.",
};

export default function ReportsPage() {
  return <ReportsView />;
}
