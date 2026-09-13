import { DEFAULT_SYNTAX_ID, resolveSyntax, type SyntaxDefinition } from "./syntax";
import { Diagnostic, SourceSpan } from "./types";

export type TokenType =
  | "EOF"
  | "NEWLINE"
  | "IDENTIFIER"
  | "INTEGER_LITERAL"
  | "REAL_LITERAL"
  | "STRING_LITERAL"
  | "CHAR_LITERAL"
  | "KEYWORD"
  | "ASSIGN"
  | "COLON"
  | "COMMA"
  | "LPAREN"
  | "RPAREN"
  | "LBRACKET"
  | "RBRACKET"
  | "DOT"
  | "AMPERSAND"
  | "PLUS"
  | "MINUS"
  | "STAR"
  | "SLASH"
  | "CARET"
  | "EQ"
  | "EQEQ"
  | "LT"
  | "LTE"
  | "GT"
  | "GTE"
  | "NEQ";

export interface Token {
  type: TokenType;
  lexeme: string;
  keyword?: string;
  span: SourceSpan;
}

function buildSpan(
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
): SourceSpan {
  return { startLine, startColumn, endLine, endColumn };
}

function keywordCaseError(syntax: SyntaxDefinition, lexeme: string, canonical: string): string | null {
  if (syntax.keywordCase === "upper" && lexeme !== canonical) {
    return `Keyword "${canonical}" must be uppercase in ${syntax.shortLabel} syntax.`;
  }
  if (syntax.keywordCase === "lower" && lexeme !== canonical.toLowerCase()) {
    return `Keyword "${canonical.toLowerCase()}" must be lowercase in ${syntax.shortLabel} syntax.`;
  }
  return null;
}

