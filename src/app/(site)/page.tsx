import type { Metadata } from "next";
import { Ending } from "@/components/home/Ending";
import { FeatureStrip } from "@/components/home/FeatureStrip";
import { Hero } from "@/components/home/Hero";
import { Preloader } from "@/components/home/Preloader";
import { Story } from "@/components/home/Story";

export const metadata: Metadata = {
  title: { absolute: "Lakeview Cabins · Waterfront cabin on Howe Sound" },
  description:
    "A timber-framed waterfront cabin near Squamish, BC, with a private sauna, fire-pit and views over Howe Sound. Check availability and request your stay.",
};

export default function HomePage() {
  return (
    <>
      <Preloader />
      <Hero />
      <FeatureStrip />
      <Story />
      <Ending />
    </>
  );
}
