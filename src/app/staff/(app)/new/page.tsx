import type { Metadata } from "next";
import { getRules } from "@/lib/booking/service";
import { getSql } from "@/lib/server/sql";
import { todayIn } from "@/lib/booking/dates";
import { NewForms } from "./NewForms";
import { connection } from "next/server";
import { cx } from "@/app/staff/cx";

export const metadata: Metadata = { title: "New booking / block" };

export default async function NewPage() {
  await connection(); // staff data is always live
  const rules = await getRules(getSql());
  return (
    <>
      <div className={cx("page-head")}>
        <h1>New booking or blocked dates</h1>
      </div>
      <NewForms today={todayIn(rules.timezone)} maxGuests={rules.maxGuests} />
    </>
  );
}
