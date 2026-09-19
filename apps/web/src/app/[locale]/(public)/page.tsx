import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bug,
  Cloud,
  Code2,
  GitBranch,
  GraduationCap,
  Lock,
  Play,
  ScrollText,
  Shuffle,
} from "lucide-react";
import { PublicHeader } from "@/app/components/PublicHeader";
import { defaultLocale, localePath, localeTags, localeUrl, pageMetadata } from "@/i18n/config";
import { getDictionary } from "@/i18n/messages";
import { resolveLocale, type LocaleParams } from "@/i18n/server";
import {
  authorName,
  getDocs,
  getFaq,
  getPosts,
  githubUrl,
  organizationName,
  productName,
  productSlogan,
  productTagline,
  siteUrl,
} from "@/lib/seo-content";

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await resolveLocale(params);
  const t = getDictionary(locale).meta;
  return {
    ...pageMetadata(locale, "/", t.homeTitle, t.homeDescription, t.ogImageAlt),
    keywords: t.keywords,
  };
}

const featureIcons = [Code2, Play, GitBranch, Bug, Cloud, Lock];

function HeroWindow({ workspace, compiled, terminal }: { workspace: string; compiled: string; terminal: string }) {
  return (
    <div className="site-window site-reveal site-reveal-3" aria-hidden="true">
      <div className="site-window-bar">
        <span className="site-window-dot" />
        <span className="site-window-dot" />
        <span className="site-window-dot" />
        <span className="ml-3">main.pseudo</span>
        <span className="ml-auto text-[#7fd1b5]">{compiled}</span>
      </div>
      <div className="grid md:grid-cols-[150px_1fr]">
        <aside className="hidden border-r border-white/10 p-4 text-[11px] text-white/55 md:block">
          <p className="mb-3 font-semibold uppercase text-white/80">{workspace}</p>
          <p className="rounded bg-white/10 px-2 py-1 text-white">main.pseudo</p>
          <p className="px-2 py-1">validate.pseudo</p>
          <p className="px-2 py-1">search.pseudo</p>
        </aside>
        <div>
          <pre className="m-0 overflow-x-auto p-5 font-mono text-[13px] leading-7">
            <span className="site-token-cmt">{"// Sum the first five integers"}</span>
            {"\n"}
            <span className="site-token-kw">DECLARE</span> Number : <span className="site-token-type">INTEGER</span>
            {"\n"}
            <span className="site-token-kw">DECLARE</span> Total : <span className="site-token-type">INTEGER</span>
            {"\n"}
            Total <span className="site-token-kw">{"<-"}</span> <span className="site-token-num">0</span>
            {"\n\n"}
            <span className="site-token-kw">FOR</span> Number <span className="site-token-kw">{"<-"}</span>{" "}
            <span className="site-token-num">1</span> <span className="site-token-kw">TO</span>{" "}
            <span className="site-token-num">5</span>
            {"\n"}
            {"    "}Total <span className="site-token-kw">{"<-"}</span> Total + Number
            {"\n"}
            <span className="site-token-kw">NEXT</span> Number
            {"\n\n"}
            <span className="site-token-kw">OUTPUT</span> <span className="site-token-str">{'"Total = "'}</span>, Total
          </pre>
          <div className="border-t border-white/10 bg-[#111313] p-4 font-mono text-[12px]">
            <p className="text-white/50">{terminal}</p>
            <p className="mt-1 text-[#30d158]">&gt; Total = 15</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage({ params }: LocaleParams) {
  const locale = await resolveLocale(params);
  const dict = getDictionary(locale);
  const t = dict.home;
  const docs = getDocs(locale);
  const posts = getPosts(locale);
  const faqItems = getFaq(locale);
  const href = (path: string) => localePath(locale, path);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: productName,
      alternateName: ["Pseudo Build editor", "Pseudocode editor", "Pseudocode compiler", "伪代码编辑器"],
      applicationCategory: "EducationalApplication",
      applicationSubCategory: "Pseudocode editor and compiler",
      operatingSystem: "Web",
      browserRequirements: "Requires a modern browser with WebAssembly",
      url: localeUrl(locale, "/"),
      inLanguage: Object.values(localeTags),
      description: locale === defaultLocale ? productTagline : dict.meta.homeDescription,
      image: `${siteUrl}/icon.png`,
      author: { "@type": "Person", name: authorName },
      publisher: { "@type": "Organization", name: organizationName, url: siteUrl, logo: `${siteUrl}/icon.png` },
      audience: {
        "@type": "EducationalAudience",
        educationalRole: "student",
        audienceType: dict.meta.audienceType,
      },
      educationalUse: ["practice", "self-study", "classroom"],
      isAccessibleForFree: true,
      license: "https://www.gnu.org/licenses/gpl-3.0.html",
      keywords: dict.meta.keywords.join(", "),
      featureList: dict.meta.featureList,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: productName,
      url: siteUrl,
      inLanguage: Object.values(localeTags),
      publisher: { "@type": "Organization", name: organizationName },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: localeTags[locale],
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <PublicHeader locale={locale} />

      <section className="site-wrap grid items-center gap-12 py-16 md:py-24 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="site-eyebrow site-reveal">{t.eyebrow}</p>
          <h1 className="site-h1 site-reveal site-reveal-2 mt-5">
            {t.h1a}
            <br />
            <span className="text-[var(--accent)]">{t.h1b}</span>
          </h1>
          <p className="site-lede site-reveal site-reveal-3 mt-6 max-w-xl">
            {locale === defaultLocale ? `${productSlogan} ` : ""}
            {t.lede}
          </p>
          <div className="site-reveal site-reveal-4 mt-8 flex flex-wrap gap-3">
            <Link href={href("/app")} className="site-btn site-btn-accent">
              {t.ctaStart} <Play size={16} />
            </Link>
            <Link href={href("/practice")} className="site-btn site-btn-ghost">
              {t.ctaPractice} <Shuffle size={16} />
            </Link>
            <Link href={href("/docs")} className="site-btn site-btn-ghost">
              {t.ctaDocs} <ArrowRight size={16} />
            </Link>
          </div>
          <p className="site-reveal site-reveal-4 mt-6 text-sm text-[var(--ink-3)]">{t.noAccount}</p>
        </div>
        <HeroWindow workspace={t.windowWorkspace} compiled={t.windowCompiled} terminal={t.windowTerminal} />
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--paper-2)]">
        <div className="site-wrap py-16 md:py-20">
          <p className="site-eyebrow">{t.featuresEyebrow}</p>
          <h2 className="site-h2 mt-3 max-w-2xl">{t.featuresTitle}</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {t.features.map((feature, index) => {
              const Icon = featureIcons[index] ?? Code2;
              return (
                <article key={feature.title} className="site-card site-card-hover p-6">
                  <span className="inline-flex rounded-lg bg-[var(--paper-2)] p-2.5 text-[var(--accent)]">
                    <Icon size={22} />
                  </span>
                  <h3 className="mt-5 text-lg font-extrabold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">{feature.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="site-wrap grid gap-10 py-16 md:py-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="site-eyebrow">{t.studentsEyebrow}</p>
          <h2 className="site-h2 mt-3">{t.studentsTitle}</h2>
          <p className="site-lede mt-5 max-w-lg">{t.studentsLede}</p>
          <p className="mt-5 max-w-lg text-sm leading-6 text-[var(--ink-3)]">{t.teacherNote}</p>
          <Link href={href("/practice")} className="site-btn mt-7">
            {t.studentsPractice} <Shuffle size={16} />
          </Link>
        </div>
        <ul className="grid gap-4">
          {t.exams.map((exam) => (
            <li key={exam.name} className="site-card flex gap-4 p-5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--paper-2)] text-[var(--accent)]">
                <GraduationCap size={20} />
              </span>
              <div>
                <h3 className="font-extrabold tracking-tight">{exam.name}</h3>
                <p className="mt-1 text-sm leading-6 text-[var(--ink-2)]">{exam.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--paper-2)]">
        <div className="site-wrap grid gap-10 py-16 md:py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="site-eyebrow">{t.learnEyebrow}</p>
            <h2 className="site-h2 mt-3">{t.learnTitle}</h2>
            <p className="site-lede mt-5 max-w-lg">{t.learnLede}</p>
            <Link href={href("/manual")} className="site-btn mt-7">
              {t.learnCta} <ScrollText size={16} />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {docs.slice(0, 4).map((doc, index) => (
              <Link key={doc.slug} href={href(`/docs/${doc.slug}`)} className="site-card p-5">
                <span className="site-chip">
                  {t.guideLabel} {index + 1}
                </span>
                <h3 className="mt-4 font-extrabold tracking-tight">{doc.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--ink-2)]">{doc.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--line)] bg-white">
        <div className="site-wrap py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="site-eyebrow">{t.blogEyebrow}</p>
              <h2 className="site-h2 mt-3">{t.blogTitle}</h2>
            </div>
            <Link href={href("/blog")} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent)]">
              {t.blogAll} <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {posts.slice(0, 3).map((post) => (
              <Link key={post.slug} href={href(`/blog/${post.slug}`)} className="site-card bg-[var(--paper)] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-3)]">{post.readingTime}</p>
                <h3 className="mt-3 text-lg font-extrabold leading-snug tracking-tight">{post.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--ink-2)]">{post.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="site-wrap grid gap-10 py-16 md:py-20 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="site-eyebrow">{t.faqEyebrow}</p>
          <h2 className="site-h2 mt-3">{t.faqTitle}</h2>
          <div className="mt-8 divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {faqItems.map((item) => (
              <details key={item.question} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                  {item.question}
                  <span className="font-mono text-[var(--accent)] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-7 text-[var(--ink-2)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-[var(--radius)] bg-[var(--ink)] p-8 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#7fd1b5]">{t.ossEyebrow}</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">{t.ossTitle}</h2>
            <p className="mt-4 leading-7 text-white/70">{t.ossBody}</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="site-btn site-btn-accent">
              {t.ossGithub} <ArrowUpRight size={16} />
            </a>
            <Link href={href("/security")} className="site-btn site-btn-ghost !border-white/30 !text-white hover:!bg-white/10">
              {t.ossSecurity}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
