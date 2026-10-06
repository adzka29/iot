import type { Metadata } from "next";
import LoginView from "./components/login-view";
import "./login.css";

export const metadata: Metadata = {
  title: "Sign in — SYNAPSE-T",
};

export default function LoginPage() {
  return <LoginView />;
}
