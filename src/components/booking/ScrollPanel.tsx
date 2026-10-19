"use client";
/**
 * Scroll container with the site's glowing teal scrollbar (drawn by us so it looks
 * the same in every browser). The native scrollbar is hidden but scrolling,
 * keyboard and screen-reader behaviour stay native.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import styles from "./booking.module.css";

export const ScrollPanel = forwardRef<HTMLDivElement | null, { children: ReactNode }>(function ScrollPanel(
  { children },
  ref,
) {
  const box = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ top: 0, height: 0, show: false });
  useImperativeHandle(ref, () => box.current as HTMLDivElement);

  const update = useCallback(() => {
    const el = box.current,
      tr = track.current;
    if (!el || !tr) return;
    const trackH = tr.clientHeight;
    const ratio = el.clientHeight / el.scrollHeight;
    const height = Math.max(36, trackH * ratio);
    const max = el.scrollHeight - el.clientHeight;
    const top = max > 0 ? (el.scrollTop / max) * (trackH - height) : 0;
    setThumb({ top, height, show: ratio < 0.999 });
  }, []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
    };
  }, [update]);

  // Drag the thumb
  function onThumbDown(e: React.PointerEvent) {
    const el = box.current,
      tr = track.current;
    if (!el || !tr) return;
    e.preventDefault();
    const startY = e.clientY,
      startScroll = el.scrollTop;
    const scale = (el.scrollHeight - el.clientHeight) / (tr.clientHeight - thumb.height || 1);
    const move = (ev: PointerEvent) => {
      el.scrollTop = startScroll + (ev.clientY - startY) * scale;
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className={styles.panel}>
      <div className={styles.scroll} ref={box} tabIndex={-1}>
        <div className={styles.content}>{children}</div>
      </div>
      <div className={styles.track} ref={track} aria-hidden="true">
        <div
          className={styles.thumb}
          style={{ transform: `translateY(${thumb.top}px)`, height: thumb.height, opacity: thumb.show ? 1 : 0.35 }}
          onPointerDown={onThumbDown}
        />
      </div>
    </div>
  );
});
