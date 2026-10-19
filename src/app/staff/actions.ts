"use server";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff, signIn, signOut } from "@/auth";
import { isIsoDate } from "@/lib/booking/dates";
import {
  approveBooking,
  blockDates,
  BookingError,
  cancelBooking,
  createStaffBooking,
  declineBooking,
} from "@/lib/booking/service";
import { paymentGateway } from "@/lib/payments/stripe";
import { getSql } from "@/lib/server/sql";
import { sendBookingEmail } from "@/lib/email/mailer";

export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;

function fail(e: unknown): ActionState {
  if (e instanceof BookingError) return { error: e.message };
  console.error(e);
  return { error: "Something went wrong. Please try again." };
}

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo: String(form.get("next") || "/staff"),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return {
        error:
          (e as { code?: string }).code === "too_many_attempts"
            ? "Too many attempts. Please wait 15 minutes and try again."
            : "Incorrect email or password.",
      };
    }
    throw e; // the redirect after a successful sign-in
  }
}

export async function logout() {
  await signOut({ redirectTo: "/staff/login" });
}

const idSchema = z.string().uuid();
const reasonSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => v || undefined);

async function decide(kind: "approve" | "decline" | "cancel", form: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  const id = idSchema.parse(form.get("id"));
  const reason = reasonSchema.parse(form.get("reason") ?? undefined);
  let message: string;
  try {
    const sql = getSql();
    const pay = paymentGateway();
    if (kind === "approve") {
      const b = await approveBooking(sql, id, staff.email, pay);
      await sendBookingEmail(sql, "approved", b);
      message =
        b.payment_status === "captured" && b.stripe_payment_intent_id
          ? "Approved. The payment was captured."
          : "Approved.";
    } else if (kind === "decline") {
      const b = await declineBooking(sql, id, staff.email, pay, reason);
      await sendBookingEmail(sql, "declined", b);
      message =
        b.payment_status === "released"
          ? "Declined. The card authorisation was released."
          : "Declined. The dates are free again.";
    } else {
      const b = await cancelBooking(sql, id, staff.email, pay, reason);
      if (b.kind === "reservation") await sendBookingEmail(sql, "cancelled", b);
      message =
        b.kind === "block"
          ? "Unblocked. The dates are bookable again."
          : b.payment_status === "refunded"
            ? "Cancelled and refunded. The dates are free again."
            : "Cancelled. The dates are free again.";
    }
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/staff", "layout");
  return { ok: true, message };
}

export async function approveAction(_: ActionState, form: FormData) {
  return decide("approve", form);
}
export async function declineAction(_: ActionState, form: FormData) {
  return decide("decline", form);
}
export async function cancelAction(_: ActionState, form: FormData) {
  return decide("cancel", form);
}

const dateField = z.string().refine(isIsoDate, "Choose a date");

export async function createBookingAction(_: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  const parsed = z
    .object({
      checkIn: dateField,
      checkOut: dateField,
      guests: z.coerce.number().int().min(1),
      breakfast: z.preprocess((v) => v === "on", z.boolean()),
      name: z.string().trim().min(2, "Enter the guest's name").max(120),
      email: z.string().trim().toLowerCase().email("Enter a valid email"),
      phone: z
        .string()
        .trim()
        .max(40)
        .optional()
        .transform((v) => v || undefined),
      message: z
        .string()
        .trim()
        .max(1000)
        .optional()
        .transform((v) => v || undefined),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  let id: string;
  try {
    const b = await createStaffBooking(getSql(), parsed.data, staff.email);
    id = b.id;
    await sendBookingEmail(getSql(), "approved", b);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/staff", "layout");
  redirect(`/staff/bookings/${id}?created=1`);
}

export async function blockDatesAction(_: ActionState, form: FormData): Promise<ActionState> {
  const staff = await requireStaff();
  const parsed = z
    .object({ start: dateField, end: dateField, reason: reasonSchema })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    await blockDates(getSql(), parsed.data.start, parsed.data.end, staff.email, parsed.data.reason);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/staff", "layout");
  return { ok: true, message: "Dates blocked. They no longer appear as available on the website." };
}
