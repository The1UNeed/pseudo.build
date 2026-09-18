import {
  ArrayAccessNode,
  BasicTypeName,
  Diagnostic,
  ExpressionNode,
  FunctionDefinitionNode,
  FunctionSignature,
  ProcedureDefinitionNode,
  ProcedureSignature,
  ProgramNode,
  SemanticResult,
  SourceSpan,
  StatementNode,
  StaticType,
  TypeNode,
} from "./types";
import { DEFAULT_SYNTAX_ID, resolveSyntax, type SyntaxDefinition } from "./syntax";

interface SymbolEntry {
  name: string;
  kind: "variable" | "constant" | "param" | "procedure" | "function";
  type: StaticType;
}

class Scope {
  private readonly symbols = new Map<string, SymbolEntry>();
  constructor(public readonly parent: Scope | null = null) {}

  define(symbol: SymbolEntry): boolean {
    const key = symbol.name.toLowerCase();
    if (this.symbols.has(key)) {
      return false;
    }
    this.symbols.set(key, symbol);
    return true;
  }

  lookup(name: string): SymbolEntry | null {
    return this.symbols.get(name.toLowerCase()) ?? this.parent?.lookup(name) ?? null;
  }
}

const UNKNOWN: StaticType = { kind: "unknown" };
const BOOLEAN: StaticType = { kind: "basic", name: "BOOLEAN" };
const INTEGER: StaticType = { kind: "basic", name: "INTEGER" };
const REAL: StaticType = { kind: "basic", name: "REAL" };
const STRING: StaticType = { kind: "basic", name: "STRING" };

const DEFAULT_ARRAY_BOUNDS = [{ lower: 0, upper: 1023 }];

function toStaticType(typeNode: TypeNode): StaticType {
  if (typeNode.kind === "basic") {
    return { kind: "basic", name: typeNode.name };
  }
  return {
    kind: "array",
    elementType: typeNode.elementType,
    dimensions: typeNode.dimensions,
  };
}

function typeName(type: StaticType): string {
  if (type.kind === "unknown") {
    return "UNKNOWN";
  }
  if (type.kind === "basic") {
    return type.name;
  }
  return `ARRAY OF ${type.elementType}`;
}

/** True when the type is one of `names`. UNKNOWN (an already-reported error) always passes. */
function isBasic(type: StaticType, ...names: BasicTypeName[]): boolean {
  return type.kind === "unknown" || (type.kind === "basic" && names.includes(type.name));
}

function isStringy(type: StaticType): boolean {
  return type.kind === "basic" && (type.name === "STRING" || type.name === "CHAR");
}

function typesCompatible(target: StaticType, value: StaticType): boolean {
  if (target.kind === "unknown" || value.kind === "unknown") {
    return true;
  }

  if (target.kind === "array" || value.kind === "array") {
    if (target.kind !== "array" || value.kind !== "array") {
      return false;
    }
    return (
      target.elementType === value.elementType &&
      target.dimensions.length === value.dimensions.length
    );
  }

  return (
    target.name === value.name ||
    (target.name === "REAL" && value.name === "INTEGER") ||
    (target.name === "STRING" && value.name === "CHAR")
  );
}

function comparable(operator: string, left: StaticType, right: StaticType): boolean {
  if (left.kind === "unknown" || right.kind === "unknown") {
    return true;
  }
  if (isBasic(left, "INTEGER", "REAL")) {
    return isBasic(right, "INTEGER", "REAL");
  }
  if (isBasic(left, "STRING", "CHAR")) {
    return isBasic(right, "STRING", "CHAR");
  }
  if (isBasic(left, "BOOLEAN")) {
    return isBasic(right, "BOOLEAN") && (operator === "=" || operator === "<>");
  }
  return false;
}

/** `ROUND(x, 0)` produces a whole number, so it may be stored in an INTEGER. */
function isRoundToWhole(expression: ExpressionNode): boolean {
  const places = expression.kind === "call" && expression.name === "ROUND" ? expression.args[1] : undefined;
  return places?.kind === "literal" && places.literalType === "INTEGER" && places.value === 0;
}

