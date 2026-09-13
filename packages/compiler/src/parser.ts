import {
  ArrayAccessNode,
  BasicTypeName,
  Diagnostic,
  ExpressionNode,
  FunctionDefinitionNode,
  IdentifierNode,
  LiteralNode,
  ParameterNode,
  ProgramNode,
  SourceSpan,
  StatementNode,
  TypeNode,
} from "./types";
import { BASIC_TYPE_NAMES, DEFAULT_SYNTAX_ID, resolveSyntax, type SyntaxDefinition } from "./syntax";
import { Token, tokenize } from "./tokenizer";

const METHOD_ALIASES: Record<string, string> = {
  UPPER: "UCASE",
  TOUPPER: "UCASE",
  TOUPPERCASE: "UCASE",
  LOWER: "LCASE",
  TOLOWER: "LCASE",
  TOLOWERCASE: "LCASE",
  LENGTH: "LENGTH",
  LEN: "LENGTH",
  SUBSTRING: "SUBSTRING",
  SUBSTR: "SUBSTRING",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
};

type BinaryOp = {
  precedence: number;
  rightAssociative?: boolean;
};

const BINARY_OPERATORS: Record<string, BinaryOp> = {
  OR: { precedence: 1 },
  AND: { precedence: 2 },
  "=": { precedence: 3 },
  "<": { precedence: 3 },
  "<=": { precedence: 3 },
  ">": { precedence: 3 },
  ">=": { precedence: 3 },
  "<>": { precedence: 3 },
  "+": { precedence: 4 },
  "-": { precedence: 4 },
  "&": { precedence: 4 },
  "*": { precedence: 5 },
  "/": { precedence: 5 },
  DIV: { precedence: 5 },
  MOD: { precedence: 5 },
  "^": { precedence: 6, rightAssociative: true },
};

function spanFrom(start: SourceSpan, end: SourceSpan): SourceSpan {
  return {
    startLine: start.startLine,
    startColumn: start.startColumn,
    endLine: end.endLine,
    endColumn: end.endColumn,
  };
}

function createFallbackSpan(): SourceSpan {
  return { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 };
}

const MAX_NESTING_DEPTH = 200;

class NestingLimitError extends Error {}

class Parser {
  private tokens: Token[];
  private index = 0;
  private depth = 0;
  diagnostics: Diagnostic[];
  private syntax: SyntaxDefinition;

  constructor(tokens: Token[], diagnostics: Diagnostic[], syntax: SyntaxDefinition) {
    this.tokens = tokens;
    this.diagnostics = diagnostics;
    this.syntax = syntax;
  }

  parseProgram(): ProgramNode {
    const start = this.current().span;
    let body: StatementNode[] = [];
    try {
      body = this.parseStatements(new Set(["EOF"]));
    } catch (error) {
      if (!(error instanceof NestingLimitError)) {
        throw error;
      }
      this.error(this.current(), "SYN099", `Program nesting is too deep (limit ${MAX_NESTING_DEPTH} levels).`);
    }
    const end = this.previous().span;
    return {
      kind: "program",
      body,
      span: spanFrom(start, end),
    };
  }

  private enterNesting() {
    this.depth += 1;
    if (this.depth > MAX_NESTING_DEPTH) {
      throw new NestingLimitError();
    }
  }

  private parseStatements(stopKeywords: Set<string>): StatementNode[] {
    this.enterNesting();
    try {
      return this.parseStatementsInner(stopKeywords);
    } finally {
      this.depth -= 1;
    }
  }

  private parseStatementsInner(stopKeywords: Set<string>): StatementNode[] {
    const statements: StatementNode[] = [];
    this.consumeNewlines();

    while (!this.isAtEnd()) {
      const token = this.current();
      if (this.atStop(stopKeywords)) {
        break;
      }
      if (token.type === "EOF") {
        break;
      }

      const statement = this.parseStatement();
      if (statement) {
        statements.push(statement);
      } else {
        this.synchronizeLine();
      }
      this.consumeNewlines();
    }

    return statements;
  }

  private parseStatement(): StatementNode | null {
    const token = this.current();
    if (token.type === "KEYWORD") {
      switch (token.keyword) {
        case "DECLARE":
          return this.parseDeclareStatement();
        case "CONSTANT":
          return this.parseConstantStatement();
        case "GLOBAL":
          this.advance();
          return this.parseStatement();
        case "INPUT":
          return this.parseInputStatement();
        case "OUTPUT":
        case "PRINT":
          return this.parseOutputStatement();
        case "IF":
          return this.parseIfStatement();
        case "CASE":
          return this.parseCaseStatement();
        case "SWITCH":
          return this.parseSwitchStatement();
        case "FOR":
          return this.parseForStatement();
        case "LOOP":
          return this.parseIbLoopStatement();
        case "REPEAT":
          return this.parseRepeatStatement();
        case "DO":
          return this.parseDoStatement();
        case "WHILE":
          return this.parseWhileStatement();
        case "PROCEDURE":
        case "SUBROUTINE":
          return this.parseProcedureDefinition();
        case "FUNCTION":
          return this.parseFunctionDefinition();
        case "CALL":
          return this.parseCallStatement();
        case "RETURN":
          return this.parseReturnStatement();
        case "OPENFILE":
          return this.parseOpenFileStatement();
        case "READFILE":
          return this.parseReadFileStatement();
        case "WRITEFILE":
          return this.parseWriteFileStatement();
        case "CLOSEFILE":
          return this.parseCloseFileStatement();
        default:
          this.error(token, "SYN003", `Unexpected keyword "${token.keyword}".`);
          return null;
      }
    }

    if (token.type === "IDENTIFIER") {
      return this.parseIdentifierStatement();
    }

    this.error(token, "SYN004", "Expected a valid statement.");
    return null;
  }

