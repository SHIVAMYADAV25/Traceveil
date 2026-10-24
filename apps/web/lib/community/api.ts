/**
 * Calls to the Community service. It is a separate server from the rest of the site, so nothing
 * here touches the existing /api routes.
 *
 * In development the service is on port 8004 and the browser calls it directly (cookies are not
 * port-specific, and the service allows this origin). In production, route a path on the same
 * domain to the service and set NEXT_PUBLIC_COMMUNITY_API_URL=/api/community.
 */
export const API_BASE = (process.env.NEXT_PUBLIC_COMMUNITY_API_URL ?? "http://localhost:8004/api/community").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T = unknown>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: "include",
      headers: {
        "X-Community-Client": "web",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network", "We could not reach the Community. Please check your connection and try again.");
  }
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) {
    const e = (data as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiError(res.status, e?.code ?? "error", e?.message ?? "Something went wrong. Please try again.", e?.details);
  }
  return data as T;
}

export const get = <T,>(p: string) => api<T>("GET", p);
export const post = <T,>(p: string, b: unknown = {}) => api<T>("POST", p, b);
export const put = <T,>(p: string, b: unknown = {}) => api<T>("PUT", p, b);
export const patch = <T,>(p: string, b: unknown = {}) => api<T>("PATCH", p, b);
export const del = <T,>(p: string, b?: unknown) => api<T>("DELETE", p, b);

export function websocketUrl(): string {
  if (API_BASE.startsWith("/")) {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}${API_BASE}/ws`;
  }
  return `${API_BASE.replace(/^http/, "ws")}/ws`;
}

export const newClientId = (): string => crypto.randomUUID();
