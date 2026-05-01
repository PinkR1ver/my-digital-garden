---
title: LLM cache hit
tags:
  - llm
  - cache
  - inference
date: 2026-04-29
---

## 核心概念

LLM 里的 cache hit 通常指：模型在处理本次请求时，发现某一段输入前缀已经在之前请求中完成过 prefill，于是可以复用那段前缀对应的 KV cache，而不是重新计算所有注意力层的 key/value。它主要减少的是输入阶段的延迟和成本，对输出 token 的逐步生成本身没有同等程度的加速。

这类缓存不要和语义缓存混在一起。语义缓存是应用层用 embedding 或规则判断“两个问题意思相近”，然后复用上次答案；prompt / prefix / context caching 则是推理系统复用“完全相同前缀”的中间张量，通常不会改变模型输出分布，只是减少重复计算。

## 推理阶段中的缓存

自回归 Transformer 推理一般分成两个阶段：

1. **Prefill**：把输入 prompt 一次性跑过模型，得到每一层 attention 的 KV cache。
2. **Decode**：逐 token 生成输出；每生成一个 token，只需要和已有 KV cache 做 attention，不需要重新计算完整历史。

跨请求的 cache hit，本质上是把第一次请求的 prefill 结果保存下来。下一次请求如果开头 token 完全一致，就可以从分叉点之后继续计算。

因此最基本的命中条件是：

- 命中的部分必须是前缀，不是中间任意片段。
- 前缀 tokenization、消息顺序、工具 schema、图片参数等都必须一致。
- 前缀要达到厂商或推理引擎的最小缓存粒度。
- 缓存还没有过期、被淘汰，且请求被路由到能找到该缓存的服务实例。

## 影响 cache hit 的因素

影响 cache hit 的因素可以分成两层：一层是模型和推理服务本身能不能经济地保存、查找、复用 KV cache；另一层是应用请求是否真的给出了稳定、可匹配的前缀。

### 模型与服务架构有关

**KV cache 的大小。** 对同样长度的上下文，KV cache 大小受层数、KV heads 数、head dimension、精度影响。MHA、GQA、MQA、MLA 等 attention 设计会改变每个 token 需要保存多少 KV 状态。KV cache 越小，越容易长时间保存、跨请求复用，也越适合放到更慢但更便宜的存储层。

**Attention 的窗口。** 全局 attention 的历史 KV 一般随上下文线性增长；sliding window attention 只保留或重点使用局部窗口，缓存持久化和命中规则可能会变得更复杂。DeepSeek 文档就明确提到，由于 Sliding Window Attention，缓存前缀被作为独立完整单元持久化，后续请求必须完整匹配某个缓存前缀单元才算命中。

**位置编码与 token 边界。** KV cache 是绑定 token 序列和位置的。即使语义相同，只要前面多了时间戳、空格、不同 JSON 字段顺序，后续所有 token 的位置都可能变化，缓存就会断掉。

**推理引擎的块管理。** vLLM 的 Automatic Prefix Caching 会以 KV block 为单位缓存和查找前缀；PagedAttention 把 KV cache 分块管理，减少显存碎片并允许跨请求共享块。块大小越大，管理开销越低，但命中粒度也更粗。

**模型是否支持某种服务端缓存策略。** 有些厂商只做短期 GPU 内存缓存；有些支持显式缓存对象、缓存检查点、长 TTL 或磁盘/本地存储层。这个能力不完全由模型架构决定，但 KV cache 的体积和注意力结构会强烈影响它能否经济地实现。

### 应用开发实践有关

**把稳定内容放在最前面。** 系统 prompt、工具定义、JSON schema、few-shot examples、长文档、代码仓库摘要应尽量放在请求开头；用户当次问题、时间戳、随机 ID、短期状态放在后面。

**保持序列化稳定。** tools / functions / schema 的字段顺序、空白、枚举顺序、图片 detail 参数、文件引用方式都要稳定。对于 JSON，最好用确定性序列化。

**多轮对话只追加，不改写历史。** 修改、删除、重排早期 messages 会破坏前缀。需要压缩历史时，应该意识到压缩点之前的缓存会失效。

**使用厂商提供的路由 key。** OpenAI 的 `prompt_cache_key`、xAI 的 `x-grok-conv-id` / `prompt_cache_key` 这类参数可以帮助请求落到更可能有缓存的服务实例。

**显式缓存或 checkpoint 要放在静态内容末尾。** Claude / Bedrock 这类支持 cache breakpoint 的 API，应该把 breakpoint 放在“最后一个稳定块”后面，而不是放在每次都会变化的用户消息后面。

**监控 cache hit tokens。** 不要靠感觉判断缓存是否生效。应该记录 `cached_tokens`、`cache_read_input_tokens`、`prompt_cache_hit_tokens` 等字段，并按 prompt 模板、模型、路由 key、请求类型统计命中率。

### 架构因素和开发因素对比

