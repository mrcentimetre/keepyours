import type { Metadata } from "next";
import AdvanceScreen from "@/components/advance-screen";

export const metadata: Metadata = {
  title: "Keep Yours — advance",
};

export default function AdvancePage() {
  return <AdvanceScreen />;
}
