import { analyzeProgram } from "./semantics";
import { parseSource } from "./parser";
import { resolveSyntax } from "./syntax";
import { CompileRequest, CompileResult, Diagnostic } from "./types";

export { parseSource } from "./parser";
export {
  DEFAULT_SYNTAX_ID,
  SYNTAX_CATALOG,
  SYNTAX_OPTIONS,
  displayKeyword,
  isSyntaxId,
  resolveSyntax,
  type KeywordCase,
  type SyntaxDefinition,
  type SyntaxId,
} from "./syntax";

/** Maximum source size in UTF-8 bytes. */
export const MAX_SOURCE_BYTES = 256 * 1024;
const MAX_DIAGNOSTICS = 200;

function utf8ByteLength(source: string): number {
  let bytes = 0;
  for (const char of source) {
    const codePoint = char.codePointAt(0) ?? 0;
    bytes += codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4;
  }
  return bytes;
}

function programDiagnostic(code: string, message: string, hint?: string): Diagnostic {
  return { code, message, severity: "error", line: 1, column: 1, endLine: 1, endColumn: 1, ...(hint ? { hint } : {}) };
}

export function compilePseudocode(request: CompileRequest): CompileResult {
  if (request.source.length > MAX_SOURCE_BYTES || utf8ByteLength(request.source) > MAX_SOURCE_BYTES) {
    return {
      success: false,
      diagnostics: [
        programDiagnostic(
          "CMP413",
          `Source is too large to compile (limit ${MAX_SOURCE_BYTES / 1024} KB).`,
          "Split the program into smaller files.",
        ),
      ],
      astJson: "",
    };
  }

  const syntax = resolveSyntax(request.syntaxId);
  const { ast, diagnostics: parseDiagnostics } = parseSource(request.source, syntax);
  let semanticDiagnostics: Diagnostic[] = [];
  // Semantic checks on a partially parsed program mostly repeat the syntax errors.
  if (!parseDiagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    try {
      semanticDiagnostics = analyzeProgram(ast, syntax).diagnostics;
    } catch (error) {
      if (!(error instanceof RangeError)) {
        throw error;
      }
      semanticDiagnostics = [programDiagnostic("SEM099", "Program is too deeply nested to analyze.")];
    }
  }

  let diagnostics = [...parseDiagnostics, ...semanticDiagnostics].sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    return a.code.localeCompare(b.code);
  });

  const success = !diagnostics.some((diagnostic) => diagnostic.severity === "error");
  if (diagnostics.length > MAX_DIAGNOSTICS) {
    const last = diagnostics[MAX_DIAGNOSTICS - 2];
    diagnostics = [
      ...diagnostics.slice(0, MAX_DIAGNOSTICS - 1),
      {
        ...programDiagnostic("CMP429", `Too many errors. Showing the first ${MAX_DIAGNOSTICS - 1}.`),
        line: last.endLine,
        column: last.endColumn,
        endLine: last.endLine,
        endColumn: last.endColumn,
      },
    ];
  }

  return {
    success,
    diagnostics,
    astJson: JSON.stringify(ast),
  };
}
