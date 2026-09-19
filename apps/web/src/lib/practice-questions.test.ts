import { describe, expect, it } from "vitest";
import {
  getPracticeQuestion,
  getPracticeQuestions,
  pickRandomQuestion,
  practiceDocumentBasename,
  practiceFilterFallsBack,
  practiceQuestions,
  questionIdFromDocumentName,
  relatedPracticeQuestions,
} from "./practice-questions";

describe("practice questions", () => {
  it("keeps the same ids in English and Chinese", () => {
    const enIds = getPracticeQuestions("en").map((question) => question.id);
    const zhIds = getPracticeQuestions("zh").map((question) => question.id);
    expect(zhIds).toEqual(enIds);
    expect(new Set(enIds).size).toBe(enIds.length);
  });

  it("looks up a question by id for the locale", () => {
    expect(getPracticeQuestion("en", "pass-or-fail")?.title).toBe("Pass or fail from a mark");
    expect(getPracticeQuestion("zh", "pass-or-fail")?.title).toBe("根据分数判断及格");
    expect(getPracticeQuestion("en", "missing")).toBeUndefined();
  });

  it("maps namespaced practice files back to question ids", () => {
    expect(practiceDocumentBasename("pass-or-fail")).toBe("practice.q.pass-or-fail");
    expect(questionIdFromDocumentName("practice.q.pass-or-fail.pseudo")).toBe("pass-or-fail");
    expect(questionIdFromDocumentName("practice-pass-or-fail.pseudo")).toBeNull();
    expect(questionIdFromDocumentName("practice-notes.pseudo")).toBeNull();
    expect(questionIdFromDocumentName("main.pseudo")).toBeNull();
  });

  it("prefers other questions in the same topic", () => {
    const related = relatedPracticeQuestions(practiceQuestions, "pass-or-fail", 3);
    expect(related[0]?.topic).toBe("selection");
    expect(related.some((question) => question.id === "pass-or-fail")).toBe(false);
  });
});

describe("pickRandomQuestion", () => {
  it("returns null for an empty bank", () => {
    expect(pickRandomQuestion([])).toBeNull();
  });

  it("picks from a topic filter and skips the current id", () => {
    const picked = pickRandomQuestion(practiceQuestions, {
      topic: "selection",
      excludeId: "pass-or-fail",
      random: () => 0,
    });
    expect(picked?.topic).toBe("selection");
    expect(picked?.id).not.toBe("pass-or-fail");
  });

  it("falls back to the whole bank when a filter matches nothing", () => {
    const picked = pickRandomQuestion(practiceQuestions, {
      topic: "io",
      difficulty: "extended",
      random: () => 0,
    });
    expect(picked).not.toBeNull();
    expect(practiceFilterFallsBack(practiceQuestions, { topic: "io", difficulty: "extended" })).toBe(true);
  });

  it("falls back to other topics when the filtered pool is only the current question", () => {
    const picked = pickRandomQuestion(practiceQuestions, {
      topic: "procedures",
      excludeId: "print-heading",
      random: () => 0,
    });
    expect(picked?.id).not.toBe("print-heading");
    expect(picked?.topic).not.toBe("procedures");
    expect(
      practiceFilterFallsBack(practiceQuestions, { topic: "procedures", excludeId: "print-heading" }),
    ).toBe(true);
  });

  it("returns the only remaining question when every other id is excluded", () => {
    const only = practiceQuestions.slice(0, 1);
    expect(
      pickRandomQuestion(only, {
        excludeId: only[0]!.id,
        random: () => 0.99,
      })?.id,
    ).toBe(only[0]!.id);
    expect(practiceFilterFallsBack(only, { excludeId: only[0]!.id })).toBe(false);
  });
});
