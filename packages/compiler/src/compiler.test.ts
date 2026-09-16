import { describe, expect, it } from "vitest";
import { compilePseudocode, parseSource } from "./index";
import { tokenize } from "./tokenizer";
import { ExpressionNode } from "./types";

const compile = (source: string) => compilePseudocode({ source, filename: "main.pseudo", strict: true });
const codes = (source: string) => compile(source).diagnostics.map((diagnostic) => diagnostic.code);

const show = (e: ExpressionNode): string =>
  e.kind === "binary"
    ? `(${show(e.left)} ${e.operator} ${show(e.right)})`
    : e.kind === "unary"
      ? `(${e.operator} ${show(e.operand)})`
      : e.kind === "literal"
        ? String(e.value)
        : e.name;

const firstOutput = (source: string) => {
  const statement = parseSource(source).ast.body[0];
  if (statement?.kind !== "output") throw new Error("expected OUTPUT");
  return statement.values[0];
};

describe("compilePseudocode", () => {
  it("compiles valid IGCSE pseudocode into AST JSON", () => {
    const result = compile(`DECLARE Total : INTEGER
DECLARE Index : INTEGER
FOR Index <- 1 TO 3
    Total <- Total + Index
NEXT Index
OUTPUT Total`);

    expect(result.success).toBe(true);
    expect(result.astJson).toContain('"kind":"for"');
    expect(result.astJson).toContain('"kind":"output"');
  });

  it("returns syntax diagnostics for malformed IF blocks", () => {
    expect(codes(`DECLARE Score : INTEGER\nIF Score > 10 THEN\n    OUTPUT "High"`)).toContain("SYN018");
  });

  it("returns semantic diagnostics for undeclared identifiers", () => {
    expect(codes(`Value <- 7`)).toEqual(["SEM019"]);
  });

  it("returns semantic diagnostics for array index dimension mismatch", () => {
    expect(codes(`DECLARE Grid : ARRAY[1:3, 1:3] OF INTEGER\nDECLARE Value : INTEGER\nValue <- Grid[1]`)).toEqual(["SEM027"]);
  });

  it("returns semantic diagnostics for READFILE on WRITE mode", () => {
    expect(codes(`DECLARE Line : STRING\nOPENFILE "FileA.txt" FOR WRITE\nREADFILE "FileA.txt", Line`)).toEqual(["SEM015"]);
  });
});

describe("tokenizer", () => {
  it("handles CRLF line endings", () => {
    const { tokens } = tokenize("DECLARE X : INTEGER\r\nX <- 1\r\n");
    expect(tokens.map((t) => t.type)).toEqual([
      "KEYWORD", "IDENTIFIER", "COLON", "KEYWORD", "NEWLINE", "IDENTIFIER", "ASSIGN", "INTEGER_LITERAL", "NEWLINE", "EOF",
    ]);
    const [diagnostic] = compile(`DECLARE X : INTEGER\r\nX <- "a"\r\n`).diagnostics;
    expect(diagnostic).toMatchObject({ code: "SEM003", line: 2, column: 1, endLine: 2, endColumn: 8 });
  });

  it("accepts the arrow assignment symbol", () => {
    expect(tokenize("X ← 1").tokens[1]).toMatchObject({ type: "ASSIGN", lexeme: "←" });
    expect(codes("DECLARE X : INTEGER\nX ← 1")).toEqual([]);
  });

  it("reads string and char literals", () => {
    const { tokens, diagnostics } = tokenize(`"é😀 x" 'a' "" `);
    expect(diagnostics).toEqual([]);
    expect(tokens.slice(0, 3).map((t) => [t.type, t.lexeme])).toEqual([
      ["STRING_LITERAL", '"é😀 x"'],
      ["CHAR_LITERAL", "'a'"],
      ["STRING_LITERAL", '""'],
    ]);
  });

  it("maps typographic quotes to plain quotes", () => {
    expect(codes("OUTPUT “hello”, ‘a’")).toEqual([]);
    expect(firstOutput("OUTPUT “hello”")).toMatchObject({ kind: "literal", value: "hello" });
  });

  it("reports unterminated strings and chars with inclusive end columns", () => {
    expect(compile(`OUTPUT "abc`).diagnostics).toEqual([
      expect.objectContaining({ code: "SYN008", line: 1, column: 8, endLine: 1, endColumn: 11 }),
    ]);
    expect(compile("OUTPUT 'a\r\nOUTPUT 1").diagnostics).toEqual([
      expect.objectContaining({ code: "SYN009", line: 1, column: 8, endColumn: 9 }),
    ]);
  });

  it("requires CHAR literals to hold exactly one character", () => {
    expect(codes(`DECLARE C : CHAR\nC <- 'ab'`)).toEqual(["SYN082"]);
    expect(codes(`DECLARE C : CHAR\nC <- ''`)).toEqual(["SYN082"]);
    expect(codes(`DECLARE C : CHAR\nC <- '😀'`)).toEqual([]);
  });

  it("ignores comments", () => {
    expect(codes(`// heading\nDECLARE X : INTEGER // trailing @#!\nX <- 1 // done`)).toEqual([]);
  });

  it("merges runs of unexpected characters", () => {
    expect(compile("OUTPUT 1 @@@ 2").diagnostics.filter((d) => d.code === "SYN002")).toEqual([
      expect.objectContaining({ message: 'Unexpected characters "@@@".', column: 10, endColumn: 12 }),
    ]);
    expect(compile("X <- 1 $").diagnostics[0]).toMatchObject({ code: "SYN002", message: 'Unexpected character "$".' });
  });
});