function blockReturns(statements: StatementNode[]): boolean {
  return statements.some(statementReturns);
}

function statementReturns(statement: StatementNode): boolean {
  switch (statement.kind) {
    case "return":
      return true;
    case "if":
      return blockReturns(statement.thenBody) && blockReturns(statement.elseBody);
    case "case":
      return (
        statement.clauses.some((clause) => clause.value === null) &&
        statement.clauses.every((clause) => statementReturns(clause.statement))
      );
    case "while":
      // WHILE TRUE can only be left through RETURN. Other loops may run zero times.
      return statement.condition.kind === "literal" && statement.condition.value === true;
    default:
      return false;
  }
}

class Analyzer {
  diagnostics: Diagnostic[] = [];
  // User routines only. The syntax's builtins are looked up separately, so a
  // program may define a routine whose name shadows a builtin from another board.
  private functionSignatures: Record<string, FunctionSignature> = {};
  private procedureSignatures: Record<string, ProcedureSignature> = {};
  private syntax: SyntaxDefinition;

  constructor(syntax: SyntaxDefinition) {
    this.syntax = syntax;
  }

  analyze(program: ProgramNode): SemanticResult {
    const globalScope = new Scope(null);

    this.predeclareRoutines(program.body, globalScope);
    // The main program runs first, so routines can see every top-level declaration.
    this.analyzeStatements(program.body, globalScope, null, {});
    for (const statement of program.body) {
      if (statement.kind === "procedureDefinition" || statement.kind === "functionDefinition") {
        this.analyzeRoutine(statement, globalScope);
      }
    }

    return { diagnostics: this.diagnostics };
  }

  private predeclareRoutines(statements: StatementNode[], globalScope: Scope) {
    for (const statement of statements) {
      if (statement.kind !== "procedureDefinition" && statement.kind !== "functionDefinition") {
        continue;
      }
      const key = statement.name.toLowerCase();
      if (this.procedureSignatures[key] || this.functionSignatures[key]) {
        this.pushError(statement.span, "SEM001", `Duplicate routine name \"${statement.name}\".`);
        continue;
      }

      const params = statement.params.map((param) => toStaticType(param.typeNode));
      if (statement.kind === "functionDefinition") {
        const returnType: StaticType = { kind: "basic", name: statement.returnType };
        this.functionSignatures[key] = { name: statement.name, params, returnType };
        globalScope.define({ name: statement.name, kind: "function", type: returnType });
      } else {
        this.procedureSignatures[key] = { name: statement.name, params };
        globalScope.define({ name: statement.name, kind: "procedure", type: UNKNOWN });
      }
    }
  }

  private analyzeRoutine(statement: ProcedureDefinitionNode | FunctionDefinitionNode, globalScope: Scope) {
    const scope = new Scope(globalScope);
    for (const param of statement.params) {
      if (!scope.define({ name: param.name, kind: "param", type: toStaticType(param.typeNode) })) {
        this.pushError(param.span, "SEM010", `Duplicate parameter \"${param.name}\".`);
      }
    }

    if (statement.kind === "procedureDefinition") {
      this.analyzeStatements(statement.body, scope, null, {});
      return;
    }

    this.analyzeStatements(statement.body, scope, { kind: "basic", name: statement.returnType }, {});
    if (!blockReturns(statement.body)) {
      this.pushError(
        statement.span,
        "SEM011",
        `Function \"${statement.name}\" must RETURN a value on every path.`,
      );
    }
  }

