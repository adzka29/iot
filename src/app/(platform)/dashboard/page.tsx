import type { Metadata } from "next";
import DashboardView from "./components/dashboard-view";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "Command Dashboard — SYNAPSE-T",
  description: "Real-time situational awareness for personnel, zones, and alerts.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
