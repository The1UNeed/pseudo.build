import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { practiceQuestions } from "@/lib/practice-questions";
import { RandomPracticeControls } from "./RandomPracticeButton";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("RandomPracticeControls", () => {
  afterEach(() => {
    cleanup();
  });

  it("navigates to a random question in the selected topic", () => {
    push.mockReset();
    render(<RandomPracticeControls locale="en" questions={practiceQuestions} />);

    fireEvent.click(screen.getByRole("button", { name: "Selection" }));
    fireEvent.click(screen.getByRole("button", { name: "Practice a random question" }));

    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0]?.[0]).toMatch(/^\/practice\/(pass-or-fail|letter-grade)$/);
  });

  it("warns when Another question has to leave a single-question topic", () => {
    push.mockReset();
    render(
      <RandomPracticeControls locale="en" questions={practiceQuestions} excludeId="print-heading" />,
    );

    expect(screen.queryByText("No questions in this topic. Showing the full set instead.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Procedures" }));
    expect(
      screen.getByText("No questions in this topic. Showing the full set instead."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Another question" }));
    expect(push.mock.calls.at(-1)?.[0]).not.toBe("/practice/print-heading");
  });
});