  /** One scope per routine: blocks inside IF, CASE and loops share the enclosing scope. */
  private analyzeStatements(
    statements: StatementNode[],
    scope: Scope,
    currentFunctionReturnType: StaticType | null,
    openFiles: Record<string, "READ" | "WRITE" | "APPEND">,
  ) {
    const analyzeBlock = (body: StatementNode[]) =>
      this.analyzeStatements(body, scope, currentFunctionReturnType, { ...openFiles });

    for (const statement of statements) {
      switch (statement.kind) {
        case "declare": {
          const declaredType = toStaticType(statement.typeNode);
          if (!scope.define({ name: statement.identifier.name, kind: "variable", type: declaredType })) {
            this.pushError(statement.span, "SEM002", `Duplicate identifier \"${statement.identifier.name}\" in scope.`);
          }
          break;
        }

        case "constant": {
          const value = statement.value;
          const literal =
            value.kind === "unary" && value.operator === "-" && value.operand.kind === "literal" &&
            (value.operand.literalType === "INTEGER" || value.operand.literalType === "REAL")
              ? value.operand
              : value.kind === "literal"
                ? value
                : null;
          if (!literal) {
            this.pushError(
              value.span,
              "SEM032",
              "CONSTANT value must be a literal, such as 5, -2.5, \"Text\", 'c' or TRUE.",
            );
          }
          const valueType: StaticType = literal ? { kind: "basic", name: literal.literalType } : UNKNOWN;
          if (!scope.define({ name: statement.identifier.name, kind: "constant", type: valueType })) {
            this.pushError(statement.span, "SEM002", `Duplicate identifier \"${statement.identifier.name}\" in scope.`);
          }
          break;
        }

        case "assignment": {
          const valueType = this.inferExpressionType(statement.value, scope);
          const targetType = this.resolveAssignableType(statement.target, scope, valueType);
          if (!this.fits(targetType, statement.value, valueType)) {
            this.pushError(
              statement.span,
              "SEM003",
              `Cannot assign ${typeName(valueType)} to ${typeName(targetType)}.`,
            );
          }
          break;
        }

        case "input": {
          this.resolveAssignableType(statement.target, scope, STRING);
          break;
        }

        case "output": {
          for (const value of statement.values) {
            this.inferExpressionType(value, scope);
          }
          break;
        }

        case "if": {
          const condType = this.inferExpressionType(statement.condition, scope);
          if (!isBasic(condType, "BOOLEAN")) {
            this.pushError(statement.condition.span, "SEM004", "IF condition must evaluate to BOOLEAN.");
          }
          analyzeBlock(statement.thenBody);
          analyzeBlock(statement.elseBody);
          break;
        }

        case "case": {
          const subjectType = this.inferExpressionType(statement.expression, scope);
          for (const clause of statement.clauses) {
            if (clause.value) {
              const valueType = this.inferExpressionType(clause.value, scope);
              if (!comparable("=", subjectType, valueType)) {
                this.pushError(
                  clause.value.span,
                  "SEM031",
                  `CASE value must match the CASE expression type ${typeName(subjectType)}, got ${typeName(valueType)}.`,
                );
              }
            }
            analyzeBlock([clause.statement]);
          }
          break;
        }

        case "for": {
          const iterator = statement.iterator;
          // Syntaxes without DECLARE introduce the iterator on the FOR line itself.
          if (!scope.lookup(iterator.name) && !this.syntax.requireDeclarations) {
            scope.define({ name: iterator.name, kind: "variable", type: INTEGER });
          }
          const iteratorSymbol = scope.lookup(iterator.name);
          if (!iteratorSymbol) {
            this.pushError(iterator.span, "SEM005", `Loop iterator \"${iterator.name}\" must be declared before use.`);
          } else if (iteratorSymbol.kind === "constant") {
            this.pushError(iterator.span, "SEM025", `Cannot use CONSTANT \"${iterator.name}\" as a FOR loop iterator.`);
          } else if (iteratorSymbol.kind === "procedure" || iteratorSymbol.kind === "function") {
            this.pushError(iterator.span, "SEM029", `Cannot use ${iteratorSymbol.kind} \"${iterator.name}\" as a FOR loop iterator.`);
          } else if (!isBasic(iteratorSymbol.type, "INTEGER")) {
            this.pushError(iterator.span, "SEM006", "FOR iterator must be INTEGER.");
          }

          for (const expr of [statement.startValue, statement.endValue, ...(statement.stepValue ? [statement.stepValue] : [])]) {
            const type = this.inferExpressionType(expr, scope);
            if (!isBasic(type, "INTEGER")) {
              this.pushError(expr.span, "SEM007", "FOR start, end and STEP values must be INTEGER.");
            }
          }

          analyzeBlock(statement.body);
          break;
        }

        case "repeat": {
          analyzeBlock(statement.body);
          const condType = this.inferExpressionType(statement.condition, scope);
          if (!isBasic(condType, "BOOLEAN")) {
            this.pushError(statement.condition.span, "SEM008", "UNTIL condition must evaluate to BOOLEAN.");
          }
          break;
        }

        case "while": {
          const condType = this.inferExpressionType(statement.condition, scope);
          if (!isBasic(condType, "BOOLEAN")) {
            this.pushError(statement.condition.span, "SEM009", "WHILE condition must evaluate to BOOLEAN.");
          }
          analyzeBlock(statement.body);
          break;
        }

        case "callStatement": {
          const signature = this.procedureSignatures[statement.name.toLowerCase()];
          if (!signature) {
            this.pushError(statement.span, "SEM012", `Unknown procedure \"${statement.name}\".`);
            break;
          }
          this.validateCallArguments(statement.args, signature.params, statement.span, statement.name, scope);
          break;
        }

        case "return": {
          const returnValueType = this.inferExpressionType(statement.value, scope);
          if (!currentFunctionReturnType) {
            this.pushError(statement.span, "SEM013", "RETURN is only valid inside FUNCTION definitions.");
          } else if (!this.fits(currentFunctionReturnType, statement.value, returnValueType)) {
            this.pushError(
              statement.span,
              "SEM014",
              `RETURN type mismatch. Expected ${typeName(currentFunctionReturnType)}, got ${typeName(returnValueType)}.`,
            );
          }
          break;
        }

        case "openfile": {
          const fileName = this.literalFileName(statement.fileIdentifier, scope);
          if (fileName) {
            openFiles[fileName] = statement.mode;
          }
          break;
        }

        case "readfile": {
          const fileName = this.literalFileName(statement.fileIdentifier, scope);
          if (fileName && openFiles[fileName] && openFiles[fileName] !== "READ") {
            this.pushError(statement.span, "SEM015", `READFILE used on write-only handle \"${fileName}\".`);
          }
          this.resolveAssignableType(statement.target, scope);
          break;
        }

        case "writefile": {
          const fileName = this.literalFileName(statement.fileIdentifier, scope);
          if (fileName && openFiles[fileName] && openFiles[fileName] !== "WRITE" && openFiles[fileName] !== "APPEND") {
            this.pushError(statement.span, "SEM016", `WRITEFILE used on read-only handle \"${fileName}\".`);
          }
          this.inferExpressionType(statement.value, scope);
          break;
        }

        case "closefile": {
          const fileName = this.literalFileName(statement.fileIdentifier, scope);
          if (fileName) {
            delete openFiles[fileName];
          }
          break;
        }

        // Routine definitions are analyzed separately, after the main program.
        default:
          break;
      }
    }
  }

