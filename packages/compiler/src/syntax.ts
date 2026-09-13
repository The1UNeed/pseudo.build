import type { BasicTypeName, FunctionSignature, StaticType } from "./types";

export type SyntaxId =
  | "cambridge-igcse"
  | "cambridge-alevel"
  | "ib-dp"
  | "ocr-gcse"
  | "aqa-gcse";

export type KeywordCase = "upper" | "lower" | "any";

const INTEGER: StaticType = { kind: "basic", name: "INTEGER" };
const REAL: StaticType = { kind: "basic", name: "REAL" };
const STRING: StaticType = { kind: "basic", name: "STRING" };
const UNKNOWN: StaticType = { kind: "unknown" };

function fn(
  name: string,
  params: StaticType[],
  returnType: StaticType,
): FunctionSignature {
  return { name, params, returnType };
}

export interface SyntaxDefinition {
  id: SyntaxId;
  label: string;
  shortLabel: string;
  board: string;
  syllabus: string;
  description: string;
  keywordCase: KeywordCase;
  keywords: ReadonlySet<string>;
  comments: ReadonlyArray<"//" | "#">;
  assignmentEquals: boolean;
  equalityDoubleEquals: boolean;
  whileRequiresDo: boolean;
  requireDeclarations: boolean;
  allowUntypedParams: boolean;
  allowCallWithoutKeyword: boolean;
  identifierUnderscore: boolean;
  forCloser: "NEXT" | "ENDFOR" | "ENDLOOP";
  sampleSource: string;
  builtins: Record<string, FunctionSignature>;
  canonicalCallNames: Record<string, string>;
}

const CAMBRIDGE_KEYWORDS = [
  "DECLARE",
  "CONSTANT",
  "ARRAY",
  "OF",
  "INTEGER",
  "REAL",
  "CHAR",
  "STRING",
  "BOOLEAN",
  "DATE",
  "INPUT",
  "OUTPUT",
  "IF",
  "THEN",
  "ELSE",
  "ELSEIF",
  "ENDIF",
  "CASE",
  "OTHERWISE",
  "ENDCASE",
  "FOR",
  "TO",
  "STEP",
  "NEXT",
  "REPEAT",
  "UNTIL",
  "WHILE",
  "DO",
  "ENDWHILE",
  "PROCEDURE",
  "ENDPROCEDURE",
  "FUNCTION",
  "RETURNS",
  "ENDFUNCTION",
  "CALL",
  "RETURN",
  "OPENFILE",
  "READFILE",
  "WRITEFILE",
  "CLOSEFILE",
  "READ",
  "WRITE",
  "APPEND",
  "BYREF",
  "BYVAL",
  "TRUE",
  "FALSE",
  "AND",
  "OR",
  "NOT",
  "DIV",
  "MOD",
  "LENGTH",
  "LCASE",
  "UCASE",
  "SUBSTRING",
  "ROUND",
  "RANDOM",
  "RAND",
  "LEFT",
  "RIGHT",
  "MID",
  "INT",
  "ASC",
  "CHR",
] as const;

const CAMBRIDGE_BUILTINS: Record<string, FunctionSignature> = {
  DIV: fn("DIV", [INTEGER, INTEGER], INTEGER),
  MOD: fn("MOD", [INTEGER, INTEGER], INTEGER),
  LENGTH: fn("LENGTH", [STRING], INTEGER),
  LCASE: fn("LCASE", [STRING], STRING),
  UCASE: fn("UCASE", [STRING], STRING),
  SUBSTRING: fn("SUBSTRING", [STRING, INTEGER, INTEGER], STRING),
  ROUND: fn("ROUND", [REAL, INTEGER], REAL),
  RANDOM: fn("RANDOM", [], REAL),
};

const ALEVEL_BUILTINS: Record<string, FunctionSignature> = {
  ...CAMBRIDGE_BUILTINS,
  RAND: fn("RAND", [INTEGER], INTEGER),
  LEFT: fn("LEFT", [STRING, INTEGER], STRING),
  RIGHT: fn("RIGHT", [STRING, INTEGER], STRING),
  MID: fn("MID", [STRING, INTEGER, INTEGER], STRING),
  INT: fn("INT", [UNKNOWN], INTEGER),
  ASC: fn("ASC", [STRING], INTEGER),
  CHR: fn("CHR", [INTEGER], STRING),
};

const IB_KEYWORDS = [
  "IF",
  "THEN",
  "ELSE",
  "END",
  "LOOP",
  "WHILE",
  "UNTIL",
  "FROM",
  "TO",
  "TIMES",
  "OUTPUT",
  "INPUT",
  "AND",
  "OR",
  "NOT",
  "TRUE",
  "FALSE",
  "MOD",
  "DIV",
  "RETURN",
  "FUNCTION",
  "PROCEDURE",
  "ENDFUNCTION",
  "ENDPROCEDURE",
  "CALL",
  "ARRAY",
  "OF",
  "INTEGER",
  "REAL",
  "CHAR",
  "STRING",
  "BOOLEAN",
] as const;

