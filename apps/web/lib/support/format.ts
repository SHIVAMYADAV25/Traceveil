const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** "2026-10-21" → "21 Oct 2026" (no timezone surprises). */
export function formatChecked(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function initials(name: string): string {
  return name
    .replace(/[()]/g, "")
    .split(/[\s-]+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function searchUrl(kind: "spotify" | "youtube" | "openlibrary" | "googlebooks", q: string): string {
  const e = encodeURIComponent(q);
  switch (kind) {
    case "spotify": return `https://open.spotify.com/search/${e}`;
    case "youtube": return `https://www.youtube.com/results?search_query=${e}`;
    case "openlibrary": return `https://openlibrary.org/search?q=${e}`;
    case "googlebooks": return `https://www.google.com/books?q=${e}`;
  }
}

/** "/chat" is ours. Anything else opens another site. */
export const isInternal = (url: string) => url.startsWith("/");
