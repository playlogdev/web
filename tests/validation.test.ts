import { describe, expect, it } from "vitest";
import {
  normalizeEmail,
  passwordByteLength,
  safeInternalPath,
  validatePassword,
  validateUsername,
} from "@/lib/validation";

describe("normalizeEmail", () => {
  it("trims and lowercases", () => {
    expect(normalizeEmail("  User@Example.COM ")).toBe("user@example.com");
  });

  it("rejects invalid addresses and non-strings", () => {
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
    expect(normalizeEmail(42)).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });
});

describe("validateUsername", () => {
  it("accepts the documented format", () => {
    expect(validateUsername("Player_one")).toBe("player_one");
  });

  it("rejects wrong length or characters", () => {
    expect(validateUsername("ab")).toBeNull();
    expect(validateUsername("a".repeat(31))).toBeNull();
    expect(validateUsername("has space")).toBeNull();
    expect(validateUsername("has-dash")).toBeNull();
    expect(validateUsername("")).toBeNull();
    expect(validateUsername(undefined)).toBeNull();
  });
});

describe("validatePassword (byte-based)", () => {
  it("accepts 8-72 bytes", () => {
    expect(validatePassword("1234567a")).toBe("1234567a");
  });

  it("rejects short passwords by byte count", () => {
    expect(validatePassword("1234567")).toBeNull();
  });

  it("rejects over-72-byte passwords even when under 72 characters", () => {
    const multibyte = "é".repeat(40); // 80 bytes in UTF-8, 40 characters
    expect(passwordByteLength(multibyte)).toBe(80);
    expect(validatePassword(multibyte)).toBeNull();
  });

  it("rejects non-strings", () => {
    expect(validatePassword(12345678)).toBeNull();
  });
});

describe("safeInternalPath", () => {
  it("accepts internal paths", () => {
    expect(safeInternalPath("/home")).toBe("/home");
    expect(safeInternalPath("/library?shelf=1")).toBe("/library?shelf=1");
  });

  it("rejects external and protocol-smuggled destinations", () => {
    expect(safeInternalPath("https://evil.example")).toBe("/");
    expect(safeInternalPath("//evil.example")).toBe("/");
    expect(safeInternalPath("/\\evil")).toBe("/");
    expect(safeInternalPath("/redirect?to=https://evil.example")).toBe("/");
    expect(safeInternalPath(null)).toBe("/");
    expect(safeInternalPath("/ok", "/fallback")).toBe("/ok");
  });
});
