import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { practiceQuestions } from "@/lib/practice-questions";
import { RandomPracticeControls } from "./RandomPracticeButton";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("RandomPracticeControls", () => {
  it("navigates to a random question in the selected topic", () => {
    push.mockReset();
    render(<RandomPracticeControls locale="en" questions={practiceQuestions} />);

    fireEvent.click(screen.getByRole("button", { name: "Selection" }));
    fireEvent.click(screen.getByRole("button", { name: "Practice a random question" }));

    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0]?.[0]).toMatch(/^\/practice\/(pass-or-fail|letter-grade)$/);
  });
});
