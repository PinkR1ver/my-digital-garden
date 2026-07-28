---
title: 主流 AI Benchmark 概览
tags:
  - llm
  - benchmark
  - evaluation
date: 2026-05-07
last_updated: 2026-07-27
---

## 代码

| Benchmark | 考察能力 | 评测模式 | 特点 |
|---|---|---|---|
| **SWE-bench Verified** | 软件工程：修 bug、写 feature、理解大型代码库 | Agent（自选） | SWE-bench 的精筛子集，去掉不可复现/描述不清的 issue；已成为代码评测事实主标 |
| **SWE-bench** | 同上（完整版） | Agent（自选） | 原始 2294 题，部分 issue 描述模糊或测试不稳定，逐渐被 Verified 替代 |
| **Aider Polyglot** | 多语言代码编辑 | Agent（自选） | 基于 aider 工具流，测模型在多语言 repo 中完成编辑任务的能力 |
| **HumanEval** | 函数级代码生成 | LLM 直接 | 通过单元测试验证生成代码的正确性，题量小但引用率高 |
| **MBPP** | 基础编程能力 | LLM 直接 | 比 HumanEval 条目更多、题目更偏入门 |
| **LiveCodeBench** | 实时编程竞赛 | 混合 | 从 LeetCode / AtCoder 等平台搜集新题，防止数据污染；部分设定需要编译反馈 |
| **Terminal-Bench 2.0** | 终端/命令行任务 | Agent（自选） | 模拟真实 shell 环境中的多步操作 |

## 知识与推理

| Benchmark | 考察能力 | 评测模式 | 特点 |
|---|---|---|---|
| **MMLU-Pro** | 多学科选择题 | LLM 直接 | MMLU 的升级版，选项从 4 个增加到 10 个，减少猜测空间，覆盖 50+ 学科 |
| **GPQA-Diamond** | 研究生级别科学推理 | LLM 直接 | 由领域专家出题（物理、化学、生物），非专家仅能做对 ~34%，主要测推理性 |
| **Humanity's Last Exam** | 跨学科极限难题 | LLM 直接 | 题目来自全球研究人员投稿，难度极高，绝大多数人类也无法通过 |
| **AIME 2024/2025** | 竞赛级数学 | LLM 直接 | 美国数学邀请赛真题，比 MATH 更难、更接近奥赛水平，已成为前沿模型数学能力新标尺 |
| **FrontierMath** | 极限数学 | LLM 直接 | 由职业数学家命题，难度远超 MATH/AIME，目前所有模型得分极低 |
| **MATH** | 竞赛级数学 | LLM 直接 | 涵盖代数、几何、数论等，需要多步推导；前沿模型已接近饱和 |
| **GSM8K** | 小学数学应用题 | LLM 直接 | 已饱和，多数前沿模型达到 95%+ |
| **ARC-AGI** | 抽象视觉推理 | LLM 直接 | 每题包含少数几个网格示例，需要推断变换规则；强调 fluid intelligence |
| **BBH** (BIG-Bench Hard) | 多任务推理 | LLM 直接 | BIG-bench 的精筛子集（23 个任务），只保留当时模型无法超越平均人类水平的任务 |

## 检索与搜索

| Benchmark | 考察能力 | 评测模式 | 特点 |
|---|---|---|---|
| **BrowseComp** | Web 浏览与信息综合 | Agent（自选） | 需要从多个网页中收集、交叉比对信息后回答问题 |
| **DeepSearchQA** | 深度搜索问答 | Agent（自选） | 模拟多轮搜索、筛选、归纳的复杂信息检索流程 |
| **SimpleQA** | 事实准确性 | LLM 直接 | 单轮简单事实问答，主要测幻觉和知识边界 |

## Agent 能力

| Benchmark | 考察能力 | 评测模式 | 特点 |
|---|---|---|---|
| **tau2-bench** | 工具使用与 Agent 任务规划 | Agent（自选） | 模拟真实世界中 multi-step agent 任务，如预订、客服、数据操作 |
| **GDPval** | Agent 综合能力 | Agent（自选） | 评估 agent 在开放环境中的规划、执行和纠错 |
| **OSWorld** | 操作系统级别 Agent | Agent（自选） | 在真实虚拟机上完成 GUI 操作，覆盖办公软件、浏览器、命令行等 |
| **WebArena** | Web Agent | Agent（自选） | 在真实网站（Reddit、GitLab、电商等）上完成多步任务，测端到端 web 交互能力 |

