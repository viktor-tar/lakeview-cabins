"use client";
/**
 * The closing scene: three links rise into view, then the illustrated cabin plays its intro
 * (the door light coming on) and settles into a loop with the fire flickering. "Book now!" opens the booking popup.
 */
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef, useState } from "react";
import { ENDING } from "@/content/home";
import { ArrowLink } from "@/components/site/ArrowLink";
import { useDialogs } from "@/components/site/DialogProvider";
import styles from "./Ending.module.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export function Ending() {
  const root = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLVideoElement>(null);
  const loop = useRef<HTMLVideoElement>(null);
  const [looping, setLooping] = useState(false);
  const { open } = useDialogs();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Links rise one after another each time the scene comes into view.
        const links = gsap.utils.toArray<HTMLElement>(`.${styles.linkItem}`);
        gsap.set(links, { y: 200 });
        ScrollTrigger.create({
          trigger: root.current,
          start: "top bottom",
          onEnter: () =>
            gsap.to(links, { y: 0, duration: 1, ease: "back.out(1.4)", delay: 0.5, stagger: 0.3, overwrite: true }),
          onEnterBack: () =>
            gsap.to(links, { y: 0, duration: 1, ease: "back.out(1.4)", stagger: 0.3, overwrite: true }),
          onLeaveBack: () => gsap.to(links, { y: 200, duration: 0.5, overwrite: true }),
        });

        // "Book now!" lifts into place once most of the scene is visible.
        gsap.fromTo(
          `.${styles.book}`,
          { y: 0 },
          {
            y: -155,
            duration: 1,
            delay: 0.5,
            ease: "back.out(1.4)",
            scrollTrigger: { trigger: root.current, start: "top 40%", toggleActions: "play none none none" },
          },
        );
      });

      // Start the cabin intro when the scene is half visible; it hands over to the loop when it ends.
      ScrollTrigger.create({
        trigger: `.${styles.scene}`,
        start: "top 50%",
        once: true,
        onEnter: () => {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setLooping(true);
            return;
          }
          const v = intro.current;
          if (!v) return;
          v.currentTime = 0;
          v.play().catch(() => setLooping(true));
        },
      });
    },
    { scope: root },
  );

  function startLoop() {
    setLooping(true);
    loop.current?.play().catch(() => {});
  }

  return (
    <div ref={root} className={styles.ending}>
      <div className={styles.inner}>
        <div className={styles.fade}>
          <ul className={styles.links}>
            {ENDING.links.map((l) => (
              <li key={l.label} className={styles.linkItem}>
                {"href" in l && l.href ? (
                  <ArrowLink href={l.href}>{l.label}</ArrowLink>
                ) : (
                  <ArrowLink onClick={() => open("amenities")}>{l.label}</ArrowLink>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.scene}>
          <video
            ref={loop}
            className={styles.video}
            data-hidden={!looping}
            muted
            loop
            playsInline
            preload="none"
            poster={ENDING.loop.poster}
            aria-hidden="true"
          >
            <source src={ENDING.loop.webm} type="video/webm" />
            <source src={ENDING.loop.mp4} type="video/mp4" />
          </video>
          <video
            ref={intro}
            className={styles.video}
            data-hidden={looping}
            muted
            playsInline
            preload="metadata"
            poster={ENDING.intro.poster}
            onEnded={startLoop}
            aria-hidden="true"
          >
            <source src={ENDING.intro.webm} type="video/webm" />
            <source src={ENDING.intro.mp4} type="video/mp4" />
          </video>
          <div className={styles.shade} aria-hidden="true" />
          <div className={styles.bookWrap}>
            <button type="button" className={styles.book} onClick={() => open("booking")} aria-haspopup="dialog">
              {ENDING.bookLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
