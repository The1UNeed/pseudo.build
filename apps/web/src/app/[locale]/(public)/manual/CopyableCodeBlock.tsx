"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "@/i18n/context";
import { manualEn } from "./manualContent.en";
import { manualZh } from "./manualContent.zh";

type CopyState = "idle" | "copied" | "error";
type TokenType =
  | "comment"
  | "keyword"
  | "type"
  | "predefined"
  | "number"
  | "string"
  | "operator"
  | "identifier"
  | "delimiter"
  | "text";

const TYPE_KEYWORDS = new Set(["INTEGER", "REAL", "CHAR", "STRING", "BOOLEAN"]);
const ROUTINE_KEYWORDS = new Set(["DIV", "MOD", "LENGTH", "LCASE", "UCASE", "SUBSTRING", "ROUND", "RANDOM"]);
const FLOW_KEYWORDS = new Set([
  "DECLARE",
  "CONSTANT",
  "ARRAY",
  "OF",
  "INPUT",
  "OUTPUT",
  "IF",
  "THEN",
  "ELSE",
  "ENDIF",
  "CASE",
  "OTHERWISE",
  "ENDCASE",
  "FOR",
  "TO",
  "STEP",
  "NEXT",
  "REPEAT",
  "UNTIL",
  "WHILE",
  "DO",
  "ENDWHILE",
  "PROCEDURE",
  "ENDPROCEDURE",
  "FUNCTION",
  "RETURNS",
  "ENDFUNCTION",
  "CALL",
  "RETURN",
  "OPENFILE",
  "READFILE",
  "WRITEFILE",
  "CLOSEFILE",
  "READ",
  "WRITE",
  "AND",
  "OR",
  "NOT",
  "TRUE",
  "FALSE",
]);

const tokenPattern =
  /\/\/.*$|"[^"\n]*"|'[^'\n]*'|\b[0-9]+\.[0-9]+\b|\b[0-9]+\b|<-|←|<=|>=|<>|=|<|>|\+|-|\*|\/|\^|\b[A-Za-z][A-Za-z0-9]*\b|[:,()[\]]/g;

function getTokenType(token: string): TokenType {
  if (token.startsWith("//")) {
    return "comment";
  }
  if ((token.startsWith("\"") && token.endsWith("\"")) || (token.startsWith("'") && token.endsWith("'"))) {
    return "string";
  }
  if (/^\d/.test(token)) {
    return "number";
  }
  if (/^(<-|←|<=|>=|<>|=|<|>|\+|-|\*|\/|\^)$/.test(token)) {
    return "operator";
  }
  if (/^[:,()[\]]$/.test(token)) {
    return "delimiter";
  }
  if (ROUTINE_KEYWORDS.has(token)) {
    return "predefined";
  }
  if (TYPE_KEYWORDS.has(token)) {
    return "type";
  }
  if (FLOW_KEYWORDS.has(token)) {
    return "keyword";
  }
  if (/^[A-Za-z]/.test(token)) {
    return "identifier";
  }
  return "text";
}

function renderPseudocodeLine(line: string, lineIndex: number) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      parts.push(line.slice(lastIndex, index));
    }

    parts.push(
      <span key={`${lineIndex}-${index}`} className={`manual-token-${getTokenType(token)}`}>
        {token}
      </span>,
    );
    lastIndex = index + token.length;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts;
}

function HighlightedPseudocode({ code }: { code: string }) {
  const lines = code.split("\n");

  return (
    <>
      {lines.map((line, index) => (
        <span key={index} className="manual-code-line">
          {renderPseudocodeLine(line, index)}
          {index < lines.length - 1 ? "\n" : null}
        </span>
      ))}
    </>
  );
}

function fallbackCopy(text: string) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();

  const didCopy = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!didCopy) {
    throw new Error("Copy failed");
  }
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  fallbackCopy(text);
}

export default function CopyableCodeBlock({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  const locale = useLocale();
  const labels = (locale === "zh" ? manualZh : manualEn).codeBlock;
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    try {
      await copyToClipboard(code);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    resetTimerRef.current = setTimeout(() => {
      setCopyState("idle");
    }, 1600);
  }

  const buttonLabel = copyState === "copied" ? labels.copied : labels.copy;

  return (
    <div className={`manual-code-block ${className}`.trim()}>
      <div className="flex items-center justify-between gap-3 border-b border-[var(--separator)]/60 px-4 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent)]">
          {labels.language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="manual-nav-pill !px-3 !py-1 !text-[11px]"
          aria-label={copyState === "copied" ? labels.copiedAria : labels.copyAria}
        >
          {buttonLabel}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code>
          <HighlightedPseudocode code={code} />
        </code>
      </pre>
      {copyState === "error" ? (
        <p className="px-4 pb-3 text-[11px] text-[var(--red)]">{labels.unavailable}</p>
      ) : null}
    </div>
  );
}
