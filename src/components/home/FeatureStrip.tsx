"use client";
/** The six icons under the hero. Clicking one slides its text open underneath; clicking again closes it. */
import Image from "next/image";
import { useState } from "react";
import { FEATURES } from "@/content/home";
import styles from "./FeatureStrip.module.css";

export function FeatureStrip() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className={styles.strip} aria-label="About your stay">
      <ul className={styles.list}>
        {FEATURES.map((f, i) => {
          const isOpen = open.has(f.id);
          return (
            <li key={f.id} className={`${styles.item} ${i === FEATURES.length - 1 ? styles.last : ""}`}>
              <button
                type="button"
                className={styles.head}
                aria-expanded={isOpen}
                aria-controls={`feature-${f.id}`}
                onClick={() => toggle(f.id)}
              >
                <Image
                  src={f.icon}
                  alt=""
                  width={60}
                  height={70}
                  className={f.narrowIcon ? `${styles.icon} ${styles.iconNarrow}` : styles.icon}
                />
                <span className={styles.title}>
                  {f.title[0]}
                  <br />
                  {f.title[1]}
                </span>
                <span className={styles.closeBadge} aria-hidden="true" data-show={isOpen}>
                  <Image src="/media/close-icon.png" alt="" width={20} height={20} className={styles.closeIcon} />
                  <span className={styles.ring1} />
                  <span className={styles.ring2} />
                  <span className={styles.ring3} />
                </span>
              </button>
              <div
                id={`feature-${f.id}`}
                className={styles.answer}
                data-open={isOpen}
                role="region"
                aria-label={f.title.join(" ")}
              >
                <div className={styles.answerInner}>
                  <div
                    className={f.short ? `${styles.text} ${styles.textShort}` : styles.text}
                    tabIndex={isOpen ? 0 : -1}
                  >
                    {f.paragraphs.map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                    {f.lines && (
                      <p>
                        {f.lines.map((l, j) => (
                          <span key={l}>
                            {j > 0 && <br />}
                            {l}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