const OCR_KEYWORDS = [
  "IF",
  "THEN",
  "ELSE",
  "ELSEIF",
  "ENDIF",
  "FOR",
  "TO",
  "NEXT",
  "STEP",
  "WHILE",
  "ENDWHILE",
  "DO",
  "UNTIL",
  "SWITCH",
  "CASE",
  "DEFAULT",
  "ENDSWITCH",
  "PRINT",
  "INPUT",
  "FUNCTION",
  "PROCEDURE",
  "ENDFUNCTION",
  "ENDPROCEDURE",
  "RETURN",
  "GLOBAL",
  "AND",
  "OR",
  "NOT",
  "TRUE",
  "FALSE",
  "DIV",
  "MOD",
  "INT",
  "STR",
  "FLOAT",
  "LEN",
  "ARRAY",
  "OF",
  "INTEGER",
  "REAL",
  "CHAR",
  "STRING",
  "BOOLEAN",
] as const;

const AQA_KEYWORDS = [
  "IF",
  "THEN",
  "ELSE",
  "ELSEIF",
  "ENDIF",
  "FOR",
  "TO",
  "STEP",
  "ENDFOR",
  "WHILE",
  "ENDWHILE",
  "REPEAT",
  "UNTIL",
  "OUTPUT",
  "USERINPUT",
  "CONSTANT",
  "DECLARE",
  "ARRAY",
  "OF",
  "SUBROUTINE",
  "ENDSUBROUTINE",
  "FUNCTION",
  "ENDFUNCTION",
  "PROCEDURE",
  "ENDPROCEDURE",
  "RETURNS",
  "RETURN",
  "AND",
  "OR",
  "NOT",
  "TRUE",
  "FALSE",
  "DIV",
  "MOD",
  "LEN",
  "POSITION",
  "SUBSTRING",
  "INTEGER",
  "REAL",
  "CHAR",
  "STRING",
  "BOOLEAN",
] as const;

const SHARED_EXTRA_BUILTINS: Record<string, FunctionSignature> = {
  INT: fn("INT", [UNKNOWN], INTEGER),
  STR: fn("STR", [UNKNOWN], STRING),
  FLOAT: fn("FLOAT", [UNKNOWN], REAL),
  LEN: fn("LENGTH", [STRING], INTEGER),
  RAND: fn("RAND", [INTEGER], INTEGER),
  LEFT: fn("LEFT", [STRING, INTEGER], STRING),
  RIGHT: fn("RIGHT", [STRING, INTEGER], STRING),
  MID: fn("MID", [STRING, INTEGER, INTEGER], STRING),
  ASC: fn("ASC", [STRING], INTEGER),
  CHR: fn("CHR", [INTEGER], STRING),
  POSITION: fn("POSITION", [STRING, STRING], INTEGER),
};

function keywordSet(words: readonly string[]): ReadonlySet<string> {
  return new Set(words);
}

