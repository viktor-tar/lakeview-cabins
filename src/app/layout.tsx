import type { Metadata, Viewport } from "next";
import "@fontsource/port-lligat-sans/400.css";
import "@fontsource/lato/400.css";
import "@fontsource/lato/700.css";
import "@fontsource/poppins/400.css";
import "@fontsource/pt-serif/400.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
  ),
  title: { default: "Lakeview Cabins", template: "%s · Lakeview Cabins" },
  description: "Waterfront wooden cabin on Howe Sound near Squamish, BC.",
  icons: { icon: "/media/favicon2.jpg", apple: "/media/webclip.png" },
};

export const viewport: Viewport = { themeColor: "#08131f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
