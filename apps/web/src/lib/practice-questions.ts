import type { Locale } from "@/i18n/config";
import { practiceQuestionsZh } from "./practice-questions.zh";

export const practiceTopics = ["io", "selection", "loops", "arrays", "strings", "procedures"] as const;
export type PracticeTopic = (typeof practiceTopics)[number];

export const practiceDifficulties = ["core", "extended"] as const;
export type PracticeDifficulty = (typeof practiceDifficulties)[number];

export type PracticeSample = {
  input: string[];
  output: string[];
};

export type PracticeQuestion = {
  id: string;
  topic: PracticeTopic;
  difficulty: PracticeDifficulty;
  exam: string;
  title: string;
  description: string;
  prompt: string[];
  requirements: string[];
  sample: PracticeSample;
  starter: string;
};

export type RandomQuestionOptions = {
  topic?: PracticeTopic | "any";
  difficulty?: PracticeDifficulty | "any";
  excludeId?: string;
  random?: () => number;
};

export const practiceQuestions: PracticeQuestion[] = [
  {
    id: "greet-by-name",
    topic: "io",
    difficulty: "core",
    exam: "IGCSE 0478",
    title: "Greet the user by name",
    description:
      "IGCSE-style INPUT and OUTPUT practice: read a name and print a greeting in Cambridge pseudocode.",
    prompt: [
      "A program should ask the user for their name and then greet them.",
      "Write pseudocode that reads one name and outputs a greeting that includes that name.",
    ],
    requirements: [
      "Declare a STRING variable for the name.",
      "Use INPUT to read the name.",
      "Use OUTPUT to print a greeting that includes the name.",
    ],
    sample: {
      input: ["Alex"],
      output: ['Hello Alex'],
    },
    starter: `// Read a name and output a greeting that includes it.
DECLARE Name : STRING
`,
  },
  {
    id: "pass-or-fail",
    topic: "selection",
    difficulty: "core",
    exam: "IGCSE 0478",
    title: "Pass or fail from a mark",
    description:
      "Practice an IF statement in Cambridge IGCSE pseudocode: output Pass or Fail from a single mark.",
    prompt: [
      "A test is passed when the mark is 50 or more.",
      "Write pseudocode that reads one integer mark and outputs Pass or Fail.",
    ],
    requirements: [
      "Declare an INTEGER variable for the mark.",
      "Use IF ... THEN ... ELSE ... ENDIF.",
      "Output exactly Pass or Fail.",
    ],
    sample: {
      input: ["74"],
      output: ["Pass"],
    },
    starter: `// Input one mark. Output "Pass" if the mark is 50 or more, otherwise "Fail".
DECLARE Mark : INTEGER
`,
  },
  {
    id: "letter-grade",
    topic: "selection",
    difficulty: "extended",
    exam: "IGCSE 0478",
    title: "Letter grade from a mark",
    description:
      "Nested IF or CASE practice for IGCSE Computer Science: convert a mark into a letter grade.",
    prompt: [
      "Marks convert to grades as follows: 80 or more is A, 70 or more is B, 60 or more is C, otherwise U.",
      "Write pseudocode that reads one integer mark and outputs the matching grade letter.",
    ],
    requirements: [
      "Read one INTEGER mark.",
      "Use nested IF statements or CASE.",
      "Output A, B, C, or U.",
    ],
    sample: {
      input: ["73"],
      output: ["B"],
    },
    starter: `// Convert one mark into A, B, C, or U using the grade boundaries in the question.
DECLARE Mark : INTEGER
`,
  },
  {
    id: "validate-choice",
    topic: "loops",
    difficulty: "core",
    exam: "IGCSE 0478",
    title: "Validate a menu choice",
    description:
      "REPEAT UNTIL practice: keep reading a menu choice until the value is between 1 and 4.",
    prompt: [
      "A menu accepts only the numbers 1, 2, 3, or 4.",
      "Write pseudocode that keeps asking for a choice until the user enters a valid number, then outputs Accepted.",
    ],
    requirements: [
      "Use REPEAT ... UNTIL.",
      "The prompt must run at least once.",
      "Stop only when the choice is between 1 and 4 inclusive.",
      "Output Accepted after a valid choice.",
    ],
    sample: {
      input: ["8", "0", "3"],
      output: ["Accepted"],
    },
    starter: `// Keep reading Choice until it is between 1 and 4, then output Accepted.
DECLARE Choice : INTEGER
`,
  },
  {
    id: "total-five-marks",
    topic: "loops",
    difficulty: "core",
    exam: "O Level 2210",
    title: "Total five marks",
    description:
      "FOR loop practice for IGCSE and O Level: read five marks and output their total.",
    prompt: [
      "A teacher records five marks.",
      "Write pseudocode that reads five integer marks and outputs their total.",
    ],
    requirements: [
      "Use a FOR loop that runs exactly five times.",
      "Initialise the total to 0 before the loop.",
      "Output the total after the loop.",
    ],
    sample: {
      input: ["10", "20", "30", "40", "50"],
      output: ["150"],
    },
    starter: `// Read five marks with a FOR loop and output the total.
DECLARE Index : INTEGER
DECLARE Mark : INTEGER
DECLARE Total : INTEGER
`,
  },
  {
    id: "count-passes",
    topic: "loops",
    difficulty: "extended",
    exam: "IGCSE 0478",
    title: "Count how many students passed",
    description:
      "Combine a FOR loop and an IF statement to count how many of ten marks are 50 or more.",
    prompt: [
      "Ten students sit a test. A pass is a mark of 50 or more.",
      "Write pseudocode that reads ten marks and outputs how many students passed.",
    ],
    requirements: [
      "Use a count-controlled loop for ten marks.",
      "Count only marks that are 50 or more.",
      "Output the pass count after the loop.",
    ],
    sample: {
      input: ["40", "50", "61", "22", "90", "49", "50", "88", "12", "73"],
      output: ["6"],
    },
    starter: `// Read 10 marks. Count how many are 50 or more, then output that count.
DECLARE Index : INTEGER
DECLARE Mark : INTEGER
DECLARE PassCount : INTEGER
`,
  },
  {
    id: "largest-value",
    topic: "loops",
    difficulty: "core",
    exam: "IGCSE 0478",
    title: "Find the largest of ten numbers",
    description:
      "Running-maximum practice: read ten integers and output the largest value.",
    prompt: [
      "A program reads ten integers one after another.",
      "Write pseudocode that outputs the largest of those ten numbers.",
    ],
    requirements: [
      "Read ten INTEGER values.",
      "Keep a variable for the largest value seen so far.",
      "Output the largest value after the loop.",
    ],
    sample: {
      input: ["4", "17", "9", "23", "8", "23", "1", "15", "6", "12"],
      output: ["23"],
    },
    starter: `// Read 10 numbers and output the largest.
DECLARE Index : INTEGER
DECLARE Value : INTEGER
DECLARE Largest : INTEGER
`,
  },
  {
    id: "linear-search",
    topic: "arrays",
    difficulty: "extended",
    exam: "AS & A Level 9618",
    title: "Search an array for a name",
    description:
      "Linear search practice with a Boolean flag: find whether a target name exists in an array.",
    prompt: [
      "An array Names stores 5 student names in positions 1 to 5.",
      "Write pseudocode that reads a target name, searches the array, and outputs Found or Not found.",
    ],
    requirements: [
      "Declare Names as ARRAY[1:5] OF STRING.",
      "You may assume the five names have already been stored.",
      "Use a Boolean flag during the search.",
      "Output Found or Not found.",
    ],
    sample: {
      input: ["Sam"],
      output: ["Found"],
    },
    starter: `// Names already holds five student names. Search for Target and output Found or Not found.
DECLARE Names : ARRAY[1:5] OF STRING
DECLARE Index : INTEGER
DECLARE Target : STRING
DECLARE Found : BOOLEAN

Names[1] <- "Alex"
Names[2] <- "Sam"
Names[3] <- "Riley"
Names[4] <- "Jordan"
Names[5] <- "Chris"
`,
  },
  {
    id: "count-positives",
    topic: "arrays",
    difficulty: "core",
    exam: "IGCSE 0478",
    title: "Count positive values in an array",
    description:
      "Array traversal practice: count how many stored integers are greater than zero.",
    prompt: [
      "An array Values stores 6 integers in positions 1 to 6.",
      "Write pseudocode that counts how many of those values are greater than 0 and outputs the count.",
    ],
    requirements: [
      "Declare Values as ARRAY[1:6] OF INTEGER.",
      "You may assume the six values have already been stored.",
      "Use a loop from 1 to 6.",
      "Output the count of values greater than 0.",
    ],
    sample: {
      input: [],
      output: ["4"],
    },
    starter: `// Count how many values in the array are greater than 0, then output the count.
DECLARE Values : ARRAY[1:6] OF INTEGER
DECLARE Index : INTEGER
DECLARE Count : INTEGER

Values[1] <- 4
Values[2] <- -1
Values[3] <- 0
Values[4] <- 18
Values[5] <- 3
Values[6] <- -7
`,
  },
  {
    id: "password-length",
    topic: "strings",
    difficulty: "core",
    exam: "IGCSE 0478",
    title: "Check a password length",
    description:
      "LENGTH string routine practice: accept a password only when it has at least 8 characters.",
    prompt: [
      "A password is valid when it has 8 or more characters.",
      "Write pseudocode that reads a password and outputs Valid or Too short.",
    ],
    requirements: [
      "Declare a STRING variable for the password.",
      "Use LENGTH(Password) to test the length.",
      "Output Valid or Too short.",
    ],
    sample: {
      input: ["secret12"],
      output: ["Valid"],
    },
    starter: `// Read a password. Output "Valid" if LENGTH is 8 or more, otherwise "Too short".
DECLARE Password : STRING
`,
  },
  {
    id: "first-initials",
    topic: "strings",
    difficulty: "extended",
    exam: "IGCSE 0478",
    title: "Output initials from two names",
    description:
      "SUBSTRING practice: read a first name and a last name, then output the two initials.",
    prompt: [
      "A program reads a first name and a last name.",
      "Write pseudocode that outputs the first letter of each name with no extra spaces.",
    ],
    requirements: [
      "Read two STRING values: first name then last name.",
      "Use SUBSTRING with a start position of 1 and a length of 1.",
      "Output the two initials next to each other, for example AK.",
    ],
    sample: {
      input: ["Alex", "Kim"],
      output: ["AK"],
    },
    starter: `// Read FirstName and LastName. Output the first letter of each, joined together.
DECLARE FirstName : STRING
DECLARE LastName : STRING
`,
  },
  {
    id: "print-heading",
    topic: "procedures",
    difficulty: "extended",
    exam: "AS & A Level 9618",
    title: "Print a heading with a procedure",
    description:
      "PROCEDURE practice for A Level Computer Science: output a line of stars, a title, then another line of stars.",
    prompt: [
      "Write a procedure Heading that outputs a line of 10 asterisks, then a title, then another line of 10 asterisks.",
      "The main program should call Heading with the title Report.",
    ],
    requirements: [
      "Declare PROCEDURE Heading with a STRING parameter Title.",
      "The procedure outputs a line of 10 asterisks, then the title, then another line of 10 asterisks.",
      "The main program uses CALL Heading(\"Report\").",
    ],
    sample: {
      input: [],
      output: ["**********", "Report", "**********"],
    },
    starter: `// Write PROCEDURE Heading(Title : STRING) and call it with "Report".
`,
  },
];

