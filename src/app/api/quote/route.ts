import { stayInput, firstIssue } from "@/lib/booking/input";
import { quoteStay, validateStay } from "@/lib/booking/rules";
import { BookingError, getRules } from "@/lib/booking/service";
import { errorResponse, json, preflight } from "@/lib/server/http";
import { getSql } from "@/lib/server/sql";

export const OPTIONS = preflight;

export async function POST(req: Request) {
  try {
    const parsed = stayInput.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) throw new BookingError("invalid_input", firstIssue(parsed.error));
    const rules = await getRules(getSql());
    const err = validateStay(parsed.data, rules);
    if (err) throw new BookingError(err.code, err.message);
    return json(req, { quote: quoteStay(parsed.data, rules) });
  } catch (e) {
    return errorResponse(req, e);
  }
}