  private fits(target: StaticType, value: ExpressionNode, valueType: StaticType): boolean {
    return typesCompatible(target, valueType) || (isBasic(target, "INTEGER") && isRoundToWhole(value));
  }

  private validateCallArguments(
    args: ExpressionNode[],
    expected: StaticType[],
    span: SourceSpan,
    name: string,
    scope: Scope,
  ) {
    if (args.length !== expected.length) {
      this.pushError(span, "SEM017", `Routine \"${name}\" expects ${expected.length} argument(s), got ${args.length}.`);
      return;
    }

    args.forEach((arg, index) => {
      const actualType = this.inferExpressionType(arg, scope);
      if (!this.fits(expected[index], arg, actualType)) {
        this.pushError(
          arg.span,
          "SEM018",
          `Argument ${index + 1} for \"${name}\" must be ${typeName(expected[index])}, got ${typeName(actualType)}.`,
        );
      }
    });
  }

  private inferExpressionType(expression: ExpressionNode, scope: Scope): StaticType {
    switch (expression.kind) {
      case "literal":
        return { kind: "basic", name: expression.literalType };

      case "identifier": {
        const symbol = scope.lookup(expression.name);
        if (!symbol) {
          if (!this.syntax.requireDeclarations) {
            return UNKNOWN;
          }
          this.pushError(expression.span, "SEM019", `Undeclared identifier \"${expression.name}\".`);
          return UNKNOWN;
        }
        if (symbol.kind === "function") {
          this.pushError(expression.span, "SEM029", `Function \"${expression.name}\" must be called with parentheses, like ${expression.name}().`);
          return UNKNOWN;
        }
        if (symbol.kind === "procedure") {
          this.pushError(expression.span, "SEM029", `Procedure \"${expression.name}\" can't be used as a value. Use CALL ${expression.name}().`);
          return UNKNOWN;
        }
        return symbol.type;
      }

      case "arrayAccess":
        return this.resolveArrayAccessType(expression, scope);

      case "unary": {
        const operandType = this.inferExpressionType(expression.operand, scope);
        if (expression.operator === "NOT") {
          if (!isBasic(operandType, "BOOLEAN")) {
            this.pushError(expression.span, "SEM020", "NOT operator requires a BOOLEAN operand.");
          }
          return BOOLEAN;
        }
        if (!isBasic(operandType, "INTEGER", "REAL")) {
          this.pushError(expression.span, "SEM021", "Unary minus requires a numeric operand.");
          return UNKNOWN;
        }
        return operandType;
      }

      case "binary": {
        const leftType = this.inferExpressionType(expression.left, scope);
        const rightType = this.inferExpressionType(expression.right, scope);
        const op = expression.operator;

        // Concatenation: Cambridge spells it `&`, the other boards `+`, and the
        // parser canonicalises both to `+`, so this branch has to accept either.
        if (op === "+" && (isStringy(leftType) || isStringy(rightType))) {
          return STRING;
        }

        if (["+", "-", "*", "/", "^", "DIV", "MOD"].includes(op)) {
          if (!isBasic(leftType, "INTEGER", "REAL") || !isBasic(rightType, "INTEGER", "REAL")) {
            this.pushError(expression.span, "SEM022", `Operator ${op} requires numeric operands.`);
            return UNKNOWN;
          }
          if (op === "DIV" || op === "MOD") {
            return INTEGER;
          }
          if (op === "/" || typeName(leftType) === "REAL" || typeName(rightType) === "REAL") {
            return REAL;
          }
          return leftType.kind === "unknown" || rightType.kind === "unknown" ? UNKNOWN : INTEGER;
        }

        if (["=", "<", "<=", ">", ">=", "<>"].includes(op)) {
          if (!comparable(op, leftType, rightType)) {
            this.pushError(
              expression.span,
              "SEM030",
              `Cannot compare ${typeName(leftType)} with ${typeName(rightType)} using ${op}.`,
            );
          }
          return BOOLEAN;
        }

        if (["AND", "OR"].includes(op)) {
          if (!isBasic(leftType, "BOOLEAN") || !isBasic(rightType, "BOOLEAN")) {
            this.pushError(expression.span, "SEM023", `Operator ${op} requires BOOLEAN operands.`);
          }
          return BOOLEAN;
        }

        return UNKNOWN;
      }

      case "call": {
        const signature =
          this.syntax.builtins[expression.name.toUpperCase()] ??
          this.functionSignatures[expression.name.toLowerCase()];
        if (!signature) {
          this.pushError(expression.span, "SEM024", `Unknown function \"${expression.name}\".`);
          return UNKNOWN;
        }
        this.validateCallArguments(expression.args, signature.params, expression.span, expression.name, scope);
        return signature.returnType;
      }

      default:
        return UNKNOWN;
    }
  }

