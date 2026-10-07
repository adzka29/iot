import type { Metadata } from "next";
import OperationsView from "./components/operations-view";
import "../dashboard/dashboard.css";
import "./operations.css";

export const metadata: Metadata = {
  title: "Operations — SYNAPSE-T",
  description: "Create, monitor, and manage tactical operations across groups and geofences.",
};

export default function OperationsPage() {
  return <OperationsView />;
}

