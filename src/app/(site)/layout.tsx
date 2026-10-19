import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { Providers } from "@/components/site/Providers";

/** Public pages: logo + menu rail, the page itself, and the footer. Popups are managed by <Providers>. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </Providers>
  );
}
