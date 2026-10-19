"use client";
/**
 * Logo, the fixed rail on the right (menu icon + "Scroll down"), and the full-screen menu.
 * The menu's open/close choreography follows the original: the dark panel slides in from the right,
 * links rise in one after another, then the photo on the left is revealed and settles from a zoom.
 */
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CONTACT } from "@/content/site";
import { useDialogs, type DialogName } from "./DialogProvider";
import { AmenitiesPanel, DirectionsPanel, LandmarksPanel, MapFrame, OccupancyPanel } from "./Panels";
import styles from "./Header.module.css";

gsap.registerPlugin(useGSAP);

type PanelName = Extract<DialogName, "amenities" | "landmarks" | "directions" | "occupancy">;

const PANELS: Record<PanelName, () => ReactNode> = {
  amenities: () => <AmenitiesPanel />,
  landmarks: () => <LandmarksPanel />,
  directions: () => <DirectionsPanel />,
  occupancy: () => <OccupancyPanel />,
};

const LINKS: ({ label: string } & ({ panel: PanelName } | { href: string }))[] = [
  { label: "Amenities", panel: "amenities" },
  { label: "Landmarks", panel: "landmarks" },
  { label: "Navigation", panel: "directions" },
  { label: "Gallery", href: "/gallery" },
  { label: "Occupancy rules", panel: "occupancy" },
  { label: "Customer reviews", href: "/customer-reviews" },
];

/** Below this width the menu's left column is hidden, so menu items open full-screen popups instead. */
const SIDE_PANELS_MIN = 992;

