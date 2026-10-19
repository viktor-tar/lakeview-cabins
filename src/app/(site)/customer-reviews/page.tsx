import type { Metadata } from "next";
import Image from "next/image";
import { ReviewsWidget } from "@/components/reviews/ReviewsWidget";
import { ArrowLink } from "@/components/site/ArrowLink";
import styles from "@/components/reviews/Reviews.module.css";

export const metadata: Metadata = {
  title: "Guest Reviews",
  description: "What guests say about their stay at the Lakeview cabin on Howe Sound near Squamish, BC.",
};

export default function ReviewsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true">
        <Image src="/media/canada4-compressed-400kb.jpg" alt="" fill sizes="100vw" className={styles.photo} />
      </div>
      <div className={styles.back}>
        <ArrowLink href="/">Back to home page</ArrowLink>
      </div>
      <h1 className="visually-hidden">Lakeview Cabins guest reviews</h1>
      <div className={styles.widget}>
        <ReviewsWidget />
      </div>
    </div>
  );
}