  private resolveAssignableType(target: ExpressionNode, scope: Scope, inferred?: StaticType): StaticType {
    if (target.kind === "arrayAccess") {
      return this.resolveArrayAccessType(target, scope, inferred);
    }
    if (target.kind !== "identifier") {
      return UNKNOWN;
    }

    const symbol = scope.lookup(target.name);
    if (!symbol && !this.syntax.requireDeclarations) {
      // Syntaxes without DECLARE create the variable on first assignment.
      const type = inferred && inferred.kind !== "unknown" ? inferred : UNKNOWN;
      scope.define({ name: target.name, kind: "variable", type });
      return type;
    }
    if (!symbol) {
      this.pushError(target.span, "SEM019", `Undeclared identifier \"${target.name}\".`);
      return UNKNOWN;
    }
    if (symbol.kind === "constant") {
      this.pushError(target.span, "SEM025", `Cannot assign/input into CONSTANT \"${target.name}\".`);
    }
    if (symbol.kind === "procedure" || symbol.kind === "function") {
      this.pushError(target.span, "SEM029", `Cannot assign to ${symbol.kind} \"${target.name}\".`);
      return UNKNOWN;
    }
    return symbol.type;
  }

  private resolveArrayAccessType(target: ArrayAccessNode, scope: Scope, inferred?: StaticType): StaticType {
    let symbol = scope.lookup(target.name);
    if (!symbol && !this.syntax.requireDeclarations) {
      // Syntaxes without DECLARE create the array on first indexed assignment.
      const arrayType: StaticType = {
        kind: "array",
        elementType: inferred && inferred.kind === "basic" ? inferred.name : "INTEGER",
        dimensions: target.indices.map(() => DEFAULT_ARRAY_BOUNDS[0]),
      };
      scope.define({ name: target.name, kind: "variable", type: arrayType });
      symbol = scope.lookup(target.name);
    }
    if (!symbol) {
      this.pushError(target.span, "SEM019", `Undeclared identifier \"${target.name}\".`);
      return UNKNOWN;
    }

    if (symbol.type.kind === "unknown") {
      return UNKNOWN;
    }

    if (symbol.type.kind !== "array") {
      this.pushError(target.span, "SEM026", `Identifier \"${target.name}\" is not an ARRAY.`);
      return UNKNOWN;
    }

    const elementType: StaticType = { kind: "basic", name: symbol.type.elementType };
    if (target.indices.length !== symbol.type.dimensions.length) {
      this.pushError(
        target.span,
        "SEM027",
        `ARRAY \"${target.name}\" expects ${symbol.type.dimensions.length} index value(s), got ${target.indices.length}.`,
      );
      return elementType;
    }

    for (const index of target.indices) {
      const indexType = this.inferExpressionType(index, scope);
      if (!isBasic(indexType, "INTEGER")) {
        this.pushError(index.span, "SEM028", "Array index must evaluate to INTEGER.");
      }
    }

    return elementType;
  }

  /** Checks the file identifier once and returns its name when it is a string literal. */
  private literalFileName(expression: ExpressionNode, scope: Scope): string | null {
    if (expression.kind === "literal" && expression.literalType === "STRING" && typeof expression.value === "string") {
      return expression.value;
    }
    this.inferExpressionType(expression, scope);
    return null;
  }

  private pushError(span: SourceSpan, code: string, message: string) {
    this.diagnostics.push({
      code,
      message,
      severity: "error",
      line: span.startLine,
      column: span.startColumn,
      endLine: span.endLine,
      endColumn: span.endColumn,
    });
  }
}

export function analyzeProgram(
  ast: ProgramNode,
  syntaxInput: SyntaxDefinition | string = DEFAULT_SYNTAX_ID,
): SemanticResult {
  const analyzer = new Analyzer(typeof syntaxInput === "string" ? resolveSyntax(syntaxInput) : syntaxInput);
  return analyzer.analyze(ast);
}