const questionsByLocale: Record<Locale, PracticeQuestion[]> = {
  en: practiceQuestions,
  zh: practiceQuestionsZh,
};

export function getPracticeQuestions(locale: Locale): PracticeQuestion[] {
  return questionsByLocale[locale];
}

export function getPracticeQuestion(locale: Locale, id: string): PracticeQuestion | undefined {
  return getPracticeQuestions(locale).find((question) => question.id === id);
}

/** Workspace files for the bank use this prefix so `practice-notes.pseudo` stays a normal file. */
export const practiceFilePrefix = "practice.q.";

export function practiceDocumentBasename(id: string): string {
  return `${practiceFilePrefix}${id}`;
}

export function questionIdFromDocumentName(name: string): string | null {
  const base = name.replace(/\.pseudo$/i, "");
  if (!base.startsWith(practiceFilePrefix)) {
    return null;
  }
  const id = base.slice(practiceFilePrefix.length);
  return id.length > 0 ? id : null;
}

export function filterPracticeQuestions(
  questions: readonly PracticeQuestion[],
  options: Pick<RandomQuestionOptions, "topic" | "difficulty" | "excludeId"> = {},
): PracticeQuestion[] {
  const topic = options.topic ?? "any";
  const difficulty = options.difficulty ?? "any";
  return questions.filter((question) => {
    const topicOk = topic === "any" || question.topic === topic;
    const difficultyOk = difficulty === "any" || question.difficulty === difficulty;
    const excludeOk = !options.excludeId || question.id !== options.excludeId;
    return topicOk && difficultyOk && excludeOk;
  });
}

