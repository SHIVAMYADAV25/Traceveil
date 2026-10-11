import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/** Server fetch: use 127.0.0.1 so Node is less likely to hit ::1 while uvicorn is on IPv4. */
function analysisBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? process.env.ANALYSIS_SERVICE_URL ?? "http://127.0.0.1:8000";
  return raw.replace("http://localhost", "http://127.0.0.1").replace("https://localhost", "https://127.0.0.1");
}

function normalizeCreatedAt(value: unknown): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
  }
  return Math.floor(Date.now() / 1000);
}

type RouteCtx = { params: Promise<{ caseId: string }> } | { params: { caseId: string } };

async function resolveCaseId(context: RouteCtx): Promise<string | null> {
  const p = context.params as Promise<{ caseId: string }> | { caseId: string };
  const resolved = await Promise.resolve(p);
  const id = resolved?.caseId?.trim();
  return id?.length ? id : null;
}

export async function GET(_req: NextRequest, context: RouteCtx) {
  try {
    const caseId = await resolveCaseId(context);
    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    try {
      const client = await clientPromise;
      const col = client.db("snifferX").collection("cases");
      const doc = await col.findOne(
        { case_id: caseId },
        {
          projection: {
            _id: 0,
            case_id: 1,
            created_at: 1,
            anonymous: 1,
            platform_source: 1,
            issue_type: 1,
            description: 1,
            pipeline_type: 1,
          },
        },
      );

      if (doc) {
        return NextResponse.json({
          case_id: String(doc.case_id ?? caseId),
          created_at: normalizeCreatedAt(doc.created_at),
          anonymous: typeof doc.anonymous === "boolean" ? doc.anonymous : true,
          platform_source: typeof doc.platform_source === "string" ? doc.platform_source : "Other",
          issue_type: typeof doc.issue_type === "string" ? doc.issue_type : "Other",
          description: typeof doc.description === "string" ? doc.description : null,
          pipeline_type: typeof doc.pipeline_type === "string" ? doc.pipeline_type : "deepfake",
        });
      }
    } catch {
      // Mongo optional — continue to analysis API.
    }

    const base = analysisBaseUrl();
    const res = await fetch(`${base}/api/cases/${encodeURIComponent(caseId)}`, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    const json = (await res.json()) as Record<string, unknown>;
    return NextResponse.json(json);
  } catch {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
}
