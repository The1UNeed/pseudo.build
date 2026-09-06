import { compilePseudocode } from "@/compiler";
import type { CompileRequest, CompileResult, Diagnostic } from "@/compiler/types";
import type { CompilerWorkerResponseMessage } from "@/workers/compiler.worker";

interface PendingCompile {
  resolve: (result: CompilerRunResult) => void;
  reject: (error: Error) => void;
  cacheKey: string | null;
}

export interface CompilerRunResult {
  result: CompileResult;
  requestId: number;
  stale: boolean;
  cached: boolean;
}

const COMPILE_TIMEOUT_MS = 10_000;
const MAX_COMPILE_CACHE_ENTRIES = 40;

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

function compilerErrorResult(message: string): CompileResult {
  const diagnostic: Diagnostic = {
    code: "CMP500",
    message,
    severity: "error",
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1,
  };

  return {
    success: false,
    diagnostics: [diagnostic],
    astJson: "",
  };
}

class CompilerRunner {
  private worker: Worker | null = null;
  private nextId = 1;
  private latestRequestId = 0;
  private pending = new Map<number, PendingCompile>();
  private cache = new Map<string, CompileResult>();

  private ensureWorker(): Worker | null {
    if (typeof Worker === "undefined") {
      return null;
    }

    if (this.worker) {
      return this.worker;
    }

    this.worker = new Worker(new URL("../workers/compiler.worker.ts", import.meta.url));
    this.worker.onmessage = (event: MessageEvent<CompilerWorkerResponseMessage>) => {
      const { id } = event.data;
      const pending = this.pending.get(id);
      if (!pending) {
        return;
      }

      this.pending.delete(id);

      if (event.data.kind === "error") {
        pending.resolve({
          result: compilerErrorResult(event.data.message),
          requestId: id,
          stale: id !== this.latestRequestId,
          cached: false,
        });
        return;
      }

      if (pending.cacheKey) {
        this.setCachedResult(pending.cacheKey, event.data.result);
      }

      pending.resolve({
        result: event.data.result,
        requestId: id,
        stale: id !== this.latestRequestId,
        cached: false,
      });
    };

    this.worker.onerror = (event) => {
      const error = new Error(event.message || "Compiler worker crashed.");
      for (const pending of this.pending.values()) {
        pending.reject(error);
      }
      this.pending.clear();
      this.worker?.terminate();
      this.worker = null;
    };

    return this.worker;
  }

  private setCachedResult(cacheKey: string, result: CompileResult) {
    if (this.cache.has(cacheKey)) {
      this.cache.delete(cacheKey);
    }

    this.cache.set(cacheKey, result);

    while (this.cache.size > MAX_COMPILE_CACHE_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.cache.delete(oldestKey);
    }
  }

  compile(request: CompileRequest, cacheKey: string | null = null): Promise<CompilerRunResult> {
    const cached = cacheKey ? this.cache.get(cacheKey) : undefined;
    if (cached) {
      const requestId = this.latestRequestId;
      return Promise.resolve({
        result: cached,
        requestId,
        stale: false,
        cached: true,
      });
    }

    const id = this.nextId;
    this.nextId += 1;
    this.latestRequestId = id;

    const worker = this.ensureWorker();
    if (!worker) {
      let result: CompileResult;
      try {
        result = compilePseudocode(request);
      } catch (error) {
        result = compilerErrorResult(error instanceof Error ? error.message : "Unknown compiler error");
      }
      if (cacheKey) {
        this.setCachedResult(cacheKey, result);
      }
      return Promise.resolve({
        result,
        requestId: id,
        stale: false,
        cached: false,
      });
    }

    return new Promise<CompilerRunResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!this.pending.has(id)) {
          return;
        }
        this.pending.delete(id);
        this.worker?.terminate();
        this.worker = null;
        reject(new Error("Compiler timed out."));
      }, COMPILE_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
        cacheKey,
      });
      worker.postMessage({ kind: "compile", id, request });
    }).catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown compiler error";
      return {
        result: compilerErrorResult(message),
        requestId: id,
        stale: id !== this.latestRequestId,
        cached: false,
      };
    });
  }

  preload(): void {
    void this.ensureWorker();
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export function getCompileCacheKey(documentId: string, filename: string, source: string): string {
  return `${documentId}:${filename}:${hashString(source)}`;
}

export const pseudocodeCompilerRunner = new CompilerRunner();

export function compilePseudocodeInWorker(
  request: CompileRequest,
  cacheKey?: string | null,
): Promise<CompilerRunResult> {
  return pseudocodeCompilerRunner.compile(request, cacheKey ?? null);
}

export function preloadPseudocodeCompiler(): void {
  pseudocodeCompilerRunner.preload();
}