  private parseDeclareStatement(): StatementNode | null {
    const start = this.expectKeyword("DECLARE", "SYN010");
    const identifier = this.parseIdentifier();
    if (!identifier) {
      return null;
    }

    this.expectType("COLON", "SYN011", "Expected ':' after identifier in DECLARE statement.");
    const typeNode = this.parseTypeNode();
    if (!typeNode) {
      return null;
    }

    return {
      kind: "declare",
      identifier,
      typeNode,
      span: spanFrom(start.span, typeNode.span),
    };
  }

  private parseConstantStatement(): StatementNode | null {
    const start = this.expectKeyword("CONSTANT", "SYN012");
    const identifier = this.parseIdentifier();
    if (!identifier) {
      return null;
    }

    this.expectAssignment("SYN013", "Expected assignment operator in CONSTANT declaration.");
    const value = this.parseExpression();

    return {
      kind: "constant",
      identifier,
      value,
      span: spanFrom(start.span, value.span),
    };
  }

  private parseInputStatement(): StatementNode | null {
    const start = this.expectKeyword("INPUT", "SYN014");
    if (this.matchType("LPAREN")) {
      if (!this.checkType("RPAREN")) {
        this.parseExpression();
      }
      this.expectType("RPAREN", "SYN045", "Expected ')' after INPUT arguments.");
      return {
        kind: "input",
        target: {
          kind: "identifier",
          name: "InputValue",
          span: start.span,
        },
        span: start.span,
      };
    }
    const target = this.parseAssignableTarget();
    if (!target) {
      return null;
    }
    return {
      kind: "input",
      target,
      span: spanFrom(start.span, target.span),
    };
  }

  private parseOutputStatement(): StatementNode {
    const start = this.advance();
    const values: ExpressionNode[] = [];

    if (this.checkType("LPAREN")) {
      values.push(this.parseExpression());
    } else if (!this.checkType("NEWLINE") && !this.isAtEnd() && !this.atStop(new Set(["ELSE", "ENDIF", "END"]))) {
      values.push(this.parseExpression());
      while (this.matchType("COMMA")) {
        values.push(this.parseExpression());
      }
    }

    const endSpan = values.length > 0 ? values[values.length - 1].span : start.span;
    return {
      kind: "output",
      values: values.length > 0 ? values : [this.literalNode(start, "", "STRING")],
      span: spanFrom(start.span, endSpan),
    };
  }

  private parseIfStatement(): StatementNode {
    const start = this.expectKeyword("IF", "SYN016");
    return this.parseIfFromCondition(start);
  }

  private parseIfFromCondition(start: Token): StatementNode {
    const condition = this.parseExpression();
    this.consumeNewlines();
    this.matchKeyword("THEN");
    this.consumeNewlines();

    const thenBody = this.parseStatements(new Set(["ELSE", "ELSEIF", "ENDIF", "END"]));
    let elseBody: StatementNode[] = [];

    if (this.matchKeyword("ELSEIF") || this.matchKeywordSequence("ELSE", "IF")) {
      elseBody = [this.parseIfFromCondition(this.previous())];
    } else if (this.matchKeyword("ELSE")) {
      this.consumeNewlines();
      elseBody = this.parseStatements(new Set(["ENDIF", "END"]));
      this.expectIfEnd();
    } else {
      this.expectIfEnd();
    }

    return {
      kind: "if",
      condition,
      thenBody,
      elseBody,
      span: spanFrom(start.span, this.previous().span),
    };
  }

  private parseCaseStatement(): StatementNode {
    const start = this.expectKeyword("CASE", "SYN019");
    this.matchKeyword("OF");
    const expression = this.parseExpression();
    this.consumeNewlines();

    const clauses: Array<{ value: ExpressionNode | null; statement: StatementNode; span: SourceSpan }> = [];

    while (!this.isAtEnd() && !this.checkKeyword("ENDCASE") && !this.checkKeywordSequence("END", "CASE")) {
      const clauseStart = this.current().span;
      if (this.matchKeyword("OTHERWISE") || this.matchKeyword("DEFAULT")) {
        this.matchType("COLON");
        const statement = this.parseStatementAfterCaseColon();
        if (statement) {
          clauses.push({ value: null, statement, span: spanFrom(clauseStart, statement.span) });
        }
      } else {
        const value = this.parseExpression();
        this.expectType("COLON", "SYN021", "Expected ':' after CASE value.");
        const statement = this.parseStatementAfterCaseColon();
        if (statement) {
          clauses.push({ value, statement, span: spanFrom(clauseStart, statement.span) });
        }
      }
      this.consumeNewlines();
    }

    this.expectKeywordOrSequence("ENDCASE", ["END", "CASE"], "SYN022", "Expected ENDCASE to close CASE statement.");

    return {
      kind: "case",
      expression,
      clauses,
      span: spanFrom(start.span, this.previous().span),
    };
  }

