---
title: Agent Tool Calling and MCP Interview
date: 2026-06-08
tags:
  - ai
  - llm
  - agent
  - mcp
  - interview
---

## Tool Calling 是什么？

**Q: 大模型 Tool Calling 是什么？**

A: Tool Calling 是让模型在需要外部能力时，输出一个结构化的工具调用请求，比如调用搜索、数据库、计算器、浏览器或业务 API。真正的工具执行由应用层完成，模型只负责决定调用哪个工具、传什么参数。

典型流程：

1. 开发者注册工具名称、描述和参数 schema。
2. 用户提出任务。
3. LLM 判断是否需要工具。
4. LLM 输出 tool name 和 arguments。
5. 后端校验参数并执行工具。
6. 工具结果返回给 LLM。
7. LLM 基于结果继续推理或生成最终答案。

关键句：

> Tool Calling 的本质是把模型从纯文本生成，扩展成可调用外部系统的决策器。

## 为什么需要工具？

**Q: 为什么不直接让模型回答？**

A: 因为模型参数里的知识有限，而且不能直接访问实时数据和私有系统。

工具适合解决：

- 实时信息：搜索、天气、价格、库存。
- 私有数据：数据库、CRM、内部知识库。
- 确定性计算：代码执行、数学计算。
- 外部动作：发邮件、创建 ticket、调用业务 API。
- 多模态操作：浏览器、文件、图片处理。

## MCP 是什么？

**Q: MCP 是什么？它和普通 Tool Calling 有什么区别？**

A: MCP 是 Model Context Protocol，用来标准化模型应用和外部工具/数据源之间的连接方式。普通 Tool Calling 往往是每个应用自己定义工具接入方式；MCP 更像一个统一协议，让工具服务以标准方式暴露给模型应用。

面试表达：

> Function Calling 更偏模型侧的结构化调用能力，MCP 更偏上下文和工具接入协议。MCP 让不同工具、数据源、Agent 客户端之间的集成更标准。

可以类比：

- Tool Calling：模型决定要调用 `search_docs(query)`。
- MCP：规定这个工具服务如何被发现、描述、调用、返回资源。

## Tool 怎么设计？

**Q: 设计一个工具时要注意什么？**

A:

- 名称清晰：模型能理解什么时候用。
- 描述准确：不要夸大工具能力。
- 参数 schema 明确：类型、必填项、枚举值。
- 返回结果结构化：方便模型继续使用。
- 权限控制：不同用户能调用的工具不同。
- 幂等性：避免重复调用造成副作用。
- 超时和重试：工具不稳定时能恢复。

坏例子：

```text
tool: do_something
description: helps user
```

好例子：

```text
tool: search_internal_docs
description: Search documents the current user has permission to access.
arguments: { query: string, top_k: number, doc_type?: string }
```

## 工具调用怎么做权限控制？

**Q: Agent 能调用工具，怎么避免越权？**

A: 权限不能只写在 prompt 里，必须在服务端执行。

做法：

- 工具白名单：当前用户只能看到允许的工具。
- 参数校验：防止模型构造危险参数。
- 服务端鉴权：工具执行前检查 user、tenant、role。
- 敏感动作确认：删除、付款、发送消息等需要二次确认。
- 审计日志：记录谁在什么时候调用了什么工具。

关键句：

> 模型可以建议调用工具，但不能拥有最终执行权。最终权限边界必须由后端系统控制。

## RAG 应该作为工具吗？

**Q: RAG 应该接在 Agent 里，还是包装成工具？**

A: 取决于产品形态。

- 知识库问答：RAG 作为固定链路更稳定。
- 多任务 Agent：RAG 包装成工具更灵活。

面试回答：

> 如果用户每次问题都依赖知识库，我会把 RAG 放到主链路里；如果 Agent 同时有搜索、数据库、工单、代码执行等工具，我会把 RAG 暴露成 `search_knowledge_base` 工具，让 Agent 按需调用。

## 怎么记录调用链？

**Q: Agent 工具调用怎么 debug？**

A: 必须记录完整 trace：

- user input
- prompt version
- model output
- selected tool
- tool arguments
- tool response
- latency
- error type
- retry count
- final answer

面试里可以说：

> 没有 trace 的 Agent 很难上线。因为用户只看到最后答案，但工程师需要知道错误发生在规划、检索、工具调用还是生成阶段。

## 常见坑

**Q: Tool Calling 有哪些坑？**

A:

- 工具描述不清，模型乱选工具。
- schema 太宽，参数不可控。
- 把危险动作直接交给模型执行。
- 缺少幂等设计，重复调用产生副作用。
- 工具返回太长，浪费上下文。
- 没有 trace，线上问题无法复盘。

