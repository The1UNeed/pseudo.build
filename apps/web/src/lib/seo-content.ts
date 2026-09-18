import type { Locale } from "@/i18n/config";
import { docsZh, faqZh, postsZh } from "./seo-content.zh";

export const siteUrl = "https://pseudo.build";

export const productName = "Pseudo Build";

export const organizationName = "Pseudo Build";

export const authorName = "Alex Xin Liu";

export const githubUrl = "https://github.com/The1UNeed/pseudo.build";

/** Monitored mailbox for privacy, security, and legal requests. */
export const contactEmail = "privacy@pseudo.build";

export const securityEmail = "security@pseudo.build";

export const productSlogan = "Free and open-source pseudo code editor and compiler.";

export const productTagline =
  "A free and open-source pseudo code editor and compiler for writing, running, debugging, and learning structured pseudocode in the browser.";

export type SeoDoc = {
  slug: string;
  title: string;
  description: string;
  updated: string;
  sections: Array<{
    heading: string;
    body: string[];
    example?: string;
  }>;
};

export type SeoPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  tags: string[];
  sections: Array<{
    heading: string;
    body: string[];
  }>;
};

export const docs: SeoDoc[] = [
  {
    slug: "getting-started",
    title: "Getting started with Pseudo Build",
    description:
      "Open the browser editor, write your first pseudocode program, compile it, and run it directly in the browser.",
    updated: "2026-05-04",
    sections: [
      {
        heading: "Start in the browser",
        body: [
          "Open the app, create or select a pseudocode document, and type directly into the editor. Pseudo Build saves local work during development and supports cloud workspace sync on the deployed site when you sign in.",
          "Use the Run button to compile the current file. Diagnostics appear with line and column details when the compiler finds syntax or semantic problems.",
        ],
      },
      {
        heading: "First program",
        body: [
          "A simple program declares variables, assigns values with <-, and writes output with OUTPUT. Keep one statement per line when you are learning because diagnostics are easier to follow.",
        ],
        example: `DECLARE Name : STRING
INPUT Name
OUTPUT "Hello ", Name`,
      },
    ],
  },
  {
    slug: "syntax",
    title: "Pseudocode syntax reference",
    description:
      "Reference the core pseudocode syntax supported by the browser compiler, including assignment, conditions, loops, arrays, and output.",
    updated: "2026-05-04",
    sections: [
      {
        heading: "Core statements",
        body: [
          "Use DECLARE for variables, <- for assignment, INPUT for user input, and OUTPUT for displayed values.",
          "Pick Cambridge IGCSE, Cambridge A Level, IB, OCR, or AQA in Settings so the compiler follows that board's notation.",
        ],
        example: `DECLARE Total : INTEGER
Total <- 0
OUTPUT Total`,
      },
      {
        heading: "Blocks",
        body: [
          "Selection and loop blocks use clear closing keywords such as ENDIF, NEXT, ENDWHILE, and UNTIL. Matching block endings makes programs easier to trace and debug.",
        ],
      },
    ],
  },
  {
    slug: "variables-input-output",
    title: "Variables, input, and output",
    description:
      "Learn how Pseudo Build handles declarations, assignment, INPUT prompts, and OUTPUT statements.",
    updated: "2026-05-04",
    sections: [
      {
        heading: "Declare before use",
        body: [
          "Declare each variable with a type before assigning to it. This helps the compiler catch misspellings and mismatched values early.",
          "Common scalar types include INTEGER, REAL, STRING, CHAR, and BOOLEAN.",
        ],
        example: `DECLARE Score : INTEGER
DECLARE Passed : BOOLEAN
Score <- 74
Passed <- TRUE`,
      },
      {
        heading: "Interactive input",
        body: [
          "When a program reaches INPUT, the terminal asks for the next line of input. This lets you test validation loops and menu programs in the browser.",
        ],
      },
    ],
  },
  {
    slug: "selection",
    title: "IF, THEN, ELSE selection",
    description:
      "Use IF statements to branch pseudocode programs based on comparisons and Boolean expressions.",
    updated: "2026-05-04",
    sections: [
      {
        heading: "Choose between paths",
        body: [
          "Selection runs one block when a condition is true and optionally runs an ELSE block when it is false.",
          "Use indentation consistently. The compiler reads the keywords, but clean indentation makes tracing much easier.",
        ],
        example: `IF Mark >= 50
  THEN
    OUTPUT "Pass"
  ELSE
    OUTPUT "Try again"
ENDIF`,
      },
    ],
  },
  {
    slug: "loops",
    title: "FOR, WHILE, and REPEAT loops",
    description:
      "Choose the right pseudocode loop for fixed counts, pre-condition repetition, and validation tasks.",
    updated: "2026-05-04",
    sections: [
      {
        heading: "Pick the loop by intent",
        body: [
          "Use FOR when the repeat count is known. Use WHILE when a condition must be checked before each run. Use REPEAT UNTIL when the body must run at least once.",
        ],
        example: `FOR Index <- 1 TO 5
    OUTPUT Index
NEXT Index`,
      },
      {
        heading: "Avoid endless loops",
        body: [
          "A WHILE loop must update the value used by the condition. If the condition never changes, the program cannot finish.",
        ],
      },
    ],
  },
  {
    slug: "arrays",
    title: "Arrays and indexed values",
    description:
      "Declare arrays, access indexed items, and process list-style data in pseudocode.",
    updated: "2026-05-04",
    sections: [
      {
        heading: "Declare an array",
        body: [
          "Arrays store related values under one name. Use indexes to read or write a specific item.",
        ],
        example: `DECLARE Scores : ARRAY[1:5] OF INTEGER
Scores[1] <- 80
OUTPUT Scores[1]`,
      },
    ],
  },
  {
    slug: "flowcharts",
    title: "Flowcharts from pseudocode",
    description:
      "Use the Pseudo Build flowchart mode to reason about process, input/output, and decision nodes.",
    updated: "2026-05-04",
    sections: [
      {
        heading: "Visualize control flow",
        body: [
          "Flowcharts help you see where a program starts, where decisions split, and where loops return to an earlier step.",
          "Use flowchart mode as a planning companion, then keep the pseudocode source as the final executable version.",
        ],
      },
    ],
  },
  {
    slug: "saving-workspaces",
    title: "Saving browser workspaces",
    description:
      "Understand how local browser storage and signed-in cloud sync work in Pseudo Build.",
    updated: "2026-05-04",
    sections: [
      {
        heading: "Local and cloud modes",
        body: [
          "On localhost, Pseudo Build saves to browser storage. On pseudo.build, signed-in users can save workspaces through Clerk authentication and Convex cloud sync.",
          "Signed-out production sessions can edit in memory, but signing in is required before cloud saving.",
        ],
      },
    ],
  },
  {
    slug: "debugging-errors",
    title: "Debugging compiler errors",
    description:
      "Use diagnostics, line numbers, and generated output to fix pseudocode syntax and logic problems.",
    updated: "2026-05-04",
    sections: [
      {
        heading: "Read the first error first",
        body: [
          "Syntax problems often cascade. Fix the earliest error, run again, and then move to the next diagnostic.",
          "Line and column details point to where the compiler first noticed the problem, which may be slightly after the actual typo.",
        ],
      },
      {
        heading: "Check declarations and block endings",
        body: [
          "Many beginner errors come from using an undeclared variable, mixing value types, or forgetting an ENDIF, NEXT, ENDWHILE, or UNTIL.",
        ],
      },
    ],
  },
];

