import type { Metadata } from "next";
import InstallGate from "@/components/install-gate";

export const metadata: Metadata = {
  title: "Keep Yours — app",
};

export default function AppEntry() {
  return <InstallGate />;
}
