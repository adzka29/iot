import type { Metadata } from "next";
import ProfileView from "./components/profile-view";
import "../dashboard/dashboard.css";
import "./profile.css";

export const metadata: Metadata = {
  title: "My Profile — SYNAPSE-T",
  description: "Manage your personal information and how others see you on the platform.",
};

export default function ProfilePage() {
  return <ProfileView />;
}
