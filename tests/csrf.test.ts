import { describe, expect, it } from "vitest";
import { isSameOriginMutation } from "@/lib/auth/csrf";

const HOST = "playlog.example:3000";

describe("isSameOriginMutation", () => {
  it("accepts matching origin with same-origin fetch metadata", () => {
    expect(
      isSameOriginMutation(`https://${HOST}`, "same-origin", HOST),
    ).toBe(true);
  });

  it("accepts matching origin without fetch metadata (older browsers)", () => {
    expect(isSameOriginMutation(`https://${HOST}`, null, HOST)).toBe(true);
  });

  it("rejects cross-site fetch metadata even with a matching origin", () => {
    expect(
      isSameOriginMutation(`https://${HOST}`, "cross-site", HOST),
    ).toBe(false);
  });

  it("rejects mismatched origin", () => {
    expect(isSameOriginMutation("https://evil.example", "same-origin", HOST)).toBe(false);
  });

  it("rejects missing origin without fetch metadata", () => {
    expect(isSameOriginMutation(null, null, HOST)).toBe(false);
  });

  it("rejects malformed origin", () => {
    expect(isSameOriginMutation("not-a-url", "same-origin", HOST)).toBe(false);
  });
});
