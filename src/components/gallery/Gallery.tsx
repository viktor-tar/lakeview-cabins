"use client";
/**
 * The gallery page: a five-photo mosaic; clicking it (or "Show all photos") slides up the full gallery,
 * and any photo there opens the viewer.
 */
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowLink } from "@/components/site/ArrowLink";
import { GALLERY_INTRO, MOSAIC, PHOTOS, type Photo } from "@/content/gallery";
import { Lightbox } from "./Lightbox";
import styles from "./Gallery.module.css";

function Tile({
  photo,
  onOpen,
  sizes,
  className,
  label,
}: {
  photo: Photo;
  onOpen: () => void;
  sizes: string;
  className?: string;
  label: string;
}) {
  return (
    // The frame sizes itself like the original (height: 100%, padding-top: 50%), which drives the grid's row heights.
    <div className={`${styles.frame} ${className ?? ""}`}>
      <button type="button" className={styles.tile} onClick={onOpen} aria-label={label}>
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          className={styles.tileImage}
          style={photo.position ? { objectPosition: photo.position } : undefined}
        />
        <span className={styles.tileShade} aria-hidden="true" />
      </button>
    </div>
  );
}

export function Gallery() {
  const [allOpen, setAllOpen] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);
  const all = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = all.current;
    if (!d) return;
    if (allOpen && !d.open) d.showModal();
    if (!allOpen && d.open) d.close();
  }, [allOpen]);

  const show = () => setAllOpen(true);
  const p = (i: number) => PHOTOS[i];

  return (
    <>
      <section className={styles.section} aria-labelledby="gallery-heading">
        <h1 id="gallery-heading" className="visually-hidden">
          Lakeview Cabins photo gallery
        </h1>
        <div className={styles.container}>
          <div className={styles.back}>
            <ArrowLink href="/">Back to home page</ArrowLink>
          </div>
          <div className={styles.intro}>
            <Image
              src="/media/mountain-transparent.png"
              alt=""
              width={490}
              height={183}
              className={styles.mountains}
              priority
            />
            <p className={styles.introText}>{GALLERY_INTRO}</p>
          </div>

          <div className={styles.mosaic}>
            <div className={styles.mosaicMain}>
              <Tile
                photo={p(MOSAIC.main)}
                onOpen={show}
                sizes="(max-width: 767px) 100vw, 640px"
                className={styles.r1}
                label="Open the full gallery"
              />
            </div>
            <div className={styles.mosaicSide}>
              <Tile
                photo={p(MOSAIC.top)}
                onOpen={show}
                sizes="(max-width: 767px) 100vw, 460px"
                className={styles.r2}
                label="Open the full gallery"
              />
              <div className={styles.mosaicPair}>
                <div className={styles.pairWide}>
                  <Tile
                    photo={p(MOSAIC.left)}
                    onOpen={show}
                    sizes="(max-width: 767px) 100vw, 300px"
                    label="Open the full gallery"
                  />
                </div>
                <div className={styles.pairNarrow}>
                  <Tile
                    photo={p(MOSAIC.right)}
                    onOpen={show}
                    sizes="(max-width: 767px) 100vw, 160px"
                    label="Open the full gallery"
                  />
                </div>
              </div>
              <Tile
                photo={p(MOSAIC.bottom)}
                onOpen={show}
                sizes="(max-width: 767px) 100vw, 460px"
                className={styles.r3}
                label="Open the full gallery"
              />
            </div>
            <button
              type="button"
              className={styles.showAll}
              onClick={show}
              aria-haspopup="dialog"
              aria-label="Show all photos"
            >
              <svg viewBox="0 0 256 256" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M72 60a12 12 0 1 1-12-12a12 12 0 0 1 12 12m56-12a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 24a12 12 0 1 0-12-12a12 12 0 0 0 12 12M60 116a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12M60 184a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12m68 0a12 12 0 1 0 12 12a12 12 0 0 0-12-12"
                />
              </svg>
              <span className={styles.showAllText}>Show all photos</span>
            </button>
          </div>
        </div>
      </section>

      <dialog
        ref={all}
        className={styles.all}
        aria-label="All photos"
        onCancel={(e) => {
          e.preventDefault();
          if (viewing === null) setAllOpen(false);
        }}
      >
        {allOpen && (
          <>
            <div className={styles.allHeader}>
              <button
                type="button"
                className={styles.backCircle}
                onClick={() => setAllOpen(false)}
                aria-label="Close the gallery"
              >
                <Image src="/media/back-icon.svg" alt="" width={10} height={16} className={styles.backIcon} />
              </button>
              <ArrowLink href="/" className={styles.allHome}>
                Back to home page
              </ArrowLink>
            </div>
            <ul className={styles.grid}>
              {PHOTOS.map((photo, i) => (
                <li
                  key={photo.src}
                  className={styles.cell}
                  style={{ ["--area" as string]: photo.area, ["--area-md" as string]: photo.areaTablet ?? photo.area }}
                >
                  <Tile
                    photo={photo}
                    onOpen={() => setViewing(i)}
                    sizes="(max-width: 479px) 100vw, (max-width: 991px) 50vw, 640px"
                    label={`View photo ${i + 1}: ${photo.alt}`}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </dialog>

      <Lightbox photos={PHOTOS} index={viewing} onChange={setViewing} onClose={() => setViewing(null)} />
    </>
  );
}
