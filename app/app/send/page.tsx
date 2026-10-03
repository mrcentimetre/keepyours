import PageTransition from "@/components/app/page-transition";
import type { Metadata } from "next";
import SendScreen from "@/components/send-screen";

export const metadata: Metadata = {
  title: "Keep Yours — send",
};

export default function SendPage() {
  return (
    <PageTransition>
      <SendScreen />
    </PageTransition>
  );
}
