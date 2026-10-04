import type { Metadata } from "next";
import PageTransition from "@/components/app/page-transition";
import ActivityScreen from "@/components/activity-screen";

export const metadata: Metadata = {
  title: "Keep Yours — activity",
};

export default function ActivityPage() {
  return (
    <PageTransition>
      <ActivityScreen />
    </PageTransition>
  );
}
