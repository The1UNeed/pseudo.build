import type { ManualContentData } from "./manualContent.en";

export const manualZh: ManualContentData = {
  close: "关闭",
  codeBlock: {
    language: "伪代码",
    copy: "复制",
    copied: "已复制",
    copyAria: "将代码复制到剪贴板",
    copiedAria: "代码已复制到剪贴板",
    unavailable: "此处无法访问剪贴板。",
  },
  hero: {
    badge: "Cambridge 0478 指南",
    title: "伪代码详细指南",
    description: "本指南依据 Cambridge IGCSE Computer Science（0478）2026–2028 年考纲中“评估详情”部分（第 35–49 页）的伪代码规范编写。内容侧重实际作答：组织逻辑、选择正确的控制结构，以及用清晰易读的伪代码写出符合考试要求的答案。",
    openEditor: "打开编辑器",
    notationTitle: "重要符号说明",
    notationBeforeCode: "Cambridge 官方示例使用向左箭头表示赋值。在本编译器/编辑器中，请将赋值写成 ",
    notationAfterCode: "。",
    editorSupportTitle: "编辑器支持",
    editorSupport: "编辑器的自动补全包含 DIV、MOD、LENGTH、LCASE、UCASE、SUBSTRING、ROUND 和 RANDOM，因此你可以在输入时直接使用考试规定的函数语法。",
  },
  navigation: {
    title: "快速导航",
    items: [
      { href: "#workflow", label: "编写步骤", num: "1" }, { href: "#syntax", label: "核心语法与函数", num: "2" }, { href: "#loops", label: "深入理解循环逻辑", num: "3" }, { href: "#patterns", label: "可复用的编程模式", num: "4" }, { href: "#worked", label: "完整示例程序", num: "5" }, { href: "#trace", label: "跟踪表", num: "6" }, { href: "#files", label: "文件处理", num: "7" }, { href: "#exam", label: "考试指令词", num: "8" },
    ],
  },
  workflow: {
    title: "编写步骤",
    introduction: "每次解题都按以下步骤进行，可以减少逻辑错误。",
    steps: ["阅读题目，确定所需的输入和输出。", "用正确的数据类型声明每个变量和数组。", "在循环开始前初始化计数器、累加值和标志。", "根据题目条件选择合适的选择结构和循环类型。", "将处理逻辑写成简短、易读的代码块。", "处理完成后输出最终结果。", "用示例值和边界情况进行手动运行。"],
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
    title: "核心语法规则",
    cards: [
      { title: "格式与命名", points: ["关键字使用大写：IF、FOR、WHILE、PROCEDURE。", "标识符使用 PascalCase，并以大写字母开头。", "标识符名称中不要使用下划线。", "使用 // 编写注释。"] },
      { title: "数据类型与常量", points: ["INTEGER、REAL、CHAR、STRING、BOOLEAN。", "变量使用 DECLARE Name : TYPE 声明。", "常量使用 CONSTANT Name <- literal 声明。", "常量值必须是字面量，不能是表达式。"] },
      { title: "运算符", points: ["算术运算：+ - * / ^", "整数除法函数：DIV(a,b)、MOD(a,b)", "关系运算：= < <= > >= <>", "逻辑运算：AND OR NOT"] },
      { title: "常用库函数", points: ["LENGTH(StringValue) 返回字符串中的字符数。", "LCASE(StringOrChar) 和 UCASE(StringOrChar) 转换字母大小写。", "SUBSTRING(StringValue, Start, Length) 的起始位置从 1 开始计数。", "ROUND(RealValue, Places) 将实数四舍五入到指定的小数位数。", "RANDOM() 返回 0 到 1 之间的随机数，包括 0 和 1。"] },
    ],
    routineTitle: "官方函数语法",
    routineCode: `LENGTH("Happy Days")
LCASE('W')
UCASE("Happy")
SUBSTRING("Happy Days", 1, 5)
ROUND(15.6789, 2)
RANDOM()

Value <- ROUND(RANDOM() * 6, 0)`,
    routineBeforeRound: "Cambridge 明确定义了 ", routineBetween: " 和 ", routineAfterRandom: "，本编辑器的自动补全也支持这两个函数。",
  },
  loops: {
    title: "深入理解循环逻辑",
    introduction: "选择了错误的循环类型，或写出无法终止的循环，都会失分。你需要理解每次循环在何时检查条件，以及状态如何变化。",
    cards: [
      { title: "FOR 循环", points: ["已知循环次数时使用 FOR。", "上下界都包括在内，因此 FOR I <- 1 TO 5 会运行 5 次。", "STEP 可以是正数或负数。"] },
      { title: "WHILE 循环", points: ["在执行循环体之前检查条件。", "如果初始条件为 FALSE，循环可能一次也不执行。", "在循环内更新变量，使条件最终能够变为 FALSE。"] },
      { title: "REPEAT UNTIL", points: ["先执行循环体，再检查条件。", "循环体至少执行一次。", "进行输入校验时，用 UNTIL 后的条件表示输入有效。"] },
    ],
    checklistTitle: "终止检查清单",
    checklist: ["每次循环是否都会改变状态？", "条件最终能否变为 FALSE（WHILE）或 TRUE（UNTIL）？", "循环边界是否正确，没有差一错误？", "是否在循环前初始化了计数器和累加值？"],
  },
  patterns: {
    title: "可复用的编程模式", badges: ["1", "2", "3", "4"], whenToUse: "适用场景：", walkthrough: "逻辑逐步讲解",
    items: [
      { title: "使用 FOR 的计数循环（固定重复次数）", whenToUse: "你明确知道循环需要执行多少次。", logic: ["设置循环变量的起始值和结束值。", "对范围内的每个值执行一次循环体。", "每轮循环更新累加值或计数器。", "处理完整个范围后自动退出。"], template: `DECLARE Count : INTEGER
DECLARE Total : INTEGER
Total <- 0

FOR Count <- 1 TO 10
    Total <- Total + Count
NEXT Count

OUTPUT "Total = ", Total`, walkthrough: ["循环前：Total = 0", "Count=1 -> Total=1", "Count=2 -> Total=3", "Count=3 -> Total=6", "...", "Count=10 -> Total=55，然后循环结束"] },
      { title: "使用 WHILE 的前测条件循环（重复次数未知）", whenToUse: "条件保持 TRUE 时重复执行。", logic: ["每轮循环开始前检查条件。", "如果开始时条件为 FALSE，循环会执行零次。", "循环体必须改变状态，使条件最终能够变为 FALSE。"], template: `DECLARE Number : INTEGER
INPUT Number

WHILE Number > 9 DO
    Number <- Number - 9
ENDWHILE

OUTPUT Number`, walkthrough: ["输入 28", "28 > 9 为 true -> Number 变为 19", "19 > 9 为 true -> Number 变为 10", "10 > 9 为 true -> Number 变为 1", "1 > 9 为 false -> 退出"] },
      { title: "使用 REPEAT UNTIL 的后测条件循环（输入校验循环）", whenToUse: "用户必须先操作至少一次，再重复到输入有效为止。", logic: ["先执行循环体，再测试条件。", "最适合输入校验和菜单重试。", "条件应表示“有效/已完成”的状态。"], template: `DECLARE Password : STRING

REPEAT
    OUTPUT "Enter password"
    INPUT Password
UNTIL Password = "Secret"`, walkthrough: ["如果第一次输入错误，循环会重复。", "如果第一次输入正确，程序也能正常运行，因为循环保证至少执行一次。"] },
      { title: "嵌套 FOR 循环（表格、网格和二维数组）", whenToUse: "处理行与列，或两个范围内所有值的组合。", logic: ["外层循环控制每一行或每一组项目。", "内层循环处理当前外层值对应的所有列或项目。", "开始内层循环前，重置每行的累加值。"], template: `DECLARE Row : INTEGER
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

OUTPUT "Grand total = ", GrandTotal`, walkthrough: ["第 1 行处理第 1 到第 4 列，然后输出第 1 行的总和。", "第 2 行开始时，RowTotal 重新设为 0。", "处理完最后一行后，GrandTotal 保存所有单元格的总和。"] },
    ],
  },
  worked: {
    title: "完整示例程序", badges: ["A", "B", "C", "D"], introduction: "以下是完整的考试风格答案，展示了声明、控制结构和输出。", objective: "目标：", explanation: "逻辑说明", sampleRun: "示例运行",
    programs: [
      { title: "程序 A：使用选择结构和循环统计成绩", objective: "读取 5 个分数，统计及格（>= 50）人数，并显示全班平均分。", code: `DECLARE Index : INTEGER
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
OUTPUT "Average = ", Average`, explanation: ["恰好有 5 个分数，因此这是计数控制的循环。", "Total 累加所有分数；PassCount 记录循环中满足条件的次数。", "每轮循环不一定执行 IF 分支，只有分数满足条件时才增加 PassCount。", "循环完成后，只计算一次 Average。"], testRun: ["输入分数：42、50、74、21、90", "Total = 277", "PassCount = 3", "Average = 55.4"] },
      { title: "程序 B：使用 REPEAT UNTIL 校验菜单输入", objective: "只接受 1 到 4 的菜单选项。", code: `DECLARE Choice : INTEGER

REPEAT
    OUTPUT "1.View 2.Add 3.Delete 4.Exit"
    INPUT Choice
UNTIL Choice >= 1 AND Choice <= 4

OUTPUT "Accepted choice: ", Choice`, explanation: ["用户至少需要看到一次提示，因此适合使用 REPEAT UNTIL。", "条件说明什么是有效输入，而不是什么是无效输入。", "使用 AND 可以同时检查下限和上限。"], testRun: ["输入：8 -> 无效，重复", "输入：0 -> 无效，重复", "输入：3 -> 有效，退出"] },
      { title: "程序 C：使用标志在数组中搜索", objective: "查找目标姓名是否存在于 StudentNames[1:30] 中。", code: `DECLARE StudentNames : ARRAY[1:30] OF STRING
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
ENDIF`, explanation: ["Found 初始为 FALSE，找到匹配项时变为 TRUE。", "这个写法会检查全部元素；阅卷员通常接受这种清晰的写法。", "最后的 IF 使用该标志输出一条消息。"], testRun: ['Target = "Ali"，并且它出现在索引 7 -> Found 变为 TRUE', "输出：Found"] },
      { title: "程序 D：结合使用过程与函数", objective: "展示代码复用：用过程负责显示，用函数负责计算。", code: `PROCEDURE PrintLine(Count : INTEGER)
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
OUTPUT "Answer = ", Answer`, explanation: ["过程调用是一个完整语句，因此使用 CALL。", "函数会返回值，因此可以出现在表达式中。", "将显示逻辑与计算逻辑分开，代码会更清晰。"], testRun: ["PrintLine 输出 10 条短横线。", "SumSquare(3,4) 返回 25。", "输出：Answer = 25"] },
    ],
  },
  trace: {
    title: "跟踪表与手动运行", introduction: "考试中，快速手动运行程序能发现大多数逻辑错误。每轮循环后记录关键变量。",
    code: `DECLARE N : INTEGER
DECLARE Fact : INTEGER
DECLARE I : INTEGER

INPUT N
Fact <- 1
FOR I <- 1 TO N
    Fact <- Fact * I
NEXT I
OUTPUT Fact`,
    headers: ["I", "执行前的 Fact", "执行 Fact <- Fact * I 后的 Fact"], rows: [[1, 1, 1], [2, 1, 2], [3, 2, 6], [4, 6, 24], [5, 24, 120]], conclusion: "当 N = 5 时，预期输出为 120。如果跟踪表与输出不一致，请检查循环边界和初始值。",
  },
  files: {
    title: "文件处理指南", stepNumbers: ["1", "2", "3", "4"], steps: ["声明文件名和数据变量。", "使用 OPENFILE 和 FOR READ 或 FOR WRITE 打开文件。", "使用 READFILE/WRITEFILE 操作。", "完成后使用 CLOSEFILE 关闭文件。"],
    code: `DECLARE FileName : STRING
DECLARE LineText : STRING

FileName <- "Scores.txt"
OPENFILE FileName FOR READ

READFILE FileName, LineText
OUTPUT "First line was: ", LineText

CLOSEFILE FileName`, warning: "不要同时以 READ 和 WRITE 模式打开同一个文件。即使算法很短，也要始终关闭文件。",
  },
  exam: {
    title: "考试指令词", headers: ["指令词", "答题要求"],
    words: [["Calculate（计算）", "根据给出的事实、数据或信息得出结果。"], ["Compare（比较）", "找出相同点和不同点，并作出说明。"], ["Define（定义）", "给出准确含义。"], ["Demonstrate（演示）", "说明做法或给出示例。"], ["Describe（描述）", "陈述要点、特性和主要特征。"], ["Evaluate（评价）", "判断质量、重要性、数量或价值。"], ["Explain（解释）", "给出原因，说明关系，并用证据支持。"], ["Give（给出）", "根据材料或记忆写出答案。"], ["Identify（识别）", "说出、选择或辨认。"], ["Outline（概述）", "列出主要要点。"], ["Show (that)（证明）", "提供有条理的证据并推导出结果。"], ["State（陈述）", "用清楚明确的语言表达。"], ["Suggest（建议）", "运用知识提出合理的方案或考虑因素。"]],
  },
  finalChecklist: {
    title: "提交前的最终检查清单", items: ["所有变量和数组都已用正确的数据类型声明。", "已设置计数器、累加值和标志的初始值。", "循环选择正确：FOR、WHILE 或 REPEAT UNTIL。", "所有 IF、CASE 和循环代码块都正确结束。", "调用过程时使用 CALL；函数调用出现在表达式中。", "输出与题目要求完全一致。", "ROUND() 和 RANDOM() 等内置函数使用正确的语法。", "已用普通输入和边界情况进行手动运行。"],
  },
};