## 多模态理解

| Benchmark | 考察能力 | 评测模式 | 特点 |
|---|---|---|---|
| **MMMU-Pro** | 跨学科多模态推理 | LLM 直接 | 覆盖艺术、科学、医学等领域的图表、图像、文档理解 |
| **ZeroBench** | 视觉计数与精确观察 | LLM 直接 | 故意设计大量杂乱物体的数数题，当前模型普遍表现差 |
| **MathVista** | 数学可视化推理 | LLM 直接 | 几何图、统计图表、公式图像中的数学推理 |

## 综合与偏好

| Benchmark | 考察能力 | 评测模式 | 特点 |
|---|---|---|---|
| **Chatbot Arena**  [[chatbot_arena|→ 详见 Arena 评测体系]] | 人类偏好对比 | LLM 直接 | LMSYS 组织的盲评投票，分 Overall / Coding / Math / Creative Writing / Hard Prompts / Multi-Turn / Instruction Following / Vision / Safety 等赛道做 Elo 排名 |
| **AlpacaEval / Arena-Hard** | 自动偏好评测 | LLM 直接 | 用 LLM 做 judge 自动评估回复质量，成本远低于人工 Arena，但 judge bias 是已知问题 |
| **IFEval** | 指令遵循 | LLM 直接 | 精确约束测试（如"用 3 段回复""包含一个 markdown 表格"），自动判定是否遵守 |
| **BIG-bench** | 泛化与极限能力 | LLM 直接（多数） | Google 主导的 200+ 任务集合，覆盖面广但条目质量参差；BBH 是其高质量子集 |

## 评测模式说明

上表中「评测模式」区分了三种情况：

- **LLM 直接**：prompt in → answer out，模型不调用外部工具、不与环境交互。分数可以直接归因到模型本身。
- **Agent（自选）**：评测环境固定（repo 快照、VM 镜像、网站等），但 **agent 架构不做统一要求**——各团队自行选择 scaffold（ReAct、function-calling loop、OpenHands、SWE-agent 等）、tool 定义、prompt 策略、错误恢复机制。
- **Agent（固定）**：评测同时固定环境和 agent 架构，分数完全可比（目前极少 benchmark 做到这一点）。

### Agent（自选）的 scaffold 混淆问题

当 benchmark 只固定环境但不固定 agent 架构时，**最终分数是 model + scaffold 的复合产物**，无法单独归因到模型能力。同一个模型——例如 GPT-5——在 SWE-bench 上用不同 scaffold 可能差 10 个百分点以上。

这意味着：
- 跨论文的 benchmark 分数对比本质上是不可信的，除非 scaffold 也做了控制
- 一部分"模型进步"可能只是 scaffold engineering 的改进（更好的 tool description、更聪明的错误恢复、更好的 context management）
- 这是当前 agent benchmark 评测体系最大的结构性缺陷，学术界已经开始关注但尚未有统一的解决方案

## 自动化 benchmark 与人类偏好评测的互补

评测体系可以按「谁来打分」分成两条线：

| | 自动化 benchmark | 人类偏好评测（Arena） |
|---|---|---|
| **评分者** | 测试用例 / 答案匹配 / 规则检查 | 人类盲评投票 |
| **测什么** | 客观正确性、能力边界 | 主观可用性、真实偏好 |
| **优势** | 可复现、成本低、可大规模跑 | 防数据污染、捕捉"好不好用" |
| **劣势** | 可能泄漏、无法测体验 | 成本高、统计噪声大、受风格偏好干扰 |
| **典型代表** | MMLU、MATH、SWE-bench、IFEval | Chatbot Arena、AlpacaEval |

两者之间的 gap 本身就是信号：高正确率低 Elo 的模型，可能做对了但体验差（啰嗦、格式乱、不遵从指令风格）。反过来，有些模型 Arena 得分高但自动化 benchmark 一般——可能只是回复风格讨喜，实际能力有水分。最值得关注的是**两类评测都在前列的模型**。

详见 [[chatbot_arena|Chatbot Arena 评测体系]]。

## 四象限视角

按「AI 能不能做 × 人类能不能做」分类，可以快速判断一个 benchmark 的难度成色：

