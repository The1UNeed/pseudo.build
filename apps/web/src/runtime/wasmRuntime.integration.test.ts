import { describe, expect, it, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { compilePseudocode } from "@/compiler";
import initRuntime, { run_pseudocode } from "./wasm/pkg/pseudocode_runtime";
import type { RunResult } from "@/compiler/types";

beforeAll(async () => {
  const wasmBytes = await readFile(path.join(process.cwd(), "src/runtime/wasm/pkg/pseudocode_runtime_bg.wasm"));
  await initRuntime({ module_or_path: wasmBytes });
});

function runSource(source: string, options?: {
  stdinLines?: string[];
  virtualFiles?: Record<string, string[]>;
}): RunResult {
  const compileResult = compilePseudocode({
    source,
    filename: "main.pseudo",
    strict: true,
  });

  expect(compileResult.success).toBe(true);
  expect(compileResult.astJson).toBeTruthy();

  return JSON.parse(
    run_pseudocode(
      JSON.stringify({
        ast_json: compileResult.astJson,
        stdin_lines: options?.stdinLines ?? [],
        virtual_files: options?.virtualFiles ?? {},
      }),
    ),
  ) as RunResult;
}

describe("WASM pseudocode runtime integration", () => {
  it("runs arithmetic, loops, and arrays from compiler AST JSON", () => {
    const result = runSource(`DECLARE Total : INTEGER
DECLARE Numbers : ARRAY[1:3] OF INTEGER
DECLARE Index : INTEGER
FOR Index <- 1 TO 3
    Numbers[Index] <- Index * 2
    Total <- Total + Numbers[Index]
NEXT Index
OUTPUT Total`);

    expect(result).toMatchObject({
      success: true,
      stdout: "12",
      stderr: "",
    });
  });

  it("matches interactive INPUT rerun behavior with accumulated stdin", () => {
    const result = runSource(`DECLARE Name : STRING
INPUT Name
OUTPUT "Hello, ", Name`, {
      stdinLines: ["Ada"],
    });

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("Hello, Ada");
  });

  it("runs functions and virtual file operations", () => {
    const result = runSource(`FUNCTION AddOne(X : INTEGER) RETURNS INTEGER
    RETURN X + 1
ENDFUNCTION

OPENFILE "out.txt" FOR WRITE
WRITEFILE "out.txt", AddOne(4)
CLOSEFILE "out.txt"`);

    expect(result.success).toBe(true);
    expect(result.virtualFiles).toEqual({ "out.txt": ["5"] });
  });

  it("returns runtime diagnostics without relying on worker termination", () => {
    const result = runSource(`DECLARE Value : INTEGER
OUTPUT 10 / Value`);

    expect(result.success).toBe(false);
    expect(result.diagnostics[0]?.code).toBe("RUN001");
  });
});
