import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Lakeview Cabins", template: "%s · Lakeview Cabins" },
  description: "Waterfront wooden cabin on Howe Sound near Squamish, BC.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