describe("precedence and associativity", () => {
  it.each([
    ["OUTPUT -2 ^ 2", "(- (2 ^ 2))"],
    ["OUTPUT -2 * 3", "((- 2) * 3)"],
    ["OUTPUT 2 ^ -1", "(2 ^ (- 1))"],
    ["OUTPUT 2 ^ 3 ^ 2", "(2 ^ (3 ^ 2))"],
    ["OUTPUT 1 - 2 - 3", "((1 - 2) - 3)"],
    ["OUTPUT 1 + 2 * 3", "(1 + (2 * 3))"],
    ["OUTPUT A OR B AND C", "(A OR (B AND C))"],
    ["OUTPUT NOT A = B", "((NOT A) = B)"],
    ["OUTPUT A + 1 > B AND C", "(((A + 1) > B) AND C)"],
  ])("%s", (source, expected) => {
    expect(show(firstOutput(source))).toBe(expected);
  });
});

describe("CASE", () => {
  const program = (clauses: string) => `DECLARE X : INTEGER\nX <- 1\nCASE OF X\n${clauses}\nENDCASE`;

  it("accepts clauses with an optional colon after OTHERWISE", () => {
    expect(codes(program(`  1 : OUTPUT "a"\n  2 : OUTPUT "b"\n  OTHERWISE : OUTPUT "other"`))).toEqual([]);
    expect(codes(program(`  1 : OUTPUT "a"\n  OTHERWISE OUTPUT "other"`))).toEqual([]);
  });

  it("requires OTHERWISE to be the single last clause", () => {
    expect(codes(program(`  OTHERWISE OUTPUT "x"\n  1 : OUTPUT "a"`))).toEqual(["SYN080"]);
    expect(codes(program(`  OTHERWISE OUTPUT "x"\n  OTHERWISE OUTPUT "y"`))).toEqual(["SYN080"]);
  });

  it("checks clause values against the CASE expression type", () => {
    expect(codes(program(`  "a" : OUTPUT "a"\n  TRUE : OUTPUT "b"\n  2.5 : OUTPUT "c"`))).toEqual(["SEM031", "SEM031"]);
    expect(codes(`DECLARE C : CHAR\nC <- 'a'\nCASE OF C\n  'a' : OUTPUT 1\n  "b" : OUTPUT 2\nENDCASE`)).toEqual([]);
  });

  it("reports only the missing ENDCASE when a block closes first", () => {
    expect(codes(`DECLARE X : INTEGER\nIF TRUE THEN\n  CASE OF X\n    1 : OUTPUT 1\nENDIF`)).toEqual(["SYN022"]);
  });

  it("requires the clause statement on the same line", () => {
    expect(codes(program(`  1 :\n    OUTPUT "a"`))).toContain("SYN023");
  });
});

