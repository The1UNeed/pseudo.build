export const manualEn = {
  close: "Close",
  codeBlock: {
    language: "Pseudocode",
    copy: "Copy",
    copied: "Copied",
    copyAria: "Copy code to clipboard",
    copiedAria: "Code copied to clipboard",
    unavailable: "Clipboard access is unavailable here.",
  },
  hero: {
    badge: "Cambridge 0478 Guide",
    title: "Detailed Pseudocode Guidelines",
    description:
      "These guidelines are based on Cambridge IGCSE Computer Science (0478) syllabus 2026-2028 pseudocode conventions from the assessment details section (pages 35-49). They focus on practical writing: structuring logic, choosing correct control flow, and building exam-style solutions with clear, readable pseudocode.",
    openEditor: "Open editor",
    notationTitle: "Important notation note",
    notationBeforeCode:
      "Official Cambridge examples use a left-arrow assignment symbol. In this compiler/editor, write assignment as ",
    notationAfterCode: ".",
    editorSupportTitle: "Editor support",
    editorSupport:
      "Settings has an Exam syntax control for Cambridge IGCSE, Cambridge A Level, IB, OCR, and AQA. Completions follow the board you pick, including DIV, MOD, LENGTH, and the extra routines that board uses.",
  },
  navigation: {
    title: "Quick Navigation",
    items: [
      { href: "#workflow", label: "Writing Workflow", num: "1" },
      { href: "#syntax", label: "Core Syntax + Routines", num: "2" },
      { href: "#loops", label: "Loop Logic Deep Dive", num: "3" },
      { href: "#patterns", label: "Reusable Coding Patterns", num: "4" },
      { href: "#worked", label: "Fully Worked Programs", num: "5" },
      { href: "#trace", label: "Trace Tables", num: "6" },
      { href: "#files", label: "File Handling", num: "7" },
      { href: "#exam", label: "Exam Command Words", num: "8" },
    ],
  },
  workflow: {
    title: "Writing Workflow",
    introduction: "Use this process every time you solve a question to avoid logic errors.",
    steps: [
      "Read the problem and identify required inputs and outputs.",
      "Declare every variable/array with correct data type.",
      "Initialize counters/totals/flags before loops.",
      "Choose selection and loop types based on the problem conditions.",
      "Write processing logic in small, readable blocks.",
      "Output final results after processing.",
      "Dry-run with sample values and edge cases.",
    ],
    stepNumbers: ["1", "2", "3", "4", "5", "6", "7"],
    code: `// ==================================================
// EXAM-STYLE PSEUDOCODE STRUCTURE
// ==================================================
// 1) Declarations and constants
DECLARE Index : INTEGER
DECLARE Value : INTEGER
DECLARE Total : INTEGER
CONSTANT MaxItems <- 5

// 2) Initialisation
Total <- 0

// 3) Input + processing
FOR Index <- 1 TO MaxItems
    INPUT Value
    Total <- Total + Value
NEXT Index

// 4) Output
OUTPUT "Total = ", Total`,
  },
  syntax: {
    title: "Core Syntax Rules",
    cards: [
      { title: "Formatting and Names", points: ["Keywords in UPPER CASE: IF, FOR, WHILE, PROCEDURE.", "Identifiers in PascalCase and starting with capital letter.", "No underscore in identifier names.", "Use comments with //."] },
      { title: "Data Types and Constants", points: ["INTEGER, REAL, CHAR, STRING, BOOLEAN.", "DECLARE Name : TYPE for variables.", "CONSTANT Name <- literal for constants.", "Constant value must be a literal, not an expression."] },
      { title: "Operators", points: ["Arithmetic: + - * / ^", "Integer division routines: DIV(a,b), MOD(a,b)", "Relational: = < <= > >= <>", "Logical: AND OR NOT"] },
      { title: "Common Library Routines", points: ["LENGTH(StringValue) returns the number of characters in a string.", "LCASE(StringOrChar) and UCASE(StringOrChar) change case.", "SUBSTRING(StringValue, Start, Length) uses a 1-based start position.", "ROUND(RealValue, Places) rounds a real number to a chosen number of decimal places.", "RANDOM() returns a random number between 0 and 1 inclusive."] },
    ],
    routineTitle: "Official Routine Syntax",
    routineCode: `LENGTH("Happy Days")
LCASE('W')
UCASE("Happy")
SUBSTRING("Happy Days", 1, 5)
ROUND(15.6789, 2)
RANDOM()

Value <- ROUND(RANDOM() * 6, 0)`,
    routineBeforeRound: "Cambridge specifically defines ",
    routineBetween: " and ",
    routineAfterRandom: ", and both routines are available in this editor's autocomplete.",
  },
  loops: {
    title: "Loop Logic Deep Dive",
    introduction: "Students lose marks by choosing the wrong loop type or by writing loops that never terminate. Understand the condition timing and state changes in every cycle.",
    cards: [
      { title: "FOR Loop", points: ["Use FOR when iteration count is known.", "Bounds are inclusive, so FOR I <- 1 TO 5 runs 5 times.", "STEP can be positive or negative."] },
      { title: "WHILE Loop", points: ["Condition checked before loop body.", "Can execute zero times if initial condition is FALSE.", "Update variables inside loop so condition can become FALSE."] },
      { title: "REPEAT UNTIL", points: ["Loop body executes before condition check.", "Always executes at least once.", "Use UNTIL valid condition for input validation patterns."] },
    ],
    checklistTitle: "Termination Checklist",
    checklist: ["Does each iteration change state?", "Can condition eventually become FALSE (WHILE) or TRUE (UNTIL)?", "Are bounds correct (no off-by-one mistakes)?", "Have you initialized counters/totals before the loop?"],
  },
  patterns: {
    title: "Reusable Coding Patterns",
    badges: ["1", "2", "3", "4"],
    whenToUse: "When to use:",
    walkthrough: "Logic walkthrough",
    items: [
      { title: "Counted Loop with FOR (Fixed Number of Repeats)", whenToUse: "You know exactly how many times the loop must run.", logic: ["Set loop variable start and end values.", "Run body once for each value in the range.", "Update totals/counters each cycle.", "Exit automatically when range is complete."], template: `DECLARE Count : INTEGER
DECLARE Total : INTEGER
Total <- 0

FOR Count <- 1 TO 10
    Total <- Total + Count
NEXT Count

OUTPUT "Total = ", Total`, walkthrough: ["Before loop: Total = 0", "Count=1 -> Total=1", "Count=2 -> Total=3", "Count=3 -> Total=6", "...", "Count=10 -> Total=55 then loop ends"] },
      { title: "Pre-condition Loop with WHILE (Unknown Repeats)", whenToUse: "Repeat while a condition remains TRUE.", logic: ["Condition is checked before each iteration.", "If condition is FALSE at start, loop runs zero times.", "Body must change state so condition can eventually become FALSE."], template: `DECLARE Number : INTEGER
INPUT Number

WHILE Number > 9 DO
    Number <- Number - 9
ENDWHILE

OUTPUT Number`, walkthrough: ["Input 28", "28 > 9 true -> Number becomes 19", "19 > 9 true -> Number becomes 10", "10 > 9 true -> Number becomes 1", "1 > 9 false -> exit"] },
      { title: "Post-condition Loop with REPEAT UNTIL (Validation Loop)", whenToUse: "User must do something at least once, then repeat until valid.", logic: ["Body executes first, then condition is tested.", "Best for input validation and menu retries.", "Condition should represent the 'valid/finished' state."], template: `DECLARE Password : STRING

REPEAT
    OUTPUT "Enter password"
    INPUT Password
UNTIL Password = "Secret"`, walkthrough: ["If first entry is wrong, loop repeats.", "If first entry is correct, still valid because one run is guaranteed."] },
      { title: "Nested FOR Loops (Tables / Grids / 2D Arrays)", whenToUse: "Process rows and columns or all combinations of two ranges.", logic: ["Outer loop controls each row/item group.", "Inner loop completes all columns/items for current outer value.", "Reset row-level totals before starting inner loop."], template: `DECLARE Row : INTEGER
DECLARE Column : INTEGER
DECLARE RowTotal : INTEGER
DECLARE GrandTotal : INTEGER
DECLARE Amount : ARRAY[1:5, 1:4] OF INTEGER

GrandTotal <- 0
FOR Row <- 1 TO 5
    RowTotal <- 0
    FOR Column <- 1 TO 4
        RowTotal <- RowTotal + Amount[Row, Column]
    NEXT Column
    OUTPUT "Row ", Row, " total = ", RowTotal
    GrandTotal <- GrandTotal + RowTotal
NEXT Row

OUTPUT "Grand total = ", GrandTotal`, walkthrough: ["Row 1 processes columns 1..4, then outputs row 1 total.", "Row 2 starts fresh with RowTotal reset to 0.", "After final row, GrandTotal contains sum of all cells."] },
    ],
  },
  worked: {
    title: "Fully Worked Programs",
    badges: ["A", "B", "C", "D"],
    introduction: "These are full exam-style answers showing declarations, control flow, and output.",
    objective: "Objective:",
    explanation: "How the logic works",
    sampleRun: "Sample run",
    programs: [
      { title: "Program A: Grade Counter with Selection + Loop", objective: "Read 5 marks, count how many are passes (>= 50), and show class average.", code: `DECLARE Index : INTEGER
DECLARE Mark : INTEGER
DECLARE Total : INTEGER
DECLARE PassCount : INTEGER
DECLARE Average : REAL

Total <- 0
PassCount <- 0

FOR Index <- 1 TO 5
    OUTPUT "Enter mark ", Index
    INPUT Mark
    Total <- Total + Mark

    IF Mark >= 50
      THEN
        PassCount <- PassCount + 1
    ENDIF
NEXT Index

Average <- Total / 5
OUTPUT "Passes = ", PassCount
OUTPUT "Average = ", Average`, explanation: ["This is count-controlled because there are exactly 5 marks.", "Total accumulates all marks; PassCount tracks a condition inside the loop.", "IF branch is optional per iteration; only true marks increment PassCount.", "Average is computed once, after loop completes."], testRun: ["Input marks: 42, 50, 74, 21, 90", "Total = 277", "PassCount = 3", "Average = 55.4"] },
      { title: "Program B: Input Validation Menu with REPEAT UNTIL", objective: "Accept only menu choices 1 to 4.", code: `DECLARE Choice : INTEGER

REPEAT
    OUTPUT "1.View 2.Add 3.Delete 4.Exit"
    INPUT Choice
UNTIL Choice >= 1 AND Choice <= 4

OUTPUT "Accepted choice: ", Choice`, explanation: ["REPEAT UNTIL is ideal because user must be prompted at least once.", "Condition states what valid means, not what invalid means.", "Using AND ensures both lower and upper bounds are respected."], testRun: ["Input: 8 -> invalid, repeats", "Input: 0 -> invalid, repeats", "Input: 3 -> valid, exits"] },
      { title: "Program C: Search in Array with Flag", objective: "Find whether a target name exists in StudentNames[1:30].", code: `DECLARE StudentNames : ARRAY[1:30] OF STRING
DECLARE Index : INTEGER
DECLARE Target : STRING
DECLARE Found : BOOLEAN

INPUT Target
Found <- FALSE

FOR Index <- 1 TO 30
    IF StudentNames[Index] = Target
      THEN
        Found <- TRUE
    ENDIF
NEXT Index

IF Found = TRUE
  THEN
    OUTPUT "Found"
  ELSE
    OUTPUT "Not found"
ENDIF`, explanation: ["Found starts FALSE and flips TRUE when match appears.", "This variant checks all items; examiners usually accept this clear style.", "Final IF uses the flag to output one message."], testRun: ['Target = "Ali" and appears at index 7 -> Found becomes TRUE', "Output: Found"] },
      { title: "Program D: Procedure + Function Together", objective: "Show reuse: a procedure for display and a function for calculation.", code: `PROCEDURE PrintLine(Count : INTEGER)
    DECLARE Index : INTEGER
    FOR Index <- 1 TO Count
        OUTPUT "-"
    NEXT Index
ENDPROCEDURE

FUNCTION SumSquare(A : INTEGER, B : INTEGER) RETURNS INTEGER
    RETURN A * A + B * B
ENDFUNCTION

DECLARE Answer : INTEGER
CALL PrintLine(10)
Answer <- SumSquare(3, 4)
OUTPUT "Answer = ", Answer`, explanation: ["Procedure is called using CALL because it is a full statement.", "Function returns a value, so it appears in an expression.", "Keeping display logic and calculation logic separate improves clarity."], testRun: ["PrintLine outputs 10 dashes.", "SumSquare(3,4) returns 25.", "Output: Answer = 25"] },
    ],
  },
  trace: {
    title: "Trace Tables and Dry Runs",
    introduction: "In exams, a fast dry-run catches most logical mistakes. Track key variables after each iteration.",
    code: `DECLARE N : INTEGER
DECLARE Fact : INTEGER
DECLARE I : INTEGER

INPUT N
Fact <- 1
FOR I <- 1 TO N
    Fact <- Fact * I
NEXT I
OUTPUT Fact`,
    headers: ["I", "Fact before", "Fact after Fact <- Fact * I"],
    rows: [[1, 1, 1], [2, 1, 2], [3, 2, 6], [4, 6, 24], [5, 24, 120]],
    conclusion: "For N = 5, expected output is 120. If your trace table and output disagree, debug the loop boundaries and initial value.",
  },
  files: {
    title: "File Handling Guide",
    stepNumbers: ["1", "2", "3", "4"],
    steps: ["Declare file name and data variables.", "OPENFILE with FOR READ or FOR WRITE.", "Use READFILE/WRITEFILE operations.", "CLOSEFILE when finished."],
    code: `DECLARE FileName : STRING
DECLARE LineText : STRING

FileName <- "Scores.txt"
OPENFILE FileName FOR READ

READFILE FileName, LineText
OUTPUT "First line was: ", LineText

CLOSEFILE FileName`,
    warning: "Avoid opening the same file in both READ and WRITE simultaneously, and always close files even in short algorithms.",
  },
  exam: {
    title: "Exam Command Words",
    headers: ["Command Word", "Meaning in Answers"],
    words: [
      ["Calculate", "Work out from given facts, figures or information."], ["Compare", "Identify and comment on similarities and differences."], ["Define", "Give the precise meaning."], ["Demonstrate", "Show how, or give an example."], ["Describe", "State points, characteristics and main features."], ["Evaluate", "Judge quality, importance, amount or value."], ["Explain", "Give reasons, show relationships, and support with evidence."], ["Give", "Produce an answer from source material or recall."], ["Identify", "Name, select or recognise."], ["Outline", "Set out main points."], ["Show (that)", "Provide structured evidence leading to a result."], ["State", "Express in clear terms."], ["Suggest", "Apply knowledge to give valid proposals or considerations."],
    ],
  },
  finalChecklist: {
    title: "Final Checklist Before Submitting",
    items: ["All variables/arrays declared with correct data types.", "Initial values set for counters, totals, and flags.", "Correct loop choice: FOR vs WHILE vs REPEAT UNTIL.", "All IF/CASE/loop blocks properly ended.", "Procedure calls use CALL; function calls appear in expressions.", "Outputs match the question requirements exactly.", "Built-in routines such as ROUND() and RANDOM() use the correct syntax.", "Dry-run tested with normal and edge-case inputs."],
  },
};

export type ManualContentData = typeof manualEn;
