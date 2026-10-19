import { expect, test, type Locator } from "@playwright/test";

/** Clicks the first bookable day, then a bookable day at least `nights` later (moving to next month if needed). */
async function pickStay(cal: Locator, nights = 3) {
  const free = cal.locator("button[data-date]:not([aria-disabled])");
  const checkIn = (await free.first().getAttribute("data-date"))!;
  await free.first().click();
  for (let attempt = 0; attempt < 3; attempt++) {
    for (const day of await free.all()) {
      const d = (await day.getAttribute("data-date"))!;
      if ((Date.parse(d) - Date.parse(checkIn)) / 864e5 >= nights) {
        await day.click();
        return;
      }
    }
    await cal.getByRole("button", { name: "Next month" }).click();
  }
  throw new Error("No bookable check-out date found");
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
