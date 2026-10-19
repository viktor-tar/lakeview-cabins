import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Stripe test-mode guard", () => {
  it("refuses a live secret key", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_123");
    const { getStripe } = await import("../src/lib/payments/stripe");
    expect(() => getStripe()).toThrow(/live Stripe key/);
  });
  it("accepts a test key", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123");
    const { getStripe } = await import("../src/lib/payments/stripe");
    expect(() => getStripe()).not.toThrow();
  });
});
