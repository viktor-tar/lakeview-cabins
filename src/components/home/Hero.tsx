"use client";
/** Full-screen photo with the booking calendar (left) and the intro text (right). */
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getImageProps } from "next/image";
import { useRef } from "react";
import { HeroBooking } from "@/components/booking/HeroBooking";
import { HERO } from "@/content/home";
import styles from "./Hero.module.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Phones get a different crop where the cabin and the tree stay in frame.
const PHOTO_SIZES = "100vw";
const { props: wide } = getImageProps({
  src: HERO.image.src,
  alt: HERO.image.alt,
  fill: true,
  priority: true,
  sizes: PHOTO_SIZES,
});
const {
  props: { srcSet: narrowSrcSet },
} = getImageProps({ src: HERO.imageSmall, alt: "", fill: true, priority: true, sizes: PHOTO_SIZES });

export function Hero() {
  const root = useRef<HTMLElement>(null);

  // As the hero scrolls away, the photo drifts down 20% and the bottom shade grows to full height.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scrollTrigger = { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.8 };
        gsap.to(`.${styles.photo}`, { yPercent: 20, ease: "none", scrollTrigger });
        gsap.fromTo(`.${styles.shadeBottom}`, { height: "35svh" }, { height: "100svh", ease: "none", scrollTrigger });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={styles.hero} aria-labelledby="hero-heading">
      <div className={styles.media}>
        <picture>
          <source media="(max-width: 479px)" srcSet={narrowSrcSet} sizes={PHOTO_SIZES} />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- alt comes from getImageProps */}
          <img {...wide} className={styles.photo} />
        </picture>
        <div className={styles.shadeTop} />
        <div className={styles.shadeBottom} />
      </div>
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.booking}>
            <HeroBooking />
          </div>
          <div className={styles.text}>
            <h1 id="hero-heading" className={styles.heading}>
              {HERO.heading}
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
}