describe("functions and return paths", () => {
  const fn = (body: string) => `FUNCTION F(N : INTEGER) RETURNS INTEGER\n${body}\nENDFUNCTION\nOUTPUT F(1)`;

  it("accepts a RETURN in both IF branches", () => {
    expect(codes(`FUNCTION Max(A : INTEGER, B : INTEGER) RETURNS INTEGER
    IF A > B
      THEN
        RETURN A
      ELSE
        RETURN B
    ENDIF
ENDFUNCTION
OUTPUT Max(1, 2)`)).toEqual([]);
  });

  it.each([
    ["a top-level RETURN", "RETURN N"],
    ["a RETURN after an IF", "IF N > 1 THEN\n  OUTPUT N\nENDIF\nRETURN N"],
    ["nested IFs that all return", "IF N > 1 THEN\n  IF N > 2 THEN\n    RETURN 2\n  ELSE\n    RETURN 1\n  ENDIF\nELSE\n  RETURN 0\nENDIF"],
    ["a CASE with OTHERWISE where every clause returns", "CASE OF N\n  1 : RETURN 10\n  OTHERWISE RETURN 0\nENDCASE"],
    ["WHILE TRUE", "WHILE TRUE DO\n  RETURN N\nENDWHILE"],
  ])("accepts %s", (_name, body) => {
    expect(codes(fn(body))).toEqual([]);
  });

  it.each([
    ["no RETURN", "OUTPUT N"],
    ["an IF without ELSE", "IF N > 1 THEN\n  RETURN 1\nENDIF"],
    ["an ELSE branch that does not return", "IF N > 1 THEN\n  RETURN 1\nELSE\n  OUTPUT N\nENDIF"],
    ["a CASE without OTHERWISE", "CASE OF N\n  1 : RETURN 10\nENDCASE"],
    ["a CASE clause that does not return", "CASE OF N\n  1 : OUTPUT 10\n  OTHERWISE RETURN 0\nENDCASE"],
    ["a RETURN only inside FOR", "DECLARE I : INTEGER\nFOR I <- 1 TO 3\n  RETURN I\nNEXT I"],
    ["a RETURN only inside a conditional WHILE", "WHILE N > 0 DO\n  RETURN N\nENDWHILE"],
  ])("reports SEM011 once for %s", (_name, body) => {
    expect(codes(fn(body))).toEqual(["SEM011"]);
  });

  it("checks RETURN placement and type", () => {
    expect(codes(`PROCEDURE P()\n  RETURN 1\nENDPROCEDURE`)).toEqual(["SEM013"]);
    expect(codes(fn(`RETURN "text"`))).toEqual(["SEM014"]);
  });

  it("reports routines defined outside the top level", () => {
    expect(codes(`IF TRUE THEN\n  PROCEDURE Hello()\n    OUTPUT "hi"\n  ENDPROCEDURE\nENDIF`)).toEqual(["SYN078"]);
    expect(codes(`PROCEDURE A()\n  FUNCTION B() RETURNS INTEGER\n    RETURN 1\n  ENDFUNCTION\nENDPROCEDURE`)).toEqual(["SYN078"]);
    expect(codes(`DECLARE X : INTEGER\nCASE OF X\n  1 : PROCEDURE P()\nENDPROCEDURE\nENDCASE`)).toContain("SYN078");
  });
});

describe("procedure calls", () => {
  const proc = `PROCEDURE Show(Name : STRING, Count : INTEGER)\n  OUTPUT Name, Count\nENDPROCEDURE\n`;

  it("accepts matching arguments, including CHAR for STRING", () => {
    expect(codes(`${proc}CALL Show("a", 1)\nCALL Show('b', 2)`)).toEqual([]);
  });

  it("checks argument count and types", () => {
    expect(codes(`${proc}CALL Show("a")`)).toEqual(["SEM017"]);
    expect(codes(`${proc}CALL Show(1, "a")`)).toEqual(["SEM018", "SEM018"]);
    expect(codes(`CALL Missing()`)).toEqual(["SEM012"]);
  });

  it("reports duplicate routines and parameters", () => {
    expect(codes(`PROCEDURE P()\nENDPROCEDURE\nPROCEDURE P()\nENDPROCEDURE`)).toEqual(["SEM001"]);
    expect(codes(`PROCEDURE P(A : INTEGER, A : INTEGER)\nENDPROCEDURE`)).toEqual(["SEM010"]);
  });
});

