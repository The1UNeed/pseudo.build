"use client";

import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Serve Monaco from our own bundle instead of the default jsDelivr CDN so the
// editor works under a strict Content Security Policy and without third-party
// script dependencies at runtime.
if (typeof window !== "undefined") {
  const monacoWindow = window as Window & {
    MonacoEnvironment?: { getWorker: (workerId: string, label: string) => Worker };
  };

  monacoWindow.MonacoEnvironment = {
    getWorker: () =>
      new Worker(new URL("monaco-editor/esm/vs/editor/editor.worker.js", import.meta.url), {
        type: "module",
      }),
  };

  loader.config({ monaco });
}
