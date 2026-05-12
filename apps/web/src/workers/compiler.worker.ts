/// <reference lib="webworker" />

import { compilePseudocode } from "@/compiler";
import type { CompileRequest, CompileResult } from "@/compiler/types";

export type CompilerWorkerRequestMessage = {
  kind: "compile";
  id: number;
  request: CompileRequest;
};

export type CompilerWorkerResponseMessage =
  | {
      kind: "compiled";
      id: number;
      result: CompileResult;
    }
  | {
      kind: "error";
      id: number;
      message: string;
    };

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<CompilerWorkerRequestMessage>) => {
  const { id, request } = event.data;

  try {
    const result = compilePseudocode(request);
    const response: CompilerWorkerResponseMessage = {
      kind: "compiled",
      id,
      result,
    };
    self.postMessage(response);
  } catch (error) {
    const response: CompilerWorkerResponseMessage = {
      kind: "error",
      id,
      message: error instanceof Error ? error.message : "Unknown compiler error",
    };
    self.postMessage(response);
  }
};

export {};
