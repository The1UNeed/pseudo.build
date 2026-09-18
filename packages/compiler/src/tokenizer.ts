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

const SINGLE_CHAR_TOKENS: Record<string, TokenType> = {
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

// Typographic quotes pasted from PDFs and word processors count as plain quotes.
const DOUBLE_QUOTES = '"“”';
const SINGLE_QUOTES = "'‘’ꞌ";

/** First characters of the multi-character operators handled above the fallback. */
const OPERATOR_STARTS = "←≠≤≥!";

function buildSpan(
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
): SourceSpan {
  return { startLine, startColumn, endLine, endColumn };
}

/**
 * Describes how `lexeme` breaks the syntax's casing rule for keyword `canonical`,
 * or null when the casing is acceptable. The parser, not the tokenizer, decides
 * whether a mis-cased word is a keyword or a name, so it owns the diagnostic.
 */
export function keywordCaseError(syntax: SyntaxDefinition, lexeme: string, canonical: string): string | null {
  if (syntax.keywordCase === "upper" && lexeme !== canonical) {
    return `Keyword "${canonical}" must be uppercase in ${syntax.shortLabel} syntax.`;
  }
  if (syntax.keywordCase === "lower" && lexeme !== canonical.toLowerCase()) {
    return `Keyword "${canonical.toLowerCase()}" must be lowercase in ${syntax.shortLabel} syntax.`;
  }
  return null;
}

/** The spelling a keyword must use in this syntax. */
export function expectedKeywordSpelling(syntax: SyntaxDefinition, canonical: string): string {
  return syntax.keywordCase === "lower" ? canonical.toLowerCase() : canonical.toUpperCase();
}

/** Diagnostic columns are 1-based and inclusive at both ends. */
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

  const addError = (code: string, message: string, startLine: number, startColumn: number, hint?: string) => {
    diagnostics.push({
      code,
      message,
      severity: "error",
      line: startLine,
      column: startColumn,
      endLine: line,
      endColumn: Math.max(startColumn, column - 1),
      ...(hint ? { hint } : {}),
    });
  };

  const identifierContinue = (char: string) =>
    syntax.identifierUnderscore ? /[A-Za-z0-9_]/.test(char) : /[A-Za-z0-9]/.test(char);

  const singleQuotesAreChars = syntax.id === "cambridge-igcse" || syntax.id === "cambridge-alevel";

  /** True when `char` could begin a token, so a run of bad characters stops here. */
  const startsToken = (char: string) =>
    /[A-Za-z0-9_ \t\r\n]/.test(char) ||
    char in SINGLE_CHAR_TOKENS ||
    DOUBLE_QUOTES.includes(char) ||
    SINGLE_QUOTES.includes(char) ||
    OPERATOR_STARTS.includes(char) ||
    (char === "#" && syntax.comments.includes("#"));

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

    if (SINGLE_CHAR_TOKENS[char]) {
      advance();
      addToken(SINGLE_CHAR_TOKENS[char], char, startLine, startColumn, line, column - 1);
      continue;
    }

    const quotes = DOUBLE_QUOTES.includes(char) ? DOUBLE_QUOTES : SINGLE_QUOTES.includes(char) ? SINGLE_QUOTES : null;
    if (quotes) {
      const isString = quotes === DOUBLE_QUOTES;
      const quote = isString ? '"' : "'";
      advance();
      let text = "";
      while (!quotes.includes(current()) && current() !== "\n" && current() !== "\r" && current() !== "\0") {
        text += advance();
      }
      if (quotes.includes(current())) {
        advance();
        // Only the Cambridge boards reserve single quotes for one-character CHARs;
        // elsewhere 'abc' is an ordinary string, so the parser types it as STRING.
        if (!isString && singleQuotesAreChars && [...text].length !== 1) {
          addError(
            "SYN082",
            "A CHAR literal must contain exactly one character.",
            startLine,
            startColumn,
            'Use double quotes for text, like "abc".',
          );
        }
      } else if (isString) {
        addError(
          "SYN008",
          "Unterminated string literal.",
          startLine,
          startColumn,
          "String literals must end with a closing double quote.",
        );
      } else {
        addError(
          "SYN009",
          "Unterminated character literal.",
          startLine,
          startColumn,
          "Character literals must end with a closing single quote.",
        );
      }
      addToken(
        isString ? "STRING_LITERAL" : "CHAR_LITERAL",
        `${quote}${text}${quote}`,
        startLine,
        startColumn,
        line,
        column - 1,
      );
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
      // Keywords keep their original lexeme; the parser reports wrong casing
      // (or a reserved word used as a name) depending on where it appears.
      if (syntax.keywords.has(upper)) {
        addToken("KEYWORD", lexeme, startLine, startColumn, line, column - 1, upper);
      } else {
        addToken("IDENTIFIER", lexeme, startLine, startColumn, line, column - 1);
      }
      continue;
    }

    // One diagnostic for a whole run of characters that can't start a token.
    let run = "";
    do {
      run += advance();
    } while (index < source.length && !startsToken(current()));
    const shown = run.length > 20 ? `${run.slice(0, 20)}…` : run;
    addError(
      "SYN002",
      run.length === 1 ? `Unexpected character "${run}".` : `Unexpected characters "${shown}".`,
      startLine,
      startColumn,
      `Remove the character or replace it with valid ${syntax.shortLabel} pseudocode syntax.`,
    );
  }

  addToken("EOF", "", line, column, line, column);
  return { tokens, diagnostics };
}
