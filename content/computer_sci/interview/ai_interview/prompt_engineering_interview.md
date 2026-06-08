---
title: Prompt Engineering Interview
date: 2026-06-08
tags:
  - ai
  - llm
  - prompt
  - interview
---

## Prompt Engineering 是什么？

**Q: Prompt Engineering 不是简单写提示词吗？为什么面试会问？**

A: 在工程场景里，Prompt Engineering 不是写一句“请认真回答”，而是把任务目标、上下文、约束、输出格式、失败处理都显式组织起来，让模型输出稳定、可控、可评估。

面试回答：

> Prompt 是大模型应用里的接口设计。好的 prompt 不只是让模型答得更好，还要让输出格式稳定、错误可控、方便后续系统消费。

## 一个好的 Prompt 包含什么？

**Q: 你怎么设计一个 Prompt？**

A: 我通常会包含这些部分：

- Role：模型扮演什么角色。
- Task：具体要完成什么。
- Context：可用背景信息。
- Constraints：不能做什么，必须遵守什么。
- Output format：JSON、Markdown、表格或字段 schema。
- Examples：少量示例帮助模型对齐风格。
- Evaluation criteria：什么算好答案。

示例结构：

```text
你是一个面试辅导助手。
任务：基于候选人的项目经历生成 5 个追问。
要求：问题要偏工程落地，不要泛泛而谈。
输出：JSON array，每个元素包含 question、purpose、expected_signal。
```

## 怎么让输出稳定？

**Q: 大模型输出不稳定，怎么解决？**

A:

- 明确输出 schema。
- 降低 temperature。
- 给 few-shot examples。
- 用 JSON mode 或 function calling。
- 对输出做 schema validation。
- 失败时让模型基于错误信息修复。

面试里要强调：

> Prompt 只能提高概率，不能提供强保证。强约束要靠解析器、schema 校验和后处理完成。

## Prompt 优化怎么做？

**Q: Prompt 优化一般怎么迭代？**

A:

1. 收集 bad cases。
2. 给 bad case 分类：理解错、格式错、证据不足、语气不对、幻觉。
3. 修改 prompt 中对应部分。
4. 在固定评估集上回归测试。
5. 记录版本和指标变化。

项目表达：

> 我不会只凭感觉改 prompt，会维护一组典型 query 和 expected output。每次改 prompt 后跑回归，避免修好一个 case 又弄坏另一个 case。

## Prompt 和 RAG 的关系

**Q: RAG 里 Prompt 主要控制什么？**

A: RAG 的 prompt 主要控制模型如何使用检索证据。

常见约束：

- 只基于给定资料回答。
- 如果资料不足，要说明不知道。
- 引用对应来源。
- 不要编造文档中没有的信息。
- 对冲突证据要说明冲突。

示例回答：

> 在 RAG 中，prompt 的重点不是让模型更会说，而是让模型 grounded in context，避免脱离证据自由发挥。

## Prompt 和 Agent 的关系

**Q: Agent 里的 Prompt 有什么特殊点？**

A: Agent prompt 除了回答问题，还要指导模型选择动作。

需要描述：

- 当前目标。
- 已完成步骤。
- 可用工具。
- 每个工具的参数和限制。
- 什么时候调用工具。
- 什么时候停止。
- 输出 action 的格式。

常见坑：

- 工具描述太模糊，模型乱调用。
- 没有终止条件，Agent 反复循环。
- 没有限制动作空间，模型幻想不存在的工具。
- 没有错误恢复策略。

## 面试高频追问

**Q: Prompt 能不能彻底解决幻觉？**

A: 不能。Prompt 可以降低幻觉概率，但不能根除。要结合 RAG、工具调用、引用来源、规则校验、人工审核和评估集。

**Q: Zero-shot、Few-shot、Chain-of-Thought 有什么区别？**

A:

- Zero-shot：不给例子，直接让模型完成任务。
- Few-shot：给几个输入输出示例，帮助模型对齐模式。
- Chain-of-Thought：引导模型分步骤推理，但生产环境不一定要暴露推理过程。

**Q: 什么时候不用复杂 Prompt？**

A: 简单分类、固定格式抽取、可由规则解决的任务，不一定要写复杂 prompt。工程上优先选择稳定、便宜、可维护的方案。

