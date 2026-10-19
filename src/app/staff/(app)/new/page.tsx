import type { Metadata } from "next";
import { getRules } from "@/lib/booking/service";
import { getSql } from "@/lib/server/sql";
import { todayIn } from "@/lib/booking/dates";
import { NewForms } from "./NewForms";
import { connection } from "next/server";

export const metadata: Metadata = { title: "New booking / block" };

export default async function NewPage() {
  await connection(); // staff data is always live
  const rules = await getRules(getSql());
  return (
    <>
      <div className="page-head">
        <h1>New booking or blocked dates</h1>
      </div>
      <NewForms today={todayIn(rules.timezone)} maxGuests={rules.maxGuests} />
    </>
  );
}
