import { beforeEach, describe, expect, it, vi } from "vitest";
import { PseudocodeRuntimeRunner } from "./executeRuntime";

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

describe("PseudocodeRuntimeRunner", () => {
  beforeEach(() => {
    MockWorker.instances = [];
    vi.stubGlobal("Worker", MockWorker);
  });

  it("preloads the runtime explicitly and reports ready status", async () => {
    const runner = new PseudocodeRuntimeRunner();
    const statuses: string[] = [];
    runner.subscribe((status) => statuses.push(status));

    const preload = runner.preload();
    const worker = MockWorker.instances[0];

    expect(worker.messages).toEqual([{ kind: "preload", id: 1 }]);
    expect(runner.getStatus()).toBe("loading");

    worker.emit({ kind: "runtime-status", status: "ready" });

    await expect(preload).resolves.toBeUndefined();
    expect(runner.getStatus()).toBe("ready");
    expect(statuses).toEqual(["idle", "loading", "ready"]);
  });

  it("starts loading on the first run instead of requiring eager initialization", async () => {
    const runner = new PseudocodeRuntimeRunner();
    const run = runner.run({
      astJson: "{}",
      stdinLines: [],
      virtualFiles: {},
    });
    const worker = MockWorker.instances[0];

    expect(worker.messages).toEqual([
      {
        kind: "run",
        id: 1,
        request: {
          astJson: "{}",
          stdinLines: [],
          virtualFiles: {},
        },
      },
    ]);
    expect(runner.getStatus()).toBe("loading");

    worker.emit({ kind: "runtime-status", status: "ready" });
    worker.emit({
      kind: "run-result",
      id: 1,
      result: {
        success: true,
        stdout: "ok",
        stderr: "",
        diagnostics: [],
        virtualFiles: {},
      },
    });

    await expect(run).resolves.toMatchObject({ success: true, stdout: "ok" });
    expect(runner.getStatus()).toBe("ready");
  });
});
