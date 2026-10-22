import type { Book } from "@/lib/support/types";
import { searchUrl } from "@/lib/support/format";
import { BookCover } from "./CoverTile";
import { ExternalIcon } from "./Icons";

const linkClassName =
  "inline-flex items-center gap-1.5 text-[12.5px] font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink transition-colors";

export function BookRow({ book: b, index }: { book: Book; index: number }) {
  const q = `${b.title} ${b.author}`;

  return (
    <li className="flex gap-4 border-b border-line py-7 last:border-b-0 sm:gap-6 items-start">
      {/* Sequential Number Badge */}
      <span className="w-6 shrink-0 pt-1 font-mono text-[20px] font-light leading-none text-line-strong select-none sm:w-8 sm:text-[22px]">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Book Cover Thumbnail */}
      <BookCover title={b.title} author={b.author} tone={b.tone} />

      {/* Content Container */}
      <div className="min-w-0 flex-1">
        {/* Title & Author */}
        <h3 className="font-serif text-[19px] font-normal leading-snug tracking-tight text-ink sm:text-[20px]">
          {b.title}
        </h3>
        <p className="mt-0.5 text-[13px] font-medium text-ink-soft">
          {b.author} · {b.year}
        </p>

        {/* Why Read / Summary */}
        <p className="mt-3 max-w-xl text-[14.5px] leading-[1.7] text-ink-body">
          {b.why}
        </p>

        {/* Content Warning Box */}
        {/* {b.contentNote && (
          <div className="mt-4 max-w-xl rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-[13px] leading-relaxed text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200/90">
            <span className="font-semibold uppercase tracking-wider text-[11px] font-mono block mb-0.5 text-amber-800 dark:text-amber-300">
              Content note
            </span>
            {b.contentNote}
          </div>
        )} */}

        {/* Effort Badge & External Resource Links */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2.5">
          {b.effort && (
            <span className="rounded-full border border-line bg-canvas px-3 py-1 text-[12px] font-medium text-ink-soft shadow-2xs">
              {b.effort}
            </span>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href={searchUrl("openlibrary", q)}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
            >
              Borrow on Open Library <ExternalIcon size={11} className="text-ink-faint" />
              <span className="sr-only">: {b.title} (opens in a new tab)</span>
            </a>

            {b.publisher && (
              <a
                href={b.publisher.url}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
              >
                Publisher page{b.publisher.paid ? " (paid)" : ""}{" "}
                <ExternalIcon size={11} className="text-ink-faint" />
                <span className="sr-only">: {b.title} (opens in a new tab)</span>
              </a>
            )}

            <a
              href={searchUrl("googlebooks", q)}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
            >
              Google Books <ExternalIcon size={11} className="text-ink-faint" />
              <span className="sr-only">: search for {b.title} on Google Books (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}