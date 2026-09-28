import type { Metadata } from "next";
import WithdrawScreen from "@/components/withdraw-screen";

export const metadata: Metadata = {
  title: "Keep Yours — withdraw",
};

export default function WithdrawPage() {
  return <WithdrawScreen />;
}