describe("scope", () => {
  it("keeps a variable declared in an IF visible after ENDIF", () => {
    expect(codes(`DECLARE Flag : BOOLEAN
Flag <- TRUE
IF Flag
  THEN
    DECLARE X : INTEGER
    X <- 1
ENDIF
X <- 2
OUTPUT X`)).toEqual([]);
  });

  it("reports a redeclaration inside an IF as SEM002", () => {
    expect(codes(`DECLARE X : INTEGER\nIF TRUE THEN\n  DECLARE X : STRING\nENDIF`)).toEqual(["SEM002"]);
    expect(codes(`PROCEDURE P()\n  DECLARE Y : INTEGER\n  WHILE TRUE DO\n    DECLARE Y : INTEGER\n  ENDWHILE\nENDPROCEDURE`)).toEqual(["SEM002"]);
  });

  it("lets routines use top-level declarations", () => {
    expect(codes(`DECLARE Total : INTEGER\nPROCEDURE Show()\n  OUTPUT Total\nENDPROCEDURE\nTotal <- 5\nCALL Show()`)).toEqual([]);
    expect(codes(`PROCEDURE Show()\n  OUTPUT Total\nENDPROCEDURE\nDECLARE Total : INTEGER\nTotal <- 5\nCALL Show()`)).toEqual([]);
  });

  it("keeps routine locals and parameters out of the main program", () => {
    expect(codes(`PROCEDURE P(A : INTEGER)\n  DECLARE B : INTEGER\nENDPROCEDURE\nOUTPUT A\nOUTPUT B`)).toEqual(["SEM019", "SEM019"]);
  });

  it("lets a routine local share a name with a global", () => {
    expect(codes(`DECLARE X : INTEGER\nPROCEDURE P()\n  DECLARE X : STRING\n  X <- "a"\nENDPROCEDURE`)).toEqual([]);
  });

  it("still requires declaration before use in the main program", () => {
    expect(codes(`X <- 1\nDECLARE X : INTEGER`)).toEqual(["SEM019"]);
  });
});

