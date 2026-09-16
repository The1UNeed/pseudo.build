"use client";

import { localePath } from "@/i18n/config";
import { useLocale } from "@/i18n/context";
import Link from "next/link";
import type React from "react";
import CopyableCodeBlock from "./CopyableCodeBlock";
import { manualEn } from "./manualContent.en";
import { manualZh } from "./manualContent.zh";

function ManualCard({ children, className = "", accent = false, delay = 0, id }: { children: React.ReactNode; className?: string; accent?: boolean; delay?: number; id?: string }) {
  return <div id={id} className={`manual-card ${accent ? "manual-card-accent" : ""} ${className}`.trim()} style={{ animationDelay: `${delay}ms` }}><div className="relative z-10 p-5 md:p-6">{children}</div></div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) { return <h2 className="manual-section-title">{children}</h2>; }
function InfoBadge({ children }: { children: React.ReactNode }) { return <div className="manual-tag mb-3 inline-flex">{children}</div>; }

function BulletList({ points, color = "accent" }: { points: string[]; color?: "accent" | "green" }) {
  const dotClass = color === "green" ? "bg-[var(--green)]" : "bg-[var(--accent)]";
  return <ul className="mt-2.5 space-y-1.5">{points.map((point) => <li key={point} className="flex items-start gap-2 text-sm text-[var(--text2)]"><span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`} />{point}</li>)}</ul>;
}

function ProgramNotes({ title, lines, green = false }: { title: string; lines: string[]; green?: boolean }) {
  const titleClass = green ? "text-[var(--green)]" : "text-[var(--accent)]";
  const dotClass = green ? "bg-[var(--green)]" : "bg-[var(--text3)]";
  return <div className="rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-3.5"><p className={`text-xs font-bold uppercase tracking-[0.12em] ${titleClass}`}>{title}</p><ul className="mt-2 space-y-1">{lines.map((line) => <li key={line} className="flex items-start gap-2 text-sm text-[var(--text2)]"><span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${dotClass}`} />{line}</li>)}</ul></div>;
}

interface ManualContentProps { onClose?: () => void; isModal?: boolean }