export function tokenize(
  source: string,
  syntaxInput: SyntaxDefinition | string = DEFAULT_SYNTAX_ID,
): { tokens: Token[]; diagnostics: Diagnostic[] } {
  const syntax = typeof syntaxInput === "string" ? resolveSyntax(syntaxInput) : syntaxInput;
  const diagnostics: Diagnostic[] = [];
  const tokens: Token[] = [];

  let index = 0;
  let line = 1;
  let column = 1;

  const current = () => source[index] ?? "\0";
  const peek = (offset = 1) => source[index + offset] ?? "\0";

  const advance = () => {
    const char = current();
    index += 1;
    if (char === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return char;
  };

  const addToken = (
    type: TokenType,
    lexeme: string,
    startLine: number,
    startColumn: number,
    endLine: number,
    endColumn: number,
    keyword?: string,
  ) => {
    tokens.push({
      type,
      lexeme,
      keyword,
      span: buildSpan(startLine, startColumn, endLine, endColumn),
    });
  };

  const identifierContinue = (char: string) =>
    syntax.identifierUnderscore ? /[A-Za-z0-9_]/.test(char) : /[A-Za-z0-9]/.test(char);

  while (index < source.length) {
    const char = current();

    if (char === " " || char === "\t" || char === "\r") {
      advance();
      continue;
    }

    if (char === "\n") {
      const startLine = line;
      const startColumn = column;
      advance();
      addToken("NEWLINE", "\\n", startLine, startColumn, startLine, startColumn);
      continue;
    }

    if (char === "/" && peek() === "/" && syntax.comments.includes("//")) {
      while (current() !== "\n" && current() !== "\0") {
        advance();
      }
      continue;
    }

    if (char === "#" && syntax.comments.includes("#")) {
      while (current() !== "\n" && current() !== "\0") {
        advance();
      }
      continue;
    }

    const startLine = line;
    const startColumn = column;

    if (char === "←" || (char === "<" && peek() === "-")) {
      const lexeme = char === "←" ? advance() : `${advance()}${advance()}`;
      addToken("ASSIGN", lexeme, startLine, startColumn, line, column - 1);
      continue;
    }

    if (char === "<" && peek() === "=") {
      advance();
      advance();
      addToken("LTE", "<=", startLine, startColumn, line, column - 1);
      continue;
    }
    if (char === ">" && peek() === "=") {
      advance();
      advance();
      addToken("GTE", ">=", startLine, startColumn, line, column - 1);
      continue;
    }
    if (char === "<" && peek() === ">") {
      advance();
      advance();
      addToken("NEQ", "<>", startLine, startColumn, line, column - 1);
      continue;
    }
    if (char === "!" && peek() === "=") {
      advance();
      advance();
      addToken("NEQ", "!=", startLine, startColumn, line, column - 1);
      continue;
    }
    if (char === "=" && peek() === "=") {
      advance();
      advance();
      addToken("EQEQ", "==", startLine, startColumn, line, column - 1);
      continue;
    }
    if (char === "≠") {
      advance();
      addToken("NEQ", "≠", startLine, startColumn, line, column - 1);
      continue;
    }
    if (char === "≤") {
      advance();
      addToken("LTE", "≤", startLine, startColumn, line, column - 1);
      continue;
    }
    if (char === "≥") {
      advance();
      addToken("GTE", "≥", startLine, startColumn, line, column - 1);
      continue;
    }

    const singleCharTokens: Record<string, TokenType> = {
      ":": "COLON",
      ",": "COMMA",
      "(": "LPAREN",
      ")": "RPAREN",
      "[": "LBRACKET",
      "]": "RBRACKET",
      ".": "DOT",
      "&": "AMPERSAND",
      "+": "PLUS",
      "-": "MINUS",
      "*": "STAR",
      "/": "SLASH",
      "^": "CARET",
      "=": "EQ",
      "<": "LT",
      ">": "GT",
    };

    if (singleCharTokens[char]) {
      advance();
      addToken(singleCharTokens[char], char, startLine, startColumn, line, column - 1);
      continue;
    }

    if (char === '"') {
      let lexeme = advance();
      while (current() !== '"' && current() !== "\n" && current() !== "\0") {
        lexeme += advance();
      }
      if (current() !== '"') {
        diagnostics.push({
          code: "SYN008",
          message: "Unterminated string literal.",
          severity: "error",
          line: startLine,
          column: startColumn,
          endLine: line,
          endColumn: column,
          hint: "String literals must end with a closing double quote.",
        });
      } else {
        lexeme += advance();
      }
      addToken("STRING_LITERAL", lexeme, startLine, startColumn, line, column - 1);
      continue;
    }

    if (char === "'" || char === "ꞌ") {
      const quote = char;
      let lexeme = advance();
      while (current() !== quote && current() !== "\n" && current() !== "\0") {
        lexeme += advance();
      }
      if (current() !== quote) {
        diagnostics.push({
          code: "SYN009",
          message: "Unterminated character literal.",
          severity: "error",
          line: startLine,
          column: startColumn,
          endLine: line,
          endColumn: column,
          hint: "Character literals must end with a closing single quote.",
        });
      } else {
        lexeme += advance();
      }
      addToken("CHAR_LITERAL", lexeme, startLine, startColumn, line, column - 1);
      continue;
    }

    if (/[0-9]/.test(char)) {
      let lexeme = "";
      while (/[0-9]/.test(current())) {
        lexeme += advance();
      }
      if (current() === "." && /[0-9]/.test(peek())) {
        lexeme += advance();
        while (/[0-9]/.test(current())) {
          lexeme += advance();
        }
        addToken("REAL_LITERAL", lexeme, startLine, startColumn, line, column - 1);
      } else {
        addToken("INTEGER_LITERAL", lexeme, startLine, startColumn, line, column - 1);
      }
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let lexeme = advance();
      while (identifierContinue(current())) {
        lexeme += advance();
      }
      const upper = lexeme.toUpperCase();
      if (syntax.keywords.has(upper)) {
        const caseError = keywordCaseError(syntax, lexeme, upper);
        if (caseError) {
          diagnostics.push({
            code: "SYN001",
            message: caseError,
            severity: "error",
            line: startLine,
            column: startColumn,
            endLine: line,
            endColumn: column - 1,
            hint: `Use "${syntax.keywordCase === "lower" ? upper.toLowerCase() : upper}" exactly.`,
          });
        }
        addToken("KEYWORD", lexeme, startLine, startColumn, line, column - 1, upper);
      } else {
        addToken("IDENTIFIER", lexeme, startLine, startColumn, line, column - 1);
      }
      continue;
    }

    diagnostics.push({
      code: "SYN002",
      message: `Unexpected character "${char}".`,
      severity: "error",
      line,
      column,
      endLine: line,
      endColumn: column,
      hint: `Remove the character or replace it with valid ${syntax.shortLabel} pseudocode syntax.`,
    });
    advance();
  }

  addToken("EOF", "", line, column, line, column);
  return { tokens, diagnostics };
}
