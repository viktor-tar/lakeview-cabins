/** Request validation for the public API (shared shapes, server-side source of truth). */
import { z } from "zod";
import { isIsoDate } from "./dates";

const isoDate = z.string().refine(isIsoDate, "Invalid date");

export const stayInput = z.object({
  checkIn: isoDate,
  checkOut: isoDate,
  guests: z.coerce.number().int(),
  breakfast: z.coerce.boolean().default(false),
});

export const bookingInput = stayInput.extend({
  name: z.string().trim().min(2, "Please enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(200),
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
  // spam protection
  website: z.string().optional(), // honeypot: real visitors never see or fill this
  startedAt: z.coerce.number().optional(), // when the form was shown (ms since epoch)
  returnUrl: z.string().url().optional(),
});

export type BookingInput = z.infer<typeof bookingInput>;

export function firstIssue(err: z.ZodError) {
  const issue = err.issues[0];
  return issue?.message && issue.message !== "Required" ? issue.message : "Please check the booking details.";
}
