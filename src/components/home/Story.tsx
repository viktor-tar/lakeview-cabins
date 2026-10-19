/**
 * The long content section under the strip: photo/text rows over a city-to-nature backdrop,
 * with the car-and-road animation pinned down the middle while the page scrolls.
 */
import Image from "next/image";
import { CLIPS } from "@/content/site";
import { STORY } from "@/content/home";
import { DialogButton } from "@/components/site/DialogProvider";
import { LoopClip } from "@/components/site/LoopClip";
import { RoadCanvas } from "./RoadCanvas";
import styles from "./Story.module.css";

type Img = { src: string; alt: string };

function Portrait({ img, sizes }: { img: Img; sizes: string }) {
  return (
    <div className={styles.portrait}>
      <Image src={img.src} alt={img.alt} fill sizes={sizes} className={styles.cover} />
    </div>
  );
}

const BIG = "(max-width: 767px) 50vw, 45vw";
const SMALL = "(max-width: 767px) 50vw, 35vw";

export function Story() {
  const [first, second] = STORY.rows;
  return (
    <div className={styles.outer} id="about">
      <section
        className={styles.story}
        style={{ ["--skyline" as string]: `url(${STORY.background})` }}
        aria-labelledby="story-heading"
      >
        <div className={styles.wrap}>
          <div className={styles.roadFade} aria-hidden="true" />

          <div className={styles.intro}>
            <div className={styles.introGrid}>
              <h2 id="story-heading" className={styles.heading}>
                {STORY.heading.map((line, i) => (
                  <span key={line}>
                    {i > 0 && <br />}
                    {line}
                  </span>
                ))}
              </h2>
              <div className={styles.introClip}>
                <LoopClip src={CLIPS.road} className={styles.clipWide} />
              </div>
              <div className={styles.introText}>
                <p className={`${styles.copy} ${styles.copyIntro}`}>{STORY.intro}</p>
                <DialogButton name="map" className={styles.mapButton}>
                  <span className={styles.mapOutline}>{STORY.mapButton}</span>
                  <span className={styles.mapFill} aria-hidden="true">
                    {STORY.mapButton}
                  </span>
                </DialogButton>
              </div>
              <div className={styles.introImage}>
                {/* Natural height on purpose: the photo's proportions set the height of the intro rows, as on the original. */}
                <Image
                  src={STORY.introImage.src}
                  alt={STORY.introImage.alt}
                  width={1600}
                  height={2845}
                  sizes="(max-width: 991px) 300px, 30vw"
                  className={styles.introPhoto}
                />
              </div>
            </div>
          </div>

          <div className={`${styles.row} ${styles.rowA}`}>
            <div className={styles.big}>
              <Portrait img={first.big} sizes={BIG} />
              <p className={`${styles.copy} ${styles.copyNarrow} ${styles.below}`}>{first.bigText}</p>
            </div>
            <div className={styles.small}>
              <div className={styles.smallTop}>
                <LoopClip src={CLIPS[first.clip]} className={`${styles.clip} ${styles.clipBright}`} />
                <p className={`${styles.copy} ${styles.copyIntro}`}>{first.smallText}</p>
              </div>
              <Portrait img={first.small} sizes={SMALL} />
            </div>
          </div>

          <div className={`${styles.row} ${styles.rowB}`}>
            <div className={styles.big}>
              <Portrait img={second.big} sizes={BIG} />
              <p className={`${styles.copy} ${styles.copyNarrow} ${styles.below}`}>{second.bigText}</p>
            </div>
            <div className={styles.small}>
              <div className={styles.smallTop}>
                <LoopClip src={CLIPS[second.clip]} className={styles.clip} />
                <p className={`${styles.copy} ${styles.copyPulled}`}>{second.smallText}</p>
              </div>
              <Portrait img={second.small} sizes={SMALL} />
            </div>
          </div>

          <div className={`${styles.row} ${styles.pair}`}>
            {STORY.saunaPair.map((img) => (
              <div key={img.src} className={styles.third}>
                <Portrait img={img} sizes="(max-width: 767px) 50vw, 30vw" />
              </div>
            ))}
          </div>

          <div className={`${styles.row} ${styles.nightRow}`}>
            <div className={styles.big}>
              <Portrait img={STORY.night.big} sizes={BIG} />
              <p className={`${styles.copy} ${styles.copyNight} ${styles.below}`}>{STORY.night.bigText}</p>
            </div>
            <div className={styles.small}>
              <div className={styles.smallTop}>
                <video
                  className={styles.camp}
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster={STORY.night.video.poster}
                  aria-hidden="true"
                >
                  <source src={STORY.night.video.webm} type="video/webm" />
                  <source src={STORY.night.video.mp4} type="video/mp4" />
                </video>
                <p className={`${styles.copy} ${styles.copyStars}`}>{STORY.night.smallText}</p>
              </div>
              <Portrait img={STORY.night.small} sizes={SMALL} />
            </div>
          </div>

          <div className={`${styles.row} ${styles.finaleRow}`}>
            <div className={styles.finale}>
              <Image
                src={STORY.finale.src}
                alt={STORY.finale.alt}
                fill
                sizes="(max-width: 767px) 100vw, 80vw"
                className={styles.cover}
              />
            </div>
          </div>

          {/* Pinned to the viewport for the whole section; the scene below overlaps its empty slot at the end. */}
          <div className={styles.roadPin}>
            <div className={styles.roadFrame}>
              <RoadCanvas />
            </div>
          </div>
        </div>
      </section>
      {/* Phones: a fixed skyline behind the section (background-attachment: fixed doesn't work on iOS). */}
      <div className={styles.mobileBackdrop} aria-hidden="true">
        <Image
          src="/media/section-image-11.jpg"
          alt=""
          fill
          sizes="100vw"
          className={`${styles.cover} ${styles.portraitSky}`}
        />
        <Image src={STORY.background} alt="" fill sizes="100vw" className={`${styles.cover} ${styles.landscapeSky}`} />
      </div>
    </div>
  );
}
