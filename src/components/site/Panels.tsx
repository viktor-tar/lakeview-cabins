/** The content of each popup. Used both in full-screen dialogs and inside the menu's left column. */
import Image from "next/image";
import { AMENITY_GROUPS } from "@/content/amenities";
import { CHECK_IN, CLIPS, DIRECTIONS, HOUSE_RULES, LANDMARKS, MAP_EMBED, OCCUPANCY } from "@/content/site";
import { LoopClip } from "./LoopClip";
import styles from "./Panels.module.css";

export function AmenitiesPanel() {
  return (
    <div>
      <h2 className={styles.title}>What this place offers</h2>
      {AMENITY_GROUPS.map((group) => (
        <section key={group.title} className={styles.group}>
          <h3 className={styles.groupTitle}>{group.title}</h3>
          <ul className={styles.list}>
            {group.items.map((item) => (
              <li key={item.label} className={styles.item}>
                <Image
                  src={item.icon}
                  alt=""
                  width={25}
                  height={25}
                  className={item.narrow ? `${styles.icon} ${styles.iconNarrow}` : styles.icon}
                />
                <p className={item.excluded ? styles.excluded : styles.label}>
                  {item.excluded && <span className="visually-hidden">Not included: </span>}
                  {item.label}
                  {item.note && (
                    <>
                      <br />
                      <span className={styles.note}>{item.note}</span>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Photos({ images }: { images: { src: string; alt: string }[] }) {
  return (
    <div className={styles.photos}>
      {images.map((img) => (
        <Image
          key={img.src}
          src={img.src}
          alt={img.alt}
          width={600}
          height={600}
          sizes="300px"
          className={styles.photo}
        />
      ))}
    </div>
  );
}

export function LandmarksPanel() {
  return (
    <div>
      <h2 className={styles.title}>{LANDMARKS.title}</h2>
      <div className={styles.split}>
        <div className={styles.text}>
          <p>{LANDMARKS.intro}</p>
          {LANDMARKS.activities.map((a) => (
            <p key={a.title}>
              <strong>{a.title}</strong>
              <br />
              {a.text}
            </p>
          ))}
          <p>
            <strong>Landmarks:</strong>
          </p>
          <ul className={styles.dashList}>
            {LANDMARKS.landmarks.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p>{LANDMARKS.outro}</p>
        </div>
        <Photos images={LANDMARKS.images} />
      </div>
    </div>
  );
}

export function MapFrame({ tall = false }: { tall?: boolean }) {
  return (
    <iframe
      src={MAP_EMBED}
      title="Map of the Lakeview Cabins location"
      loading="lazy"
      className={tall ? styles.mapTall : styles.map}
    />
  );
}

export function DirectionsPanel() {
  return (
    <div>
      <h2 className={styles.title}>{DIRECTIONS.title}</h2>
      <div className={styles.mapBox}>
        <MapFrame />
      </div>
      <div className={styles.split}>
        <div className={styles.text}>
          <LoopClip src={CLIPS.road} className={styles.clip} />
          <p>{DIRECTIONS.text}</p>
        </div>
        <Photos images={DIRECTIONS.images} />
      </div>
    </div>
  );
}

export function OccupancyPanel() {
  return (
    <div>
      <h2 className={styles.title}>{OCCUPANCY.title}</h2>
      <div className={styles.split}>
        <div className={styles.text}>
          <p>{CHECK_IN}</p>
          <p>
            {OCCUPANCY.checkIn}
            <br />
            {OCCUPANCY.checkOut}
          </p>
          <p>{HOUSE_RULES}</p>
          <p>
            Quiet hours:
            <br />
            {OCCUPANCY.quietHours}
          </p>
        </div>
        <Photos images={OCCUPANCY.images} />
      </div>
    </div>
  );
}

export function MapPanel() {
  return (
    <div className={styles.mapOnly}>
      <MapFrame tall />
    </div>
  );
}
