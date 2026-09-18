import { describe, expect, it } from "vitest";
import { compilePseudocode } from "./index";
import { manualEn } from "../../../apps/web/src/app/[locale]/(public)/manual/manualContent.en";
import { manualZh } from "../../../apps/web/src/app/[locale]/(public)/manual/manualContent.zh";

// Every multi-line string in the manual is a code example.
function collectExamples(node: unknown, path = "", out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof node === "string") {
    if (node.includes("\n")) out.push([path, node]);
  } else if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      collectExamples(value, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}

// Examples that are not complete programs, with the reason.
const NOT_PROGRAMS: Record<string, string> = {
  "syntax.routineCode": "Lists bare routine calls. Each line is compiled on its own below.",
};

const errorsIn = (source: string) =>
  compilePseudocode({ source, filename: "main.pseudo", strict: true }).diagnostics.map(
    (d) => `${d.code} L${d.line}:${d.column} ${d.message}`,
  );

describe.each([
  ["en", manualEn],
  ["zh", manualZh],
])("manual examples (%s)", (_locale, manual) => {
  const examples = collectExamples(manual);

  it("finds the code examples", () => {
    expect(examples.length).toBeGreaterThanOrEqual(11);
  });

  it.each(examples.filter(([path]) => !NOT_PROGRAMS[path]))("%s compiles", (_path, source) => {
    expect(errorsIn(source)).toEqual([]);
  });

  it("routine examples compile line by line", () => {
    const lines = manual.syntax.routineCode.split("\n").filter((line) => line.trim());
    for (const line of lines) {
      const source = line.includes("<-") ? `DECLARE Value : INTEGER\n${line}` : `OUTPUT ${line}`;
      expect(errorsIn(source), source).toEqual([]);
    }
  });
});
