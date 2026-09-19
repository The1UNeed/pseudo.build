// Simplified Chinese content. Slugs must match the English entries in seo-content.ts
// so /zh/docs/<slug> and /docs/<slug> are translations of the same page.
import type { FaqItem, SeoDoc, SeoPost } from "./seo-content";

export const docsZh: SeoDoc[] = [
  {
    slug: "getting-started",
    title: "Pseudo Build 入门：在线编写并运行伪代码",
    description: "打开浏览器编辑器，写下你的第一个伪代码程序，编译它，并直接在浏览器中运行。",
    updated: "2026-05-04",
    sections: [
      {
        heading: "从浏览器开始",
        body: [
          "打开应用，新建或选择一个伪代码文档，直接在编辑器中输入。开发环境下 Pseudo Build 会保存本地工作；在正式站点登录后，还支持工作区的云端同步。",
          "点击“运行”按钮编译当前文件。当编译器发现语法或语义问题时，诊断信息会带着行号和列号一起显示。",
        ],
      },
      {
        heading: "第一个程序",
        body: [
          "一个简单的程序会声明变量，用 <- 赋值，再用 OUTPUT 输出结果。初学时请保持每行只写一条语句，这样诊断信息更容易对照。",
        ],
        example: `DECLARE Name : STRING
INPUT Name
OUTPUT "Hello ", Name`,
      },
    ],
  },
  {
    slug: "syntax",
    title: "伪代码语法参考（剑桥 IGCSE 风格）",
    description: "查阅浏览器编译器支持的核心伪代码语法，包括赋值、条件、循环、数组和输出。",
    updated: "2026-05-04",
    sections: [
      {
        heading: "核心语句",
        body: [
          "用 DECLARE 声明变量，用 <- 赋值，用 INPUT 读取用户输入，用 OUTPUT 显示值。",
          "关键字刻意贴近剑桥风格的伪代码规范，这样程序在备考练习时始终保持易读。",
        ],
        example: `DECLARE Total : INTEGER
Total <- 0
OUTPUT Total`,
      },
      {
        heading: "块结构",
        body: [
          "选择结构和循环块使用明确的结束关键字，例如 ENDIF、NEXT、ENDWHILE 和 UNTIL。块结束语句一一对应，程序才更容易跟踪和调试。",
        ],
      },
    ],
  },
  {
    slug: "variables-input-output",
    title: "变量、输入与输出",
    description: "了解 Pseudo Build 如何处理声明、赋值、INPUT 输入提示和 OUTPUT 语句。",
    updated: "2026-05-04",
    sections: [
      {
        heading: "先声明，再使用",
        body: [
          "给每个变量赋值之前，先用类型声明它。这样编译器能尽早发现拼写错误和类型不匹配的值。",
          "常见的标量类型包括 INTEGER、REAL、STRING、CHAR 和 BOOLEAN。",
        ],
        example: `DECLARE Score : INTEGER
DECLARE Passed : BOOLEAN
Score <- 74
Passed <- TRUE`,
      },
      {
        heading: "交互式输入",
        body: [
          "程序执行到 INPUT 时，终端会要求你输入下一行内容。这样你就能在浏览器里测试输入校验循环和菜单程序。",
        ],
      },
    ],
  },
  {
    slug: "selection",
    title: "IF、THEN、ELSE 选择结构",
    description: "用 IF 语句根据比较和布尔表达式让伪代码程序分支执行。",
    updated: "2026-05-04",
    sections: [
      {
        heading: "在不同路径之间选择",
        body: [
          "选择结构在条件为真时执行一个块，条件为假时可以选择性地执行 ELSE 块。",
          "缩进要保持一致。编译器读取的是关键字，但整洁的缩进会让跟踪程序容易得多。",
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
    title: "FOR、WHILE 与 REPEAT 循环",
    description: "针对固定次数、前置条件重复和输入校验任务，选择合适的伪代码循环。",
    updated: "2026-05-04",
    sections: [
      {
        heading: "按意图选择循环",
        body: [
          "重复次数已知时用 FOR。每次执行前都必须检查条件时用 WHILE。循环体至少要执行一次时用 REPEAT UNTIL。",
        ],
        example: `FOR Index <- 1 TO 5
    OUTPUT Index
NEXT Index`,
      },
      {
        heading: "避免死循环",
        body: ["WHILE 循环必须更新条件中用到的值。如果条件永远不变，程序就无法结束。"],
      },
    ],
  },
  {
    slug: "arrays",
    title: "数组与下标访问",
    description: "在伪代码中声明数组、访问带下标的元素，并处理列表型数据。",
    updated: "2026-05-04",
    sections: [
      {
        heading: "声明数组",
        body: ["数组把一组相关的值放在同一个名字下。通过下标读取或写入某个具体元素。"],
        example: `DECLARE Scores : ARRAY[1:5] OF INTEGER
Scores[1] <- 80
OUTPUT Scores[1]`,
      },
    ],
  },
  {
    slug: "flowcharts",
    title: "从伪代码生成流程图",
    description: "使用 Pseudo Build 的流程图模式来理解处理、输入/输出和判断节点。",
    updated: "2026-05-04",
    sections: [
      {
        heading: "把控制流画出来",
        body: [
          "流程图能帮你看清程序从哪里开始、在哪里出现分支、循环又在哪里回到前面的步骤。",
          "把流程图模式当作规划的帮手，最终可执行的版本仍以伪代码源代码为准。",
        ],
      },
    ],
  },
  {
    slug: "saving-workspaces",
    title: "保存浏览器工作区",
    description: "了解 Pseudo Build 中浏览器本地存储和登录后云端同步的工作方式。",
    updated: "2026-05-04",
    sections: [
      {
        heading: "本地模式与云端模式",
        body: [
          "在 localhost 上，Pseudo Build 会把工作区保存到浏览器存储。在 pseudo.build 上，登录用户可以通过 Clerk 身份验证和 Convex 云端同步保存工作区。",
          "在正式站点未登录时可以在内存中编辑，但要保存到云端必须先登录。",
        ],
      },
    ],
  },
  {
    slug: "debugging-errors",
    title: "调试伪代码编译错误",
    description: "利用诊断信息、行号和输出结果，修复伪代码的语法和逻辑问题。",
    updated: "2026-05-04",
    sections: [
      {
        heading: "先看第一条错误",
        body: [
          "语法问题常常会连锁出现。先修复最早的那条错误，再运行一次，然后处理下一条诊断信息。",
          "行号和列号指向编译器首次发现问题的位置，它可能比真正的笔误稍微靠后一点。",
        ],
      },
      {
        heading: "检查声明和块结束语句",
        body: [
          "初学者的很多错误来自使用了未声明的变量、混用了值的类型，或者漏掉了 ENDIF、NEXT、ENDWHILE 或 UNTIL。",
        ],
      },
    ],
  },
  {
    slug: "exam-style-practice",
    title: "如何练习随机伪代码题目",
    description: "用 Pseudo Build 的随机练习题，在浏览器编辑器里演练 IGCSE、O Level 和 A Level 算法题。",
    updated: "2026-09-19",
    sections: [
      {
        heading: "从一道随机题开始",
        body: [
          "打开练习页，点击“练习一道随机题”。页面会抽取一道原创的考试风格题目，这样你没法按固定顺序背答案。",
          "只想练循环、数组、字符串或过程时，按主题筛选。混合复习试卷 2 时，把筛选留在全部主题。",
        ],
      },
      {
        heading: "在编辑器里写",
        body: [
          "每道题都有起始文件。在编辑器中打开它，补全算法，再用样例输入运行。",
          "把样例输出当作第一次检查，再手算一个边界情况，然后再抽下一题。",
        ],
      },
    ],
  },
];

export const postsZh: SeoPost[] = [
  {
    slug: "igcse-pseudocode-basics",
    title: "IGCSE 伪代码基础：实用的起点",
    description: "一份关于声明、赋值、输入、输出的精简指南，以及让伪代码更容易跟踪的好习惯。",
    date: "2026-05-04",
    readingTime: "5 分钟阅读",
    tags: ["IGCSE", "伪代码", "基础"],
    sections: [
      {
        heading: "从明确的数据开始",
        body: [
          "好的伪代码不只是加了关键字的英语。它给数据起清晰的名字，声明预期的类型，并让每一次改变都清晰可见。",
          "对初学者来说，最好的习惯是写一些能编译、能运行、并且产生一个明确结果的小程序。",
        ],
      },
      {
        heading: "先跟踪，再优化",
        body: [
          "在把程序改短之前，先用几个样例值逐行跟踪。一张清晰的跟踪表能很快暴露漏掉的初始化和循环中的差一错误。",
        ],
      },
    ],
  },
  {
    slug: "how-to-trace-pseudocode",
    title: "如何跟踪伪代码，而不是靠猜",
    description: "用一套可重复的跟踪表流程，逐步跟踪变量、分支和循环更新。",
    date: "2026-05-04",
    readingTime: "6 分钟阅读",
    tags: ["跟踪", "复习", "调试"],
    sections: [
      {
        heading: "把变量写成列",
        body: [
          "跟踪表把看不见的程序状态变成可以检查的东西。每个会变化的变量占一列。",
          "只有在发生赋值、INPUT 或循环计数器变化时才更新表格。",
        ],
      },
      {
        heading: "标出分支判断",
        body: [
          "对于 IF 和 WHILE 的条件，在条件旁边写下 true 或 false。这样能避免最常见的错误：执行了程序本该跳过的块。",
        ],
      },
    ],
  },
  {
    slug: "choosing-the-right-loop",
    title: "FOR、WHILE 和 REPEAT UNTIL 该怎么选",
    description: "学会一条简单的判断规则，选出合适的伪代码循环结构。",
    date: "2026-05-04",
    readingTime: "4 分钟阅读",
    tags: ["循环", "控制流", "语法"],
    sections: [
      {
        heading: "次数已知就用 FOR",
        body: ["当你确切知道需要处理多少个值、多少行或多少次尝试时，FOR 循环能最清楚地表达这个意图。"],
      },
      {
        heading: "次数未知就用条件循环",
        body: [
          "第一次执行前必须检查条件时用 WHILE。提示或动作至少要发生一次时用 REPEAT UNTIL。",
        ],
      },
    ],
  },
  {
    slug: "common-pseudocode-compiler-errors",
    title: "常见伪代码编译错误及修复方法",
    description: "更快地修复未声明变量、缺少块结束语句、非法赋值和类型不匹配。",
    date: "2026-05-04",
    readingTime: "7 分钟阅读",
    tags: ["编译错误", "诊断信息", "练习"],
    sections: [
      {
        heading: "未声明的名字",
        body: [
          "如果某个变量拼错了一次，编译器可能把它当成另一个未声明的名字。把诊断信息里的拼写和声明处对照一下。",
        ],
      },
      {
        heading: "块结束语句",
        body: [
          "漏掉 ENDIF、NEXT、ENDWHILE 或 UNTIL 会改变后面每一行的结构。先修好块结构，再去追后面的错误。",
        ],
      },
    ],
  },
  {
    slug: "why-use-a-browser-pseudocode-editor",
    title: "为什么要用在线伪代码编辑器？",
    description: "基于浏览器的编译器让伪代码练习更快，因为反馈、示例和运行都在同一个地方。",
    date: "2026-05-04",
    readingTime: "5 分钟阅读",
    tags: ["在线编辑器", "学习", "工具"],
    sections: [
      {
        heading: "即时反馈改变练习方式",
        body: [
          "反馈是即时的，学生就能测试更小的改动，并准确理解是哪一行引起了问题。",
          "在线编辑器还省去了安装配置：打开页面，输入，运行，修改。",
        ],
      },
      {
        heading: "把学习资料放在手边",
        body: ["文档、示例和手册应该就在编辑器旁边，让参考资料支持练习，而不是打断练习。"],
      },
    ],
  },
  {
    slug: "random-pseudocode-practice",
    title: "为什么随机题比固定练习单更有用",
    description: "打乱顺序的原创伪代码题更接近没见过的试卷，而不是反复做同一组五个例子。",
    date: "2026-09-19",
    readingTime: "4 分钟阅读",
    tags: ["练习", "IGCSE", "复习"],
    sections: [
      {
        heading: "没见过才是重点",
        body: [
          "试卷不会按上周练习单的顺序再出一遍。随机练习逼你从题面里判断该用循环、条件还是数组遍历，而不是靠记忆。",
        ],
      },
      {
        heading: "让编译器一起参与",
        body: [
          "在编辑器里写答案，对着样例运行，然后再抽一题。漏掉 ENDIF 或未声明名字时，编译器会在你把同样的错误写到纸上之前拦住你。",
        ],
      },
    ],
  },
];

export const faqZh: FaqItem[] = [
  {
    question: "Pseudo Build 是什么？",
    answer:
      "Pseudo Build 是一个免费开源的伪代码编辑器和编译器。编辑器、编译器、运行器、流程图视图、手册和工作区工具全部在浏览器应用中运行。",
  },
  {
    question: "可以在浏览器里运行伪代码吗？",
    answer: "可以。Pseudo Build 会把支持的伪代码编译成 AST，并在浏览器运行时中执行，包括交互式的 INPUT 输入提示。",
  },
  {
    question: "浏览器版本会保存我的工作吗？",
    answer:
      "本地开发环境会保存到浏览器存储。在 pseudo.build 上，登录用户可以通过 Clerk 身份验证和 Convex 云端同步保存工作区。",
  },
  {
    question: "这只适用于 IGCSE 计算机科学吗？",
    answer:
      "不是。设置里可以在剑桥 IGCSE、剑桥 AS 和 A Level、IB 文凭课程、OCR GCSE 和 AQA GCSE 记法之间切换。编译器、高亮和自动补全会跟随你选择的语法。",
  },
  {
    question: "伪代码遵循哪个考试局的规范？",
    answer:
      "语法遵循剑桥国际的伪代码指南，该指南用于 IGCSE 计算机科学（0478 和 0984）、O Level 计算机科学（2210）以及 AS 和 A Level 计算机科学（9618）。Pseudo Build 是独立项目，与剑桥无隶属关系，也未获其认可。",
  },
  {
    question: "需要安装什么吗？",
    answer:
      "不需要。编辑器、编译器和运行时可以在笔记本电脑、Chromebook 或平板上的任何现代浏览器中加载。什么都不用安装，也不需要学校 IT 部门审批。",
  },
  {
    question: "Pseudo Build 真的免费开源吗？",
    answer:
      "是的。Pseudo Build 可以免费使用，源代码基于 GNU GPL v3 发布在 GitHub 上。你可以阅读它、自己运行它，也可以参与贡献。",
  },
  {
    question: "可以练习随机的考试风格题目吗？",
    answer:
      "可以。练习页会随机抽取一道原创的 IGCSE、O Level 或 A Level 风格题目。你可以按主题筛选，在编辑器中打开起始文件，并在浏览器里运行你的答案。",
  },
];
