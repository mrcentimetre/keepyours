import PageTransition from "@/components/app/page-transition";
import type { Metadata } from "next";
import HomeScreen from "@/components/home-screen";

export const metadata: Metadata = {
  title: "Keep Yours — home",
};

export default function HomePage() {
  return (
    <PageTransition>
      <HomeScreen />
    </PageTransition>
  );
}
