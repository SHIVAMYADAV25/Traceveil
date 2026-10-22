import type { Book } from "@/lib/support/types";
import { searchUrl } from "@/lib/support/format";
import { BookCover } from "./CoverTile";
import { ExternalIcon } from "./Icons";

export function BookRow({ book: b, index }: { book: Book; index: number }) {
  const q = `${b.title} ${b.author}`;
  return (
    <li className="flex gap-4 border-b border-line py-7 last:border-b-0 sm:gap-6">
      <span className="hidden w-8 shrink-0 pt-1 font-mono text-[22px] font-light leading-none text-line-strong select-none sm:block">
        {String(index + 1).padStart(2, "0")}
      </span>
      <BookCover title={b.title} author={b.author} tone={b.tone} />
      <div className="min-w-0 flex-1">
        <h3 className="text-[18px] font-semibold leading-snug text-ink">{b.title}</h3>
        <p className="text-[13px] text-ink-soft">
          {b.author} · {b.year}
        </p>
        <p className="mt-2.5 max-w-xl text-[14.5px] leading-[1.7] text-ink-body">{b.why}</p>
        {b.contentNote && (
          <p className="mt-3 max-w-xl rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-2 text-[12.5px] leading-relaxed text-amber-900">
            <span className="font-semibold">Content note: </span>{b.contentNote}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="rounded-full border border-line bg-canvas px-2.5 py-1 text-[12px] text-ink-soft">{b.effort}</span>
          <a href={searchUrl("openlibrary", q)} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            Borrow on Open Library <ExternalIcon size={11} className="text-ink-faint" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
          {b.publisher && (
            <a href={b.publisher.url} target="_blank" rel="noopener noreferrer"
               className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
              Publisher page{b.publisher.paid ? " (paid)" : ""} <ExternalIcon size={11} className="text-ink-faint" /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          <a href={searchUrl("googlebooks", q)} target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
            Google Books <ExternalIcon size={11} className="text-ink-faint" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </li>
  );
}
