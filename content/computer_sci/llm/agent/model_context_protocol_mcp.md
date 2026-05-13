---
title: Model Context Protocol MCP
date: 2026-05-13
tags:
  - llm
  - agent
  - mcp
  - tooling
  - codex
  - claude_code
---

## 写在前面

MCP，全称 **Model Context Protocol**，可以先粗略理解成：

> 给 AI application / agent 连接外部工具、数据源、业务系统的一套标准协议。

它解决的问题不是“模型怎么推理”，而是：

- agent 要怎么发现外部工具？
- 外部工具的参数 schema 怎么描述？
- 文件、数据库 schema、API response 这类 context 怎么交给模型？
- 一个 agent app 怎么同时接多个工具服务，而不是每个工具都写一套私有集成？
- 本地工具和远程工具怎么用相似的协议接入？

Anthropic 官方在 2024-11-25 开源 MCP 时，用过一个很经典的类比：MCP 像 AI 应用里的 USB-C；不同数据源和工具不再需要各写各的私有接口，而是通过一个通用协议接进来。[1]

这篇笔记更关心机制，不追某个具体 MCP server 的安装教程。

---

## 1. MCP 为什么会出现

在 MCP 之前，LLM app 已经有很多“连接外部世界”的方式：

- RAG：把外部文档检索后塞进 context
- function calling：模型输出结构化 tool call
- ChatGPT plugins / 各厂商 plugin
- IDE 内置工具：read file、write file、run shell
- 各 agent framework 自己定义 tool interface

这些东西都能工作，但问题是它们太碎了。

如果一个公司有：

- GitHub
- Slack
- Notion
- Google Drive
- Postgres
- Sentry
- Linear
- internal API

传统做法往往是：

```text
Claude integration for GitHub
OpenAI integration for GitHub
Cursor integration for GitHub
internal agent integration for GitHub
...
```

每换一个 host app，就要重新适配一遍。每个 host 对工具 schema、鉴权、错误返回、上下文注入的理解也不一样。

MCP 的出现，本质上是把这个问题从：

> 每个 AI app 都各自写 N 个 connector

变成：

> 每个数据源 / 工具实现一个 MCP server，多个 AI app 作为 MCP host 去连接它

所以 MCP 不是“另一个 agent 框架”，而是 agent 生态里的 **integration protocol**。

---

## 2. 发展脉络

### 2.1 2024-11：Anthropic 开源 MCP

Anthropic 在 2024-11-25 发布 MCP，目标是提供一个 open standard，把 AI assistant 连接到 content repositories、business tools、development environments 等数据所在的系统。[1]

当时一起发布的东西主要有：

- MCP specification and SDKs
- Claude Desktop 的本地 MCP server 支持
- 一批 open-source MCP servers，比如 Google Drive、Slack、GitHub、Git、Postgres、Puppeteer

这说明 MCP 一开始就不是纯论文式协议，而是和 Claude Desktop / developer tooling 一起落地的。

### 2.2 2025：从 Claude 生态扩散到 agent 生态

MCP 后来快速被各种 AI coding / agent 工具吸收。

官方 spec 也逐步从“能连工具”扩展到更完整的 agent runtime 协议：

- client / server capability negotiation
- stdio 和 Streamable HTTP transport
- resources / prompts / tools 三类 server primitives
- roots / sampling / elicitation 等 client primitives
- authorization、安全建议、tool result schema、通知机制

OpenAI Agents SDK 现在也直接支持 MCP server，并把 MCP 描述成“applications expose tools and context to language models”的标准；SDK 支持 hosted MCP、Streamable HTTP、SSE、stdio 等不同接入方式。[2]

### 2.3 2025-12：MCP 捐给 Linux Foundation / AAIF

2025-12-09，Anthropic 宣布把 MCP 捐给 Linux Foundation 旗下新成立的 **Agentic AI Foundation**，作为 founding project 之一；同一批 founding projects 还包括 Block 的 goose 和 OpenAI 的 AGENTS.md。[3]

这件事的意义是：MCP 不再只是 Anthropic 自家产品的接口规范，而是更明确地走向中立治理和跨厂商 agent 标准。