export function Header() {
  // "closing" keeps the menu on screen while its exit animation plays.
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  const open = phase === "open";
  const [panel, setPanel] = useState<PanelName | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const { open: openDialog } = useDialogs();
  const pathname = usePathname();

  // Kill any running menu animation if the header unmounts.
  useGSAP(() => () => tl.current?.kill(), { scope: root });

  function playOpen() {
    tl.current?.kill();
    const q = gsap.utils.selector(root);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      gsap.set(q(`.${styles.bg}, .${styles.link}, .${styles.contacts}, .${styles.photo}`), { clearProps: "all" });
      gsap.set(q(`.${styles.leftCover}`), { xPercent: -101 });
      return;
    }
    tl.current = gsap
      .timeline()
      .set(q(`.${styles.bg}`), { xPercent: 101 })
      .set(q(`.${styles.photo}`), { scale: 1.2, opacity: 0 })
      .set(q(`.${styles.link}`), { opacity: 0, y: "4rem" })
      .set(q(`.${styles.leftCover}`), { xPercent: 0 })
      .set(q(`.${styles.contacts}`), { y: 500 })
      .to(q(`.${styles.bg}`), { xPercent: 0, duration: 1, ease: "circ.inOut" })
      .to(q(`.${styles.icon}`), { height: "0.1rem", duration: 0.5, ease: "circ.out" }, 0.1)
      .to(q(`.${styles.link}`), { opacity: 1, y: 0, duration: 0.5, ease: "circ.out", stagger: 0.2 }, 0)
      .to(q(`.${styles.leftCover}`), { xPercent: -101, duration: 1, ease: "circ.inOut" }, 1.2)
      .set(q(`.${styles.photo}`), { opacity: 1 }, 1.2)
      .to(q(`.${styles.photo}`), { scale: 1, duration: 2, ease: "circ.out" }, 1.2)
      .to(q(`.${styles.contacts}`), { y: 0, duration: 1, ease: "quint.out" }, 2);
  }

  function playClose() {
    tl.current?.kill();
    const q = gsap.utils.selector(root);
    tl.current = gsap
      .timeline({ onComplete: () => setPhase("closed") })
      .to(q(`.${styles.link}`), { opacity: 0, y: "4rem", duration: 0.8, ease: "circ.inOut" })
      .to(q(`.${styles.photo}`), { opacity: 0, duration: 0.5, ease: "circ.inOut" }, 0)
      .to(q(`.${styles.contacts}`), { y: 500, duration: 0.5, ease: "power1.inOut" }, 0)
      .to(q(`.${styles.bg}`), { xPercent: 101, duration: 1, ease: "circ.inOut" }, 0.4)
      .to(q(`.${styles.icon}`), { height: "0.75rem", duration: 0.5, ease: "circ.out" }, 0.4);
  }

  function toggle(next = !open) {
    setPanel(null);
    if (next) {
      setPhase("open");
      playOpen();
    } else if (phase === "open") {
      setPhase("closing");
      playClose();
    }
  }

  // Close the menu straight away when navigating to another page.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setPhase("closed");
    setPanel(null);
  }

  // After an instant close (page change), put the animated pieces back to their resting state.
  useEffect(() => {
    if (phase !== "closed") return;
    tl.current?.kill();
    gsap.set(`.${styles.icon}`, { height: "0.75rem" });
  }, [phase]);

  // Escape closes the menu; the page behind can't be scrolled while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("dialog[open]")) return;
      if (panel) setPanel(null);
      else toggle(false);
    };
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  });

  function choose(p: PanelName) {
    if (window.innerWidth >= SIDE_PANELS_MIN) setPanel(p);
    else openDialog(p);
  }

  return (
    <div ref={root}>
      <div className={styles.brandWrap}>
        <Link href="/" className={styles.brand} aria-label="Lakeview Cabins home">
          <Image src="/media/cabinlogo9.png" alt="" width={100} height={100} priority />
        </Link>
      </div>

      <button
        type="button"
        className={styles.rail}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => toggle()}
      >
        <span className={styles.railInner}>
          <span className={styles.icon} aria-hidden="true">
            <span />
            <span />
          </span>
          <span className="visually-hidden">{open ? "Close menu" : "Open menu"}</span>
          <span className={styles.railText} aria-hidden="true">
            Scroll down
          </span>
        </span>
        <span className={styles.railLine} aria-hidden="true" />
      </button>

      <div id="site-menu" className={styles.menu} data-phase={phase} aria-label="Site menu">
        <div className={styles.inner}>
          <div className={styles.bg} />
          <div className={styles.left}>
            <Image
              src="/media/view.jpg"
              alt="Adirondack chair on the deck facing the mountains across the sound"
              fill
              sizes="65vw"
              className={styles.photo}
            />
            <div className={styles.leftCover} />
            {panel && (
              <div
                className={`${styles.side} ${panel === "amenities" ? styles.sideNarrow : ""}`}
                role="region"
                aria-label={LINKS.find((l) => "panel" in l && l.panel === panel)?.label}
                onClick={(e) => e.target === e.currentTarget && setPanel(null)}
              >
                <div className={styles.sideCard}>
                  <button type="button" className={styles.sideClose} onClick={() => setPanel(null)} aria-label="Close">
                    <span aria-hidden="true" />
                    <span aria-hidden="true" />
                  </button>
                  <div className={styles.sideContent}>{PANELS[panel]()}</div>
                </div>
              </div>
            )}
          </div>
          <div className={styles.right}>
            <nav className={styles.links} aria-label="Main">
              {LINKS.map((l) =>
                "href" in l ? (
                  <Link key={l.label} href={l.href} className={styles.link} onClick={() => toggle(false)}>
                    {l.label}
                  </Link>
                ) : (
                  <button
                    key={l.label}
                    type="button"
                    className={`${styles.link} ${panel === l.panel ? styles.linkActive : ""}`}
                    onClick={() => choose(l.panel)}
                  >
                    {l.label}
                  </button>
                ),
              )}
            </nav>
            <div className={styles.contacts}>
              <a href={CONTACT.phoneHref} className={styles.contact}>
                <Image src="/media/phone.svg" alt="" width={16} height={16} />
                {CONTACT.phone}
              </a>
              <a href={`mailto:${CONTACT.email}`} className={styles.contact}>
                <Image src="/media/email.svg" alt="" width={16} height={16} />
                {CONTACT.email}
              </a>
              <div className={styles.map}>
                <MapFrame />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