/** True when the requested filter is empty (or only the current question) so a pick uses the full bank. */
export function practiceFilterFallsBack(
  questions: readonly PracticeQuestion[],
  options: RandomQuestionOptions = {},
): boolean {
  const matching = filterPracticeQuestions(questions, {
    topic: options.topic,
    difficulty: options.difficulty,
  });
  const withoutCurrent = options.excludeId
    ? matching.filter((question) => question.id !== options.excludeId)
    : matching;
  if (withoutCurrent.length > 0) {
    return false;
  }
  return filterPracticeQuestions(questions, { excludeId: options.excludeId }).length > 0;
}

export function relatedPracticeQuestions(
  questions: readonly PracticeQuestion[],
  id: string,
  limit = 3,
): PracticeQuestion[] {
  const current = questions.find((question) => question.id === id);
  const sameTopic = questions.filter((question) => question.id !== id && question.topic === current?.topic);
  const rest = questions.filter(
    (question) => question.id !== id && !sameTopic.some((candidate) => candidate.id === question.id),
  );
  return [...sameTopic, ...rest].slice(0, limit);
}

function clampIndex(randomValue: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  if (!Number.isFinite(randomValue) || randomValue < 0) {
    return 0;
  }
  return Math.min(length - 1, Math.floor(randomValue * length));
}

/** Pick one question from the bank, optionally filtered by topic or difficulty. */
export function pickRandomQuestion(
  questions: readonly PracticeQuestion[],
  options: RandomQuestionOptions = {},
): PracticeQuestion | null {
  const random = options.random ?? Math.random;
  const matching = filterPracticeQuestions(questions, {
    topic: options.topic,
    difficulty: options.difficulty,
    excludeId: options.excludeId,
  });
  const pickFrom =
    matching.length > 0
      ? matching
      : filterPracticeQuestions(questions, { excludeId: options.excludeId });
  const lastResort = matching.length > 0 ? matching : [...questions];
  const pool = pickFrom.length > 0 ? pickFrom : lastResort;
  if (pool.length === 0) {
    return null;
  }

  return pool[clampIndex(random(), pool.length)] ?? null;
}
