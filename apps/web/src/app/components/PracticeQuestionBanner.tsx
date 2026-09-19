"use client";

import { useState } from "react";
import { ChevronUp, Shuffle } from "lucide-react";
import { useDictionary } from "@/i18n/context";
import type { PracticeQuestion } from "@/lib/practice-questions";

export function PracticeQuestionBanner({
  question,
  onAnother,
}: {
  question: PracticeQuestion;
  onAnother: () => void;
}) {
  const t = useDictionary().practice;
  const [open, setOpen] = useState(true);

  return (
    <section className="shrink-0 border-b border-[var(--separator)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 px-4 py-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text)]">{question.title}</p>
        <button
          type="button"
          className="rounded-lg border border-[var(--separator)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text2)] transition hover:bg-[var(--hover)]"
          onClick={onAnother}
        >
          <span className="inline-flex items-center gap-1">
            <Shuffle size={12} />
            {t.another}
          </span>
        </button>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-[11px] font-semibold text-[var(--text3)] transition hover:text-[var(--text)]"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="inline-flex items-center gap-1">
            <ChevronUp size={14} className={open ? "" : "rotate-180"} />
            {open ? t.hidePrompt : t.showPrompt}
          </span>
        </button>
      </div>
      {open ? (
        <div className="space-y-2 px-4 pb-3 text-sm leading-6 text-[var(--text2)]">
          <p>{t.editorHint}</p>
          {question.prompt.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <ul className="list-disc space-y-1 pl-5">
            {question.requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
