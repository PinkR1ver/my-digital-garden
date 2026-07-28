---
title: Chatbot Arena 评测体系
tags:
  - llm
  - benchmark
  - evaluation
  - lmsys
date: 2026-07-27
---

LMSYS Chatbot Arena 是目前影响力最大的 LLM 人类偏好评测平台。核心机制：两个匿名模型各生成一个回复，人类投票选择更好的那个，最终以 Elo 分排名。

## 评测维度

Arena 不是只有一个总分，而是按 prompt 类型拆成多个评测赛道：

| 赛道 | 典型 prompt | 考察什么 |
|---|---|---|
| **Overall** | 各类混合 | 综合能力，权重最大的主指标 |
| **Coding** | 写代码、debug、解释算法、代码审查 | 编程能力，与 SWE-bench / HumanEval 互补——ARENA 测的是"人觉得好不好用"，不是 pass@k |
| **Math** | 数学推导、解题、公式推理 | 数学推理，与 MATH / AIME 互补——后者测客观正确率，Arena 测推导过程是否清晰可读 |
| **Creative Writing** | 写故事、诗歌、剧本、文案 | 创意表达、风格控制、叙事连贯性 |
| **Hard Prompts** | 复杂推理、精细指令、多约束任务 | 模型在难度上限的表现 |
| **Longer Query** | 需要长回复的 task（综述、详细教程等） | 长文本组织能力、信息密度、是否跑题 |
| **Multi-Turn** | 多轮对话 | 上下文跟踪、对话一致性、记忆能力 |
| **Instruction Following** | 精确格式要求、约束条件 | 是否严格遵守用户指令（与 IFEval 考察同类能力，但 Arena 用人类 judge） |
| **Vision** | 图片理解、图表分析、多模态 | 多模态能力（对应 MMMU-Pro 等自动化 benchmark） |
| **Safety** | 边界问题、敏感话题 | 拒绝回答是否合理、是否安全但不过度保守 |

关键设计：**赛道由 prompt 类型决定，不是由回答内容决定**。用户提 coding 问题，就被归入 Coding 赛道，不看模型怎么答的。

## 为什么 Arena 重要

### 1. 防止数据污染

题目来自真实用户的实时输入，不存在训练集泄漏问题。这是相对于 MMLU / GSM8K 等固定 benchmark 的最大优势。

### 2. 捕捉自动化 benchmark 测不到的东西

| 自动化 benchmark | Arena 互补的能力 |
|---|---|
| HumanEval（客观正确率） | 代码可读性、解释质量、方案合理性 |
| MATH（答案对错） | 推导过程是否清晰、有无跳步 |
| MMMU-Pro（选择题） | 多模态交互体验、视觉描述质量 |
| IFEval（规则检查） | 人类实际感受到的指令遵循程度 |

自动化 benchmark 能告诉你模型答对了没有；Arena 能告诉你人觉得好不好用。两者的差距本身就是信息——高正确率低 Elo 可能意味着模型虽然做对了但体验差（啰嗦、格式乱、不遵从指令风格）。

### 3. 真实用户分布

Arena 的 prompt 分布反映的是真实用户实际会问的问题，而不是 benchmark 设计者认为重要的题。这个分布本身就在变化——随着模型能力提升，用户也在提更难的问题。

## 方法论要点

- **盲评**：用户投票时不知道模型身份，减少品牌偏见
- **Bradley-Terry 模型**：从 pairwise comparison 推导 Elo 分，附带置信区间
- **统计显著性**：只显示有足够 battle 数的模型，且标明 confidence band
- **Style Control**：LMSYS 也研究如何控制"风格偏好"对评分的干扰（某些模型因回复更长或语气更热情而获得不公平优势）

## 与其他 benchmark 的关系

```
自动化 benchmark（客观正确率）  ←→  Arena（人类主观偏好）
      ↑                              ↑
      └──────── 共同构成完整评估 ────────┘
```

- Arena 高的模型不一定在 MATH 上分最高（反之亦然）
- 最值得关注的信号是**两者都在前列的模型**——既做对了事，又让人愿意用
- Arena 在 Multi-Turn / Creative Writing 等"软能力"维度上几乎没有自动化替代方案

## Reference

- LMSYS Chatbot Arena Leaderboard: https://chat.lmsys.org/
- Arena 论文 (Chatbot Arena: An Open Platform for Evaluating LLMs by Human Preference): https://arxiv.org/abs/2403.04132
- LMSYS 技术博客: https://lmsys.org/blog/
