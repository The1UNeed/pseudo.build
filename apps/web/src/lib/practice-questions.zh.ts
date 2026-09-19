import type { PracticeQuestion } from "./practice-questions";

export const practiceQuestionsZh: PracticeQuestion[] = [
  {
    id: "greet-by-name",
    topic: "io",
    difficulty: "core",
    exam: "IGCSE 0478",
    title: "按名字打招呼",
    description: "IGCSE 风格的 INPUT 与 OUTPUT 练习：读入名字并用剑桥伪代码输出问候。",
    prompt: ["程序应询问用户的名字，然后向他打招呼。", "编写伪代码：读取一个名字，并输出包含该名字的问候语。"],
    requirements: ["声明一个 STRING 变量存放名字。", "用 INPUT 读取名字。", "用 OUTPUT 打印包含该名字的问候。"],
    sample: {
      input: ["Alex"],
      output: ["Hello Alex"],
    },
    starter: `// 读取一个名字，输出包含该名字的问候。
DECLARE Name : STRING
`,
  },
  {
    id: "pass-or-fail",
    topic: "selection",
    difficulty: "core",
    exam: "IGCSE 0478",
    title: "根据分数判断及格",
    description: "练习剑桥 IGCSE 伪代码中的 IF 语句：根据一个分数输出 Pass 或 Fail。",
    prompt: ["分数大于或等于 50 视为及格。", "编写伪代码：读取一个整数分数，输出 Pass 或 Fail。"],
    requirements: ["声明一个 INTEGER 变量存放分数。", "使用 IF ... THEN ... ELSE ... ENDIF。", "只输出 Pass 或 Fail。"],
    sample: {
      input: ["74"],
      output: ["Pass"],
    },
    starter: `// 输入一个分数。大于等于 50 输出 "Pass"，否则输出 "Fail"。
DECLARE Mark : INTEGER
`,
  },
  {
    id: "letter-grade",
    topic: "selection",
    difficulty: "extended",
    exam: "IGCSE 0478",
    title: "根据分数给出等级",
    description: "IGCSE 计算机科学的嵌套 IF 或 CASE 练习：把分数转换成字母等级。",
    prompt: [
      "分数对应等级：80 及以上为 A，70 及以上为 B，60 及以上为 C，其余为 U。",
      "编写伪代码：读取一个整数分数，输出对应的等级字母。",
    ],
    requirements: ["读取一个 INTEGER 分数。", "使用嵌套 IF 或 CASE。", "输出 A、B、C 或 U。"],
    sample: {
      input: ["73"],
      output: ["B"],
    },
    starter: `// 按题目中的分数线，把一个分数转换成 A、B、C 或 U。
DECLARE Mark : INTEGER
`,
  },
  {
    id: "validate-choice",
    topic: "loops",
    difficulty: "core",
    exam: "IGCSE 0478",
    title: "校验菜单选项",
    description: "REPEAT UNTIL 练习：不断读取菜单选项，直到数值落在 1 到 4 之间。",
    prompt: [
      "菜单只接受 1、2、3 或 4。",
      "编写伪代码：不断询问选项，直到用户输入有效数字，然后输出 Accepted。",
    ],
    requirements: [
      "使用 REPEAT ... UNTIL。",
      "提示至少出现一次。",
      "仅当选项在 1 到 4（含）之间时停止。",
      "有效选项之后输出 Accepted。",
    ],
    sample: {
      input: ["8", "0", "3"],
      output: ["Accepted"],
    },
    starter: `// 不断读取 Choice，直到它在 1 到 4 之间，然后输出 Accepted。
DECLARE Choice : INTEGER
`,
  },
  {
    id: "total-five-marks",
    topic: "loops",
    difficulty: "core",
    exam: "O Level 2210",
    title: "把五个分数加总",
    description: "面向 IGCSE 与 O Level 的 FOR 循环练习：读取五个分数并输出总和。",
    prompt: ["老师要记录五个分数。", "编写伪代码：读取五个整数分数，并输出它们的总和。"],
    requirements: ["使用恰好运行五次的 FOR 循环。", "循环前把总和初始化为 0。", "循环结束后输出总和。"],
    sample: {
      input: ["10", "20", "30", "40", "50"],
      output: ["150"],
    },
    starter: `// 用 FOR 循环读取五个分数并输出总和。
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
    title: "统计及格人数",
    description: "把 FOR 循环和 IF 语句合在一起，统计十个分数中有多少个大于或等于 50。",
    prompt: ["十名学生参加测验。分数大于或等于 50 算及格。", "编写伪代码：读取十个分数，输出及格人数。"],
    requirements: ["用计数循环处理十个分数。", "只统计大于或等于 50 的分数。", "循环结束后输出及格人数。"],
    sample: {
      input: ["40", "50", "61", "22", "90", "49", "50", "88", "12", "73"],
      output: ["6"],
    },
    starter: `// 读取 10 个分数。统计大于等于 50 的个数，然后输出该个数。
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
    title: "找出十个数中的最大值",
    description: "滚动最大值练习：读取十个整数并输出其中最大的值。",
    prompt: ["程序依次读取十个整数。", "编写伪代码，输出这十个数中的最大值。"],
    requirements: ["读取十个 INTEGER 值。", "用一个变量保存目前见到的最大值。", "循环结束后输出最大值。"],
    sample: {
      input: ["4", "17", "9", "23", "8", "23", "1", "15", "6", "12"],
      output: ["23"],
    },
    starter: `// 读取 10 个数并输出最大值。
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
    title: "在数组中查找名字",
    description: "带布尔标志的线性查找练习：判断目标名字是否存在于数组中。",
    prompt: [
      "数组 Names 在位置 1 到 5 存放 5 个学生名字。",
      "编写伪代码：读取目标名字，搜索数组，输出 Found 或 Not found。",
    ],
    requirements: [
      "把 Names 声明为 ARRAY[1:5] OF STRING。",
      "可以假定五个名字已经存好。",
      "查找过程使用布尔标志。",
      "输出 Found 或 Not found。",
    ],
    sample: {
      input: ["Sam"],
      output: ["Found"],
    },
    starter: `// Names 已经存了五个学生名字。查找 Target，输出 Found 或 Not found。
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
    title: "统计数组中的正数",
    description: "数组遍历练习：统计已存储整数中有多少个大于零。",
    prompt: [
      "数组 Values 在位置 1 到 6 存放 6 个整数。",
      "编写伪代码：统计其中有多少个值大于 0，并输出该个数。",
    ],
    requirements: [
      "把 Values 声明为 ARRAY[1:6] OF INTEGER。",
      "可以假定六个值已经存好。",
      "使用从 1 到 6 的循环。",
      "输出大于 0 的个数。",
    ],
    sample: {
      input: [],
      output: ["4"],
    },
    starter: `// 统计数组中大于 0 的值的个数，然后输出该个数。
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
    title: "检查密码长度",
    description: "LENGTH 字符串例程练习：密码至少 8 个字符才算有效。",
    prompt: ["密码在不少于 8 个字符时有效。", "编写伪代码：读取密码，输出 Valid 或 Too short。"],
    requirements: ["声明一个 STRING 变量存放密码。", "用 LENGTH(Password) 检查长度。", "输出 Valid 或 Too short。"],
    sample: {
      input: ["secret12"],
      output: ["Valid"],
    },
    starter: `// 读取密码。LENGTH 大于等于 8 输出 "Valid"，否则输出 "Too short"。
DECLARE Password : STRING
`,
  },
  {
    id: "first-initials",
    topic: "strings",
    difficulty: "extended",
    exam: "IGCSE 0478",
    title: "从两个名字输出首字母",
    description: "SUBSTRING 练习：读取名和姓，然后输出两个首字母。",
    prompt: ["程序读取一个名和一个姓。", "编写伪代码：输出每个名字的第一个字母，中间不要空格。"],
    requirements: [
      "读取两个 STRING 值：先名后姓。",
      "使用 SUBSTRING，起始位置为 1，长度为 1。",
      "把两个首字母连在一起输出，例如 AK。",
    ],
    sample: {
      input: ["Alex", "Kim"],
      output: ["AK"],
    },
    starter: `// 读取 FirstName 和 LastName。输出各自的第一个字母，连在一起。
DECLARE FirstName : STRING
DECLARE LastName : STRING
`,
  },
  {
    id: "print-heading",
    topic: "procedures",
    difficulty: "extended",
    exam: "AS & A Level 9618",
    title: "用过程打印标题",
    description: "A Level 计算机科学的 PROCEDURE 练习：输出一行星号、一个标题，再输出一行星号。",
    prompt: [
      "编写过程 Heading，输出 10 个星号、然后是标题、然后再是 10 个星号。",
      "主程序应以标题 Report 调用 Heading。",
    ],
    requirements: [
      "声明 PROCEDURE Heading，参数 Title 为 STRING。",
      "过程依次输出 **********、标题、**********。",
      "主程序使用 CALL Heading(\"Report\")。",
    ],
    sample: {
      input: [],
      output: ["**********", "Report", "**********"],
    },
    starter: `// 编写 PROCEDURE Heading(Title : STRING)，并用 "Report" 调用它。
`,
  },
];