  private parseSwitchStatement(): StatementNode {
    const start = this.expectKeyword("SWITCH", "SYN019");
    const expression = this.parseExpression();
    this.matchType("COLON");
    this.consumeNewlines();

    const clauses: Array<{ value: ExpressionNode | null; statement: StatementNode; span: SourceSpan }> = [];
    while (!this.isAtEnd() && !this.checkKeyword("ENDSWITCH") && !this.checkKeywordSequence("END", "SWITCH")) {
      const clauseStart = this.current().span;
      if (this.matchKeyword("DEFAULT")) {
        this.matchType("COLON");
        const statement = this.parseStatementAfterCaseColon();
        if (statement) {
          clauses.push({ value: null, statement, span: spanFrom(clauseStart, statement.span) });
        }
      } else {
        this.expectKeyword("CASE", "SYN021", "Expected CASE in SWITCH statement.");
        const value = this.parseExpression();
        this.matchType("COLON");
        const statement = this.parseStatementAfterCaseColon();
        if (statement) {
          clauses.push({ value, statement, span: spanFrom(clauseStart, statement.span) });
        }
      }
      this.consumeNewlines();
    }

    this.expectKeywordOrSequence("ENDSWITCH", ["END", "SWITCH"], "SYN022", "Expected ENDSWITCH to close SWITCH statement.");
    return {
      kind: "case",
      expression,
      clauses,
      span: spanFrom(start.span, this.previous().span),
    };
  }

  private parseStatementAfterCaseColon(): StatementNode | null {
    this.consumeNewlines();
    if (this.checkKeyword("CASE") || this.checkKeyword("DEFAULT") || this.checkKeyword("OTHERWISE") || this.checkKeyword("ENDCASE") || this.checkKeyword("ENDSWITCH")) {
      this.error(this.current(), "SYN023", "CASE clause requires a statement.");
      return null;
    }
    return this.parseStatement();
  }

  private parseForStatement(): StatementNode {
    const start = this.expectKeyword("FOR", "SYN024");
    const iterator = this.parseIdentifier() ?? {
      kind: "identifier" as const,
      name: "InvalidIterator",
      span: start.span,
    };

    this.expectAssignment("SYN025", "Expected assignment operator in FOR statement.");
    const startValue = this.parseExpression();
    this.expectKeyword("TO", "SYN026", "Expected TO in FOR statement.");
    const endValue = this.parseExpression();

    let stepValue: ExpressionNode | null = null;
    if (this.matchKeyword("STEP")) {
      stepValue = this.parseExpression();
    }

    this.consumeNewlines();
    const body = this.parseStatements(new Set(["NEXT", "ENDFOR", "END"]));
    this.expectForEnd();

    if (this.current().type === "IDENTIFIER") {
      const closingIterator = this.advance();
      if (closingIterator.lexeme.toLowerCase() !== iterator.name.toLowerCase()) {
        this.error(
          closingIterator,
          "SYN028",
          `Iterator mismatch: expected ${iterator.name} after NEXT, found ${closingIterator.lexeme}.`,
        );
      }
    }

    return {
      kind: "for",
      iterator,
      startValue,
      endValue,
      stepValue,
      body,
      span: spanFrom(start.span, this.previous().span),
    };
  }

  private parseIbLoopStatement(): StatementNode {
    const start = this.expectKeyword("LOOP", "SYN024");

    if (this.matchKeyword("WHILE")) {
      const condition = this.parseExpression();
      this.consumeNewlines();
      const body = this.parseStatements(new Set(["END"]));
      this.expectLoopEnd();
      return {
        kind: "while",
        condition,
        body,
        span: spanFrom(start.span, this.previous().span),
      };
    }

    if (this.matchKeyword("UNTIL")) {
      const condition = this.parseExpression();
      this.consumeNewlines();
      const body = this.parseStatements(new Set(["END"]));
      this.expectLoopEnd();
      return {
        kind: "while",
        condition: {
          kind: "unary",
          operator: "NOT",
          operand: condition,
          span: condition.span,
        },
        body,
        span: spanFrom(start.span, this.previous().span),
      };
    }

    if (this.current().type === "INTEGER_LITERAL" || this.current().type === "IDENTIFIER") {
      const timesToken = this.current();
      const countExpression = this.parseExpression();
      if (this.matchKeyword("TIMES")) {
        this.consumeNewlines();
        const body = this.parseStatements(new Set(["END"]));
        this.expectLoopEnd();
        const iterator: IdentifierNode = {
          kind: "identifier",
          name: "_loop",
          span: timesToken.span,
        };
        return {
          kind: "for",
          iterator,
          startValue: this.integerLiteral(1, timesToken.span),
          endValue: countExpression,
          stepValue: null,
          body,
          span: spanFrom(start.span, this.previous().span),
        };
      }

      const iterator = countExpression.kind === "identifier"
        ? countExpression
        : {
            kind: "identifier" as const,
            name: "COUNT",
            span: timesToken.span,
          };

      this.expectKeyword("FROM", "SYN026", "Expected FROM in loop.");
      const startValue = this.parseExpression();
      this.expectKeyword("TO", "SYN026", "Expected TO in loop.");
      const endValue = this.parseExpression();
      this.consumeNewlines();
      const body = this.parseStatements(new Set(["END"]));
      this.expectLoopEnd();
      return {
        kind: "for",
        iterator,
        startValue,
        endValue,
        stepValue: null,
        body,
        span: spanFrom(start.span, this.previous().span),
      };
    }

    this.error(this.current(), "SYN024", "Expected WHILE, UNTIL, TIMES, or FROM after LOOP.");
    return {
      kind: "while",
      condition: this.literalNode(start, true, "BOOLEAN"),
      body: [],
      span: start.span,
    };
  }

