import { Footer } from "@/components/site/Footer";
import { Providers } from "@/components/site/Providers";

/** Public pages: the page itself and the footer. Popups are managed by <Providers>. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <main id="main">{children}</main>
      <Footer />
    </Providers>
  );
}
