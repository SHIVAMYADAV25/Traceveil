"use client";
import { useEffect, useState } from "react";

/** The current time, refreshed on a timer, so "5 min ago" labels stay right without reading the clock during render. */
export function useNow(everyMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(t);
  }, [everyMs]);
  return now;
}
