import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Dialog } from "@/app/components/Dialog";

beforeAll(() => {
  // jsdom has HTMLDialogElement but no showModal().
  if (typeof HTMLDialogElement.prototype.showModal !== "function") {
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
  }
});

function Harness({ autofocusInput = true }: { autofocusInput?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open ? (
        <Dialog labelledBy="harness-title" onClose={() => setOpen(false)}>
          <h2 id="harness-title">Rename Item</h2>
          <button type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>
          <input aria-label="Item name" data-autofocus={autofocusInput ? true : undefined} />
        </Dialog>
      ) : null}
    </>
  );
}

function openHarness() {
  const opener = screen.getByRole("button", { name: "Open" });
  opener.focus();
  fireEvent.click(opener);
  return { opener, dialog: screen.getByRole("dialog", { name: "Rename Item" }) };
}

describe("Dialog", () => {
  afterEach(() => cleanup());

  it("opens modally and moves focus to the autofocus element", () => {
    render(<Harness />);
    const { dialog } = openHarness();

    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("textbox", { name: "Item name" })).toHaveFocus();
  });

  it("falls back to the first focusable element", () => {
    render(<Harness autofocusInput={false} />);
    openHarness();

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the opener", () => {
    render(<Harness />);
    const { opener } = openHarness();

    fireEvent.keyDown(screen.getByRole("textbox", { name: "Item name" }), { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("closes on the native cancel event and returns focus when closed from a button", () => {
    render(<Harness />);
    const { opener, dialog } = openHarness();

    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    openHarness();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
