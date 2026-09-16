/// <reference lib="webworker" />

import type { RunResult } from "@/compiler/types";
import initRuntime, { run_pseudocode } from "@/runtime/wasm/pkg/pseudocode_runtime";

type RunWorkerMessage = {
  kind: "run";
  id: number;
  request: {
    astJson: string;
    stdinLines: string[];
    virtualFiles: Record<string, string[]>;
    seed?: number;
  };
};

type PreloadWorkerMessage = {
  kind: "preload";
  id: number;
};

type WorkerMessage = RunWorkerMessage | PreloadWorkerMessage;

type WorkerRunResponseMessage = {
  kind: "run-result";
  id: number;
  result: RunResult;
  crashed?: boolean;
};

type WorkerStatusMessage = {
  kind: "runtime-status";
  status: "ready";
};

let runtimeReady: Promise<void> | null = null;
let runtimeReadyNotified = false;
let workerFetchPatched = false;

function getWorkerOrigin(): string {
  if (self.location.origin && self.location.origin !== "null") {
    return self.location.origin;
  }

  if (self.location.href.startsWith("blob:")) {
    return new URL(self.location.href.slice("blob:".length)).origin;
  }

  return `${self.location.protocol}//${self.location.host}`;
}

function ensureAbsoluteWorkerFetch() {
  if (workerFetchPatched) {
    return;
  }

  const originalFetch = self.fetch.bind(self);
  self.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const origin = getWorkerOrigin();

    if (typeof input === "string" && input.startsWith("/")) {
      return originalFetch(new URL(input, origin), init);
    }

    if (input instanceof Request && input.url.startsWith("/")) {
      return originalFetch(new Request(new URL(input.url, origin), input), init);
    }

    const inputAsRecord = input as { href?: unknown; url?: unknown };
    const inputAsString =
      typeof inputAsRecord.href === "string"
        ? inputAsRecord.href
        : typeof inputAsRecord.url === "string"
          ? inputAsRecord.url
          : input.toString();
    if (inputAsString.startsWith("/")) {
      return originalFetch(new URL(inputAsString, origin), init);
    }

    if (input instanceof URL || input instanceof Request) {
      return originalFetch(input, init);
    }

    return originalFetch(input, init);
  }) as typeof self.fetch;
  workerFetchPatched = true;
}

async function ensureRuntimeReady() {
  if (!runtimeReady) {
    ensureAbsoluteWorkerFetch();
    runtimeReady = initRuntime().then(
      () => undefined,
      (error: unknown) => {
        // Don't cache a failed load, so the next request retries it.
        runtimeReady = null;
        throw error;
      },
    );
  }

  await runtimeReady;

  if (!runtimeReadyNotified) {
    const statusMessage: WorkerStatusMessage = { kind: "runtime-status", status: "ready" };
    self.postMessage(statusMessage);
    runtimeReadyNotified = true;
  }
}

function runtimeFailureResult(message: string, virtualFiles: Record<string, string[]>): RunResult {
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
    virtualFiles,
  };
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { id } = event.data;

  if (event.data.kind === "preload") {
    try {
      await ensureRuntimeReady();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown runtime initialization error";
      const response: WorkerRunResponseMessage = {
        kind: "run-result",
        id,
        result: runtimeFailureResult(message, {}),
      };
      self.postMessage(response);
    }
    return;
  }

  const { request } = event.data;

  try {
    await ensureRuntimeReady();
    const resultJson = run_pseudocode(
      JSON.stringify({
        ast_json: request.astJson,
        stdin_lines: request.stdinLines,
        virtual_files: request.virtualFiles,
        seed: request.seed,
      }),
    );
    const result = JSON.parse(resultJson) as RunResult;
    const response: WorkerRunResponseMessage = { kind: "run-result", id, result };
    self.postMessage(response);
  } catch (error) {
    // A WASM trap can leave the instance corrupted, so tell the runner to start a new worker.
    const message = error instanceof Error ? error.message : "Unknown worker error";
    const response: WorkerRunResponseMessage = {
      kind: "run-result",
      id,
      result: runtimeFailureResult(message, request.virtualFiles),
      crashed: true,
    };
    self.postMessage(response);
  }
};

export {};
