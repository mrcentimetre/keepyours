import type { Metadata } from "next";
import HomePlaceholder from "@/components/home-placeholder";

export const metadata: Metadata = {
  title: "Keep Yours — home",
};

export default function HomePage() {
  return <HomePlaceholder />;
}