export const posts: SeoPost[] = [
  {
    slug: "igcse-pseudocode-basics",
    title: "IGCSE pseudocode basics: a practical starting point",
    description:
      "A compact guide to declarations, assignment, input, output, and the habits that make pseudocode easier to trace.",
    date: "2026-05-04",
    readingTime: "5 min read",
    tags: ["IGCSE", "Pseudocode", "Basics"],
    sections: [
      {
        heading: "Start with explicit data",
        body: [
          "Good pseudocode is not just English with keywords. It names data clearly, declares the expected type, and makes each change visible.",
          "For beginners, the best habit is to write small programs that compile, run, and produce one obvious result.",
        ],
      },
      {
        heading: "Trace before you optimize",
        body: [
          "Before making a program shorter, trace each line with a few sample values. A clear trace table reveals missing initialization and off-by-one loop mistakes quickly.",
        ],
      },
    ],
  },
  {
    slug: "how-to-trace-pseudocode",
    title: "How to trace pseudocode without guessing",
    description:
      "Use a repeatable trace-table process to follow variables, branches, and loop updates.",
    date: "2026-05-04",
    readingTime: "6 min read",
    tags: ["Tracing", "Revision", "Debugging"],
    sections: [
      {
        heading: "Write the variables as columns",
        body: [
          "A trace table turns invisible program state into something you can inspect. Add one column for each variable that changes.",
          "Update the table only when an assignment, INPUT, or loop counter change happens.",
        ],
      },
      {
        heading: "Mark branch decisions",
        body: [
          "For IF and WHILE conditions, write true or false beside the condition. This prevents the most common mistake: running a block that the program would skip.",
        ],
      },
    ],
  },
  {
    slug: "choosing-the-right-loop",
    title: "Choosing between FOR, WHILE, and REPEAT UNTIL",
    description:
      "Learn a simple decision rule for picking the right pseudocode loop structure.",
    date: "2026-05-04",
    readingTime: "4 min read",
    tags: ["Loops", "Control flow", "Syntax"],
    sections: [
      {
        heading: "Known count means FOR",
        body: [
          "When you know exactly how many values, rows, or attempts you need to process, a FOR loop communicates that intent clearly.",
        ],
      },
      {
        heading: "Unknown count means condition loops",
        body: [
          "Use WHILE when the condition must be checked before the first run. Use REPEAT UNTIL when the prompt or action must happen at least once.",
        ],
      },
    ],
  },
  {
    slug: "common-pseudocode-compiler-errors",
    title: "Common pseudocode compiler errors and how to fix them",
    description:
      "Fix undeclared variables, missing block endings, invalid assignment, and type mismatches faster.",
    date: "2026-05-04",
    readingTime: "7 min read",
    tags: ["Compiler errors", "Diagnostics", "Practice"],
    sections: [
      {
        heading: "Undeclared names",
        body: [
          "If a variable is misspelled once, the compiler may treat it as a different undeclared name. Compare the diagnostic spelling with the declaration.",
        ],
      },
      {
        heading: "Block endings",
        body: [
          "Missing ENDIF, NEXT, ENDWHILE, or UNTIL changes the structure of every line that follows. Fix block structure before chasing later errors.",
        ],
      },
    ],
  },
  {
    slug: "why-use-a-browser-pseudocode-editor",
    title: "Why use a browser pseudocode editor?",
    description:
      "A browser-based compiler makes pseudocode practice faster because feedback, examples, and execution live in one place.",
    date: "2026-05-04",
    readingTime: "5 min read",
    tags: ["Browser editor", "Learning", "Tools"],
    sections: [
      {
        heading: "Feedback changes practice",
        body: [
          "When feedback is immediate, students can test smaller changes and understand the exact line that caused a problem.",
          "A browser editor also removes setup work: open the page, type, run, and revise.",
        ],
      },
      {
        heading: "Keep learning material nearby",
        body: [
          "Docs, examples, and the manual should sit beside the editor so reference material supports practice instead of interrupting it.",
        ],
      },
    ],
  },
];

