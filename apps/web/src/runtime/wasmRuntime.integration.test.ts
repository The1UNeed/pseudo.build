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
  seed?: number;
}): RunResult {
  const compileResult = compilePseudocode({
    source,
    filename: "main.pseudo",
    strict: true,
  });

  expect(compileResult.diagnostics).toEqual([]);
  expect(compileResult.success).toBe(true);
  expect(compileResult.astJson).toBeTruthy();

  return JSON.parse(
    run_pseudocode(
      JSON.stringify({
        ast_json: compileResult.astJson,
        stdin_lines: options?.stdinLines ?? [],
        virtual_files: options?.virtualFiles ?? {},
        seed: options?.seed,
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

  it("stops deep recursion with a clean error and keeps the instance usable", () => {
    const result = runSource(`FUNCTION R(N : INTEGER) RETURNS INTEGER
    IF N = 0 THEN
        RETURN 0
    ENDIF
    RETURN R(N - 1) + 1
ENDFUNCTION
OUTPUT R(100000)`);

    expect(result.success).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ code: "RUN001", line: 5 });
    expect(result.stderr).toBe("Recursion too deep (limit 250 calls)");

    expect(runSource(`OUTPUT "alive"`)).toMatchObject({ success: true, stdout: "alive" });
  });

  it("runs recursion up to the call limit", () => {
    const result = runSource(`FUNCTION R(N : INTEGER) RETURNS INTEGER
    IF N = 0 THEN
        RETURN 0
    ENDIF
    RETURN R(N - 1) + 1
ENDFUNCTION
OUTPUT R(249)`);

    expect(result).toMatchObject({ success: true, stdout: "249" });
  });

  it("gives each routine its own scope for DECLARE", () => {
    const shadowed = runSource(`DECLARE X : INTEGER
PROCEDURE P()
    DECLARE X : INTEGER
    X <- 5
ENDPROCEDURE
X <- 1
CALL P()
OUTPUT X`);
    expect(shadowed).toMatchObject({ success: true, stdout: "1" });

    const recursive = runSource(`FUNCTION Sum(N : INTEGER) RETURNS INTEGER
    DECLARE Local : INTEGER
    Local <- N
    IF N = 0 THEN
        RETURN 0
    ENDIF
    RETURN Sum(N - 1) + Local
ENDFUNCTION
OUTPUT Sum(3)`);
    expect(recursive).toMatchObject({ success: true, stdout: "6" });
  });

  it("runs deeply nested but valid programs", () => {
    // The deepest IF nesting the compiler accepts: its 200-level SYN099 limit also counts the program block, OUTPUT and its expression.
    const depth = 197;
    const nestedIfs = `${"IF TRUE THEN\n".repeat(depth)}OUTPUT 1\n${"ENDIF\n".repeat(depth)}`;
    expect(runSource(nestedIfs)).toMatchObject({ success: true, stdout: "1" });

    const sum = `OUTPUT ${Array(500).fill("1").join(" + ")}`;
    expect(runSource(sum)).toMatchObject({ success: true, stdout: "500" });
  });

  it("rejects INPUT text that does not match the variable type", () => {
    const result = runSource(`DECLARE N : INTEGER
INPUT N
OUTPUT N`, { stdinLines: ["abc"] });

    expect(result.success).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({ code: "RUN001", line: 2 });
    expect(result.stderr).toBe('Expected INTEGER, got "abc"');
  });

  it("raises errors for integer overflow and follows truncating DIV and MOD", () => {
    expect(runSource("OUTPUT 3037000500 * 3037000500").stderr).toBe("Integer overflow");
    expect(runSource(`OUTPUT DIV(-7, 2), " ", MOD(-7, 2), " ", MOD(7, -2)`).stdout).toBe("-3 -1 1");
  });

  it("seeds RANDOM from the request", () => {
    const source = `OUTPUT RANDOM(), " ", RANDOM()`;
    expect(runSource(source, { seed: 1234 }).stdout).toBe(runSource(source, { seed: 1234 }).stdout);
    expect(runSource(source, { seed: 1234 }).stdout).not.toBe(runSource(source, { seed: 99 }).stdout);
    expect(runSource(source).stdout).toBe(runSource(source).stdout);
  });
});