  private parseRepeatStatement(): StatementNode {
    const start = this.expectKeyword("REPEAT", "SYN029");
    this.consumeNewlines();
    const body = this.parseStatements(new Set(["UNTIL"]));
    this.expectKeyword("UNTIL", "SYN030", "Expected UNTIL to close REPEAT loop.");
    const condition = this.parseExpression();

    return {
      kind: "repeat",
      body,
      condition,
      span: spanFrom(start.span, condition.span),
    };
  }

  private parseDoStatement(): StatementNode {
    const start = this.expectKeyword("DO", "SYN029");
    this.consumeNewlines();
    const body = this.parseStatements(new Set(["UNTIL"]));
    this.expectKeyword("UNTIL", "SYN030", "Expected UNTIL to close DO loop.");
    const condition = this.parseExpression();
    return {
      kind: "repeat",
      body,
      condition,
      span: spanFrom(start.span, condition.span),
    };
  }

  private parseWhileStatement(): StatementNode {
    const start = this.expectKeyword("WHILE", "SYN031");
    const condition = this.parseExpression();
    this.consumeNewlines();
    if (this.syntax.whileRequiresDo) {
      this.expectKeyword("DO", "SYN032", "Expected DO in WHILE loop.");
    } else {
      this.matchKeyword("DO");
    }
    this.consumeNewlines();
    const body = this.parseStatements(new Set(["ENDWHILE", "END"]));
    this.expectWhileEnd();

    return {
      kind: "while",
      condition,
      body,
      span: spanFrom(start.span, this.previous().span),
    };
  }

  private parseProcedureDefinition(): StatementNode {
    const start = this.advance();
    const nameToken = this.expectType("IDENTIFIER", "SYN035", "Expected procedure identifier.");
    const params = this.parseParameterList();
    this.consumeNewlines();

    const body = this.parseStatements(new Set(["ENDPROCEDURE", "ENDSUBROUTINE", "END"]));
    this.expectProcedureEnd();

    return {
      kind: "procedureDefinition",
      name: nameToken.lexeme,
      params,
      body,
      span: spanFrom(start.span, this.previous().span),
    };
  }

  private parseFunctionDefinition(): FunctionDefinitionNode {
    const start = this.expectKeyword("FUNCTION", "SYN037");
    const nameToken = this.expectType("IDENTIFIER", "SYN038", "Expected function identifier.");
    const params = this.parseParameterList();

    let returnType: BasicTypeName = "INTEGER";
    if (this.matchKeyword("RETURNS")) {
      const returnTypeToken = this.expectType("KEYWORD", "SYN040", "Expected return data type after RETURNS.");
      returnType = this.asBasicType(returnTypeToken.keyword) ?? "INTEGER";
      if (!this.asBasicType(returnTypeToken.keyword)) {
        this.error(returnTypeToken, "SYN041", "Function return type must be a basic data type.");
      }
    }

    this.consumeNewlines();
    const body = this.parseStatements(new Set(["ENDFUNCTION", "END"]));
    this.expectFunctionEnd();

    return {
      kind: "functionDefinition",
      name: nameToken.lexeme,
      params,
      returnType,
      body,
      span: spanFrom(start.span, this.previous().span),
    };
  }

  private parseCallStatement(): StatementNode {
    const start = this.expectKeyword("CALL", "SYN043");
    const nameToken = this.expectType("IDENTIFIER", "SYN044", "Expected procedure identifier after CALL.");
    const args = this.parseArgumentList(false);
    const endSpan = args.length > 0 ? args[args.length - 1].span : nameToken.span;
    return {
      kind: "callStatement",
      name: nameToken.lexeme,
      args,
      span: spanFrom(start.span, endSpan),
    };
  }

  private parseReturnStatement(): StatementNode {
    const start = this.expectKeyword("RETURN", "SYN046");
    if (this.checkType("NEWLINE") || this.isAtEnd()) {
      return {
        kind: "return",
        value: this.literalNode(start, 0, "INTEGER"),
        span: start.span,
      };
    }
    const value = this.parseExpression();
    return {
      kind: "return",
      value,
      span: spanFrom(start.span, value.span),
    };
  }

  private parseOpenFileStatement(): StatementNode {
    const start = this.expectKeyword("OPENFILE", "SYN047");
    const fileIdentifier = this.parseExpression();
    this.expectKeyword("FOR", "SYN048", "Expected FOR in OPENFILE statement.");

    const modeToken = this.expectType("KEYWORD", "SYN049", "Expected READ, WRITE, or APPEND file mode.");
    const mode =
      modeToken.keyword === "READ" || modeToken.keyword === "WRITE" || modeToken.keyword === "APPEND"
        ? modeToken.keyword
        : "READ";
    if (modeToken.keyword !== "READ" && modeToken.keyword !== "WRITE" && modeToken.keyword !== "APPEND") {
      this.error(modeToken, "SYN050", "File mode must be READ, WRITE, or APPEND.");
    }

    return {
      kind: "openfile",
      fileIdentifier,
      mode,
      span: spanFrom(start.span, modeToken.span),
    };
  }

  private parseReadFileStatement(): StatementNode | null {
    const start = this.expectKeyword("READFILE", "SYN051");
    const fileIdentifier = this.parseExpression();
    this.expectType("COMMA", "SYN052", "Expected comma in READFILE statement.");
    const target = this.parseAssignableTarget();
    if (!target) {
      return null;
    }

    return {
      kind: "readfile",
      fileIdentifier,
      target,
      span: spanFrom(start.span, target.span),
    };
  }