### 2.4 当前状态：一个仍在快速演进的事实标准

截至这次查询，MCP 官方 specification 当前 latest 版本是 `2025-11-25`。[4]

这个版本里，MCP 已经不只是“tool calling wrapper”。它更像一套围绕 AI application 的连接协议：

- 用 JSON-RPC 2.0 做消息格式
- 用 stateful connection 管理 session
- 初始化时做 protocol version 和 capabilities negotiation
- server 暴露 resources、prompts、tools
- client 可暴露 roots、sampling、elicitation
- 通过 notification 支持列表变化、进度、日志等动态行为
- 对 remote server 的 OAuth / authorization 有专门规范

---

## 3. MCP 的核心架构

MCP 的官方架构是 **host - client - server**，不是简单的“模型直接连工具”。[5]

```text
User
  |
  v
MCP Host
  |-- MCP Client A <-> MCP Server A
  |-- MCP Client B <-> MCP Server B
  |-- MCP Client C <-> MCP Server C
  |
  v
LLM / Agent Runtime
```

### 3.1 MCP Host

Host 是 AI 应用本体。

例子：

- Claude Desktop
- Claude Code
- Cursor
- VS Code agent mode
- Codex / OpenAI Agents SDK app
- 你自己写的 agent app

Host 负责：

- 管理多个 MCP client
- 决定连接哪些 MCP server
- 做用户授权和权限控制
- 把 server 暴露的 tools/resources/prompts 整合进 agent runtime
- 决定哪些 context 给模型看
- 决定 tool call 是否需要用户确认

关键点：

> MCP server 不应该直接拥有整个 conversation。Host 才是聚合上下文和执行策略的地方。

官方架构也强调，server 不应看到完整对话，也不应看到其他 server；host 负责维持这些安全边界。[5]

### 3.2 MCP Client

MCP client 是 host 内部的连接对象。

一个 host 可以连多个 server，但通常是：

```text
one MCP client <-> one MCP server
```

Client 负责：

- 和 server 建立 stateful session
- 初始化时交换 protocol version / capabilities
- 发送 `tools/list`、`tools/call`、`resources/read` 等 JSON-RPC request
- 接收 server notification
- 把结果交回 host

平时我们说“Claude 连了一个 GitHub MCP server”，中间其实有一个 Claude host 创建出来的 MCP client。

### 3.3 MCP Server

MCP server 是最关键的概念。

它是一个独立程序 / 服务，专门把某个外部系统包装成 MCP 能理解的 primitives。

比如：

```text
GitHub MCP server
  -> list issues
  -> read pull request
  -> search code
  -> comment on PR

Postgres MCP server
  -> expose schema as resource
  -> run read-only SQL as tool
  -> provide SQL prompt templates

Filesystem MCP server
  -> list files
  -> read file
  -> write file, if allowed
```

所以 MCP server 不是“大模型服务器”，也不是“agent 子进程”。更准确地说：

> MCP server 是把某个能力域暴露给 AI host 的协议适配层。

一个好的 MCP server 应该有很聚焦的职责。不要把所有东西都塞进一个万能 server，否则权限、审计、工具选择都会变差。

---

## 4. MCP server 能暴露什么

MCP server 主要暴露三类东西：**tools、resources、prompts**。[4]

### 4.1 Tools：模型可调用的动作

Tool 是最像我们平时说的 function calling 的部分。

官方定义里，tools 是 server 暴露给 language model 调用的可执行函数，用来查数据库、调用 API、做计算等。[6]

一个 tool 通常包含：

- `name`：程序化名称
- `title`：给人看的名称，可选
- `description`：告诉模型这个工具做什么
- `inputSchema`：JSON Schema 参数定义
- `outputSchema`：可选的结构化输出 schema
- annotations / icons / execution metadata

典型消息流：

```text
client -> server: tools/list
server -> client: available tools + schemas
model decides to use a tool
client -> server: tools/call
server -> client: tool result
host -> model: tool result becomes context
```

Tool 是危险性最高的一类 primitive，因为它通常会产生副作用：

- 发请求
- 查内部系统
- 写文件
- 创建 issue
- 修改数据库