| 象限 | 典型 benchmark | 意味着 |
|---|---|---|
| AI 能做，人类难做 | SWE-bench、GPQA-Diamond、MATH | 模型在技术深度上可能超过非专业人类，是技术报告中最常引用的高含金量指标 |
| AI 能做，人类也能做 | tau2-bench、MMLU（简单题） | 检验模型的日常辅助能力，门槛相对较低 |
| AI 不大会，人类会做 | ZeroBench、ARC-AGI（部分） | 暴露模型在特定认知模式上的短板，是发现能力边界的关键 |
| AI 不会，人类也不会 | Humanity's Last Exam | 测的是"极限挑战"，用于展示模型绝对上限 |

![](computer_sci/llm/evaluation/attachments/ai_benchmark_quadrant.png)

## 选择 Benchmark 的注意事项

1. **数据污染**：训练数据可能泄露 benchmark 题目，老 benchmark（GSM8K、MMLU）尤其严重。优先看 LiveCodeBench、Chatbot Arena 这类动态更新的指标。
2. **评测方式**：选择题（MMLU）容易刷分但区分度下降；交互式评测（SWE-bench、Chatbot Arena）更能反映真实能力。同时注意区分上面提到的三种评测模式，Agent（自选）benchmark 的分数不能简单等同于模型能力。
3. **任务覆盖**：没有单一 benchmark 能代表模型整体水平。通常组合代码 + 推理 + Agent + 多模态四个维度做交叉判断。
4. **提示敏感度**：同一个模型在 zero-shot、few-shot、CoT 下的表现差异可能很大。技术报告里的数字需要看具体的 prompt 和评测设定，不能光看百分比。
5. **饱和与换代**：部分 benchmark（GSM8K、MATH、MMLU）已接近饱和，前沿模型分数接近天花板。关注新 benchmark（AIME、FrontierMath、SWE-bench Verified、Humanity's Last Exam）是判断真正进展的关键。
6. **客观 vs 主观**：自动化 benchmark 分数高 ≠ 人类愿意用。Chatbot Arena 等人类偏好评测弥补了这个 gap。理想情况下需要两类结果交叉验证。

## Reference

> 以下链接为原文保留的初始引用，后续补充的 benchmark 未全部收录链接，可按名称直接搜索。

### 代码

1. [SWE-bench](https://github.com/SWE-bench/SWE-bench)
2. [HumanEval](https://github.com/openai/human-eval)
3. [MBPP](https://arxiv.org/abs/2108.07732)
4. [LiveCodeBench](https://github.com/LiveCodeBench/LiveCodeBench)
5. [Terminal-Bench 2.0](https://github.com/laude-institute/terminal-bench)

### 知识与推理

6. [MMLU](https://arxiv.org/abs/2009.03300)
7. [MMLU-Pro](https://arxiv.org/abs/2406.01574)
8. [GPQA-Diamond](https://arxiv.org/abs/2311.12022)
9. [Humanity's Last Exam](https://arxiv.org/abs/2501.14249)
10. [MATH](https://arxiv.org/abs/2103.03874)
11. [GSM8K](https://openai.com/research/solving-math-word-problems)
12. [ARC-AGI](https://arcprize.org/guide)

### 检索与搜索

13. [BrowseComp](https://openai.com/index/browsecomp/)
14. [DeepSearchQA](https://arxiv.org/abs/2601.20975)
15. [SimpleQA](https://openai.com/index/introducing-simpleqa/)

### Agent

16. [tau2-bench](https://github.com/sierra-research/tau2-bench)
17. [GDPval](https://openai.com/index/gdpval/)
18. [OSWorld](https://arxiv.org/abs/2404.07972)

### 多模态

19. [MMMU-Pro](https://github.com/MMMU-Benchmark/MMMU)
20. [ZeroBench](https://arxiv.org/abs/2502.09696)
21. [MathVista](https://mathvista.github.io/)

### 综合与偏好

22. [Chatbot Arena](https://arxiv.org/abs/2403.04132)
23. [BIG-bench](https://github.com/google/BIG-bench)

### 补充（未在上方 Reference 但正文已列入）

- SWE-bench Verified: https://openai.com/index/introducing-swe-bench-verified/
- AIME: https://artofproblemsolving.com/wiki/index.php/AIME
- FrontierMath: https://epoch.ai/frontiermath
- Aider Polyglot: https://aider.chat/docs/leaderboards/
- WebArena: https://webarena.dev/
- BBH (BIG-Bench Hard): https://arxiv.org/abs/2210.09261
- IFEval: https://arxiv.org/abs/2311.07911
