import type { Metadata } from "next";
import { share } from "@/lib/share";
import { Ending } from "@/components/home/Ending";
import { FeatureStrip } from "@/components/home/FeatureStrip";
import { Hero } from "@/components/home/Hero";
import { Preloader } from "@/components/home/Preloader";
import { Story } from "@/components/home/Story";
import { Header } from "@/components/site/Header";

export const metadata: Metadata = {
  title: { absolute: "Lakeview Cabins · Waterfront cabin on Howe Sound" },
  description:
    "A timber-framed waterfront cabin near Squamish, BC, with a private sauna, fire-pit and views over Howe Sound. Check availability and request your stay.",
  ...share(
    "Lakeview Cabin Rentals in Squamish | Lakeview Cabins",
    "Experience the breathtaking beauty of Howe Sound from the comfort of our waterfront wooden cabin in Squamish.",
    "/media/home1.jpg",
  ),
};

export default function HomePage() {
  return (
    <>
      <Preloader />
      {/* Logo, menu rail and full-screen menu: Home only, as on the original (other pages link back here). */}
      <Header />
      <Hero />
      <FeatureStrip />
      <Story />
      <Ending />
    </>
  );
}
