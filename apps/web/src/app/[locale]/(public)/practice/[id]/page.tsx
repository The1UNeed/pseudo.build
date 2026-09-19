import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { localePath, localeTags, localeUrl, pageMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale } from "@/i18n/server";
import {
  getPracticeQuestion,
  getPracticeQuestions,
  practiceQuestions,
  relatedPracticeQuestions,
} from "@/lib/practice-questions";
import { productName } from "@/lib/seo-content";
import CopyableCodeBlock from "../../manual/CopyableCodeBlock";
import { RandomPracticeControls } from "../RandomPracticeButton";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export function generateStaticParams() {
  return practiceQuestions.map((question) => ({ id: question.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const { id } = await params;
  const question = getPracticeQuestion(locale, id);
  if (!question) return {};

  const t = getDictionary(locale).meta;
  const base = pageMetadata(
    locale,
    `/practice/${question.id}`,
    question.title,
    question.description,
    t.ogImageAlt,
  );
  return {
    ...base,
    keywords: [...t.keywords, question.title, question.exam, "pseudocode practice questions"],
  };
}

export default async function PracticeQuestionPage({ params }: PageProps) {
  const locale = await resolveLocale(params);
  const { id } = await params;
  const question = getPracticeQuestion(locale, id);
  if (!question) notFound();

  const dict = getDictionary(locale);
  const t = dict.practice;
  const questions = getPracticeQuestions(locale);
  const related = relatedPracticeQuestions(questions, question.id);
  const href = (path: string) => localePath(locale, path);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": ["LearningResource", "Quiz"],
      name: question.title,
      description: question.description,
      url: localeUrl(locale, `/practice/${question.id}`),
      inLanguage: localeTags[locale],
      learningResourceType: "practice problem",
      educationalUse: "practice",
      educationalLevel: "secondary",
      teaches: "pseudocode",
      isAccessibleForFree: true,
      audience: { "@type": "EducationalAudience", educationalRole: "student" },
      author: { "@type": "Organization", name: productName },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: t.breadcrumbHome, item: localeUrl(locale, "/") },
        { "@type": "ListItem", position: 2, name: t.back, item: localeUrl(locale, "/practice") },
        {
          "@type": "ListItem",
          position: 3,
          name: question.title,
          item: localeUrl(locale, `/practice/${question.id}`),
        },
      ],
    },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PublicHeader locale={locale} active="practice" />
      <article className="site-wrap max-w-3xl py-12 md:py-16">
        <Link href={href("/practice")} className="inline-flex items-center gap-2 text-sm font-bold">
          <ArrowLeft size={16} /> {t.back}
        </Link>
        <div className="mt-6 flex flex-wrap gap-2">
          <span className="site-chip">{t.topics[question.topic]}</span>
          <span className="site-chip">{t.difficulty[question.difficulty]}</span>
          <span className="site-chip">{question.exam}</span>
        </div>
        <h1 className="site-h1 mt-5 text-[2.4rem] md:text-[3.4rem]">{question.title}</h1>
        <p className="site-lede mt-5">{question.description}</p>

        <div className="site-prose mt-8">
          {question.prompt.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <h2>{t.requirements}</h2>
          <ul>
            {question.requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="site-card p-5">
            <h2 className="text-sm font-extrabold tracking-tight">{t.sampleInput}</h2>
            <pre className="site-code mt-3">
              {question.sample.input.length > 0 ? question.sample.input.join("\n") : "—"}
            </pre>
          </div>
          <div className="site-card p-5">
            <h2 className="text-sm font-extrabold tracking-tight">{t.sampleOutput}</h2>
            <pre className="site-code mt-3">{question.sample.output.join("\n")}</pre>
          </div>
        </div>

        <h2 className="mt-10 text-lg font-extrabold tracking-tight">{t.starter}</h2>
        <div className="mt-4">
          <CopyableCodeBlock code={question.starter.trimEnd()} />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link href={href(`/app?practice=${question.id}`)} className="site-btn site-btn-accent">
            {t.openEditor} <Play size={16} />
          </Link>
        </div>
        <div className="mt-6">
          <RandomPracticeControls locale={locale} questions={questions} excludeId={question.id} compact />
        </div>
      </article>

      {related.length > 0 ? (
        <section className="border-t border-[var(--line)] bg-[var(--paper-2)]">
          <div className="site-wrap py-14">
            <h2 className="site-h2">{t.related}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {related.map((item) => (
                <Link key={item.id} href={href(`/practice/${item.id}`)} className="site-card bg-[var(--paper)] p-5">
                  <span className="site-chip">{t.topics[item.topic]}</span>
                  <h3 className="mt-4 font-extrabold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">{item.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
