"use client";
/**
 * The mountains intro shown while the page loads: at least 2 s from the start of the visit (so it never
 * flashes) and at most 8 s (slow connections still get the page). Shown once per full page load, not on
 * client-side navigation back to Home, and skipped for visitors who prefer reduced motion.
 */
import { useEffect, useState } from "react";
import { PRELOADER } from "@/content/home";
import styles from "./Preloader.module.css";

const MIN_MS = 2000;
const MAX_MS = 8000;
const FADE_MS = 500;

let alreadyShown = false;

export function Preloader() {
  // Starts visible in the server HTML so the page never flashes before the intro.
  const [phase, setPhase] = useState<"shown" | "fading" | "gone">("shown");

  useEffect(() => {
    if (alreadyShown || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = setTimeout(() => setPhase("gone"), 0);
      return () => clearTimeout(t);
    }
    alreadyShown = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      setPhase("fading");
      timers.push(setTimeout(() => setPhase("gone"), FADE_MS));
    };
    const onLoaded = () => timers.push(setTimeout(reveal, Math.max(0, MIN_MS - performance.now())));
    if (document.readyState === "complete") onLoaded();
    else window.addEventListener("load", onLoaded, { once: true });
    timers.push(setTimeout(reveal, Math.max(0, MAX_MS - performance.now())));
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("load", onLoaded);
    };
  }, []);

  if (phase === "gone") return null;
  return (
    <div className={styles.preloader} data-fading={phase === "fading"} aria-hidden="true">
      <video className={styles.video} autoPlay muted loop playsInline poster={PRELOADER.poster}>
        <source src={PRELOADER.webm} type="video/webm" />
        <source src={PRELOADER.mp4} type="video/mp4" />
      </video>
    </div>
  );
}
