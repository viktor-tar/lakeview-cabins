import type { Metadata } from "next";
import { Gallery } from "@/components/gallery/Gallery";

export const metadata: Metadata = {
  title: "Photo Gallery",
  description: "Photos of the Lakeview cabin, its sauna and deck, and the Howe Sound landscape around Squamish, BC.",
};

export default function GalleryPage() {
  return <Gallery />;
}
