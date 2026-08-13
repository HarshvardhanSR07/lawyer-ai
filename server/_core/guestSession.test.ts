import { describe, expect, it } from "vitest";
import { GUEST_SESSION_COOKIE, resolveGuestUser } from "./guestSession";

describe("guest session", () => {
  it("issues a signed browser-scoped identity and reuses it on the next request", async () => {
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "test-guest-session-secret";
    const cookies: Array<{ name: string; value: string }> = [];
    const response = { cookie: (name: string, value: string) => cookies.push({ name, value }) } as any;
    const first = await resolveGuestUser({ headers: {}, protocol: "http" } as any, response);
    const token = cookies.find(cookie => cookie.name === GUEST_SESSION_COOKIE)?.value;
    expect(first.openId).toMatch(/^guest_/);
    expect(first.id).toBeGreaterThan(0);
    expect(first.id).toBeLessThanOrEqual(2_000_000_000);
    expect(token).toBeTruthy();
    const second = await resolveGuestUser({ headers: { cookie: `${GUEST_SESSION_COOKIE}=${token}` }, protocol: "http" } as any, response);
    expect(second.openId).toBe(first.openId);
    expect(second.id).toBe(first.id);
    process.env.JWT_SECRET = previous;
  });
});
