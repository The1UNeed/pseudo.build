import { analyzeProgram } from "./semantics";
import { parseSource } from "./parser";
import { CompileRequest, CompileResult } from "./types";

export { parseSource } from "./parser";

export const MAX_SOURCE_BYTES = 256 * 1024;

export function compilePseudocode(request: CompileRequest): CompileResult {
  if (request.source.length > MAX_SOURCE_BYTES) {
    return {
      success: false,
      diagnostics: [
        {
          code: "CMP413",
          message: `Source is too large to compile (limit ${MAX_SOURCE_BYTES / 1024} KB).`,
          severity: "error",
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 1,
          hint: "Split the program into smaller files.",
        },
      ],
      astJson: "",
    };
  }

  const { ast, diagnostics: parseDiagnostics } = parseSource(request.source);
  let semanticResult: ReturnType<typeof analyzeProgram>;
  try {
    semanticResult = analyzeProgram(ast);
  } catch (error) {
    if (!(error instanceof RangeError)) {
      throw error;
    }
    semanticResult = {
      diagnostics: [
        {
          code: "SEM099",
          message: "Program is too deeply nested to analyze.",
          severity: "error",
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 1,
        },
      ],
      symbolTypes: {},
      functionSignatures: {},
      procedureSignatures: {},
    };
  }

  const diagnostics = [...parseDiagnostics, ...semanticResult.diagnostics].sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return a.code.localeCompare(b.code);
  });

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return {
      success: false,
      diagnostics,
      astJson: JSON.stringify(ast),
    };
  }

  return {
    success: true,
    diagnostics,
    astJson: JSON.stringify(ast),
  };
}
