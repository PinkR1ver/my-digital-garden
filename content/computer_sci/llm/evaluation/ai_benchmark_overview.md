---
title: 主流 AI Benchmark 概览
tags:
  - LLM
  - benchmark
  - evaluation
date: 2026-05-07
---

## 代码

| Benchmark | 考察能力 | 特点 |
|---|---|---|
| **SWE-bench** | 软件工程：修 bug、写 feature、理解大型代码库 | 基于真实 GitHub issue，需要定位修改点并生成 patch，是代码评测的事实主标 |
| **HumanEval** | 函数级代码生成 | 通过单元测试验证生成代码的正确性，题量小但引用率高 |
| **MBPP** | 基础编程能力 | 比 HumanEval 条目更多、题目更偏入门 |
| **LiveCodeBench** | 实时编程竞赛 | 从 LeetCode / AtCoder 等平台搜集新题，防止数据污染 |
| **Terminal-Bench 2.0** | 终端/命令行任务 | 模拟真实 shell 环境中的多步操作 |

## 知识与推理

| Benchmark | 考察能力 | 特点 |
|---|---|---|
| **MMLU-Pro** | 多学科选择题 | MMLU 的升级版，选项从 4 个增加到 10 个，减少猜测空间，覆盖 50+ 学科 |
| **GPQA-Diamond** | 研究生级别科学推理 | 由领域专家出题（物理、化学、生物），非专家仅能做对 ~34%，主要测推理性 |
| **Humanity's Last Exam** | 跨学科极限难题 | 题目来自全球研究人员投稿，难度极高，绝大多数人类也无法通过 |
| **MATH** | 竞赛级数学 | 涵盖代数、几何、数论等，需要多步推导 |
| **GSM8K** | 小学数学应用题 | 容易饱和，多数前沿模型达到 95%+ |
| **ARC-AGI** | 抽象视觉推理 | 每题包含少数几个网格示例，需要推断变换规则；强调 fluid intelligence |

## 检索与搜索

| Benchmark | 考察能力 | 特点 |
|---|---|---|
| **BrowseComp** | Web 浏览与信息综合 | 需要从多个网页中收集、交叉比对信息后回答问题 |
| **DeepSearchQA** | 深度搜索问答 | 模拟多轮搜索、筛选、归纳的复杂信息检索流程 |
| **SimpleQA** | 事实准确性 | 单轮简单事实问答，主要测幻觉和知识边界 |

## Agent 能力

| Benchmark | 考察能力 | 特点 |
|---|---|---|
| **tau2-bench** | 工具使用与 Agent 任务规划 | 模拟真实世界中 multi-step agent 任务，如预订、客服、数据操作 |
| **GDPval** | Agent 综合能力 | 评估 agent 在开放环境中的规划、执行和纠错 |
| **OSWorld** | 操作系统级别 Agent | 在真实虚拟机上完成 GUI 操作，覆盖办公软件、浏览器、命令行等 |

## 多模态理解

| Benchmark | 考察能力 | 特点 |
|---|---|---|
| **MMMU-Pro** | 跨学科多模态推理 | 覆盖艺术、科学、医学等领域的图表、图像、文档理解 |
| **ZeroBench** | 视觉计数与精确观察 | 故意设计大量杂乱物体的数数题，当前模型普遍表现差 |
| **MathVista** | 数学可视化推理 | 几何图、统计图表、公式图像中的数学推理 |

## 综合与偏好

| Benchmark | 考察能力 | 特点 |
|---|---|---|
| **Chatbot Arena** | 人类偏好对比 | LMSYS 组织的盲评投票，做 Elo 排名。因反映真实用户偏好而影响力大 |
| **BIG-bench** | 泛化与极限能力 | Google 主导的 200+ 任务集合，覆盖面广但条目质量参差 |

## 四象限视角

按「AI 能不能做 × 人类能不能做」分类，可以快速判断一个 benchmark 的难度成色：

| 象限 | 典型 benchmark | 意味着 |
|---|---|---|
| AI 能做，人类难做 | SWE-bench、GPQA-Diamond、MATH | 模型在技术深度上可能超过非专业人类，是技术报告中最常引用的高含金量指标 |
| AI 能做，人类也能做 | tau2-bench、MMLU（简单题） | 检验模型的日常辅助能力，门槛相对较低 |
| AI 不大会，人类会做 | ZeroBench、ARC-AGI（部分） | 暴露模型在特定认知模式上的短板，是发现能力边界的关键 |
| AI 不会，人类也不会 | Humanity's Last Exam | 测的是“极限挑战”，用于展示模型绝对上限 |

![](computer_sci/llm/evaluation/attachments/ai_benchmark_quadrant.png)

## 选择 Benchmark 的注意事项

1. **数据污染**：训练数据可能泄露 benchmark 题目，老 benchmark（GSM8K、MMLU）尤其严重。优先看 LiveCodeBench、Chatbot Arena 这类动态更新的指标。
2. **评测方式**：选择题（MMLU）容易刷分但区分度下降；交互式评测（SWE-bench、Chatbot Arena）更能反映真实能力。
3. **任务覆盖**：没有单一 benchmark 能代表模型整体水平。通常组合代码 + 推理 + Agent + 多模态四个维度做交叉判断。
4. **提示敏感度**：同一个模型在 zero-shot、few-shot、CoT 下的表现差异可能很大，技术报告里的数字需要看具体评测方式。

## Reference

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