| 维度 | 模型 / 服务架构因素 | 应用开发因素 |
|---|---|---|
| 主要问题 | 这个模型和服务系统能不能高效保存、查找、复用 KV cache | 本次请求是否和历史请求共享完全相同的前缀 |
| 典型变量 | attention 结构、KV heads、上下文窗口、缓存块大小、TTL、路由策略、显存/磁盘层级 | prompt 结构、message 顺序、tools/schema 序列化、时间戳位置、会话 ID、history 是否只追加 |
| 开发者可控性 | 通常只能通过选模型、选服务商、设置 TTL / checkpoint / cache key 间接影响 | 高，主要由请求组织方式和状态管理决定 |
| 失败表现 | 缓存被淘汰、路由到无缓存机器、未达到最小 token、服务端不支持长 TTL | 前缀被动态字段污染、历史被改写、工具顺序变化、变量内容放得太靠前 |
| 优化方向 | 选择支持 prompt caching 的模型；利用长 TTL、显式缓存、checkpoint；关注价格和命中字段 | 静态内容前置；变量内容后置；稳定序列化；append-only conversation；持续记录 hit tokens |

## 主流 API 参数对比

截至 2026-04-29，公开文档里的规则大致如下；价格和支持模型变化很快，实际接入前要再看一次官方 pricing。

| 提供方 | 缓存类型 | 最小前缀 / 粒度 | TTL / 保留 | 开发者可控项 | 命中观测字段 | 备注 |
|---|---|---:|---|---|---|---|
| OpenAI | 自动 prompt caching；部分模型支持 extended retention | prompt >= 1024 tokens | in-memory 通常空闲 5-10 min，最长 1h；部分模型可 `24h` | `prompt_cache_key`、`prompt_cache_retention` | `usage.prompt_tokens_details.cached_tokens` 或 input details | 精确前缀匹配；messages、images、tools、structured output schema 都可参与缓存 |
| Anthropic Claude | 自动缓存或显式 `cache_control` breakpoint | 依模型：1024 / 2048 / 4096 tokens | 默认 5 min；可选 1h，写入更贵 | top-level `cache_control`；block-level cache breakpoint；最多若干 breakpoint | `cache_creation_input_tokens`、`cache_read_input_tokens` | prompt 顺序为 tools -> system -> messages；cache read 约为基础输入价 0.1x |
| Google Gemini | implicit caching + explicit cached content | implicit：Gemini 3 Flash Preview 1024，Gemini 3 Pro Preview 4096，Gemini 2.5 Flash 1024，Gemini 2.5 Pro 4096 | explicit 默认 1h，可设置 TTL；另有 storage price | 创建 cached content；请求里引用 `cached_content` | `usage_metadata` 中的 cache hit tokens | explicit caching 更像可命名缓存对象，适合长视频、PDF、长文档 |
| DeepSeek | 默认开启的 disk context caching | 文档强调完整缓存前缀单元；旧公告提过 64-token 存储单元，新文档更强调 SWA 下的完整单元匹配 | 构建需数秒；不用后通常数小时到数天清理 | 基本无需改 API；主要靠稳定前缀 | `prompt_cache_hit_tokens`、`prompt_cache_miss_tokens` | disk cache 与 MLA / SWA 等架构和服务实现关系更强；第一次、第二次请求未必立刻命中 |
| Amazon Bedrock | prompt caching checkpoint；部分模型自动/简化管理 | 依模型；Claude 常见 1024 / 2048 / 4096 tokens per checkpoint | 多数 5 min；部分 Claude 4.5 支持 1h | cache checkpoint / `cachePoint` / `cache_control`；最多 checkpoint 数依模型 | Bedrock usage metrics | 支持模型、区域、checkpoint 字段限制差异很大 |
| xAI Grok | 自动 prompt caching | 文档未给统一最小 token；从 messages array 开头精确匹配 | 可能因负载或重启随时淘汰 | `x-grok-conv-id`；Responses API 可用 `prompt_cache_key` | Chat Completions: `usage.prompt_tokens_details.cached_tokens`；Responses: `usage.input_tokens_details.cached_tokens` | 所有 grok language models 支持；强烈建议稳定 conversation id |

## 实用设计模板

一个更容易命中的请求结构：

```text
system: 固定角色、输出规范、长期约束
tools: 稳定排序的工具定义
developer/static context: 固定知识、few-shot、长文档、代码索引
conversation history: 只追加的历史消息
user: 本次变量输入
```

容易破坏缓存的结构：

```text
system: 当前时间、request id、用户临时状态
tools: 每次动态重排的工具列表
developer/context: 本次才拼接的长文档
user: 问题
```

## 我的判断

如果只是做聊天机器人，缓存命中率主要取决于“是否只追加历史”和“是否用稳定会话路由”。如果是代码助手、文档问答、agent workflow，真正的收益来自把大块稳定上下文前置：工具 schema、仓库摘要、文档 corpus、few-shot 都应该在变量输入之前。

模型架构决定的是“缓存有多贵、多大、能保存多久、服务端愿不愿意给你做长 TTL”；开发实践决定的是“你有没有给它一个可以命中的稳定前缀”。

## Sources

- [OpenAI Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching)
- [OpenAI API Pricing](https://platform.openai.com/docs/pricing/)
- [Anthropic Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Gemini Context caching](https://ai.google.dev/gemini-api/docs/caching/)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [DeepSeek Context Caching](https://api-docs.deepseek.com/guides/kv_cache)
- [DeepSeek Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing)
- [Amazon Bedrock Prompt caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html)
- [xAI Prompt Caching](https://docs.x.ai/developers/advanced-api-usage/prompt-caching)
- [xAI Usage & Pricing](https://docs.x.ai/developers/advanced-api-usage/prompt-caching/usage-and-pricing)
- [vLLM Automatic Prefix Caching](https://docs.vllm.ai/design/prefix_caching.html)