所以 host 应该在 UI 里清楚展示 tool 暴露情况，并在敏感操作前让用户确认。[6]

### 4.2 Resources：给模型看的上下文数据

Resource 是“可读取的上下文”。

官方定义里，resources 让 server 以标准方式向 client 暴露数据，例如文件、数据库 schema、API response、应用内部信息等；每个 resource 用 URI 唯一标识。[7]

例子：

```text
file:///project/src/main.rs
postgres://database/schema
github://repo/pull/123
internal-docs://policy/security
```

Resource 和 tool 的区别：

| 类型 | 核心含义 | 是否通常有副作用 |
| --- | --- | --- |
| resource | 读上下文 | 通常没有 |
| tool | 做动作 / 查询 / 计算 | 可能有 |

如果一个 server 暴露数据库：

- database schema 更像 resource
- `run_sql(query)` 更像 tool

### 4.3 Prompts：可复用的交互模板

Prompt 是 server 提供的 prompt template / workflow。

它不是 host 的 system prompt，也不是用户每次手写的 prompt，而是某个 server 根据自己领域提供的“推荐交互模板”。

比如 Postgres MCP server 可以提供：

```text
explain_query_plan
write_read_only_analytics_sql
debug_slow_query
```

这些 prompt 可以帮助 host / user 以更稳定的方式调用 server 能力。

---

## 5. MCP client 也可以暴露能力

MCP 不只是 server 单向给 host 提供工具。较新的 spec 里，client 也能向 server 声明一些能力。[4]

重要的有：

### 5.1 Roots

Roots 用来告诉 server：你被允许操作或理解的边界在哪里。

比如一个 filesystem server 不应该默认看整个电脑，而是只知道：

```text
/Users/jude/project-a
/Users/jude/project-a/docs
```

这有点像把 agent 的工作区边界显式告诉 server。

### 5.2 Sampling

Sampling 允许 server 反过来请求 host 调一次 LLM。

这个设计很有意思：server 不需要自己绑定 OpenAI / Anthropic / local model SDK，而是通过 MCP client 请求 host 提供一次 model completion。

但它也更敏感，因为 server 可能借此让模型处理额外文本，所以 spec 强调用户控制和 prompt 可见性。

### 5.3 Elicitation

Elicitation 允许 server 请求用户补充信息。

比如一个 deployment server 发现缺少环境名，可以让 host 问用户：

```text
Deploy to staging or production?
```

这让 MCP server 不只是“哑工具”，而能参与更长的交互流程。

---

## 6. Transport：MCP 怎么通信

MCP 的消息层基于 JSON-RPC 2.0，但底层 transport 可以不同。[4]

常见两类：

### 6.1 stdio

Host 启动一个本地进程，然后通过 stdin/stdout 和它通信。

```text
Claude Code / Codex
  -> start: npx some-mcp-server
  -> stdin/stdout JSON-RPC
```

适合：

- 本地文件系统
- 本地 git repo
- local database
- 开发机上的临时工具

风险：

- 本地 MCP server 本质上是你运行的代码
- 它通常拥有和 host 类似的本机权限
- 如果安装命令恶意，就等于执行恶意脚本

### 6.2 Streamable HTTP

Remote MCP server 通过 HTTP 提供服务。

适合：

- SaaS 官方 MCP server
- 企业内部统一 MCP gateway
- 云端服务
- 需要 OAuth / bearer token / API key 的服务

MCP 现在对 HTTP transport 的 authorization 有更完整规范，包括 OAuth 2.1、Protected Resource Metadata、Authorization Server Metadata、Dynamic Client Registration / Client ID Metadata 等。[8]

直觉上：

```text
stdio MCP server  -> 更像本地插件 / 本地进程
HTTP MCP server   -> 更像标准化的远程 API connector
```

---

## 7. 一个完整 MCP 调用大概怎么发生

以“让 agent 查 GitHub issue”为例：

