import type { Metadata } from "next";
import ActivityView from "./components/activity-view";
import "../dashboard/dashboard.css";
import "./activity.css";

export const metadata: Metadata = {
  title: "Activity Log — SYNAPSE-T",
  description: "Monitor and review all user and system activities across the SYNAPSE-T platform.",
};

export default function ActivityPage() {
  return <ActivityView />;
}