describe("types", () => {
  it("accepts CHAR where STRING is expected", () => {
    expect(codes(`DECLARE C : CHAR\nDECLARE S : STRING\nC <- 'a'\nS <- C\nOUTPUT LCASE('W'), UCASE(C), LENGTH(C)`)).toEqual([]);
    expect(codes(`DECLARE C : CHAR\nC <- "a"`)).toEqual(["SEM003"]);
  });

  it("allows ROUND with 0 places to be stored in an INTEGER", () => {
    expect(codes(`DECLARE Value : INTEGER\nValue <- ROUND(RANDOM() * 6, 0)`)).toEqual([]);
    expect(codes(`FUNCTION F() RETURNS INTEGER\n  RETURN ROUND(2.5, 0)\nENDFUNCTION`)).toEqual([]);
    expect(codes(`DECLARE Value : INTEGER\nValue <- ROUND(2.25, 1)`)).toEqual(["SEM003"]);
    expect(codes(`DECLARE Value : INTEGER\nValue <- ROUND(2.5, 0) + 1`)).toEqual(["SEM003"]);
  });

  it("requires CONSTANT values to be literals", () => {
    expect(codes(`CONSTANT Max <- 2 + 3`)).toEqual(["SEM032"]);
    expect(codes(`CONSTANT Low <- -5\nCONSTANT Rate <- -2.5\nCONSTANT Name <- "A"\nCONSTANT Letter <- 'c'\nCONSTANT On <- TRUE
DECLARE I : INTEGER\nFOR I <- Low TO 5\nNEXT I`)).toEqual([]);
    expect(codes(`CONSTANT A <- 1\nCONSTANT B <- A`)).toEqual(["SEM032"]);
  });

  it("requires INTEGER FOR start, end and STEP values", () => {
    expect(codes(`DECLARE I : INTEGER\nFOR I <- 1.5 TO 3.5 STEP 0.5\nNEXT I`)).toEqual(["SEM007", "SEM007", "SEM007"]);
    expect(codes(`DECLARE I : INTEGER\nFOR I <- 10 TO 1 STEP -1\nNEXT I`)).toEqual([]);
    expect(codes(`DECLARE R : REAL\nFOR R <- 1 TO 3\nNEXT R`)).toEqual(["SEM006"]);
  });

  it("rejects routines used as values or assignment targets", () => {
    const routines = `FUNCTION F() RETURNS INTEGER\n  RETURN 1\nENDFUNCTION\nPROCEDURE P()\nENDPROCEDURE\nDECLARE X : INTEGER\n`;
    expect(codes(`${routines}F <- 3`)).toEqual(["SEM029"]);
    expect(codes(`${routines}X <- F`)).toEqual(["SEM029"]);
    expect(codes(`${routines}X <- P`)).toEqual(["SEM029"]);
    expect(codes(`${routines}INPUT F`)).toEqual(["SEM029"]);
    expect(codes(`${routines}X <- F()`)).toEqual([]);
  });

  it("type-checks comparisons", () => {
    expect(codes(`IF "abc" > 5 THEN\n  OUTPUT "x"\nENDIF`)).toEqual(["SEM030"]);
    expect(codes(`IF TRUE = 1 THEN\n  OUTPUT "x"\nENDIF`)).toEqual(["SEM030"]);
    expect(codes(`IF TRUE < FALSE THEN\n  OUTPUT "x"\nENDIF`)).toEqual(["SEM030"]);
    expect(codes(`IF TRUE <> FALSE AND 'a' = "a" AND 1 < 1.5 AND "a" <= "b" THEN\n  OUTPUT "x"\nENDIF`)).toEqual([]);
  });

  it("range-checks integer literals", () => {
    const [diagnostic] = compile(`DECLARE X : INTEGER\nX <- 99999999999999999999`).diagnostics;
    expect(diagnostic).toMatchObject({ code: "SYN079", line: 2, column: 6, endColumn: 25 });
    expect(diagnostic.message).toContain("too large");
    expect(codes(`DECLARE X : INTEGER\nX <- 9007199254740991`)).toEqual([]);
    expect(codes(`DECLARE A : ARRAY[1:99999999999999999999] OF INTEGER`)).toEqual(["SYN079"]);
  });

  it("requires ARRAY lower bounds not to exceed upper bounds", () => {
    expect(compile(`DECLARE A : ARRAY[10:1] OF INTEGER`).diagnostics).toEqual([
      expect.objectContaining({ code: "SYN081", column: 19, endColumn: 22 }),
    ]);
    expect(codes(`DECLARE A : ARRAY[-3:-3, 0:2] OF INTEGER`)).toEqual([]);
  });

  it("rejects CONSTANT loop iterators and assignment", () => {
    expect(codes(`CONSTANT I <- 1\nFOR I <- 1 TO 3\nNEXT I`)).toEqual(["SEM025"]);
    expect(codes(`CONSTANT K <- 1\nK <- 2`)).toEqual(["SEM025"]);
  });
});

