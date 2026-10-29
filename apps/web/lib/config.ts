/**
 * Single place for service URLs used in the browser.
 * NEXT_PUBLIC_* values are inlined at BUILD time, so set them in Vercel before deploying.
 * The localhost fallback only applies to `next dev`; a production build without the variable
 * fails loudly in the browser console instead of silently calling the visitor's own machine.
 */
const isDev = process.env.NODE_ENV === "development";

export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? (isDev ? "http://localhost:8000" : "")
).replace(/\/$/, "");

export const COMMUNITY_API_URL = (
  process.env.NEXT_PUBLIC_COMMUNITY_API_URL ?? (isDev ? "http://localhost:8004/api/community" : "/api/community")
).replace(/\/$/, "");

if (!isDev && !API_URL && typeof window !== "undefined") {
  console.error("NEXT_PUBLIC_API_URL is not set. Set it in Vercel and redeploy.");
}