  private parseWriteFileStatement(): StatementNode {
    const start = this.expectKeyword("WRITEFILE", "SYN053");
    const fileIdentifier = this.parseExpression();
    this.expectType("COMMA", "SYN054", "Expected comma in WRITEFILE statement.");
    const value = this.parseExpression();

    return {
      kind: "writefile",
      fileIdentifier,
      value,
      span: spanFrom(start.span, value.span),
    };
  }

  private parseCloseFileStatement(): StatementNode {
    const start = this.expectKeyword("CLOSEFILE", "SYN055");
    const fileIdentifier = this.parseExpression();

    return {
      kind: "closefile",
      fileIdentifier,
      span: spanFrom(start.span, fileIdentifier.span),
    };
  }

  private parseIdentifierStatement(): StatementNode | null {
    const start = this.current();
    const target = this.parseAssignableTarget();
    if (!target) {
      return null;
    }

    if (this.matchType("DOT")) {
      const methodToken = this.advance();
      const methodName = (methodToken.keyword ?? methodToken.lexeme).toUpperCase();
      const args = this.parseArgumentList(true);
      const receiver: ExpressionNode = target;
      return {
        kind: "callStatement",
        name: METHOD_ALIASES[methodName] ?? methodName,
        args: [receiver, ...args],
        span: spanFrom(start.span, this.previous().span),
      };
    }

    if (this.matchAssignment()) {
      if (this.checkKeyword("USERINPUT") || this.checkKeyword("INPUT")) {
        const inputKeyword = this.advance();
        if (this.checkType("LPAREN")) {
          this.parseArgumentList(true);
        }
        return {
          kind: "input",
          target,
          span: spanFrom(target.span, inputKeyword.span),
        };
      }

      const value = this.parseExpression();
      if (value.kind === "call" && value.name.toUpperCase() === "INPUT") {
        return {
          kind: "input",
          target,
          span: spanFrom(target.span, value.span),
        };
      }

      return {
        kind: "assignment",
        target,
        value,
        span: spanFrom(target.span, value.span),
      };
    }

    if (this.checkType("LPAREN") && this.syntax.allowCallWithoutKeyword && target.kind === "identifier") {
      const args = this.parseArgumentList(true);
      return {
        kind: "callStatement",
        name: target.name,
        args,
        span: spanFrom(target.span, this.previous().span),
      };
    }

    this.error(this.current(), "SYN056", "Expected assignment operator after target identifier.");
    return null;
  }

  private parseAssignableTarget(): IdentifierNode | ArrayAccessNode | null {
    const identifierToken = this.expectType("IDENTIFIER", "SYN057", "Expected identifier.");
    if (!identifierToken) {
      return null;
    }

    if (this.matchType("LBRACKET")) {
      const indices: ExpressionNode[] = [];
      indices.push(this.parseExpression());
      while (this.matchType("COMMA")) {
        indices.push(this.parseExpression());
      }
      const endBracket = this.expectType("RBRACKET", "SYN058", "Expected closing ']' in array access.");
      return {
        kind: "arrayAccess",
        name: identifierToken.lexeme,
        indices,
        span: spanFrom(identifierToken.span, endBracket.span),
      };
    }

    return {
      kind: "identifier",
      name: identifierToken.lexeme,
      span: identifierToken.span,
    };
  }

  private parseExpression(minPrecedence = 1): ExpressionNode {
    this.enterNesting();
    try {
      return this.parseExpressionInner(minPrecedence);
    } finally {
      this.depth -= 1;
    }
  }

  private parseExpressionInner(minPrecedence: number): ExpressionNode {
    let left = this.parseUnary();

    while (true) {
      const operator = this.peekBinaryOperator();
      if (!operator) {
        break;
      }
      const opInfo = BINARY_OPERATORS[operator.value];
      if (!opInfo || opInfo.precedence < minPrecedence) {
        break;
      }

      this.advance();
      const nextMinPrecedence = opInfo.rightAssociative ? opInfo.precedence : opInfo.precedence + 1;
      const right = this.parseExpression(nextMinPrecedence);
      const canonical = operator.value === "&" ? "+" : operator.value;

      left = {
        kind: "binary",
        operator: canonical,
        left,
        right,
        span: spanFrom(left.span, right.span),
      };
    }

    return left;
  }

