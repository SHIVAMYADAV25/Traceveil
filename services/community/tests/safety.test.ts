import { describe, expect, it } from "vitest";
import { findLinks, isBlockedHost, loadBlockedDomains } from "../src/safety/link-guard.js";
import { findPersonalDetails } from "../src/safety/pii-guard.js";
import { loadCrisisPhrases, showsCrisisLanguage } from "../src/safety/crisis-guard.js";
import { PHRASE_WORDS, ADJECTIVES, NOUNS } from "../src/lib/words.js";
import { validateDisplayName } from "../src/lib/alias.js";

const blocked = new Set(["bad-site.com", "other.tv"]);

describe("link guard", () => {
  it("finds full urls, www links and bare domains", () => {
    expect(findLinks("see https://example.org/path?x=1", blocked).map((l) => l.host)).toEqual(["example.org"]);
    expect(findLinks("go to www.example.com now", blocked).map((l) => l.host)).toEqual(["example.com"]);
    expect(findLinks("try example.in please", blocked)).toHaveLength(1);
  });

  it("does not treat ordinary sentences as links", () => {
    expect(findLinks("I felt ok.Thanks for listening. e.g. this and i.e. that, U.S.A", blocked)).toHaveLength(0);
    expect(findLinks("It was 3.5 hours", blocked)).toHaveLength(0);
  });

  it("flags blocked hosts, including subdomains and tricks", () => {
    expect(isBlockedHost("cdn.bad-site.com", blocked)).toBe(true);
    expect(isBlockedHost("notbad-site.com", blocked)).toBe(false);
    expect(findLinks("https://BAD-SITE.com/x", blocked)[0]?.blocked).toBe(true);
    expect(findLinks("bad-site.com", blocked)[0]?.blocked).toBe(true);
    expect(findLinks("https://www.other.tv/a", blocked)[0]?.blocked).toBe(true);
  });

  it("loads the standalone blocked list from data/", () => {
    const list = loadBlockedDomains();
    expect(list.size).toBeGreaterThan(50);
    expect([...list].every((d) => !d.startsWith("#") && !d.includes(" "))).toBe(true);
    expect(list.has("imdb.com")).toBe(false);
  });
});

describe("personal details guard", () => {
  it("spots phone numbers, emails and ID-like numbers", () => {
    expect(findPersonalDetails("call me on +91 98765 43210")).toContain("phone");
    expect(findPersonalDetails("9876543210")).toContain("phone");
    expect(findPersonalDetails("write to someone@example.com")).toContain("email");
    expect(findPersonalDetails("1234 5678 9012")).toContain("government_id");
    expect(findPersonalDetails("ABCDE1234F")).toContain("government_id");
  });
  it("leaves normal text alone", () => {
    expect(findPersonalDetails("It happened 3 times in 2019 and I was 24.")).toEqual([]);
    expect(findPersonalDetails("Room 1204, floor 12")).toEqual([]);
  });
});

describe("crisis guard", () => {
  const phrases = loadCrisisPhrases();
  it("recognises listed phrases, including curly apostrophes", () => {
    expect(showsCrisisLanguage("I want to die", phrases)).toBe(true);
    expect(showsCrisisLanguage("I don’t want to live like this", phrases)).toBe(true); // curly apostrophe is normalised
  });
  it("does not trigger on unrelated text", () => {
    expect(showsCrisisLanguage("The photo was removed today", phrases)).toBe(false);
  });
});

describe("word lists and names", () => {
  it("recovery phrase words are unique and lowercase", () => {
    expect(new Set(PHRASE_WORDS).size).toBe(PHRASE_WORDS.length);
    expect(PHRASE_WORDS.every((w) => /^[a-z]+$/.test(w))).toBe(true);
  });
  it("name parts have no duplicates", () => {
    expect(new Set(ADJECTIVES).size).toBe(ADJECTIVES.length);
    expect(new Set(NOUNS).size).toBe(NOUNS.length);
  });
  it("validates display names", () => {
    expect(validateDisplayName("Quiet Heron")).toBeNull();
    expect(validateDisplayName("A")).not.toBeNull();
    expect(validateDisplayName("Admin")).not.toBeNull();
    expect(validateDisplayName("Moderator Sam")).not.toBeNull();
    expect(validateDisplayName("<script>")).not.toBeNull();
  });
});
