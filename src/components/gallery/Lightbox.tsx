"use client";
/** Full-screen photo viewer: previous/next (buttons, arrow keys, swipe), thumbnails, Escape to close. */
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { Photo } from "@/content/gallery";
import styles from "./Gallery.module.css";

interface Props {
  photos: Photo[];
  index: number | null;
  onChange: (i: number) => void;
  onClose: () => void;
}

export function Lightbox({ photos, index, onChange, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const open = index !== null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Keep the current thumbnail in view.
  useEffect(() => {
    if (index === null) return;
    thumbs.current
      ?.querySelector<HTMLElement>(`[data-i="${index}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  const go = (step: number) => index !== null && onChange((index + step + photos.length) % photos.length);
  const photo = index !== null ? photos[index] : null;

  return (
    <dialog
      ref={ref}
      className={styles.lightbox}
      aria-label="Photo viewer"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      {photo && (
        <>
          <button type="button" className={styles.lbClose} onClick={onClose} aria-label="Close viewer">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <button
            type="button"
            className={`${styles.lbNav} ${styles.lbPrev}`}
            onClick={() => go(-1)}
            aria-label="Previous photo"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 4l-8 8 8 8" />
            </svg>
          </button>
          <figure className={styles.lbFigure}>
            <Image
              key={photo.full}
              src={photo.full}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="90vw"
              className={styles.lbImage}
              priority
            />
            <figcaption className={styles.lbCount} aria-live="polite">
              {index! + 1} / {photos.length}
            </figcaption>
          </figure>
          <button
            type="button"
            className={`${styles.lbNav} ${styles.lbNext}`}
            onClick={() => go(1)}
            aria-label="Next photo"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9 4l8 8-8 8" />
            </svg>
          </button>
          <div className={styles.lbStrip} ref={thumbs}>
            {photos.map((p, i) => (
              <button
                key={p.src}
                type="button"
                data-i={i}
                className={styles.lbThumb}
                aria-label={`Photo ${i + 1}: ${p.alt}`}
                aria-current={i === index}
                onClick={() => onChange(i)}
              >
                <Image src={p.src} alt="" width={96} height={64} sizes="96px" />
              </button>
            ))}
          </div>
        </>
      )}
    </dialog>
  );
}
