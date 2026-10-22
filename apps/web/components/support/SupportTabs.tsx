"use client";

import { useEffect, useState } from "react";

export interface TabItem {
  key: string;
  label: string;
  count: number;
  panel: React.ReactNode;
}

/**
 * Segmented control, same look as the Image / Video switch on the Leak page.
 * Panels come in from the server page. The URL hash (#communities) follows the tab,
 * so a tab can be linked to and Back behaves.
 */
export function SupportTabs({ items, label }: { items: TabItem[]; label: string }) {
  const first = items[0].key;
  const [tab, setTab] = useState(first);

  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace("#", "");
      setTab(items.some((i) => i.key === h) ? h : first);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [items, first]);

  const choose = (k: string) => {
    setTab(k);
    history.replaceState(null, "", `#${k}`);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="mb-8 inline-flex max-w-full flex-wrap rounded-lg border border-line bg-paper p-0.5"
      >
        {items.map(({ key, label: text, count }) => (
          <button
            key={key}
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => choose(key)}
            className={`min-h-10 rounded-md px-4 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
              tab === key ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            {text} <span className={tab === key ? "text-white/70" : "text-ink-soft"}>{count}</span>
          </button>
        ))}
      </div>
      {items.map(({ key, panel }) => (
        <div key={key} role="tabpanel" id={`panel-${key}`} aria-labelledby={`tab-${key}`} hidden={tab !== key}>
          {panel}
        </div>
      ))}
    </div>
  );
}
