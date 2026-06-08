---
title: RAG Interview
date: 2026-06-08
tags:
  - ai
  - llm
  - rag
  - interview
---

## RAG 是什么？

**Q: 什么是 RAG？为什么大模型应用需要 RAG？**

A: RAG 是 Retrieval-Augmented Generation，检索增强生成。它不是只靠模型参数回答，而是在生成前先从外部知识库检索相关资料，再把资料作为上下文交给 LLM 生成答案。

面试回答：

> RAG 解决的是大模型知识过期、私有知识缺失、幻觉和可追溯性问题。模型负责语言理解和生成，外部知识库负责提供最新、可控、可引用的事实依据。

典型链路：

1. 文档加载。
2. 文档切分。
3. 向量化 embedding。
4. 写入向量库。
5. 用户 query 向量化。
6. 相似度检索。
7. 可选 rerank。
8. 拼接上下文。
9. LLM 生成答案。
10. 返回答案和引用来源。

## 文档怎么切分？

**Q: RAG 里文档 chunk 怎么切？**

A: 切分要平衡语义完整性和检索粒度。

常见方案：

- 固定长度切分：简单稳定，但可能切断语义。
- 按标题/段落切分：保留结构，适合文档知识库。
- 滑动窗口 overlap：避免边界信息丢失。
- 语义切分：按主题变化切，质量高但成本更高。

面试里可以说：

> 我会优先按文档结构切分，比如标题、段落、列表；再设置 overlap 保留上下文。chunk 太大召回不准，chunk 太小又缺少完整语义。

## 检索策略怎么调？

**Q: RAG 检索效果不好，你会怎么优化？**

A: 从 query、chunk、retrieval、rerank、prompt 五层排查。

- Query rewrite：把用户问题改写成更适合检索的形式。
- Hybrid search：向量检索 + BM25 关键词检索。
- TopK 调整：召回太少会漏信息，太多会引入噪声。
- Similarity threshold：低于阈值不强行回答。
- Rerank：用 cross-encoder 或 reranker 重排候选文档。
- Metadata filter：按用户权限、时间、文档类型过滤。
- Prompt grounding：要求模型只基于证据回答。

**追问: 什么时候不应该检索？**

A: 简单寒暄、通用常识、用户只要改写文本时不一定需要检索。可以先做 query classification，判断是否需要查知识库。

## RAG 和 Agent 怎么结合？

**Q: RAG 接到 Agent 里有几种方式？**

A: 两种常见方式：

- RAG 作为 Agent 内部能力：Agent 每次回答前自动执行检索。
- RAG 包装成 Tool：Agent 判断需要知识库时，显式调用 `search_knowledge_base`。

对比：

| 方式 | 优点 | 缺点 |
|---|---|---|
| 内置 RAG | 简单稳定，适合问答系统 | 不够灵活 |
| RAG Tool | Agent 可按需调用，适合复杂任务 | 工具选择和参数更容易出错 |

面试表达：

> 如果是知识库问答，我会把 RAG 作为固定链路；如果是多工具 Agent，我会把 RAG 封装成工具，让 Agent 在规划阶段决定是否调用。

## 如何处理权限？

**Q: 企业知识库 RAG 怎么做权限控制？**

A: 权限过滤必须发生在检索阶段，不能只靠 prompt 约束。

做法：

- 文档写入时带 metadata：tenant、department、role、owner、visibility。
- 查询时根据用户身份加 filter。
- 检索结果只返回用户有权限的 chunk。
- 生成答案时保留 citation，方便审计。
- 日志记录用户访问了哪些文档片段。

关键句：

> 不能先检索全量文档再让模型不要说，因为模型已经看到了越权信息。权限必须在数据进入模型上下文之前完成。

## 如何评估 RAG 效果？

**Q: RAG 系统怎么评估？**

A: 至少评估两层：

- 检索层：Recall@K、MRR、命中文档是否正确。
- 生成层：答案准确性、是否引用证据、是否幻觉、格式是否满足要求。

工程指标：

- latency
- token cost
- empty retrieval rate
- citation coverage
- user feedback
- fallback rate

面试回答：

> 我会把 RAG 评估拆成 retrieval quality 和 answer quality。如果答案错了，先判断是没检索到、检索到了但没用好，还是模型生成时幻觉。

## 常见坑

**Q: RAG 有哪些常见坑？**

A:

- 以为向量库等于 RAG，忽略文档清洗和切分。
- chunk 太碎，模型看不到完整上下文。
- topK 太大，噪声进入 prompt。
- 没有权限过滤，企业场景有数据泄露风险。
- 没有 citation，答案不可追溯。
- 没有评估集，只靠主观感觉调参数。

