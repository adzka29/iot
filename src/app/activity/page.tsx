import type { Metadata } from "next";
import ActivityView from "./activity-view";
import "../dashboard/dashboard.css";
import "./activity.css";

export const metadata: Metadata = {
  title: "Activity Log — TRACKFORGE",
  description: "Monitor and review all user and system activities across the TrackForge platform.",
};

export default function ActivityPage() {
  return <ActivityView />;
}