export default function ManualContent({ onClose, isModal = false }: ManualContentProps) {
  const locale = useLocale();
  const content = locale === "zh" ? manualZh : manualEn;
  return (
    <main className={`manual-shell ${isModal ? "manual-shell-modal" : "min-h-screen"} p-4 md:p-6`}>
      {isModal ? <button type="button" onClick={onClose} className="manual-modal-close" aria-label={content.close}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>{content.close}</button> : null}
      <div className="manual-container mx-auto max-w-6xl space-y-5">
        <ManualCard accent delay={0}>
          <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-[16rem] flex-1"><InfoBadge>{content.hero.badge}</InfoBadge><h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">{content.hero.title}</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--text2)]">{content.hero.description}</p></div>{!isModal ? <Link href={localePath(locale, "/app")} className="manual-back-btn shrink-0"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>{content.hero.openEditor}</Link> : null}</div>
          <div className="mt-5 grid gap-3 md:grid-cols-2"><div className="manual-card" style={{ borderRadius: 14 }}><div className="p-3.5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">{content.hero.notationTitle}</p><p className="mt-1.5 text-sm leading-relaxed text-[var(--text2)]">{content.hero.notationBeforeCode}<code className="rounded bg-[var(--surface2)] px-1 py-0.5 text-[var(--code-keyword)]">{"<-"}</code>{content.hero.notationAfterCode}</p></div></div><div className="manual-card" style={{ borderRadius: 14 }}><div className="p-3.5"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--accent)]">{content.hero.editorSupportTitle}</p><p className="mt-1.5 text-sm leading-relaxed text-[var(--text2)]">{content.hero.editorSupport}</p></div></div></div>
        </ManualCard>

        <ManualCard delay={60}><SectionTitle>{content.navigation.title}</SectionTitle><div className="mt-4 flex flex-wrap gap-2">{content.navigation.items.map((item) => <a key={item.href} href={item.href} className="manual-nav-pill"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface3)] text-[10px] font-bold text-[var(--text3)]">{item.num}</span>{item.label}</a>)}</div></ManualCard>

        <ManualCard id="workflow" delay={120}><SectionTitle>{content.workflow.title}</SectionTitle><p className="mt-3 text-sm leading-relaxed text-[var(--text2)]">{content.workflow.introduction}</p><ol className="mt-4 grid gap-2.5 sm:grid-cols-2">{content.workflow.steps.map((step, index) => <li key={step} className="flex items-start gap-3 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-3 text-sm text-[var(--text2)]"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">{content.workflow.stepNumbers[index]}</span>{step}</li>)}</ol><CopyableCodeBlock code={content.workflow.code} className="mt-5" /></ManualCard>

        <ManualCard id="syntax" delay={180}><SectionTitle>{content.syntax.title}</SectionTitle><div className="mt-4 grid gap-3 md:grid-cols-2">{content.syntax.cards.map((card) => <div key={card.title} className="manual-card" style={{ borderRadius: 16 }}><div className="p-4"><h3 className="text-sm font-bold text-[var(--text)]">{card.title}</h3><BulletList points={card.points} /></div></div>)}</div><div className="manual-card mt-4" style={{ borderRadius: 16 }}><div className="p-4"><h3 className="text-sm font-bold text-[var(--text)]">{content.syntax.routineTitle}</h3><CopyableCodeBlock code={content.syntax.routineCode} className="mt-3" /><p className="mt-3 text-sm leading-relaxed text-[var(--text2)]">{content.syntax.routineBeforeRound}<code className="rounded bg-[var(--surface2)] px-1 py-0.5 text-[var(--code-func)]">ROUND(Value, Places)</code>{content.syntax.routineBetween}<code className="rounded bg-[var(--surface2)] px-1 py-0.5 text-[var(--code-func)]">RANDOM()</code>{content.syntax.routineAfterRandom}</p></div></div></ManualCard>

        <ManualCard id="loops" delay={240}><SectionTitle>{content.loops.title}</SectionTitle><p className="mt-3 text-sm leading-relaxed text-[var(--text2)]">{content.loops.introduction}</p><div className="mt-4 grid gap-3 md:grid-cols-3">{content.loops.cards.map((card) => <div key={card.title} className="manual-card" style={{ borderRadius: 16 }}><div className="p-4"><h3 className="text-sm font-bold text-[var(--text)]">{card.title}</h3><BulletList points={card.points} /></div></div>)}</div><div className="manual-card mt-4" style={{ borderRadius: 16 }}><div className="p-4"><h3 className="text-sm font-bold text-[var(--text)]">{content.loops.checklistTitle}</h3><ul className="mt-2.5 grid gap-2 sm:grid-cols-2">{content.loops.checklist.map((point) => <li key={point} className="flex items-start gap-2 text-sm text-[var(--text2)]"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--green)]" />{point}</li>)}</ul></div></div></ManualCard>

        <ManualCard id="patterns" delay={300}><SectionTitle>{content.patterns.title}</SectionTitle><div className="mt-4 grid gap-4">{content.patterns.items.map((pattern, index) => <div key={pattern.title} className="manual-card" style={{ borderRadius: 18 }}><div className="p-5"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent)] text-xs font-bold text-white">{content.patterns.badges[index]}</span><h3 className="text-sm font-bold text-[var(--text)]">{pattern.title}</h3></div><p className="mt-3 text-sm leading-relaxed text-[var(--text2)]"><span className="font-semibold text-[var(--text)]">{content.patterns.whenToUse}</span> {pattern.whenToUse}</p><BulletList points={pattern.logic} /><CopyableCodeBlock code={pattern.template} className="mt-4" /><div className="mt-4 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-3.5"><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--accent)]">{content.patterns.walkthrough}</p><ul className="mt-2 space-y-1">{pattern.walkthrough.map((step) => <li key={step} className="flex items-start gap-2 text-sm text-[var(--text2)]"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--text3)]" />{step}</li>)}</ul></div></div></div>)}</div></ManualCard>

        <ManualCard id="worked" delay={360}><SectionTitle>{content.worked.title}</SectionTitle><p className="mt-3 text-sm leading-relaxed text-[var(--text2)]">{content.worked.introduction}</p><div className="mt-4 grid gap-4">{content.worked.programs.map((program, index) => <div key={program.title} className="manual-card" style={{ borderRadius: 18 }}><div className="p-5"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--orange)] text-xs font-bold text-white">{content.worked.badges[index]}</span><h3 className="text-sm font-bold text-[var(--text)]">{program.title}</h3></div><p className="mt-3 text-sm leading-relaxed text-[var(--text2)]"><span className="font-semibold text-[var(--text)]">{content.worked.objective}</span> {program.objective}</p><CopyableCodeBlock code={program.code} className="mt-4" /><div className="mt-4 grid gap-3 sm:grid-cols-2"><ProgramNotes title={content.worked.explanation} lines={program.explanation} /><ProgramNotes title={content.worked.sampleRun} lines={program.testRun} green /></div></div></div>)}</div></ManualCard>

        <ManualCard id="trace" delay={420}><SectionTitle>{content.trace.title}</SectionTitle><p className="mt-3 text-sm leading-relaxed text-[var(--text2)]">{content.trace.introduction}</p><CopyableCodeBlock code={content.trace.code} className="mt-4" /><div className="manual-table-wrap mt-4"><table><thead><tr>{content.trace.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{content.trace.rows.map(([i, before, after]) => <tr key={i}><td>{i}</td><td>{before}</td><td>{after}</td></tr>)}</tbody></table></div><p className="mt-3 text-sm leading-relaxed text-[var(--text2)]">{content.trace.conclusion}</p></ManualCard>

        <ManualCard id="files" delay={480}><SectionTitle>{content.files.title}</SectionTitle><div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">{content.files.steps.map((step, index) => <div key={step} className="manual-card" style={{ borderRadius: 14 }}><div className="p-3.5"><span className="mb-2 flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[10px] font-bold text-white">{content.files.stepNumbers[index]}</span><p className="text-sm text-[var(--text2)]">{step}</p></div></div>)}</div><CopyableCodeBlock code={content.files.code} className="mt-4" /><div className="manual-card mt-3" style={{ borderRadius: 14 }}><div className="p-3.5"><p className="text-sm leading-relaxed text-[var(--text2)]">{content.files.warning}</p></div></div></ManualCard>

        <ManualCard id="exam" delay={540}><SectionTitle>{content.exam.title}</SectionTitle><div className="manual-table-wrap mt-4"><table><thead><tr>{content.exam.headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{content.exam.words.map(([word, meaning]) => <tr key={word}><td className="font-semibold text-[var(--text)]">{word}</td><td>{meaning}</td></tr>)}</tbody></table></div></ManualCard>

        <ManualCard delay={600}><SectionTitle>{content.finalChecklist.title}</SectionTitle><div className="mt-4 grid gap-2.5 sm:grid-cols-2">{content.finalChecklist.items.map((item) => <div key={item} className="flex items-start gap-3 rounded-xl border border-[var(--separator)] bg-[var(--surface)] p-3 text-sm text-[var(--text2)]"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-[var(--green)]/15 text-[var(--green)]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></span>{item}</div>)}</div></ManualCard>
      </div>
    </main>
  );
}
