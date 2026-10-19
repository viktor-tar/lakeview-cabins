"use client";
/** Uppercase text link with three chevrons that spread and shimmer on hover (the original "button-10"). */
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./ArrowLink.module.css";

function Chevrons() {
  return (
    <span className={styles.arrows} aria-hidden="true">
      {[styles.arrow1, styles.arrow2, styles.arrow3].map((cls) => (
        <svg key={cls} className={cls} viewBox="0 0 320 512" width="12" height="20">
          <path
            fill="currentColor"
            d="M285.5 273L91.1 467.3c-9.4 9.4-24.6 9.4-33.9 0l-22.7-22.7c-9.4-9.4-9.4-24.5 0-33.9L188.5 256 34.5 101.3c-9.3-9.4-9.3-24.5 0-33.9l22.7-22.7c9.4-9.4 24.6-9.4 33.9 0L285.5 239c9.4 9.4 9.4 24.6 0 34z"
          />
        </svg>
      ))}
    </span>
  );
}

type Props = { children: ReactNode; className?: string } & (
  { href: string; onClick?: never } | { href?: never; onClick: () => void }
);

export function ArrowLink({ href, onClick, children, className }: Props) {
  const inner = (
    <>
      <span className={styles.text}>{children}</span>
      <Chevrons />
    </>
  );
  const cls = className ? `${styles.link} ${className}` : styles.link;
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" className={cls} onClick={onClick} aria-haspopup="dialog">
      {inner}
    </button>
  );
}
