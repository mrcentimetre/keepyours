import type { Metadata } from "next";
import SetupScreen from "@/components/setup-screen";

export const metadata: Metadata = {
  title: "Keep Yours — set up",
};

export default function SetupPage() {
  return <SetupScreen />;
}
