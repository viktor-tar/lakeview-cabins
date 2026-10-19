import Image from "next/image";
import Link from "next/link";
import { CONTACT } from "@/content/site";
import { DialogButton, type DialogName } from "./DialogProvider";
import { NewsletterForm } from "./NewsletterForm";
import styles from "./Footer.module.css";

type FooterLink = { label: string } & ({ href: string } | { dialog: DialogName });

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Links",
    links: [
      { label: "Home", href: "/" },
      { label: "About us", href: "/#about" },
      { label: "Amenities", dialog: "amenities" },
      { label: "Landmarks", dialog: "landmarks" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Location", dialog: "map" },
      { label: "Gallery", href: "/gallery" },
      { label: "Occupancy rules", dialog: "occupancy" },
      { label: "Customer reviews", href: "/customer-reviews" },
    ],
  },
];

const SOCIAL = [
  { name: "X", icon: "/media/ex-icon-white.png" },
  { name: "Facebook", icon: "/media/facebook-icon-white.png" },
  { name: "Instagram", icon: "/media/inst-icon-white.png" },
];

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.newsletter}>
          <div className={styles.logoWrap}>
            <Image src="/media/cabinlogo10.png" alt="" width={100} height={100} className={styles.logo} />
          </div>
          <h2 className={styles.cta}>
            Subscribe to our monthly newsletter and stay up to date with all news and events.
          </h2>
          <div className={styles.formWrap}>
            <NewsletterForm />
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.contactCol}>
            <h2 className={styles.head}>Contact Details</h2>
            <p className={styles.desc}>If you have any questions or need help feel free to contact us.</p>
            <a href={CONTACT.phoneHref} className={styles.contact}>
              <Image src="/media/phone.svg" alt="" width={16} height={16} />
              {CONTACT.phone}
            </a>
            <a href={`mailto:${CONTACT.email}`} className={styles.contact}>
              <Image src="/media/email.svg" alt="" width={16} height={16} />
              {CONTACT.email}
            </a>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className={styles.linkCol}>
              <h2 className={styles.head}>{col.title}</h2>
              <ul className={styles.links}>
                {col.links.map((l) => (
                  <li key={l.label}>
                    {"href" in l ? (
                      <Link href={l.href} className={styles.link}>
                        {l.label}
                      </Link>
                    ) : (
                      <DialogButton name={l.dialog} className={styles.link}>
                        {l.label}
                      </DialogButton>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          {/* The cabin has no public social accounts yet, so the icons are decorative rather than dead links. */}
          <div className={styles.social} aria-hidden="true">
            {SOCIAL.map((s) => (
              <Image key={s.name} src={s.icon} alt="" width={40} height={40} className={styles.socialIcon} />
            ))}
          </div>
        </div>

        <hr className={styles.rule} />
        <div className={styles.bottom}>
          <p className={styles.copy}>© Lakeview Cabins 2023 - All Rights Reserved</p>
          <div className={styles.legal}>
            <Link href="/privacy" className={styles.legalLink}>
              Privacy policy
            </Link>
            <span className={styles.dot} aria-hidden="true" />
            <Link href="/staff" className={styles.legalLink}>
              Staff login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