```text
1. Host 启动或连接 GitHub MCP server

2. Host 内部创建 MCP client

3. Client -> Server:
   initialize

4. Server -> Client:
   protocolVersion + capabilities

5. Client -> Server:
   tools/list

6. Server -> Client:
   search_issues, get_issue, list_pull_requests...

7. User:
   "帮我看一下 #123 为什么没合并"

8. Model:
   决定调用 get_issue

9. Host:
   判断权限，必要时问用户

10. Client -> Server:
    tools/call get_issue { "number": 123 }

11. Server:
    调 GitHub API

12. Server -> Client:
    返回 issue 内容

13. Host:
    把 tool result 放回模型上下文

14. Model:
    总结给用户
```

这里真正和 GitHub 打交道的是 **MCP server**；模型只看到 host 给它展示的 tool schema 和 tool result。

---

## 8. MCP 和其他概念的区别

### 8.1 MCP vs function calling

Function calling 是模型厂商提供的“模型输出结构化函数调用”的能力。

MCP 是外部工具 / 数据源如何被 host 发现、连接、调用、返回结果的一套协议。

可以这样理解：

```text
function calling:
  model says: call function X with args Y

MCP:
  server says: I have tool X with schema Y
  client says: call tool X with args Z
  server says: here is result R
```

很多 host 会把 MCP server 暴露出来的 tools 转成模型可见的 function tools。

### 8.2 MCP vs plugin

Plugin 通常是某个产品自己的扩展机制。

MCP 更像跨产品协议。

一个 MCP server 理论上可以同时被 Claude Code、Cursor、Codex、OpenAI Agents SDK、自研 agent app 连接；而 plugin 往往绑定某个平台的生命周期、UI 和权限模型。

### 8.3 MCP vs skill

Skill 更像 task-scoped prompt / workflow module。

MCP 更像外部能力接口。

对照：

| 概念 | 主要作用 |
| --- | --- |
| skill | 告诉 agent 某类任务怎么做 |
| MCP server | 给 agent 提供外部工具和数据 |
| hook | 在 agent 生命周期节点拦截 / 注入 / 记录 |
| AGENTS.md | 给项目级长期规则 |

比如：

- skill：处理 GitHub PR review 时先看 unresolved comments
- MCP server：提供 `list_pr_comments`、`reply_comment`、`get_file_diff`
- hook：agent 准备 `reply_comment` 前要求确认
- AGENTS.md：这个 repo 不允许直接 push 到 main

### 8.4 MCP vs RAG

RAG 更关注“检索知识并放进上下文”。

MCP 覆盖更广：

- 可以读资源，像 RAG
- 可以调用工具，像 function calling
- 可以暴露 prompt 模板
- 可以做授权、通知、capability negotiation

所以 MCP 可以承载 RAG，但不等于 RAG。

---

## 9. 为什么 MCP server 很关键

MCP server 是整个生态的复用单元。

如果你在开发自己的 agent，MCP server 的价值是：

### 9.1 把工具能力从 agent runtime 里拆出来

不要把所有 API 调用都硬编码在 agent 里。

更好的结构：

```text
agent runtime:
  reasoning, planning, permission, memory, UI

MCP server:
  domain-specific tools and resources
```

这样你的 agent 可以换模型，MCP server 仍然能复用。

### 9.2 让同一个工具服务多个 agent

比如你写一个 `labserver` MCP server：

- Codex 能用
- Claude Code 能用
- Cursor 能用
- 自己写的 web agent 能用

不用给每个 host 都写一套 connector。

### 9.3 明确权限边界

一个好的 MCP server 可以只暴露必要工具：

```text
read_logs
restart_service
query_metrics
```

而不是直接暴露一个万能 shell。

这比“给 agent 一个 Bash，让它自己想办法”更可控。

### 9.4 改善工具描述质量

Agent 能不能正确使用工具，很大程度取决于 tool description 和 schema。

MCP server 是沉淀这些描述的地方：

- 工具名稳定
- 参数 schema 稳定
- description 写清楚使用边界
- error result 让模型能自我修正
- outputSchema 帮助 host / model 理解结构化结果

---

## 10. 安全模型：MCP 不是魔法安全层

MCP 标准化了连接方式，但不自动让工具安全。

官方 spec 也明确提醒：MCP 带来任意数据访问和代码执行路径，implementor 必须认真处理 consent、authorization、tool safety、sampling control 等问题。[4]

特别注意：

