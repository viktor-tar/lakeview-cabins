/** Link-preview (Open Graph / Twitter) metadata for a page, using the original site's share images. */
import type { Metadata } from "next";

export function share(title: string, description: string, image: string): Pick<Metadata, "openGraph" | "twitter"> {
  const images = [{ url: image, width: 1920, height: 869, alt: title }];
  return {
    openGraph: { type: "website", siteName: "Lakeview Cabins", locale: "en_CA", title, description, images },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
