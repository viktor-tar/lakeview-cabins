/** Shared by the footer form (client) and /api/newsletter (server). */
import { z } from "zod";

export const newsletterSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email.")
    .max(200, "That email is too long.")
    .pipe(z.email("Please enter a valid email.")),
  /** Honeypot: hidden from people; bots tend to fill it. */
  website: z.string().max(200).optional(),
});

export type NewsletterInput = z.input<typeof newsletterSchema>;
