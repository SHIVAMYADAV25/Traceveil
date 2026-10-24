import { readFileSync } from "node:fs";
import { dataPath } from "../lib/paths.js";

/** Top-level domains we treat as links when written without http:// or www. */
const COMMON_TLDS = new Set([
  "com", "net", "org", "in", "co", "io", "me", "xyz", "tv", "cc", "app", "info", "site", "online",
  "link", "click", "ink", "pro", "top", "club", "live", "cam", "mobi", "bond", "sbs", "run", "tube",
  "xxx", "porn", "sex", "ltd", "rent", "best", "watch", "place", "health", "desi", "ws", "to", "ly",
  "gl", "be", "us", "uk", "ru", "cn", "de", "fr", "gov", "edu",
]);

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"')]+/giu;
const BARE_DOMAIN_PATTERN = /\b((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+([a-z]{2,24}))(?:\/[^\s<>"')]*)?/giu;

export interface LinkFinding {
  host: string;
  blocked: boolean;
}

export function loadBlockedDomains(file = dataPath("blocked-domains.txt")): Set<string> {
  const text = readFileSync(file, "utf8");
  return new Set(
    text
      .split(/\r?\n/)
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l && !l.startsWith("#")),
  );
}

function hostFromUrl(raw: string): string | null {
  const withScheme = /^[a-z]+:\/\//i.test(raw) ? raw : `http://${raw}`;
  try {
    return new URL(withScheme).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** True when the host, or any parent domain of it, is in the blocked set. */
export function isBlockedHost(host: string, blocked: ReadonlySet<string>): boolean {
  const parts = host.split(".");
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (blocked.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

/** Find every link-like piece of text and say whether it points at a blocked site. */
export function findLinks(text: string, blocked: ReadonlySet<string>): LinkFinding[] {
  const hosts = new Set<string>();

  for (const match of text.matchAll(URL_PATTERN)) {
    const host = hostFromUrl(match[0]);
    if (host) hosts.add(host);
  }
  for (const match of text.matchAll(BARE_DOMAIN_PATTERN)) {
    const full = match[1]?.toLowerCase();
    const tld = match[2]?.toLowerCase();
    if (!full || !tld) continue;
    if (COMMON_TLDS.has(tld) || blocked.has(full) || isBlockedHost(full, blocked)) {
      hosts.add(full.replace(/^www\./, ""));
    }
  }
  return [...hosts].map((host) => ({ host, blocked: isBlockedHost(host, blocked) }));
}
