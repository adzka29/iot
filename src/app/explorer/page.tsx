import type { Metadata } from "next";
import ExplorerView from "./explorer-view";
import "../dashboard/dashboard.css";
import "./explorer.css";

export const metadata: Metadata = {
  title: "Search / Explorer — TRACKFORGE",
  description: "Incoming packets, decoded fields, and communication metadata.",
};

export default function ExplorerPage() {
  return <ExplorerView />;
}
