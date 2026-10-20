import { expect, test, type Locator } from "@playwright/test";

/**
 * Picks a stay of at least `nights` nights. Clicks a check-in day, then a later free day; if a booked stay sits in
 * between, that click becomes the new check-in (as it does for a real guest), so it keeps going from there.
 */
async function pickStay(cal: Locator, nights = 3) {
  const free = cal.locator("button[data-date]:not([aria-disabled])");
  const done = cal.getByRole("button", { name: "Clear dates" });
  for (let m = 0; m < 6 && (await free.count()) === 0; m++)
    await cal.getByRole("button", { name: "Next month" }).click();
  let checkIn = (await free.first().getAttribute("data-date"))!;
  await free.first().click();
  for (let month = 0; month < 4; month++) {
    for (let i = 0; i < (await free.count()); i++) {
      const day = free.nth(i);
      const d = (await day.getAttribute("data-date"))!;
      if ((Date.parse(d) - Date.parse(checkIn)) / 864e5 < nights) continue;
      await day.click();
      if (await done.isVisible()) return;
      checkIn = d; // it became the new check-in
    }
    await cal.getByRole("button", { name: "Next month" }).click();
  }
  throw new Error("No bookable stay found");
}

test("dates picked in the hero carry over to the booking popup, and a request can be sent", async ({ page }) => {
  await page.goto("/");
  const hero = page.getByRole("region", { name: "Check availability and book" }).first();
  await expect(hero.getByText("Select Dates")).toBeVisible();

  await pickStay(hero);
  await expect(hero.getByRole("button", { name: "Clear dates" })).toBeVisible();
  await hero.getByRole("button", { name: /Continue/ }).click();

  const dialog = page.getByRole("dialog", { name: "Book your stay" });
  await expect(dialog.getByText("Your details")).toBeVisible();

  // The server's own validation messages show for an empty form.
  await dialog.getByRole("button", { name: /Request to book/ }).click();
  await expect(dialog.getByText("Please enter your full name")).toBeVisible();
  await expect(dialog.getByText("Please enter a valid email")).toBeVisible();

  await dialog.getByLabel("Full name").fill("Test Guest");
  await dialog.getByLabel("Email").fill("guest@example.com");
  await page.waitForTimeout(3200); // the API rejects forms submitted faster than a person could fill them
  await dialog.getByRole("button", { name: /Request to book/ }).click();

  // Locally (no Stripe key) the request is confirmed straight away; with Stripe it redirects to Checkout.
  await expect(dialog.getByText(/Reference LV-/)).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(hero.getByText("Request received")).toBeVisible();
});

test("newsletter sign-up validates the address", async ({ page }) => {
  await page.goto("/");
  const email = page.getByLabel("Email address");
  await email.fill("not-an-email");
  await page.getByRole("button", { name: "Subscribe" }).click();
  await expect(page.getByText("Please enter a valid email.")).toBeVisible();
  await email.fill(`fan+${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Subscribe" }).click();
  await expect(page.getByText(/on the list/)).toBeVisible();
});
