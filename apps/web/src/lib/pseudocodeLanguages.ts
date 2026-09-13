import {
  SYNTAX_OPTIONS,
  displayKeyword,
  resolveSyntax,
  type SyntaxDefinition,
  type SyntaxId,
} from "@pseudobuild/compiler";

export function languageIdForSyntax(syntaxId: SyntaxId | string): string {
  return `pseudo-${resolveSyntax(syntaxId).id}`;
}

export function keywordLookupForSyntax(syntax: SyntaxDefinition): ReadonlyMap<string, string> {
  if (syntax.keywordCase === "any") {
    return new Map();
  }
  return new Map(
    [...syntax.keywords].map((keyword) => [keyword.toLowerCase(), displayKeyword(syntax, keyword)]),
  );
}

export function syntaxKeywords(syntax: SyntaxDefinition): string[] {
  return [...syntax.keywords].map((keyword) => displayKeyword(syntax, keyword));
}

export { SYNTAX_OPTIONS, resolveSyntax };
export type { SyntaxDefinition, SyntaxId };
