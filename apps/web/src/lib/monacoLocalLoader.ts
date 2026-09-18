"use client";

import { loader } from "@monaco-editor/react";
// Core editor and its built-in contributions (find, folding, suggest, ...) only.
// The "monaco-editor" main entry also bundles the TypeScript, JSON, CSS and HTML
// language services and ~80 syntax grammars, none of which the pseudocode editor uses.
import "monaco-editor/esm/vs/editor/edcore.main.js";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";

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
