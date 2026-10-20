import type { Metadata, Viewport } from "next";
import "@fontsource/port-lligat-sans/400.css";
import "@fontsource/lato/400.css";
import "@fontsource/lato/700.css";
import "@fontsource/poppins/400.css";
import "@fontsource/pt-serif/400.css";
import "./globals.css";
import { share } from "@/lib/share";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: { default: "Lakeview Cabins", template: "%s · Lakeview Cabins" },
  description: "Waterfront wooden cabin on Howe Sound near Squamish, BC.",
  icons: { icon: "/media/favicon2.jpg", apple: "/media/webclip.png" },
  // Default link preview; pages override it with their own title and image.
  ...share(
    "Lakeview Cabin Rentals in Squamish | Lakeview Cabins",
    "Experience the breathtaking beauty of Howe Sound from the comfort of our waterfront wooden cabin in Squamish.",
    "/media/home1.jpg",
  ),
};

export const viewport: Viewport = { themeColor: "#08131f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
