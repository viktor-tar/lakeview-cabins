"use client";
/**
 * The car driving down the winding road, driven by page scroll.
 * Day frames play over the first 51% of the page, then the night version takes over, as on the original.
 * The frames are a WebP image sequence drawn onto a canvas (the original shipped them as two ~28 MB Lottie files).
 */
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useRef } from "react";
import styles from "./RoadCanvas.module.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const FRAMES = 165;
const SWITCH_AT = 0.51;
const FRAME_W = 750;
const FRAME_H = 1288;
const src = (set: "day" | "night", i: number) => `/media/road/${set}/${String(i).padStart(3, "0")}.webp`;

/** Load order: a coarse pass first so the whole drive is visible early, then fill in the gaps. */
function loadOrder(): number[] {
  const order: number[] = [];
  const seen = new Set<number>();
  for (const step of [16, 8, 4, 2, 1]) {
    for (let i = 0; i < FRAMES; i += step) {
      if (!seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    }
  }
  if (!seen.has(FRAMES - 1)) order.splice(1, 0, FRAMES - 1);
  return order;
}

export function RoadCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useGSAP(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const frames: Record<"day" | "night", (HTMLImageElement | null)[]> = {
      day: Array(FRAMES).fill(null),
      night: Array(FRAMES).fill(null),
    };
    const state = { p: 0 };
    let drawn = "";
    let cancelled = false;

    function nearest(set: "day" | "night", i: number) {
      const list = frames[set];
      for (let d = 0; d < FRAMES; d++) {
        if (list[i - d]) return list[i - d];
        if (list[i + d]) return list[i + d];
      }
      return null;
    }

    function draw(force = false) {
      const p = state.p;
      const set = p < SWITCH_AT ? "day" : "night";
      const local = set === "day" ? p / SWITCH_AT : (p - SWITCH_AT) / (1 - SWITCH_AT);
      const i = Math.min(FRAMES - 1, Math.max(0, Math.round(local * (FRAMES - 1))));
      const img = nearest(set, i);
      const key = `${set}${img?.src}`;
      if (!img || (!force && key === drawn)) return;
      drawn = key;
      const { width: cw, height: ch } = canvas!;
      // Fit the whole frame inside the canvas, centred horizontally and aligned to the top.
      const scale = Math.min(cw / FRAME_W, ch / FRAME_H);
      const w = FRAME_W * scale;
      ctx!.clearRect(0, 0, cw, ch);
      ctx!.drawImage(img, (cw - w) / 2, 0, w, FRAME_H * scale);
    }

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(rect.width * dpr);
      canvas!.height = Math.round(rect.height * dpr);
      draw(true);
    }

    async function preload() {
      const order = loadOrder();
      for (const set of ["day", "night"] as const) {
        const queue = [...order];
        const worker = async () => {
          while (queue.length && !cancelled) {
            const i = queue.shift()!;
            const img = new Image();
            img.decoding = "async";
            img.src = src(set, i);
            try {
              await img.decode();
              frames[set][i] = img;
              draw();
            } catch {
              /* a missing frame just means a neighbour is shown instead */
            }
          }
        };
        await Promise.all(Array.from({ length: 6 }, worker));
      }
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tween = gsap.to(state, {
      p: 1,
      ease: "none",
      onUpdate: () => draw(),
      scrollTrigger: { start: 0, end: "max", scrub: reduce ? true : 0.7 },
    });

    // Start fetching frames once the page itself has finished loading.
    const start = () => void preload();
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      cancelled = true;
      ro.disconnect();
      tween.scrollTrigger?.kill();
      tween.kill();
      window.removeEventListener("load", start);
    };
  });

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
