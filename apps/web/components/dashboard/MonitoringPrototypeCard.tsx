"use client";

import { useEffect, useState } from "react";

interface MonitorStatus {
  prototype?: boolean;
  disclaimer?: string;
  global?: {
    watchesActive: number;
    watchlistDomains: number;
    lastSweepAt: string;
    nextSweepAt: string;
    sweepCadenceLabel: string;
    newSignalsLastSweep: number;
  };
  recentAlerts?: Array<{
    id: string;
    severity: "info" | "review" | "critical";
    title: string;
    detail: string;
    at: string;
  }>;
  sweepHistory?: Array<{
    at: string;
    domainsChecked: number;
    thumbnailsHashed: number;
    newSignals: number;
  }>;
}

function formatShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function severityStyle(s: "info" | "review" | "critical") {
  if (s === "critical") return "border-rose-200 bg-rose-50 text-rose-800";
  if (s === "review") return "border-amber-200 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export function MonitoringPrototypeCard() {
  const [data, setData] = useState<MonitorStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/monitor/status")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json() as Promise<MonitorStatus>;
      })
      .then(setData)
      .catch(() => setErr("Could not load prototype data"));
  }, []);

  if (err) {
    return (
      <section className="rounded-xl border border-dashed border-[#e8e4de] bg-white p-5 text-[13px] text-[#9ca3af]">
        {err}
      </section>
    );
  }

  if (!data?.global) {
    return (
      <section className="rounded-xl border border-[#e8e4de] bg-white p-5 animate-pulse">
        <div className="h-4 w-40 bg-[#f0ede8] rounded mb-4" />
        <div className="h-20 bg-[#fafaf8] rounded" />
      </section>
    );
  }

  const g = data.global;

  return (
    <section className="rounded-xl border border-indigo-200/80 bg-linear-to-br from-indigo-50/90 to-white overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-indigo-100 bg-indigo-50/80">
        <span className="font-mono text-[9px] uppercase tracking-widest text-indigo-700">Prototype</span>
        <span className="text-[10px] text-indigo-600/90">Continuous monitoring — mock telemetry (no live scans)</span>
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div>
            <h2 className="text-[16px] font-semibold text-[#0a0a0a] tracking-tight">Post-removal watch</h2>
            <p className="text-[12px] text-[#6b7280] mt-1 max-w-xl leading-relaxed">
              {data.disclaimer}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-[10px] font-mono uppercase text-emerald-800">
              Watch active (demo)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="rounded-lg border border-[#e8e4de] bg-white px-3 py-2.5">
            <p className="text-[9px] font-mono uppercase text-[#a8a29e] tracking-wider mb-0.5">Active watches</p>
            <p className="text-[20px] font-semibold text-[#0a0a0a] tabular-nums">{g.watchesActive}</p>
          </div>
          <div className="rounded-lg border border-[#e8e4de] bg-white px-3 py-2.5">
            <p className="text-[9px] font-mono uppercase text-[#a8a29e] tracking-wider mb-0.5">Watchlist domains</p>
            <p className="text-[20px] font-semibold text-[#0a0a0a] tabular-nums">{g.watchlistDomains}</p>
          </div>
          <div className="rounded-lg border border-[#e8e4de] bg-white px-3 py-2.5 col-span-2 sm:col-span-1">
            <p className="text-[9px] font-mono uppercase text-[#a8a29e] tracking-wider mb-0.5">Last sweep (mock)</p>
            <p className="text-[12px] font-medium text-[#374151]">{formatShort(g.lastSweepAt)}</p>
          </div>
          <div className="rounded-lg border border-[#e8e4de] bg-white px-3 py-2.5 col-span-2 sm:col-span-1">
            <p className="text-[9px] font-mono uppercase text-[#a8a29e] tracking-wider mb-0.5">Next sweep (mock)</p>
            <p className="text-[12px] font-medium text-[#374151]">{formatShort(g.nextSweepAt)}</p>
          </div>
        </div>

        <p className="text-[11px] font-mono text-[#9ca3af] mb-3">{g.sweepCadenceLabel} · new signals last sweep: {g.newSignalsLastSweep}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#a8a29e] mb-2">Recent alerts (sample)</p>
            <ul className="space-y-2">
              {(data.recentAlerts ?? []).map((a) => (
                <li
                  key={a.id}
                  className={`rounded-lg border px-3 py-2.5 text-[12px] ${severityStyle(a.severity)}`}
                >
                  <p className="font-medium leading-snug">{a.title}</p>
                  <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">{a.detail}</p>
                  <p className="text-[10px] font-mono mt-1.5 opacity-75">{formatShort(a.at)}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#a8a29e] mb-2">Sweep history (sample)</p>
            <div className="rounded-lg border border-[#e8e4de] bg-[#fafaf8] overflow-hidden">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left border-b border-[#e8e4de] text-[#9ca3af] font-mono uppercase tracking-wider">
                    <th className="py-2 px-3">Time</th>
                    <th className="py-2 px-2">Domains</th>
                    <th className="py-2 px-2">Tiles</th>
                    <th className="py-2 px-3 text-right">New</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.sweepHistory ?? []).map((row) => (
                    <tr key={row.at} className="border-b border-[#e8e4de] last:border-0 text-[#374151]">
                      <td className="py-2 px-3 whitespace-nowrap">{formatShort(row.at)}</td>
                      <td className="py-2 px-2 tabular-nums">{row.domainsChecked}</td>
                      <td className="py-2 px-2 tabular-nums">{row.thumbnailsHashed}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium">{row.newSignals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
