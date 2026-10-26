/** Pinned notes are plain text. Numbered lines (like the four rules) are shown as a tidy numbered list. */
export function NoteBody({ body }: { body: string }) {
  const lines = body.split("\n").filter((l) => l.trim());
  const numbered = lines.length > 1 && lines.every((l) => /^\d+\.\s/.test(l));
  if (!numbered) return <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-[var(--cm-ink-2)]">{body}</p>;
  return (
    <ol className="space-y-2.5">
      {lines.map((l) => {
        const [, n, rest] = /^(\d+)\.\s(.*)$/.exec(l) ?? [];
        // The first sentence is the rule's name; the rest explains it.
        const dot = (rest ?? "").indexOf(". ");
        const head = dot > 0 ? (rest as string).slice(0, dot + 1) : "";
        const tail = dot > 0 ? (rest as string).slice(dot + 2) : (rest ?? "");
        return (
          <li key={n} className="flex gap-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--cat-soft)] text-[12px] font-semibold text-[var(--cat-ink)]">{n}</span>
            <p className="text-[14.5px] leading-relaxed text-[var(--cm-ink-2)]">{head && <span className="font-semibold text-[var(--cm-ink)]">{head} </span>}{tail}</p>
          </li>
        );
      })}
    </ol>
  );
}
