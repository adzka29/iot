import type { Metadata } from "next";
import AccessView from "./components/access-view";
import "../dashboard/dashboard.css";
import "./access.css";

export const metadata: Metadata = {
  title: "User Access — SYNAPSE-T",
  description: "Identities, roles, and the permissions that open each menu.",
};

export default function AccessPage() {
  return <AccessView />;
}