### 10.1 Local MCP server = 本地执行代码

stdio server 往往通过类似下面的命令启动：

```bash
npx some-mcp-server
python server.py
docker run ...
```

这不是“配置一下工具”那么简单，而是在本机运行代码。

官方 security best practices 也把 local MCP server compromise 列为风险：恶意启动命令、恶意 server、localhost 暴露、数据外泄、数据破坏都可能发生。[9]

### 10.2 Tool description 不是可信边界

Tool description 是给模型看的，不是安全保证。

一个工具可以描述自己是：

```text
read-only file search
```

但实际实现里可能写文件或上传数据。Host / client 不能只信 description，而要靠：

- server trust
- permission UI
- sandbox
- allowlist
- audit log
- scoped token
- network/filesystem isolation

### 10.3 Remote MCP 需要严肃鉴权

Remote MCP server 不只是“开一个 HTTP endpoint”。

如果它访问用户数据或企业系统，就要考虑：

- OAuth token audience
- dynamic registration / client identity
- redirect URI validation
- SSRF
- session hijacking
- scope minimization

MCP authorization spec 当前把 protected MCP server 视作 OAuth resource server，client 作为 OAuth client，请求代表 resource owner 访问受保护资源。[8]

---

## 11. 如果自己设计 agent，要怎么放 MCP

结合前面关于 [[computer_sci/llm/agent/ai_code_agent_hooks|AI Code Agent Hooks]] 的笔记，我会这样分层：

```text
Agent Host
  - conversation state
  - model calls
  - permission UI
  - memory
  - hooks
  - MCP client manager

MCP Client Manager
  - connect/disconnect servers
  - capability negotiation
  - tool/resource/prompt discovery
  - result normalization
  - failure handling

MCP Servers
  - GitHub server
  - filesystem server
  - database server
  - docs server
  - internal API server
```

几个设计建议：

1. 不要让模型直接决定连什么 server。Host 应该管理 server registry 和 trust policy。
2. 不要默认把所有 MCP tools 都暴露给模型。按任务、权限、用户确认做 filter。
3. MCP server 的工具要小而清楚。少做 `execute_anything` 这种万能工具。
4. tool result 要结构化。能给 `outputSchema` 就不要只吐一大段文本。
5. 本地 stdio server 要当成可执行程序审查。不要随便复制 `npx ...`。
6. Remote MCP server 要当成 API service 做鉴权、日志、rate limit。
7. Hook 和 MCP 要配合：`before_tool_call` 可以拦 MCP tool，`after_tool_call` 可以记录结果，`before_final_response` 可以检查是否遗漏验证。

---

## 12. 我的 mental model

我会把 MCP 放在 agent system 的这个位置：

```text
Rules / AGENTS.md:
  长期项目规则

Skills:
  某类任务的执行流程

Hooks:
  agent 生命周期中的拦截、注入、审计

MCP:
  外部工具和上下文的标准连接层

MCP Server:
  某个能力域的工具 / 资源 / prompt 适配器
```

一句话总结：

> MCP 是 agent 连接外部世界的协议；MCP server 是外部世界被包装成 agent 可发现、可调用、可审计能力的地方。

所以开发自己的 agent 时，MCP server 概念非常关键。它决定了你的 agent 是一个“所有工具都硬编码在自己身体里”的单体，还是一个能连接一组可复用能力服务的 host。

---

## References

[1] Anthropic, [Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol), 2024-11-25.

[2] OpenAI Agents SDK, [Model context protocol (MCP)](https://openai.github.io/openai-agents-python/mcp/).

[3] Anthropic, [Donating the Model Context Protocol and establishing the Agentic AI Foundation](https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation), 2025-12-09.

[4] Model Context Protocol, [Specification 2025-11-25](https://modelcontextprotocol.io/specification).

[5] Model Context Protocol, [Architecture](https://modelcontextprotocol.io/specification/2025-11-25/architecture).

[6] Model Context Protocol, [Server Features: Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

[7] Model Context Protocol, [Server Features: Resources](https://modelcontextprotocol.io/specification/2025-11-25/server/resources).

[8] Model Context Protocol, [Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization).

[9] Model Context Protocol, [Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices).