export const SYNTAX_CATALOG: Record<SyntaxId, SyntaxDefinition> = {
  "cambridge-igcse": {
    id: "cambridge-igcse",
    label: "Cambridge IGCSE",
    shortLabel: "IGCSE",
    board: "Cambridge International",
    syllabus: "0478 / 0984",
    description: "DECLARE, <-, OUTPUT, ENDIF, NEXT. Matches the IGCSE Computer Science pseudocode guide.",
    keywordCase: "upper",
    keywords: keywordSet(CAMBRIDGE_KEYWORDS),
    comments: ["//"],
    assignmentEquals: false,
    equalityDoubleEquals: false,
    whileRequiresDo: true,
    requireDeclarations: true,
    allowUntypedParams: false,
    allowCallWithoutKeyword: false,
    identifierUnderscore: false,
    forCloser: "NEXT",
    sampleSource: `DECLARE Number : INTEGER
DECLARE Total : INTEGER

FOR Number <- 1 TO 5
    Total <- Total + Number
NEXT Number

OUTPUT "Total = ", Total`,
    builtins: CAMBRIDGE_BUILTINS,
    canonicalCallNames: {},
  },
  "cambridge-alevel": {
    id: "cambridge-alevel",
    label: "Cambridge AS & A Level",
    shortLabel: "A Level",
    board: "Cambridge International",
    syllabus: "9618",
    description: "IGCSE-style syntax plus DATE, RAND, LEFT/RIGHT/MID, INT, ASC/CHR, & concatenation, and APPEND files.",
    keywordCase: "upper",
    keywords: keywordSet(CAMBRIDGE_KEYWORDS),
    comments: ["//"],
    assignmentEquals: false,
    equalityDoubleEquals: false,
    whileRequiresDo: true,
    requireDeclarations: true,
    allowUntypedParams: false,
    allowCallWithoutKeyword: false,
    identifierUnderscore: false,
    forCloser: "NEXT",
    sampleSource: `DECLARE Number : INTEGER
DECLARE Total : INTEGER
DECLARE Sample : INTEGER

Total <- 0
FOR Number <- 1 TO 5
    Total <- Total + Number
NEXT Number

Sample <- RAND(10)
OUTPUT "Total = " & Total
OUTPUT "Sample = ", Sample`,
    builtins: ALEVEL_BUILTINS,
    canonicalCallNames: {},
  },
  "ib-dp": {
    id: "ib-dp",
    label: "IB Diploma Programme",
    shortLabel: "IB",
    board: "International Baccalaureate",
    syllabus: "Computer Science SL/HL",
    description: "Lowercase keywords, = assignment, loop while/from/times, end if, and 0-based arrays from the IB approved notation.",
    keywordCase: "lower",
    keywords: keywordSet(IB_KEYWORDS),
    comments: ["//"],
    assignmentEquals: true,
    equalityDoubleEquals: false,
    whileRequiresDo: false,
    requireDeclarations: false,
    allowUntypedParams: true,
    allowCallWithoutKeyword: true,
    identifierUnderscore: true,
    forCloser: "ENDLOOP",
    sampleSource: `N = 0
loop COUNT from 1 to 5
    N = N + COUNT
end loop
output "Total = ", N`,
    builtins: {
      ...CAMBRIDGE_BUILTINS,
      ...SHARED_EXTRA_BUILTINS,
    },
    canonicalCallNames: {
      LEN: "LENGTH",
    },
  },
  "ocr-gcse": {
    id: "ocr-gcse",
    label: "OCR GCSE",
    shortLabel: "OCR",
    board: "OCR",
    syllabus: "J277",
    description: "Exam reference language: print/input, = and ==, elseif, for/next, while/endwhile, switch, and Python-like methods.",
    keywordCase: "lower",
    keywords: keywordSet(OCR_KEYWORDS),
    comments: ["//", "#"],
    assignmentEquals: true,
    equalityDoubleEquals: true,
    whileRequiresDo: false,
    requireDeclarations: false,
    allowUntypedParams: true,
    allowCallWithoutKeyword: true,
    identifierUnderscore: true,
    forCloser: "NEXT",
    sampleSource: `total = 0
for number = 1 to 5
    total = total + number
next number
print("Total = " + str(total))`,
    builtins: {
      ...CAMBRIDGE_BUILTINS,
      ...SHARED_EXTRA_BUILTINS,
    },
    canonicalCallNames: {
      LEN: "LENGTH",
      STR: "STR",
      INT: "INT",
      FLOAT: "FLOAT",
    },
  },
  "aqa-gcse": {
    id: "aqa-gcse",
    label: "AQA GCSE",
    shortLabel: "AQA",
    board: "AQA",
    syllabus: "8525",
    description: "AQA pseudo-code: <-, OUTPUT, USERINPUT, ENDFOR, ENDWHILE, # comments, and LEN/POSITION/SUBSTRING.",
    keywordCase: "any",
    keywords: keywordSet(AQA_KEYWORDS),
    comments: ["#", "//"],
    assignmentEquals: false,
    equalityDoubleEquals: false,
    whileRequiresDo: false,
    requireDeclarations: false,
    allowUntypedParams: true,
    allowCallWithoutKeyword: true,
    identifierUnderscore: true,
    forCloser: "ENDFOR",
    sampleSource: `total ← 0
FOR number ← 1 TO 5
    total ← total + number
ENDFOR
OUTPUT "Total = "
OUTPUT total`,
    builtins: {
      ...CAMBRIDGE_BUILTINS,
      ...SHARED_EXTRA_BUILTINS,
      LEN: fn("LENGTH", [STRING], INTEGER),
      POSITION: fn("POSITION", [STRING, STRING], INTEGER),
    },
    canonicalCallNames: {
      LEN: "LENGTH",
    },
  },
};

export const SYNTAX_OPTIONS: SyntaxDefinition[] = [
  SYNTAX_CATALOG["cambridge-igcse"],
  SYNTAX_CATALOG["cambridge-alevel"],
  SYNTAX_CATALOG["ib-dp"],
  SYNTAX_CATALOG["ocr-gcse"],
  SYNTAX_CATALOG["aqa-gcse"],
];

export const DEFAULT_SYNTAX_ID: SyntaxId = "cambridge-igcse";

export function isSyntaxId(value: unknown): value is SyntaxId {
  return typeof value === "string" && value in SYNTAX_CATALOG;
}

export function resolveSyntax(id?: string | null): SyntaxDefinition {
  if (isSyntaxId(id)) {
    return SYNTAX_CATALOG[id];
  }
  return SYNTAX_CATALOG[DEFAULT_SYNTAX_ID];
}

export function displayKeyword(syntax: SyntaxDefinition, keyword: string): string {
  if (syntax.keywordCase === "lower") {
    return keyword.toLowerCase();
  }
  return keyword.toUpperCase();
}

export const BASIC_TYPE_NAMES = new Set<BasicTypeName>([
  "INTEGER",
  "REAL",
  "CHAR",
  "STRING",
  "BOOLEAN",
]);
