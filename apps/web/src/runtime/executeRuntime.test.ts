import { beforeEach, describe, expect, it, vi } from "vitest";
import { PseudocodeRuntimeRunner } from "./executeRuntime";

class MockWorker {
  static instances: MockWorker[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  messages: unknown[] = [];
  terminated = false;

  constructor() {
    MockWorker.instances.push(this);
  }

  postMessage(message: unknown) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emit(data: unknown) {
    this.onmessage?.({ data } as MessageEvent);
  }
}

const request = { astJson: "{}", stdinLines: [], virtualFiles: {} };

function okResult(stdout: string) {
  return { success: true, stdout, stderr: "", diagnostics: [], virtualFiles: {} };
}

function failedResult(message: string) {
  return {
    success: false,
    stdout: "",
    stderr: message,
    diagnostics: [{ code: "RUN500", message, severity: "error", line: 1, column: 1, endLine: 1, endColumn: 1 }],
    virtualFiles: {},
  };
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
    const run = runner.run(request);
    const worker = MockWorker.instances[0];

    expect(worker.messages).toEqual([{ kind: "run", id: 1, request }]);
    expect(runner.getStatus()).toBe("loading");

    worker.emit({ kind: "runtime-status", status: "ready" });
    worker.emit({ kind: "run-result", id: 1, result: okResult("ok") });

    await expect(run).resolves.toMatchObject({ success: true, stdout: "ok" });
    expect(runner.getStatus()).toBe("ready");
  });

  it("passes the RANDOM seed through to the worker", () => {
    const runner = new PseudocodeRuntimeRunner();
    void runner.run({ ...request, seed: 42 });

    expect(MockWorker.instances[0].messages).toEqual([{ kind: "run", id: 1, request: { ...request, seed: 42 } }]);
  });

  it("replaces the worker after a run crashes the WASM instance", async () => {
    const runner = new PseudocodeRuntimeRunner();
    const crashedRun = runner.run(request);
    const crashedWorker = MockWorker.instances[0];
    crashedWorker.emit({ kind: "runtime-status", status: "ready" });
    crashedWorker.emit({
      kind: "run-result",
      id: 1,
      result: failedResult("RuntimeError: memory access out of bounds"),
      crashed: true,
    });

    await expect(crashedRun).resolves.toMatchObject({ success: false });
    expect(crashedWorker.terminated).toBe(true);
    expect(runner.getStatus()).toBe("idle");

    const nextRun = runner.run(request);
    expect(MockWorker.instances).toHaveLength(2);
    const freshWorker = MockWorker.instances[1];
    expect(freshWorker.messages).toEqual([{ kind: "run", id: 2, request }]);
    freshWorker.emit({ kind: "runtime-status", status: "ready" });
    freshWorker.emit({ kind: "run-result", id: 2, result: okResult("alive") });

    await expect(nextRun).resolves.toMatchObject({ success: true, stdout: "alive" });
  });

  it("does not cache a failed preload", async () => {
    const runner = new PseudocodeRuntimeRunner();
    const preload = runner.preload();
    const failedWorker = MockWorker.instances[0];
    failedWorker.emit({ kind: "run-result", id: 1, result: failedResult("Failed to fetch WASM") });

    await expect(preload).rejects.toThrow("Failed to fetch WASM");
    expect(failedWorker.terminated).toBe(true);
    expect(runner.getStatus()).toBe("error");

    const retry = runner.preload();
    expect(MockWorker.instances).toHaveLength(2);
    MockWorker.instances[1].emit({ kind: "runtime-status", status: "ready" });
    await expect(retry).resolves.toBeUndefined();
  });

  it("settles every pending run when the worker crashes", async () => {
    const runner = new PseudocodeRuntimeRunner();
    const first = runner.run(request);
    const second = runner.run(request);
    const worker = MockWorker.instances[0];

    worker.onerror?.({ message: "boom" } as ErrorEvent);

    await expect(first).resolves.toMatchObject({ success: false, stderr: "boom" });
    await expect(second).resolves.toMatchObject({ success: false, stderr: "boom" });
    expect(worker.terminated).toBe(true);
    expect(runner.getStatus()).toBe("error");
  });

  it("resets the worker when execution times out and rejects nothing unhandled", async () => {
    vi.useFakeTimers();
    try {
      const runner = new PseudocodeRuntimeRunner();
      const run = runner.run(request, 1_000);
      const worker = MockWorker.instances[0];
      worker.emit({ kind: "runtime-status", status: "ready" });
      const other = runner.run(request, 60_000);

      await vi.advanceTimersByTimeAsync(45_000);

      await expect(run).resolves.toMatchObject({ success: false, diagnostics: [{ code: "RUN408" }] });
      await expect(other).resolves.toMatchObject({ success: false, stderr: "Execution timed out." });
      expect(worker.terminated).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
