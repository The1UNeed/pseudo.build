"use client";

import { useEffect, useMemo, useRef } from "react";
import type { WorkspaceNode, WorkspaceState } from "@pseudobuild/workspace";
import { useLocale } from "@/i18n/context";
import {
  getPracticeQuestion,
  getPracticeQuestions,
  pickRandomQuestion,
  practiceDocumentBasename,
  questionIdFromDocumentName,
} from "@/lib/practice-questions";

function readPracticeIdFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return new URLSearchParams(window.location.search).get("practice");
}

function findPracticeDocument(workspace: WorkspaceState, id: string): WorkspaceNode | undefined {
  const basename = practiceDocumentBasename(id);
  return Object.values(workspace.nodes).find(
    (node) => node.type === "document" && node.name.replace(/\.pseudo$/i, "") === basename,
  );
}

function stripPracticeQuery() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("practice")) {
      return;
    }
    url.searchParams.delete("practice");
    const next = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", next);
  } catch {
    /* location may be a stub in tests */
  }
}

export function usePracticeQuestion(
  workspace: WorkspaceState | null,
  currentDocumentName: string | undefined,
  createDocumentInWorkspace: (parentId?: string, options?: { name?: string; source?: string }) => void,
  selectDocument: (documentId: string) => void,
) {
  const locale = useLocale();
  const appliedId = useRef<string | null>(null);

  useEffect(() => {
    if (!workspace) {
      return;
    }
    const id = readPracticeIdFromLocation();
    if (!id || appliedId.current === id) {
      return;
    }
    const question = getPracticeQuestion(locale, id);
    if (!question) {
      return;
    }
    appliedId.current = id;
    const existing = findPracticeDocument(workspace, question.id);
    if (existing) {
      selectDocument(existing.id);
    } else {
      createDocumentInWorkspace(undefined, {
        name: practiceDocumentBasename(question.id),
        source: question.starter,
      });
    }
    stripPracticeQuery();
  }, [workspace, locale, createDocumentInWorkspace, selectDocument]);

  const currentQuestion = useMemo(() => {
    if (!currentDocumentName) {
      return null;
    }
    const id = questionIdFromDocumentName(currentDocumentName);
    return id ? (getPracticeQuestion(locale, id) ?? null) : null;
  }, [currentDocumentName, locale]);

  const openRandomQuestion = (excludeId?: string) => {
    if (!workspace) {
      return;
    }
    const question = pickRandomQuestion(getPracticeQuestions(locale), { excludeId });
    if (!question) {
      return;
    }
    const existing = findPracticeDocument(workspace, question.id);
    if (existing) {
      selectDocument(existing.id);
      return;
    }
    createDocumentInWorkspace(undefined, {
      name: practiceDocumentBasename(question.id),
      source: question.starter,
    });
  };

  return { currentQuestion, openRandomQuestion };
}
