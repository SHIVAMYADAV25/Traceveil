import { NextRequest, NextResponse } from "next/server";

/**
 * Prototype only: returns static monitoring telemetry for demos.
 * No scheduled jobs, no crawling, no persistence — judges / users see the UX story only.
 */
export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get("caseId")?.trim() ?? null;

  const now = new Date();
  const lastSweep = new Date(now.getTime() - 6 * 60 * 60 * 1000);
  const nextSweep = new Date(now.getTime() + 18 * 60 * 60 * 1000);

  const payload = {
    prototype: true,
    disclaimer:
      "Demonstration data only. Continuous re-scanning against a live watchlist is not executed in this build.",
    global: {
      watchesActive: 12,
      watchlistDomains: 48,
      lastSweepAt: lastSweep.toISOString(),
      nextSweepAt: nextSweep.toISOString(),
      sweepCadenceLabel: "Every 24h (simulated)",
      newSignalsLastSweep: 0,
    },
    recentAlerts: [
      {
        id: "mock-1",
        severity: "info" as const,
        title: "No new matches on watchlist (last sweep)",
        detail: "Compared stored watch fingerprints against 48 monitored surface tiles.",
        at: lastSweep.toISOString(),
      },
      {
        id: "mock-2",
        severity: "review" as const,
        title: "Manual review queue (sample)",
        detail: "Low-confidence frame on a mirrored CDN — would open as a lead, not auto-verdict.",
        at: new Date(now.getTime() - 26 * 60 * 60 * 1000).toISOString(),
      },
    ],
    sweepHistory: [
      { at: lastSweep.toISOString(), domainsChecked: 48, thumbnailsHashed: 312, newSignals: 0 },
      { at: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString(), domainsChecked: 48, thumbnailsHashed: 298, newSignals: 1 },
      { at: new Date(now.getTime() - 54 * 60 * 60 * 1000).toISOString(), domainsChecked: 46, thumbnailsHashed: 276, newSignals: 0 },
    ],
  };

  if (caseId) {
    return NextResponse.json({
      ...payload,
      caseWatch: {
        caseId,
        monitoringEnabled: true,
        fingerprintStored: true,
        watchSurfaces: ["dataset: monitored domains", "user-expandable (roadmap)"],
        lastMockScanAt: lastSweep.toISOString(),
      },
    });
  }

  return NextResponse.json(payload);
}
