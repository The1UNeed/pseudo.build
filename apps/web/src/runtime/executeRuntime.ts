import { RunRequest, RunResult } from "@/compiler/types";

export type PseudocodeRuntimeStatus = "idle" | "loading" | "ready" | "running" | "error";

interface PendingRequest {
  resolve: (result: RunResult) => void;
  reject: (error: Error) => void;
}

interface WorkerRunResponse {
  kind: "run-result";
  id: number;
  result: RunResult;
  /** The WASM instance threw, so it may be corrupted and must not be reused. */
  crashed?: boolean;
}

interface WorkerStatusMessage {
  kind: "runtime-status";
  status: "ready";
}

type WorkerMessage = WorkerRunResponse | WorkerStatusMessage;

const DEFAULT_EXECUTION_TIMEOUT_MS = 12_000;
const INITIALIZATION_TIMEOUT_MS = 45_000;

export class PseudocodeRuntimeRunner {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private preloadPromise: Promise<void> | null = null;
  private preloadId: number | null = null;
  private preloadResolve: (() => void) | null = null;
  private preloadReject: ((error: Error) => void) | null = null;
  private runtimeReady = false;
  private status: PseudocodeRuntimeStatus = "idle";
  private statusListeners = new Set<(status: PseudocodeRuntimeStatus) => void>();

  private setStatus(status: PseudocodeRuntimeStatus) {
    if (this.status === status) {
      return;
    }
    this.status = status;
    for (const listener of this.statusListeners) {
      listener(status);
    }
  }

  private ensureWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }

    this.worker = new Worker(new URL("../workers/wasmRuntime.worker.ts", import.meta.url));

    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data.kind === "runtime-status") {
        this.runtimeReady = event.data.status === "ready";
        if (this.runtimeReady) {
          this.preloadResolve?.();
          this.preloadId = null;
          this.preloadResolve = null;
          this.preloadReject = null;
          this.preloadPromise = null;
          this.setStatus(this.pending.size > 0 ? "running" : "ready");
        }
        return;
      }

      const { id, result, crashed } = event.data;
      const pending = this.pending.get(id);
      if (!pending) {
        if (id === this.preloadId && !result.success) {
          // A failed load must not stay cached: start a fresh worker on the next attempt.
          this.resetWorker(
            new Error(result.stderr || result.diagnostics[0]?.message || "Pseudocode runtime preload failed."),
          );
          this.setStatus("error");
        }
        return;
      }
      this.pending.delete(id);
      pending.resolve(result);
      if (crashed) {
        this.resetWorker(new Error("Pseudocode runtime crashed and was restarted."));
        return;
      }
      this.setStatus(this.runtimeReady ? "ready" : "idle");
    };

    this.worker.onerror = (event) => {
      this.resetWorker(new Error(event.message || "Pseudocode runtime worker crashed."));
      this.setStatus("error");
    };

    return this.worker;
  }

  /** Terminates the worker and rejects every request still waiting on it. */
  private resetWorker(error: Error) {
    this.worker?.terminate();
    this.worker = null;
    this.runtimeReady = false;
    const pending = [...this.pending.values()];
    const preloadReject = this.preloadReject;
    this.pending.clear();
    this.preloadPromise = null;
    this.preloadId = null;
    this.preloadResolve = null;
    this.preloadReject = null;
    preloadReject?.(error);
    for (const request of pending) {
      request.reject(error);
    }
    this.setStatus("idle");
  }

  async run(request: RunRequest, timeoutMs = DEFAULT_EXECUTION_TIMEOUT_MS): Promise<RunResult> {
    const worker = this.ensureWorker();
    const id = this.nextId;
    this.nextId += 1;
    const runtimeWasReadyAtStart = this.runtimeReady;
    const effectiveTimeoutMs = runtimeWasReadyAtStart ? timeoutMs : Math.max(timeoutMs, INITIALIZATION_TIMEOUT_MS);
    this.setStatus(runtimeWasReadyAtStart ? "running" : "loading");

    const workerPromise = new Promise<RunResult>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage({ kind: "run", id, request });
    });

    const timeoutPromise = new Promise<RunResult>((resolve) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        const runtimeInitialized = this.runtimeReady || runtimeWasReadyAtStart;
        this.resetWorker(new Error(runtimeInitialized ? "Execution timed out." : "Runtime initialization timed out."));
        if (!runtimeInitialized) {
          this.setStatus("error");
        }
        resolve({
          success: false,
          stdout: "",
          stderr: runtimeInitialized
            ? "Execution timed out."
            : "Pseudocode runtime initialization timed out.",
          diagnostics: [
            {
              code: runtimeInitialized ? "RUN408" : "RUN409",
              message: runtimeInitialized
                ? `Execution exceeded ${effectiveTimeoutMs / 1000} seconds and was stopped.`
                : `Pseudocode runtime initialization exceeded ${effectiveTimeoutMs / 1000} seconds.`,
              severity: "error",
              line: 1,
              column: 1,
              endLine: 1,
              endColumn: 1,
              hint: runtimeInitialized
                ? "Check for infinite loops or large computations."
                : "The Rust WASM runtime did not initialize. Reload and retry.",
            },
          ],
          virtualFiles: request.virtualFiles,
        });
      }, effectiveTimeoutMs);

      const clearTimer = () => window.clearTimeout(timer);
      workerPromise.then(clearTimer, clearTimer);
    });

    try {
      return await Promise.race([workerPromise, timeoutPromise]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runtime error";
      return {
        success: false,
        stdout: "",
        stderr: message,
        diagnostics: [
          {
            code: "RUN500",
            message,
            severity: "error",
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 1,
          },
        ],
        virtualFiles: request.virtualFiles,
      };
    }
  }

  initialize(): void {
    this.preload().catch(() => {
      /* Runtime errors are shown when the user runs code. */
    });
  }

  preload(): Promise<void> {
    if (this.runtimeReady) {
      this.setStatus("ready");
      return Promise.resolve();
    }

    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    const worker = this.ensureWorker();
    const id = this.nextId;
    this.nextId += 1;
    this.setStatus("loading");
    this.preloadPromise = new Promise<void>((resolve, reject) => {
      this.preloadId = id;
      this.preloadResolve = resolve;
      this.preloadReject = reject;
      worker.postMessage({ kind: "preload", id });
    });
    return this.preloadPromise;
  }

  getStatus(): PseudocodeRuntimeStatus {
    return this.status;
  }

  subscribe(listener: (status: PseudocodeRuntimeStatus) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }
}

export const pseudocodeRuntimeRunner = new PseudocodeRuntimeRunner();
