import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompileResult } from "@/compiler/types";

class MockWorker {
  static instances: MockWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: unknown[] = [];

  constructor() {
    MockWorker.instances.push(this);
  }

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  terminate() {}

  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

const successResult: CompileResult = {
  success: true,
  diagnostics: [],
  astJson: "{}",
  pythonCode: "print('ok')",
};

describe("compilePseudocodeInWorker", () => {
  beforeEach(() => {
    vi.resetModules();
    MockWorker.instances = [];
    vi.stubGlobal("Worker", MockWorker);
  });

  it("marks older worker responses as stale", async () => {
    const { compilePseudocodeInWorker } = await import("./compilePseudocodeInWorker");

    const first = compilePseudocodeInWorker(
      { source: "OUTPUT 1", filename: "first.pseudo", strict: true },
      "first",
    );
    const second = compilePseudocodeInWorker(
      { source: "OUTPUT 2", filename: "second.pseudo", strict: true },
      "second",
    );

    const worker = MockWorker.instances[0];
    worker.emit({ kind: "compiled", id: 2, result: successResult });
    worker.emit({ kind: "compiled", id: 1, result: successResult });

    await expect(second).resolves.toMatchObject({ stale: false, cached: false });
    await expect(first).resolves.toMatchObject({ stale: true, cached: false });
  });

  it("returns cached compile results without posting another worker request", async () => {
    const { compilePseudocodeInWorker } = await import("./compilePseudocodeInWorker");
    const request = { source: "OUTPUT 1", filename: "main.pseudo", strict: true as const };

    const first = compilePseudocodeInWorker(request, "main");
    const worker = MockWorker.instances[0];
    worker.emit({ kind: "compiled", id: 1, result: successResult });

    await expect(first).resolves.toMatchObject({ cached: false, result: successResult });
    expect(worker.messages).toHaveLength(1);

    await expect(compilePseudocodeInWorker(request, "main")).resolves.toMatchObject({
      cached: true,
      result: successResult,
      stale: false,
    });
    expect(worker.messages).toHaveLength(1);
  });
});