  private parseUnary(): ExpressionNode {
    if (this.matchType("MINUS")) {
      const operatorToken = this.previous();
      const operand = this.parseUnary();
      return {
        kind: "unary",
        operator: "-",
        operand,
        span: spanFrom(operatorToken.span, operand.span),
      };
    }

    if (this.matchKeyword("NOT")) {
      const operatorToken = this.previous();
      const operand = this.parseUnary();
      return {
        kind: "unary",
        operator: "NOT",
        operand,
        span: spanFrom(operatorToken.span, operand.span),
      };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ExpressionNode {
    const token = this.current();

    if (this.matchType("INTEGER_LITERAL")) {
      const value = Number.parseInt(token.lexeme, 10);
      return this.literalNode(token, value, "INTEGER");
    }

    if (this.matchType("REAL_LITERAL")) {
      const value = Number.parseFloat(token.lexeme);
      return this.literalNode(token, value, "REAL");
    }

    if (this.matchType("STRING_LITERAL")) {
      const value = token.lexeme.slice(1, -1);
      return this.literalNode(token, value, "STRING");
    }

    if (this.matchType("CHAR_LITERAL")) {
      const value = token.lexeme.slice(1, -1);
      return this.literalNode(token, value, value.length === 1 ? "CHAR" : "STRING");
    }

    if (token.type === "KEYWORD" && (token.keyword === "TRUE" || token.keyword === "FALSE")) {
      this.advance();
      return this.literalNode(token, token.keyword === "TRUE", "BOOLEAN");
    }

    if (token.type === "KEYWORD" && token.keyword === "USERINPUT") {
      this.advance();
      return {
        kind: "call",
        name: "INPUT",
        args: [],
        span: token.span,
      };
    }

    if (this.matchType("LPAREN")) {
      const start = this.previous().span;
      const expression = this.parseExpression();
      const end = this.expectType("RPAREN", "SYN059", "Expected ')' to close expression.");
      return {
        ...expression,
        span: spanFrom(start, end.span),
      };
    }

    if (
      token.type === "IDENTIFIER" ||
      (token.type === "KEYWORD" && token.keyword && this.isCallKeyword(token.keyword))
    ) {
      this.advance();
      return this.parseIdentifierOrCall(token);
    }

    this.error(token, "SYN060", "Expected expression.");
    this.advance();
    return {
      kind: "literal",
      value: 0,
      literalType: "INTEGER",
      span: token.span,
    };
  }

  private parseIdentifierOrCall(token: Token): ExpressionNode {
    let current: ExpressionNode = {
      kind: "identifier",
      name: token.keyword ?? token.lexeme,
      span: token.span,
    };

    if (this.matchType("LPAREN")) {
      const args: ExpressionNode[] = [];
      if (!this.checkType("RPAREN")) {
        args.push(this.parseExpression());
        while (this.matchType("COMMA")) {
          args.push(this.parseExpression());
        }
      }
      const endParen = this.expectType("RPAREN", "SYN061", "Expected ')' after function call arguments.");
      current = this.rewriteCall(token.keyword ?? token.lexeme, args, spanFrom(token.span, endParen.span));
    } else if (this.matchType("LBRACKET")) {
      const indices: ExpressionNode[] = [];
      indices.push(this.parseExpression());
      while (this.matchType("COMMA")) {
        indices.push(this.parseExpression());
      }
      const endBracket = this.expectType("RBRACKET", "SYN062", "Expected closing ']' in array access.");
      current = {
        kind: "arrayAccess",
        name: token.lexeme,
        indices,
        span: spanFrom(token.span, endBracket.span),
      };
    }

    while (this.matchType("DOT")) {
      const methodToken = this.advance();
      const methodName = (methodToken.keyword ?? methodToken.lexeme).toUpperCase();
      const args = this.checkType("LPAREN") ? this.parseArgumentList(true) : [];
      current = this.rewriteCall(METHOD_ALIASES[methodName] ?? methodName, [current, ...args], spanFrom(token.span, this.previous().span));
    }

    return current;
  }

  private rewriteCall(rawName: string, args: ExpressionNode[], span: SourceSpan): ExpressionNode {
    const upper = rawName.toUpperCase();
    const canonical = this.syntax.canonicalCallNames[upper] ?? upper;

    if (this.syntax.id === "aqa-gcse" && canonical === "SUBSTRING" && args.length === 3) {
      const [start, end, text] = args;
      const length: ExpressionNode = {
        kind: "binary",
        operator: "+",
        left: {
          kind: "binary",
          operator: "-",
          left: end,
          right: start,
          span,
        },
        right: this.integerLiteral(1, span),
        span,
      };
      return {
        kind: "call",
        name: "SUBSTRING",
        args: [text, start, length],
        span,
      };
    }

    if (canonical === "LEN") {
      return { kind: "call", name: "LENGTH", args, span };
    }

    return {
      kind: "call",
      name: canonical,
      args,
      span,
    };
  }

  private parseTypeNode(): TypeNode | null {
    if (this.matchKeyword("ARRAY")) {
      const arrayKeyword = this.previous();
      this.expectType("LBRACKET", "SYN063", "Expected '[' after ARRAY keyword.");

      const dimensions: Array<{ lower: number; upper: number }> = [];
      dimensions.push(this.parseArrayDimension());
      while (this.matchType("COMMA")) {
        dimensions.push(this.parseArrayDimension());
      }

      this.expectType("RBRACKET", "SYN064", "Expected closing ']' in ARRAY declaration.");
      this.expectKeyword("OF", "SYN065", "Expected OF in ARRAY declaration.");

      const elementTypeToken = this.expectType("KEYWORD", "SYN066", "Expected array element data type.");
      const elementType = this.asBasicType(elementTypeToken.keyword) ?? "INTEGER";
      if (!this.asBasicType(elementTypeToken.keyword)) {
        this.error(elementTypeToken, "SYN067", "Array element type must be a basic data type.");
      }

      return {
        kind: "array",
        elementType,
        dimensions,
        span: spanFrom(arrayKeyword.span, elementTypeToken.span),
      };
    }

    const token = this.expectType("KEYWORD", "SYN068", "Expected data type.");
    const name = this.asBasicType(token.keyword);
    if (!name) {
      this.error(token, "SYN069", "Expected one of INTEGER, REAL, CHAR, STRING, BOOLEAN.");
      return {
        kind: "basic",
        name: "INTEGER",
        span: token.span,
      };
    }

    return {
      kind: "basic",
      name,
      span: token.span,
    };
  }

  private parseArrayDimension(): { lower: number; upper: number } {
    const lower = this.parseSignedIntegerLiteral("SYN070", "Expected lower array bound as an integer literal.");
    if (this.matchType("COLON")) {
      const upper = this.parseSignedIntegerLiteral("SYN072", "Expected upper array bound as an integer literal.");
      return { lower, upper };
    }
    return { lower: this.syntax.id === "ib-dp" || this.syntax.id === "ocr-gcse" ? 0 : 1, upper: lower };
  }

  private parseSignedIntegerLiteral(code: string, message: string): number {
    let sign = 1;
    if (this.matchType("MINUS")) {
      sign = -1;
    }

    const token = this.expectType("INTEGER_LITERAL", code, message);
    const value = Number.parseInt(token.lexeme, 10);
    return Number.isNaN(value) ? 0 : sign * value;
  }

  private parseParameterList(): ParameterNode[] {
    const params: ParameterNode[] = [];
    if (!this.matchType("LPAREN")) {
      return params;
    }

    if (!this.checkType("RPAREN")) {
      do {
        this.matchKeyword("BYREF");
        this.matchKeyword("BYVAL");
        const nameToken = this.expectType("IDENTIFIER", "SYN073", "Expected parameter identifier.");
        let typeNode: TypeNode | null = null;
        if (this.matchType("COLON")) {
          typeNode = this.parseTypeNode();
        } else if (this.syntax.allowUntypedParams) {
          typeNode = {
            kind: "basic",
            name: "INTEGER",
            span: nameToken.span,
          };
        } else {
          this.error(this.current(), "SYN074", "Expected ':' in parameter declaration.");
        }
        if (!typeNode) {
          continue;
        }

        params.push({
          name: nameToken.lexeme,
          typeNode,
          span: spanFrom(nameToken.span, typeNode.span),
        });
      } while (this.matchType("COMMA"));
    }

    this.expectType("RPAREN", "SYN075", "Expected ')' after parameter list.");
    return params;
  }

  private parseArgumentList(requireParens: boolean): ExpressionNode[] {
    const args: ExpressionNode[] = [];
    if (!this.matchType("LPAREN")) {
      return requireParens ? args : args;
    }
    if (!this.checkType("RPAREN")) {
      args.push(this.parseExpression());
      while (this.matchType("COMMA")) {
        args.push(this.parseExpression());
      }
    }
    this.expectType("RPAREN", "SYN045", "Expected ')' after arguments.");
    return args;
  }

  private parseIdentifier(): IdentifierNode | null {
    const token = this.matchType("IDENTIFIER") ? this.previous() : null;
    if (!token) {
      this.error(this.current(), "SYN076", "Expected identifier.");
      return null;
    }
    return {
      kind: "identifier",
      name: token.lexeme,
      span: token.span,
    };
  }

  private literalNode(token: Token, value: unknown, literalType: BasicTypeName): LiteralNode {
    return {
      kind: "literal",
      value: value as number | string | boolean,
      literalType,
      span: token.span,
    };
  }

  private integerLiteral(value: number, span: SourceSpan): LiteralNode {
    return {
      kind: "literal",
      value,
      literalType: "INTEGER",
      span,
    };
  }

  private peekBinaryOperator(): { value: string } | null {
    const token = this.current();
    if (token.type === "KEYWORD" && (token.keyword === "AND" || token.keyword === "OR" || token.keyword === "DIV" || token.keyword === "MOD")) {
      return { value: token.keyword };
    }

    if (token.type === "EQEQ") {
      return { value: "=" };
    }
    if (token.type === "EQ") {
      return this.syntax.equalityDoubleEquals ? null : { value: "=" };
    }
    if (token.type === "AMPERSAND") {
      return { value: "&" };
    }

    const mapping: Partial<Record<Token["type"], string>> = {
      LT: "<",
      LTE: "<=",
      GT: ">",
      GTE: ">=",
      NEQ: "<>",
      PLUS: "+",
      MINUS: "-",
      STAR: "*",
      SLASH: "/",
      CARET: "^",
    };

    const operator = mapping[token.type];
    if (!operator) {
      return null;
    }
    return { value: operator };
  }

  private synchronizeLine() {
    while (!this.isAtEnd() && this.current().type !== "NEWLINE") {
      this.advance();
    }
    this.consumeNewlines();
  }

  private consumeNewlines() {
    while (this.matchType("NEWLINE")) {
      // consume contiguous newlines
    }
  }

  private expectKeyword(keyword: string, code: string, message?: string): Token {
    if (this.checkKeyword(keyword)) {
      return this.advance();
    }
    const token = this.current();
    this.error(token, code, message ?? `Expected keyword ${keyword}.`);
    return token;
  }

  private expectType(type: Token["type"], code: string, message: string): Token {
    if (this.checkType(type)) {
      return this.advance();
    }
    const token = this.current();
    this.error(token, code, message);
    return token;
  }

  private checkKeyword(keyword: string): boolean {
    const token = this.current();
    return token.type === "KEYWORD" && token.keyword === keyword;
  }

  private matchKeyword(keyword: string): boolean {
    if (this.checkKeyword(keyword)) {
      this.advance();
      return true;
    }
    return false;
  }

  private peekKeyword(offset: number): string | undefined {
    return this.tokens[this.index + offset]?.keyword;
  }

  private checkKeywordSequence(...keywords: string[]): boolean {
    return keywords.every((keyword, offset) => this.tokens[this.index + offset]?.type === "KEYWORD" && this.tokens[this.index + offset]?.keyword === keyword);
  }

  private matchKeywordSequence(...keywords: string[]): boolean {
    if (!this.checkKeywordSequence(...keywords)) {
      return false;
    }
    for (let i = 0; i < keywords.length; i += 1) {
      this.advance();
    }
    return true;
  }

  private expectKeywordOrSequence(keyword: string, sequence: string[], code: string, message: string): Token {
    if (this.matchKeyword(keyword) || this.matchKeywordSequence(...sequence)) {
      return this.previous();
    }
    this.error(this.current(), code, message);
    return this.current();
  }

  private atStop(stopKeywords: Set<string>): boolean {
    const token = this.current();
    if (token.type === "EOF" && stopKeywords.has("EOF")) {
      return true;
    }
    if (token.type !== "KEYWORD" || !token.keyword) {
      return false;
    }
    if (stopKeywords.has(token.keyword)) {
      if (token.keyword === "END") {
        const next = this.peekKeyword(1);
        return next === "IF" || next === "WHILE" || next === "LOOP" || next === "FOR" || next === "CASE" || next === "SWITCH" || next === "FUNCTION" || next === "PROCEDURE" || next === "SUBROUTINE";
      }
      return true;
    }
    if (token.keyword === "END" && stopKeywords.has("ENDIF") && this.peekKeyword(1) === "IF") {
      return true;
    }
    if (token.keyword === "END" && stopKeywords.has("ENDWHILE") && this.peekKeyword(1) === "WHILE") {
      return true;
    }
    if (token.keyword === "END" && stopKeywords.has("ENDFOR") && this.peekKeyword(1) === "FOR") {
      return true;
    }
    return false;
  }

  private expectIfEnd() {
    if (this.matchKeyword("ENDIF") || this.matchKeywordSequence("END", "IF")) {
      return;
    }
    this.error(this.current(), "SYN018", "Expected ENDIF to close IF statement.");
  }

  private expectWhileEnd() {
    if (this.matchKeyword("ENDWHILE") || this.matchKeywordSequence("END", "WHILE") || this.matchKeywordSequence("END", "LOOP")) {
      return;
    }
    this.error(this.current(), "SYN033", "Expected ENDWHILE to close WHILE loop.");
  }

  private expectForEnd() {
    if (this.matchKeyword("NEXT") || this.matchKeyword("ENDFOR") || this.matchKeywordSequence("END", "FOR") || this.matchKeywordSequence("END", "LOOP")) {
      return;
    }
    this.error(this.current(), "SYN027", "Expected NEXT to close FOR loop.");
  }

  private expectLoopEnd() {
    if (this.matchKeywordSequence("END", "LOOP")) {
      return;
    }
    this.error(this.current(), "SYN027", "Expected end loop.");
  }

  private expectProcedureEnd() {
    if (
      this.matchKeyword("ENDPROCEDURE") ||
      this.matchKeyword("ENDSUBROUTINE") ||
      this.matchKeywordSequence("END", "PROCEDURE") ||
      this.matchKeywordSequence("END", "SUBROUTINE")
    ) {
      return;
    }
    this.error(this.current(), "SYN036", "Expected ENDPROCEDURE.");
  }

  private expectFunctionEnd() {
    if (this.matchKeyword("ENDFUNCTION") || this.matchKeywordSequence("END", "FUNCTION")) {
      return;
    }
    this.error(this.current(), "SYN042", "Expected ENDFUNCTION.");
  }

  private matchAssignment(): boolean {
    if (this.matchType("ASSIGN")) {
      return true;
    }
    if (this.syntax.assignmentEquals && this.matchType("EQ")) {
      return true;
    }
    return false;
  }

  private expectAssignment(code: string, message: string) {
    if (!this.matchAssignment()) {
      this.error(this.current(), code, message);
    }
  }

  private asBasicType(keyword?: string): BasicTypeName | null {
    if (!keyword) {
      return null;
    }
    if (keyword === "DATE") {
      return "STRING";
    }
    return BASIC_TYPE_NAMES.has(keyword as BasicTypeName) ? (keyword as BasicTypeName) : null;
  }

  private isCallKeyword(keyword: string): boolean {
    return Boolean(this.syntax.builtins[keyword] || this.syntax.canonicalCallNames[keyword] || keyword === "INPUT");
  }

  private checkType(type: Token["type"]): boolean {
    return this.current().type === type;
  }

  private matchType(type: Token["type"]): boolean {
    if (this.checkType(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private previous(): Token {
    return this.tokens[Math.max(0, this.index - 1)] ?? {
      type: "EOF",
      lexeme: "",
      span: createFallbackSpan(),
    };
  }

  private current(): Token {
    return this.tokens[this.index] ?? {
      type: "EOF",
      lexeme: "",
      span: createFallbackSpan(),
    };
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.index += 1;
    }
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.current().type === "EOF";
  }

  private error(token: Token, code: string, message: string) {
    this.diagnostics.push({
      code,
      message,
      severity: "error",
      line: token.span.startLine,
      column: token.span.startColumn,
      endLine: token.span.endLine,
      endColumn: token.span.endColumn,
    });
  }
}

export function parseSource(
  source: string,
  syntaxInput: SyntaxDefinition | string = DEFAULT_SYNTAX_ID,
): { ast: ProgramNode; diagnostics: Diagnostic[] } {
  const syntax = typeof syntaxInput === "string" ? resolveSyntax(syntaxInput) : syntaxInput;
  const { tokens, diagnostics } = tokenize(source, syntax);
  const parser = new Parser(tokens, diagnostics, syntax);
  const ast = parser.parseProgram();
  return { ast, diagnostics: parser.diagnostics };
}