describe("diagnostic quality", () => {
  it("reports one error for an unknown data type", () => {
    expect(codes(`DECLARE X : Foo`)).toEqual(["SYN069"]);
    expect(codes(`FUNCTION F() RETURNS Foo\n  RETURN 1\nENDFUNCTION`)).toEqual(["SYN041"]);
    expect(codes(`DECLARE A : ARRAY[1:3] OF Foo`)).toEqual(["SYN067"]);
  });

  it("does not invent an iterator name for a FOR without one", () => {
    const result = compile(`FOR <- 1 TO 3\nNEXT`);
    expect(result.diagnostics.map((d) => d.code)).toEqual(["SYN076"]);
    expect(result.diagnostics.some((d) => d.message.includes("InvalidIterator"))).toBe(false);
  });

  it("reports an undeclared file identifier once", () => {
    expect(codes(`OPENFILE Missing FOR READ`)).toEqual(["SEM019"]);
  });

  it("blames the missing operand, not the next line", () => {
    const result = compile(`DECLARE X : INTEGER\nIF X > THEN\n  OUTPUT X\nENDIF`);
    expect(result.diagnostics).toEqual([expect.objectContaining({ code: "SYN060", line: 2, column: 8 })]);
  });

  it("skips semantic checks when there are syntax errors", () => {
    expect(codes(`DECLARE X : INTEGER\nX <- "a"\nOUTPUT (`)).toEqual(["SYN059", "SYN060"]);
  });

  it("does not cascade from UNKNOWN operands", () => {
    expect(codes(`DECLARE X : INTEGER\nX <- -Y + 1\nIF NOT Z THEN\n  OUTPUT 1\nENDIF`)).toEqual(["SEM019", "SEM019"]);
    expect(codes(`DECLARE I : INTEGER\nFOR I <- 1 TO Missing\nNEXT I`)).toEqual(["SEM019"]);
  });

  it("says a mixed-case keyword is a reserved word when used as a name", () => {
    const result = compile(`DECLARE Length : INTEGER\nLength <- 3`);
    expect(result.diagnostics.map((d) => [d.code, d.message])).toEqual([
      ["SYN077", '"Length" is a reserved word and can\'t be used as an identifier.'],
      ["SYN077", '"Length" is a reserved word and can\'t be used as an identifier.'],
    ]);
  });

  it("still requires uppercase keywords", () => {
    expect(codes(`declare X : integer`)).toEqual(["SYN001", "SYN001"]);
  });

  it("points at the offending source", () => {
    expect(compile(`Value <- 7`).diagnostics[0]).toMatchObject({ line: 1, column: 1, endLine: 1, endColumn: 5 });
    expect(compile(`DECLARE X : INTEGER\nX <- TRUE`).diagnostics[0]).toMatchObject({ line: 2, column: 1, endColumn: 9 });
  });

  it("recovers and reports independent errors on later lines", () => {
    expect(codes(`DECLARE I : INTEGER
FOR I <- 1 TO 3
  IF I > 1 THEN
    OUTPUT I
NEXT I
OUTPUT "done"`)).toContain("SYN018");
    expect(codes(`OUTPUT )\nDECLARE : INTEGER\nOUTPUT 1`)).toEqual(["SYN060", "SYN076"]);
  });
});

describe("limits", () => {
  it("merges and caps diagnostics for pasted junk", () => {
    const start = Date.now();
    const result = compile("@".repeat(255 * 1024));
    expect(Date.now() - start).toBeLessThan(1000);
    expect(result.diagnostics.length).toBeLessThan(201);

    const spaced = compile("@ ".repeat(100 * 1024));
    expect(spaced.success).toBe(false);
    expect(spaced.diagnostics).toHaveLength(200);
    expect(spaced.diagnostics[199]).toMatchObject({ code: "CMP429" });
  });

  it("measures the size limit in UTF-8 bytes", () => {
    expect(codes(`OUTPUT "${"é".repeat(130 * 1024)}"`)).toEqual(["CMP413"]);
    expect(codes(`OUTPUT "${"a".repeat(250 * 1024)}"`)).toEqual([]);
  });

  it("reports deep prefix operator chains instead of overflowing", () => {
    expect(codes(`DECLARE X : INTEGER\nX <- ${"-".repeat(100000)}1`)).toEqual(["SYN099"]);
    expect(codes(`DECLARE X : BOOLEAN\nX <- ${"NOT ".repeat(50000)}TRUE`)).toEqual(["SYN099"]);
    expect(() => parseSource(`X <- ${"-".repeat(100000)}1`)).not.toThrow();
  });

  it("limits block nesting", () => {
    const nest = (n: number) => `${"IF TRUE THEN\n".repeat(n)}OUTPUT 1\n${"ENDIF\n".repeat(n)}`;
    expect(codes(nest(150))).toEqual([]);
    expect(codes(nest(250))).toEqual(["SYN099"]);
    expect(codes(`OUTPUT ${"(".repeat(300)}1${")".repeat(300)}`)).toEqual(["SYN099"]);
  });
});
