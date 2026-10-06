import type { Metadata } from "next";
import DashboardView from "./dashboard-view";
import "./dashboard.css";

export const metadata: Metadata = {
  title: "Command Dashboard — TRACKFORGE",
  description: "Real-time situational awareness for personnel, zones, and alerts.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