export type FaqItem = { question: string; answer: string };

export const faqItems: FaqItem[] = [
  {
    question: "What is Pseudo Build?",
    answer:
      "Pseudo Build is a free and open-source pseudo code editor and compiler. The editor, compiler, runner, flowchart view, manual, and workspace tools all run in the browser app.",
  },
  {
    question: "Can I run pseudocode in the browser?",
    answer:
      "Yes. Pseudo Build compiles supported pseudocode to an AST and runs it in the browser runtime, including interactive INPUT prompts.",
  },
  {
    question: "Does the browser version save my work?",
    answer:
      "Local development saves to browser storage. On pseudo.build, signed-in users can save workspaces with Clerk authentication and Convex cloud sync.",
  },
  {
    question: "Is this only for IGCSE Computer Science?",
    answer:
      "No. Settings lets you switch between Cambridge IGCSE, Cambridge AS and A Level, IB Diploma Programme, OCR GCSE, and AQA GCSE notation. The compiler, highlighter, and completions follow the syntax you pick.",
  },
  {
    question: "Which exam boards does the pseudocode follow?",
    answer:
      "The syntax follows the Cambridge International pseudocode guide used in IGCSE Computer Science (0478 and 0984), O Level Computer Science (2210), and AS and A Level Computer Science (9618). Pseudo Build is an independent project and is not affiliated with or endorsed by Cambridge.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. The editor, compiler, and runtime load in any modern browser on a laptop, Chromebook, or tablet. Nothing is installed and nothing needs to be approved by school IT.",
  },
  {
    question: "Is Pseudo Build really free and open source?",
    answer:
      "Yes. Pseudo Build is free to use and the source code is published under the GNU GPL v3 on GitHub. You can read it, run it yourself, and contribute.",
  },
];

const docsByLocale: Record<Locale, SeoDoc[]> = { en: docs, zh: docsZh };
const postsByLocale: Record<Locale, SeoPost[]> = { en: posts, zh: postsZh };
const faqByLocale: Record<Locale, FaqItem[]> = { en: faqItems, zh: faqZh };

export function getDocs(locale: Locale): SeoDoc[] {
  return docsByLocale[locale];
}

export function getPosts(locale: Locale): SeoPost[] {
  return postsByLocale[locale];
}

export function getFaq(locale: Locale): FaqItem[] {
  return faqByLocale[locale];
}

export function getDoc(locale: Locale, slug: string) {
  return getDocs(locale).find((doc) => doc.slug === slug);
}

export function getPost(locale: Locale, slug: string) {
  return getPosts(locale).find((post) => post.slug === slug);
}
