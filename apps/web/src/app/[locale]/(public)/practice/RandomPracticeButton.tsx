"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle } from "lucide-react";
import { localePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import {
  pickRandomQuestion,
  practiceFilterFallsBack,
  practiceTopics,
  type PracticeQuestion,
  type PracticeTopic,
} from "@/lib/practice-questions";

type TopicFilter = PracticeTopic | "any";

export function RandomPracticeControls({
  locale,
  questions,
  excludeId,
  compact = false,
}: {
  locale: Locale;
  questions: PracticeQuestion[];
  excludeId?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const t = getDictionary(locale).practice;
  const [topic, setTopic] = useState<TopicFilter>("any");

  const topicOptions = useMemo(
    () =>
      (["any", ...practiceTopics] as TopicFilter[]).map((value) => ({
        value,
        label: t.topics[value],
      })),
    [t.topics],
  );

  const fallsBack = practiceFilterFallsBack(questions, { topic, excludeId });

  const go = () => {
    const question = pickRandomQuestion(questions, { topic, excludeId });
    if (!question) {
      return;
    }
    router.push(localePath(locale, `/practice/${question.id}`));
  };

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t.topicLabel}>
        {topicOptions.map((option) => {
          const selected = topic === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => setTopic(option.value)}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                selected
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                  : "border-[var(--line)] bg-white text-[var(--ink-2)] hover:border-[var(--ink)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {fallsBack ? <p className="text-sm text-[var(--ink-3)]">{t.noneInTopic}</p> : null}
      <button type="button" onClick={go} className="site-btn site-btn-accent">
        {excludeId ? t.another : t.randomCta} <Shuffle size={16} />
      </button>
    </div>
  );
}
