import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Code2, FileText, GitBranch, Play } from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { localePath, localeTags, localeUrl, pageMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import { productName } from "@/lib/seo-content";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;
  return pageMetadata(locale, "/manual", t.manualTitle, t.manualDescription, t.ogImageAlt);
}

const sectionIcons = [Code2, GitBranch, FileText, BookOpen];

const exampleCode = [
  `DECLARE Number : INTEGER
DECLARE Total : INTEGER
Total <- 0

FOR Number <- 1 TO 5
    Total <- Total + Number
NEXT Number

OUTPUT "Total = ", Total`,
  `DECLARE Choice : INTEGER

REPEAT
    OUTPUT "Choose 1 to 4"
    INPUT Choice
UNTIL Choice >= 1 AND Choice <= 4

OUTPUT "Accepted"`,
];

export default async function ManualPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const t = dict.manual;

  const structuredData = {
    "@context": "https://schema.org",
    "@type": ["TechArticle", "LearningResource"],
    headline: `${productName} ${dict.meta.manualTitle}`,
    description: dict.meta.manualDescription,
    url: localeUrl(locale, "/manual"),
    inLanguage: localeTags[locale],
    learningResourceType: "reference",
    educationalLevel: "secondary",
    audience: { "@type": "EducationalAudience", educationalRole: "student" },
    isAccessibleForFree: true,
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PublicHeader locale={locale} active="manual" />

      <section className="site-wrap py-14 md:py-20">
        <p className="site-eyebrow">{t.eyebrow}</p>
        <h1 className="site-h1 mt-4">{t.title}</h1>
        <p className="site-lede mt-5 max-w-2xl">{t.lede}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={localePath(locale, "/app")} className="site-btn site-btn-accent">
            {t.openEditor} <Play size={16} />
          </Link>
          <Link href={localePath(locale, "/docs")} className="site-btn site-btn-ghost">
            {t.browseDocs} <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="site-wrap grid gap-4 pb-16 md:grid-cols-2">
        {t.sections.map((section, index) => {
          const Icon = sectionIcons[index] ?? Code2;
          return (
            <article key={section.title} className="site-card site-card-hover p-6">
              <span className="inline-flex rounded-lg bg-[var(--paper-2)] p-2.5 text-[var(--accent)]">
                <Icon size={22} />
              </span>
              <h2 className="mt-5 text-2xl font-extrabold tracking-tight">{section.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">{section.body}</p>
              <ul className="mt-5 space-y-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm font-semibold text-[var(--ink-2)]">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--accent)]" size={16} />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="border-y border-[var(--line)] bg-white">
        <div className="site-wrap py-16">
          <p className="site-eyebrow">{t.examplesEyebrow}</p>
          <h2 className="site-h2 mt-3">{t.examplesTitle}</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {t.examples.map((example, index) => (
              <article key={example.title}>
                <h3 className="text-lg font-extrabold tracking-tight">{example.title}</h3>
                <pre className="site-code mt-4">{exampleCode[index]}</pre>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="site-wrap grid gap-8 py-16 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="site-eyebrow">{t.checklistEyebrow}</p>
          <h2 className="site-h2 mt-3">{t.checklistTitle}</h2>
          <p className="site-lede mt-5">{t.checklistLede}</p>
        </div>
        <div className="site-card p-6">
          <ul className="space-y-4">
            {t.checklist.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--ink-2)]">
                <CheckCircle2 className="mt-0.5 shrink-0 text-[var(--accent)]" size={18} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
