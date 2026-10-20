import type { Metadata } from "next";
import { share } from "@/lib/share";
import { Gallery } from "@/components/gallery/Gallery";

export const metadata: Metadata = {
  title: "Photo Gallery",
  description: "Photos of the Lakeview cabin, its sauna and deck, and the Howe Sound landscape around Squamish, BC.",
  ...share(
    "Photo Gallery | Lakeview Cabins, Squamish",
    "Our lake cabin photo gallery: mesmerizing views outside and a cozy atmosphere inside.",
    "/media/gallery.jpg",
  ),
};

export default function GalleryPage() {
  return <Gallery />;
}
