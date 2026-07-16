---
title: "Pi Agent：用最小 Harness 看懂真实 Agent 架构"
date: 2026-07-14
tags:
  - llm
  - agent
  - architecture
  - harness
  - pi
  - coding-agent
slides: true
---

## 写在前面

在 [[computer_sci/llm/agent/agent_architecture_overview|Agent Architecture Overview]] 里，我留下过一个很具体的问题：

> Runtime 的状态机、事件循环、工具注册，到了真实框架里到底长什么样？

Pi 很适合拿来回答它。它不是另造一种 agent theory，而是一个刻意保持 **minimal、model-agnostic、self-extensible** 的 coding agent harness：默认只给模型 `read`、`bash`、`edit`、`write` 四个工具，把 sub-agent、plan mode、MCP、permission popup 等更有争议的能力留给 extension 或外部环境。[1](#ref-1)

所以这篇不把 Pi 当作又一个需要背 API 的产品，而把它当成一台拆掉外壳的机器：

- 从 `agent loop` 看 agent 最小闭环
- 从 `AgentState` / `AgentContext` / `SessionEntry` 看 state 和 memory 的区别
- 从 tool pipeline 看 model decision 如何变成真实副作用
- 从 event stream 看 UI、持久化与 hooks 如何挂到运行时
- 从 coding harness 看 Skills、`AGENTS.md`、compaction、RPC 怎样叠在核心之上
- 最后再用这些具体部件回看 [[computer_sci/llm/agent/agent_frameworks_overview|Agent Frameworks Overview]] 里的主流框架抽象

> 版本快照：本文按 2026-07-14 的 `earendil-works/pi` `0.80.6`、commit `0e6909f` 阅读。旧的 `badlogic/pi-mono` 地址会跳转到新仓库，旧的 `@mariozechner/*` npm scope 已迁移为 `@earendil-works/*`。[2](#ref-2)

---

## 1. 先把 Pi 的边界说清楚

“Pi Agent”容易混指三个层级：

| 名称 | 它实际负责什么 | 不负责什么 |
| --- | --- | --- |
| `pi-ai` | 统一不同 provider 的模型、消息、streaming、tool-call 格式 | 不跑 agent loop |
| `pi-agent-core` | stateful tool loop、消息转换、事件流、steering / follow-up | 不提供 coding 产品体验 |
| `pi-coding-agent` | tools、session、compaction、Extensions、Skills、TUI / JSON / RPC / SDK | 不内置完整 sandbox、MCP、multi-agent orchestration |
| `pi-tui` | terminal UI 与 differential rendering | 不理解 agent 语义 |

稳定主干可以画成：

```mermaid
flowchart TB
  UI["TUI / Print / JSON / RPC / SDK"] --> CA["pi-coding-agent<br/>AgentSession + resources + persistence"]
  CA --> CORE["pi-agent-core<br/>state + loop + tools + events"]
  CORE --> AI["pi-ai<br/>provider-normalized streaming API"]
  AI --> P["Anthropic / OpenAI / Google / ..."]

  EXT["Extensions / Skills / AGENTS.md"] -. "customize" .-> CA
  ENV["Filesystem / shell / external APIs"] <--> CA
```

这里的关键不是包名，而是 **separation of concerns**：

- provider 差异被压在 `pi-ai`
- agent 的闭环被压在 `pi-agent-core`
- coding-specific state 和 product behavior 被放进 `pi-coding-agent`
- UI 只是 event 的消费者，不是 agent 本身

这正好把 [[computer_sci/llm/agent/harness_engineering_and_agent_architecture|Harness Engineering 与 Agent Architecture 的关系]] 里的 “mind / body” 再拆细了一层：model 是 decision engine，core loop 是神经反射，coding harness 才是带会话、资源发现与交互界面的身体。

---

## 2. Pi 的最小 Agent Loop

### 2.1 最小闭环不是 `prompt -> answer`

`pi-agent-core` 的公开入口有两类：

- `agentLoop(prompts, context, config)`：把新 prompt 加入上下文再开始
- `agentLoopContinue(context, config)`：不加新消息，从现有 user / tool result 后继续，适合 retry

真正的核心可以压成下面这段伪代码：[3](#ref-3)

```ts
emit("agent_start")

while (true) {                         // follow-up loop
  while (hasToolCalls || hasSteering) {
    injectQueuedMessages()
    assistant = await streamModel(buildLlmContext())

    if (assistant.error || assistant.aborted) break

    toolResults = await executeToolCalls(assistant.toolCalls)
    append(toolResults)
    emit("turn_end")

    refreshModelPromptAndToolsForNextTurn()
    if (shouldStopAfterTurn()) break
    steering = drainSteeringQueue()
  }

  followUps = drainFollowUpQueue()
  if (followUps.empty) break
}

emit("agent_end")
```

```mermaid
flowchart TD
  U["User message"] --> C["Build model context"]
  C --> L["Stream one assistant turn"]
  L --> D{"tool calls?"}
  D -- "yes" --> V["resolve + validate + preflight"]
  V --> X["execute tools"]
  X --> R["append toolResult messages"]
  R --> Q{"steering queued?"}
  Q -- "yes" --> S["inject steering"]
  S --> C
  Q -- "no" --> C
  D -- "no" --> F{"follow-up queued?"}
  F -- "yes" --> C
  F -- "no" --> E["agent_end"]
```

这仍然是 [[computer_sci/llm/agent/agent_architecture_overview#41-react|ReAct]] 的工程化版本：一次 model turn 只决定下一批 action，observation 作为 `toolResult` 回到 transcript，再进行下一轮推理。Pi core 没有显式 planner、graph node 或 critic；如果需要它们，就在 prompt、tool、extension 或更外层 orchestrator 里表达。

### 2.2 `turn` 是最重要的执行单位

Pi 对 turn 的定义很实在：

```text
one assistant response + tool calls requested by it + their tool results
```

它不是一整次用户任务。一个 task 可以经历很多 turn：

```text
user
-> assistant(tool: read)
-> toolResult
-> assistant(tool: edit, bash)
-> toolResults
-> assistant(final text)
```

这使得三个层次不会混在一起：

- `message`：一条 user / assistant / toolResult 记录
- `turn`：一次 model 决策和由它直接触发的动作
- `agent run`：从 prompt 到没有 tool / steering / follow-up 为止

很多 framework 的术语不同，但实际 runtime 基本都需要类似边界，否则 retry、计费、tracing、HITL 和 persistence 都不知道该落在哪一级。

### 2.3 Steering 和 follow-up 是两种不同的队列

Pi 没有在工具执行一半时硬切断当前 turn：

- **steering**：当前 assistant turn 和它已经发出的 tool calls 完成后，下一 turn 优先注入
- **follow-up**：agent 本来要结束时才注入
- **abort**：用 `AbortSignal` 取消当前 run，是另一条控制路径

这比一句 “支持用户中途插话” 精确得多。它说明 human-in-the-loop 不一定是 approval dialog，也可以是 **在确定的 consistency boundary 上重新取得控制权**。

---

## 3. State、Context、Message、Session 不是一回事

这是读 Pi 最值得带回其他框架的区分。

| 对象 | 主要内容 | 生命周期 | 谁消费 |
| --- | --- | --- | --- |
| `AgentState` | system prompt、model、thinking level、tools、messages、streaming 状态 | 当前进程中的 mutable runtime state | `Agent` / UI |
| `AgentContext` | system prompt、messages、tools 的一次 snapshot | 一次 loop / turn | agent loop |
| `AgentMessage` | LLM 消息 + app 自定义消息 | 当前 transcript | harness、UI、转换器 |
| provider `Message` | 只有 provider / LLM 能理解的消息 | 单次模型请求 | `pi-ai` / model API |
| `SessionEntry` | message、model change、compaction、label 等 JSONL entry | 跨进程、可恢复 | `SessionManager` |

### 3.1 Live state 不等于 durable state

`AgentState` 里最核心的是：

```ts
{
  systemPrompt,
  model,
  thinkingLevel,
  tools,
  messages,
  isStreaming,
  streamingMessage,
  pendingToolCalls,
  errorMessage,
}
```

这里没有向量数据库，也没有一个叫 `memory` 的神秘模块。对 Pi 来说，最基础的 working memory 就是 transcript + 当前工具/模型状态；跨进程记忆则由 session JSONL 承担。[4](#ref-4)

这让 [[computer_sci/llm/agent/agent_architecture_overview#23-memory|Memory]] 和 [[computer_sci/llm/agent/agent_architecture_overview#24-state|State]] 的区别变得具体：

- state 是“现在执行机处在哪”
- transcript 是“本轮推理能回看什么”
- session log 是“系统真实发生过什么”
- model context 是“这一次实际给模型看什么”

它们可以相关，但绝不能默认相等。

### 3.2 Context 是投影，不是历史本身

Pi 每次调用模型前走两道边界：[5](#ref-5)

```text
AgentMessage[]
  -> transformContext()     // 剪枝、注入、extension 修改
  -> AgentMessage[]
  -> convertToLlm()         // 过滤 UI-only 类型、转换 custom message
  -> provider Message[]
  -> LLM
```

这条 pipeline 很重要，因为真实 application transcript 往往包含模型不应该或不能直接看到的东西：

- UI notification
- session label
- extension private state
- `!!` 执行但明确排除出 context 的 shell output
- compaction / branch summary 这类 app-specific message

所以 context engineering 不是“把更多内容塞进 prompt”，而是维护一个显式 projection：

```text
durable history != app transcript != current model context
```

这与 [[computer_sci/llm/agent/harness_engineering_and_agent_architecture#23-context-managementarchitecture-的策略-vs-harness-的机制|Context Management：策略 vs 机制]] 完全接上：删什么、总结什么是策略；在每次 provider call 之前可靠地执行 transform / convert，是 harness 机制。

---

## 4. Tool Call 不是“模型直接调用工具”

模型只输出一个 tool-call content block。Pi 真正的 action pipeline 是：[3](#ref-3)

```mermaid
flowchart LR
  TC["model tool call"] --> N["find tool by name"]
  N --> A["prepareArguments"]
  A --> V["schema validation"]
  V --> B["beforeToolCall / tool_call"]
  B --> G{"blocked?"}
  G -- "yes" --> ER["error toolResult"]
  G -- "no" --> X["tool.execute"]
  X --> UP["stream partial updates"]
  UP --> H["afterToolCall / tool_result"]
  H --> TR["normalized toolResult message"]
  ER --> TR
  TR --> L["next LLM turn"]
```

几个实现细节很能说明“实际框架”在解决什么：

1. **先找注册表，再校验 schema**：不存在或参数不合法时，不执行副作用，而是生成 error observation 让模型恢复。
2. **preflight 与 execution 分开**：`beforeToolCall` 在参数验证后运行，可以 block；这就是 [[computer_sci/llm/agent/ai_code_agent_hooks|AI Code Agent Hooks]] 里的 `PreToolUse` 对应物。
3. **tool output 也能 streaming**：长命令执行时，UI 不必等完整结果。
4. **默认并行，但有顺序约束**：同一 assistant message 里的 calls 会先逐个 preflight，再并发执行；只要其中一个 tool 标为 sequential，整批顺序执行。
5. **并发完成顺序不污染 transcript 顺序**：completion event 可以按真实完成时间发出，但最终 `toolResult` 按 assistant 原始 call 顺序写入，保证下一次模型输入稳定。
6. **截断的 tool call 一律不执行**：如果 assistant 因 output token limit 停在 `length`，即使残缺 JSON 勉强能 parse，Pi 仍把这一批 calls 全部判错，避免用静默缺参执行真实动作。
7. **post-hook 可以改结果**：`afterToolCall` 能改 content / details / error flag；tool 也可返回 `terminate: true`，告诉 loop 不必自动再问一次模型。

这就是 “the model decides *what*; the harness guarantees *how*” 的源码形态。工具 schema、权限 gate、并发语义、错误 normalization 和事件顺序，都不是模型智力的一部分。

---

## 5. Event Stream 是 Pi 的脊柱

Pi core 不直接绑定 TUI 或数据库，而是发一组结构化事件：[5](#ref-5)

```text
agent_start / agent_end
turn_start / turn_end
message_start / message_update / message_end
tool_execution_start / tool_execution_update / tool_execution_end
```

```mermaid
flowchart LR
  LOOP["agent loop"] --> EV["ordered AgentEvent stream"]
  EV --> RED["Agent state reducer"]
  EV --> SES["AgentSession persistence / retry / compaction"]
  EV --> EXT["Extension lifecycle handlers"]
  EV --> UI["TUI / JSON / RPC clients"]
  EV --> OBS["logs / tracing / metrics"]
```

`Agent` 自己像一个 reducer：收到 `message_end` 就把完整消息放进 state，收到 tool start / end 就维护 `pendingToolCalls`。订阅者按注册顺序被 await，因此 session 持久化可以成为 tool preflight 前的 barrier，而不是“后台迟早会写”。

这给 [[computer_sci/llm/agent/harness_engineering_and_agent_architecture|Harness Engineering]] 里的 execution logging 一个很具体的答案：

> 不要让模型在最终答案里回忆自己做过什么；让 runtime 在事件边界记录实际发生过什么。

事件流还解耦了产品形态。同一个 `AgentSession` 可以被 terminal、print、JSON event stream、stdin/stdout RPC 或 Node SDK 使用；[[computer_sci/llm/agent/chat_to_agent_connector|Chat-to-Agent Connector]] 后端真正需要接的，不一定是某个 terminal process，也可以是 SDK 或 RPC 这一层。

---

## 6. 从 Agent Core 到 Coding Harness

只有 loop 还不是一个可长期使用的 coding agent。`pi-coding-agent` 在 core 外面加了一个 `AgentSession`，负责 lifecycle、session history、model state、auto-compaction、extension dispatch 与 resource loading。[6](#ref-6)

### 6.1 System prompt 是组装出来的

Pi 的 system prompt 不是一段永远不变的字符串。它由这些输入组装：[7](#ref-7)

- 当前启用的 tools 与 tool-specific guideline
- global / parent / current directory 的 `AGENTS.md` 或 `CLAUDE.md`
- `.pi/SYSTEM.md` / `APPEND_SYSTEM.md`
- 已发现 Skills 的 name、description、location
- 当前 date 与 cwd
- Extensions 在 `before_agent_start` 做的动态改写

这与本项目自己的 `.agents/` coordination layer 很相似，但要注意职责不同：

- `AGENTS.md` 是长期 project policy
- Skill 是按任务发现、需要时再读取的 protocol module
- Extension 是真正运行的 TypeScript code，可注册 tool / command / event handler / UI
- prompt template 只是用户输入的可复用展开

Pi 对 Skill 的实现尤其能验证 [[computer_sci/llm/agent/agent_SKILL_mechanism|Agent SKILL Mechanism]] 的判断：startup 时主要把 skill metadata 放进 system prompt，模型判断相关后再用 `read` 打开完整 `SKILL.md`；显式 `/skill:name` 则直接把内容展开进用户消息。[8](#ref-8)

换句话说，Skill 的 “lazy loading” 主要是 **context loading policy**，并不是启动另一个特殊 runtime。

### 6.2 Session 是 append-only tree

Pi session 使用 JSONL，每个 entry 带 `id` / `parentId`，因此一份文件就能保存分叉树：[9](#ref-9)

```text
user A
└─ assistant B
   ├─ toolResult C
   │  └─ assistant D        <- current branch
   └─ user E
      └─ assistant F        <- alternative branch
```

entry 不只保存 message，还保存：

- model change
- thinking-level change
- compaction
- branch summary
- custom extension entry
- label / session metadata

所以 `SessionManager` 不是简单的 chat history array。它更接近一个 append-only event log + tree projector：完整历史留在磁盘，当前 branch 再被投影成 `AgentMessage[]`。

这也解释了为什么 “memory = vector database” 太窄。对 coding agent 来说，可恢复 session、model change、branch、tool result 与 compaction boundary 本身就是重要的 episodic memory。

### 6.3 Compaction 改的是 model view，不是抹掉 history

当 context 快到上限，Pi 会选择 cut point，把较早 history 总结成 `compactionSummary`，保留较新的 turns；完整 JSONL 并不删除。[10](#ref-10)

```text
full durable session
  -> choose active branch
  -> apply latest compaction summary
  -> keep messages after cut point
  -> convert to provider messages
```

这是一个很漂亮的 separation：

- **storage truth**：完整、可回看、可重新分支
- **context truth**：有损、为当前 model request 服务

compaction 因此不是 long-term memory 的同义词，而是 context window management。它可能保存决策和进度，但它仍然会丢信息，不能代替 durable session log。

### 6.4 Extensions 才是 Pi 真正的插件 / Hook 层

Extension 可以注册：[11](#ref-11)

- custom tool
- slash command / shortcut / flag
- provider
- message renderer / TUI component
- `context` transform
- `tool_call` block / argument mutation
- `tool_result` rewrite
- session / compaction / model / input lifecycle handler

因此 Pi 的 extension 不是只给 UI 加按钮，而是跨越了 policy、action、lifecycle、presentation 四层。它与 [[computer_sci/llm/agent/ai_code_agent_hooks|Hooks]] 的关系是：

```text
Extension = 可加载代码模块
Hook/Event = Extension 挂入 runtime 的生命周期位置
Tool = Extension 可以注册的一类模型能力
```

三者不是同义词。

---

## 7. Pi 的 minimalism 是架构选择，不是功能缺失表

Pi 官方明确选择不把下面这些能力放进 core：[1](#ref-1)

| Pi 默认不内置 | 它建议放在哪里 | 这个选择说明什么 |
| --- | --- | --- |
| MCP | CLI + README / Skill，或 MCP extension | integration protocol 不是 agent loop 的必要条件 |
| sub-agents | extension、额外 Pi process、tmux | multi-agent coordination 不是单 agent core 的必要条件 |
| permission popup | extension 或容器 / VM / OS policy | UI approval 与真正 isolation 应分开 |
| plan mode | file / prompt / extension | planner 可以是产品策略，不必写死进 runtime |
| built-in TODO | `TODO.md` 或 extension | working memory 的表达留给用户/模型选择 |
| background bash | tmux 等外部 process manager | 不在 core 里复制成熟系统能力 |

这个选择对我已有的笔记有两点修正。

第一，[[computer_sci/llm/agent/model_context_protocol_mcp|MCP]] 是标准 integration layer，不是 agent 成立的必要条件。Pi 用本地 CLI + readable docs 也能形成 tool-use system；如果真的需要 MCP，可以由 extension 把 server tools 映射进 Pi tool registry。

第二，[[computer_sci/llm/agent/harness_engineering_and_agent_architecture|Harness Engineering]] 里列的 permission、sandbox、subagent isolation 是生产级 harness 的重要设计维度，但不是所有 harness 都必须在进程内实现。Pi 的答案是：它本身默认继承启动用户的 filesystem / process / network 权限，project trust 只控制是否加载本地配置与 extension，**不是 sandbox**。真正 isolation 应交给 container、VM 或 policy-controlled sandbox。[12](#ref-12)

这不是安全能力“自动存在”，而是 trust boundary 被明确画在了 Pi process 外面。用 Pi 时如果忘记这点，minimalism 会直接变成风险。

---

## 8. 用 Pi 回看主流 Agent Framework

Pi 最有价值的地方，是让框架宣传页上的名词落到可执行部件。一个实际 agent framework 无论 API 怎么命名，通常都绕不开下面七个问题：

| 必答问题 | Pi 的答案 | 其他框架常见答案 |
| --- | --- | --- |
| 模型差异怎么隔离？ | `pi-ai` provider adapter | model client / provider adapter |
| 谁决定下一步？ | LLM 在 implicit ReAct loop 里生成 tool call / final | runner、graph node、workflow step |
| state 放哪里？ | `AgentState` + transcript | typed graph state、run context、session |
| context 怎么形成？ | transform -> convert -> provider message | middleware、prompt builder、memory policy |
| action 怎么执行？ | tool registry + schema + hooks + executor | tool node、function tool、action server |
| 如何观察与恢复？ | event stream + JSONL session tree + compaction | tracing、checkpoint、durable execution |
| 怎么扩展？ | Extensions + Skills + prompt templates | middleware、plugin、MCP、decorator、node |

把 Pi 放进 [[computer_sci/llm/agent/agent_frameworks_overview|Agent Frameworks Overview]] 的地图，它更接近：

> **thin agent loop + practical coding harness**

而不是：

- LangGraph 那种 explicit state graph / durable workflow runtime
- AutoGen 那种 agent-to-agent message system
- CrewAI 那种 role / task / crew business abstraction
- provider-native SDK 那种 handoff / guardrail / tracing 打包体验

### 8.1 Pi vs. graph runtime

Pi 的 control flow 主要藏在一个 `while` loop 里；LangGraph 类框架把 control flow 变成显式 graph。

```text
Pi:
  model -> tools -> model -> ... -> final

Graph runtime:
  node A -> conditional edge -> node B -> checkpoint -> interrupt -> resume
```

Pi 更容易看到 agent 的最小本体，也更容易自由改造；graph runtime 对长任务恢复、确定性 branching、human interrupt 更强，但需要维护 graph state 和 node contract。

### 8.2 Pi vs. multi-agent framework

Pi 不把 “多个角色互相聊天” 当成默认抽象。这提醒我：

> sub-agent 应该是任务确实需要的 process / responsibility boundary，而不是 agent 产品看起来高级的装饰。

单 agent + 好工具 + 清楚 context 经常已经足够。只有当 isolation、并行、不同权限/模型、独立 context window 的收益超过 coordination cost 时，multi-agent 才值得进入 core design。

### 8.3 Pi vs. workflow automation

Pi loop 是 open-ended：下一步主要由模型根据 observation 决定。固定审批链、SLA、补偿事务、定时任务等业务流程，最好由外层 workflow engine 控制，再把 Pi 当一个可调用 worker，而不是让 transcript 独自承担业务状态机。

这也给 [[computer_sci/llm/agent/chat_to_agent_connector|Chat-to-Agent Connector]] 一个升级方向：connector 负责 ingress / identity / queue，Pi SDK 或 RPC 负责单次 agent run，业务 workflow 负责 retry、schedule、approval 和最终 delivery。不要把所有责任塞进 prompt。

---

## 9. 我从 Pi 得到的框架阅读法

以后再读一个“主流 agent framework”，我会按下面顺序，而不是先看 quick start：

1. **找 loop**：什么条件触发下一次 model call，什么条件真正结束？
2. **找 message boundary**：application state 如何变成 provider messages？
3. **找 tool boundary**：schema validation、permission、timeout、concurrency、error normalization 在哪？
4. **找 state owner**：model、runner、session store，究竟谁是 source of truth？
5. **找 event / trace boundary**：记录的是模型自述，还是 runtime 事实？
6. **找 recovery semantics**：abort、retry、resume、checkpoint、compaction 各保留什么？
7. **找 extension boundary**：哪些是 core invariant，哪些允许 plugin 改写？
8. **找 trust boundary**：sandbox 真在哪里，还是其实根本没有？

如果这八个问题回答不出来，即使会写框架 API，也还没有真正理解它的 architecture。

---

## 10. 推荐的 Pi 源码阅读顺序

如果要继续从实现学习，而不是停在这篇总结，我会按这个顺序：

1. `packages/agent/src/types.ts`：先认清 state、context、tool、event 的 contract。[5](#ref-5)
2. `packages/agent/src/agent-loop.ts`：看真正的 loop、tool pipeline 与 queue drain point。[3](#ref-3)
3. `packages/agent/src/agent.ts`：看 state reducer、subscriber barrier、abort 与 queue API。[4](#ref-4)
4. `packages/coding-agent/src/core/sdk.ts`：看 provider auth、resource loader 与 Agent 如何被组装。[6](#ref-6)
5. `agent-session.ts`：看 persistence、extension、retry、compaction 怎样消费 core events。[6](#ref-6)
6. `system-prompt.ts` + `messages.ts`：看 context files、Skills 与 custom messages 怎么进入 model view。[7](#ref-7)
7. `session-format.md` + `compaction.md`：看 durable history 与 context projection 如何分离。[9](#ref-9) [10](#ref-10)
8. `extensions.md`：最后再看 Pi 如何把有争议的产品能力移到扩展层。[11](#ref-11)

这个顺序本身也代表一种学习原则：

> 先读 invariant，再读 orchestration；先读 runtime truth，再读 UI feature。

---

## 11. My mental model

如果只留一句话：

> **Pi 把 agent 的不可再分核心收缩为：规范化的 model stream、可投影的 message context、tool-execution loop、显式 runtime state 与有序 event stream；其余能力尽量作为 harness service、extension 或外部系统叠加。**

它让我对“最小 agent”的定义也更精确了：

```text
minimal agent runtime
= model boundary
+ context projection
+ tool loop
+ state owner
+ event / cancellation semantics
```

而一个实际可用的 coding agent 还要继续加：

```text
coding agent product
= minimal runtime
+ durable sessions
+ context files / skills
+ compaction
+ extension lifecycle
+ UI / RPC / SDK ports
+ an explicit external security boundary
```

这篇因此既是 [[computer_sci/llm/agent/agent_architecture_overview|Agent Architecture Overview]] 的源码落地，也是 [[computer_sci/llm/agent/harness_engineering_and_agent_architecture|Harness Engineering]] 的具体 case study；它还把 [[computer_sci/llm/agent/agent_SKILL_mechanism|Skill]]、[[computer_sci/llm/agent/ai_code_agent_hooks|Hooks]]、[[computer_sci/llm/agent/model_context_protocol_mcp|MCP]] 和 [[computer_sci/llm/agent/chat_to_agent_connector|Connector]] 放回同一台真实机器里，不再只是平行概念。

---

## References

<a id="ref-1"></a>[1] Pi, [Coding Agent README: Philosophy](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/coding-agent/README.md#philosophy).

<a id="ref-2"></a>[2] Pi, [Monorepo packages and package scope](https://github.com/earendil-works/pi/tree/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages).

<a id="ref-3"></a>[3] Pi, [`agent-loop.ts`](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/agent/src/agent-loop.ts).

<a id="ref-4"></a>[4] Pi, [`agent.ts`](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/agent/src/agent.ts).

<a id="ref-5"></a>[5] Pi, [`pi-agent-core` types and message flow](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/agent/src/types.ts).

<a id="ref-6"></a>[6] Pi, [Coding Agent SDK and `AgentSession`](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/coding-agent/docs/sdk.md).

<a id="ref-7"></a>[7] Pi, [`system-prompt.ts`](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/coding-agent/src/core/system-prompt.ts) and [`messages.ts`](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/coding-agent/src/core/messages.ts).

<a id="ref-8"></a>[8] Pi, [Skills documentation](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/coding-agent/docs/skills.md).

<a id="ref-9"></a>[9] Pi, [Session file format](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/coding-agent/docs/session-format.md).

<a id="ref-10"></a>[10] Pi, [Compaction and branch summarization](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/coding-agent/docs/compaction.md).

<a id="ref-11"></a>[11] Pi, [Extensions documentation](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/coding-agent/docs/extensions.md).

<a id="ref-12"></a>[12] Pi, [Security: project trust and sandbox boundary](https://github.com/earendil-works/pi/blob/0e6909f050eeb15e8f6c05185511f3788357ddb3/packages/coding-agent/docs/security.md).

<details class="socratic-learning-session">
<summary><span class="socratic-marker"></span>Socratic Learning - Pi Agent 架构 — 2026-07-17</summary>

<div class="socratic-summary">

- Source: [[computer_sci/llm/agent/pi_agent_architecture|Pi Agent：用最小 Harness 看懂真实 Agent 架构]]、本轮 Socratic 对话，以及退出 Socratic 模式后对 Pi 当前官方源码与文档的追问核对。
- Sessions covered: 2026-07-16—2026-07-17。
- Key takeaways: Pi 的核心价值不在于“另一个更聪明的 LLM”，而在于把 provider-normalized model I/O、stateful tool loop、context projection、runtime events 与 cancellation 组成最小 runtime；coding-specific tools、sessions、compaction、Extensions 与多种交互端口再由 `pi-coding-agent` 叠加。
- Concepts that improved: 能区分 model intention 与 harness side effect、并发完成顺序与 transcript source order、storage truth 与 model view、runtime event 与 model message、project trust 与 sandbox，以及 `pi-ai` / `pi-agent-core` / product harness / UI 四层职责。
- Recurring weak spots: 容易把 event subscriber 误认为 LLM 或 loop 的上游；把 compaction 理解成删除/备份历史；把 project trust 当成 OS-enforced sandbox；把具体 Pi package 名称误当成所有 agent 都必须复制的架构组件。
- Open questions: 本轮没有必须先解决的悬而未决问题；后续可继续验证 Pi 在 crash recovery、幂等工具、长期 workflow durability 与外部 sandbox 集成方面的实际边界。
- Suggested next focus: 用一个最小 `pi-agent-core` 示例和一个自定义 business harness 做迁移练习，再沿一次真实 run 追踪 `AgentMessage → LLM Message → provider payload → ToolCall → ToolResult → AgentEvent`。

</div>

<div class="socratic-qa">

### Concept: Pi 不是“会调用工具的 LLM”，而是 model 外面的执行系统

**Q:** Pi 到底是什么，它为什么不只是一个会调用工具的 LLM？同一个 LLM 在聊天框里说“我会修改文件”和在 Pi 中真正修改文件，中间缺少什么？

**User answer:** “这个问题真的很好，我有点回答不上来”；“Pi在runtime修改的时候，会有harness工程参与，会有工程级限制”。

**AI-expanded answer:** LLM 只能生成 text 或结构化 tool-call intention。Pi 的 harness 持有 state，建立 model context，接收 tool call，验证并执行真实副作用，把 observation 写回 transcript，再决定继续或结束。因而 model 是 decision engine，agent 是 model 加上 state owner、tool loop、context projection、events、cancellation 与 environment feedback。

### Concept: Tool pipeline 把模型意图变成受控副作用

**Q:** 从模型生成一次 `edit` 调用到文件真正改变，harness 要经过哪些步骤？

**User answer:** “先找注册表，再校验 schema”；“preflight 与 execution 分开”；tool output 可 streaming；默认并行但可声明 sequential；完成事件按真实顺序、`toolResult` 按 source order；截断调用不执行；post-hook 可改结果或 `terminate`。

**AI-expanded answer:** 这条回答覆盖了完整 pipeline：resolve tool → prepare/validate arguments → preflight hook/gate → execute → stream updates → postprocess → normalized tool result → next turn。关键不只是“能调用工具”，而是 harness 对权限、错误、并发、顺序、截断与恢复语义给出确定性保证。

### Concept: 并行执行、稳定 transcript 与可复现性

**Q:** 两个独立 tool call 按 `A → B` 发出但 `B` 先完成，为什么不按完成顺序把结果写成 `B → A`？固定顺序能否让两次 run 完全相同？

**User answer:** 回答轨迹是：“可能会返回错误的agentState” → “B需要A做完” → “这个我还真不知道” → “token 序列不相同，但会有影响吗” → “agent run这么脆弱吗” → harness 应固定顺序 → “普通的确定性逻辑就好” → “速度与性价比” → “无法将这个输出作为格式化明显的checkpoint点来调试” → 固定后仍不完全一致，“LLM本身的输入输出就不行吧”。

**AI-expanded answer:** 如果 calls 独立且用 `toolCallId` 正确配对，结果本身并未错误；问题是异步调度把无语义的偶然顺序带进 token sequence，降低 diff、测试、调试与故障复现的稳定性。harness 可按原始 call array 确定性地回填。它不能消除模型采样、provider、时间、网络、文件系统或并发进程等全部非确定性，只是在边界上消除可避免的噪声。

**Q:** 怎样用一句话概括固定 tool-result source order 的价值？

**User answer:** “固定 tool-result的顺序，不是为了保证agent run完全相同，而是为了消除异步执行引入的无意义差异，是得transcript更容易互相比较确定、调试确定故障。”

**AI-expanded answer:** 固定结果顺序不是追求全局确定性，而是让相同逻辑过程产生稳定的 observation boundary，使 transcript 更容易复现、diff，并沿 event/tool-call 边界定位故障。

### Concept: 外部状态、crash window 与幂等恢复

**Q:** 即使模型完全确定，工具与环境还会带来哪些变化？如果 tool-call 已造成副作用但 session 未写盘，如何恢复？

**User answer:** “机器运行状态确实也一直在变，时间、各种”；`date`、实时 API、未锁定依赖和并发文件修改“全都是在变化的状态”。对于 crash window：“做了这个事件，但是没有记录，事件开始和结束不闭合”；应先写 JSONL，再执行并记录结果；后来意识到任意副作用“没办法”自动回滚，应该“核对外部真实状态”。

**AI-expanded answer:** Durable log 可以缩小并暴露不确定窗口，却不能自动撤销邮件、支付或远程部署。恢复策略应依工具选择：查询外部真实状态、使用 idempotency key、设计可重试操作、记录 compensation information，或转人工 reconciliation，而不是盲目重放。

**Q:** 同一个 `idempotencyKey` 应怎样用于崩溃后的重试？

**User answer:** 起初认为“可能会导致idempotency key相同，但是发送的内容不同”；随后修正为不同逻辑操作使用不同 key；相同内容与相同 key 重试时，服务先检查是否处理过，并“返回第一次操作的既有结果到transcript”。

**AI-expanded answer:** Key 标识的是一个逻辑操作，而不是任意一次 HTTP 请求。相同 key 加不同 payload 应被拒绝或报告冲突；相同 key 加相同操作则返回既有结果而不重复副作用，从而实现 effectively-once 的调用体验。

### Concept: Application history、model context 与 provider message

**Q:** 为什么不把完整 session history 原样塞给 LLM？`transformContext()` 与 `convertToLlm()` 分别做什么？

**User answer:** “为了更准确的意图识别和上下文压缩”；UI-only 信息属于“无效消息和误导消息”；provider 不认识自定义格式时“要调整到provider格式”。最终区分为：`transformContext()` 避免无效信息占用注意力和误导模型，`convertToLlm()` 调整为 provider 可以理解的格式。

**AI-expanded answer:** `transformContext()` 是应用层的 model-view policy：剪枝、压缩、注入或重排 `AgentMessage[]`；`convertToLlm()` 是 app-message 到统一 LLM message 的类型边界：过滤 UI-only/custom state 或转换自定义消息。之后 `pi-ai` 才把统一 messages 序列化为具体 provider payload。

### Concept: Session、compaction 与 storage truth

**Q:** Compaction 后旧 entries 是否删除？模型下一轮看到什么？

**User answer:** “不应该，应该被总结或者被backup到文档”；在具体的 1—100 条例子中确认 1—70 仍在 JSONL，模型看到“1-70条的摘要 + 近期消息”；后来补充 session 还要追加“前面entry的压缩出来的摘要”。

**AI-expanded answer:** 不需要另搬文档才能保留历史。Append-only JSONL 继续保存原始 entries，并追加包含 summary 与 cut boundary 的 compaction entry。SessionManager 投影 active branch 时，用 summary 代表旧段并保留近期消息。因此 compaction 改的是 context/model view，而不是 durable storage truth。

### Concept: Agent core、事件流与 subscriber

**Q:** 为什么 core 发结构化 events，而不是直接画 TUI、写 session 和日志？什么是 subscriber？

**User answer:** 最初“不知道为什么”，也“不知道为什么A要修改agent core”；经过 `addEventListener` 类比后理解为“运行逻辑是交给不同的监听者内部代码决定的”。在辨认 core 时先答“LLM”，随后定位到 `agentLoop`；最终总结：“为了分离功能，core是上游，subscriber是下游具体执行”。

**AI-expanded answer:** Core 完成 model → tool → observation 的闭环，并发布 runtime facts；subscriber 是注册的普通程序回调。TUI 可把 `tool_execution_start` 画成 spinner，Web UI 可更新进度条，SessionManager 可写 JSONL，logger 可记录 trace。Core 无需包含每种消费者的实现，因此同一 runtime 可服务多种界面与基础设施。

**Q:** 工具完成信号由 UI 还是 core 产生？subscriber 为什么有时必须被 await？

**User answer:** 起初认为“是UI先告诉”，随后借 headless 场景修正为 agent core 最先知道工具返回，UI 是“接受runtime的事实并呈现它们的下游”。对于 persistence barrier，用户指出必须先记录操作意图、完成后再写结果，否则“事件开始和结束不闭合，无法知道有没有写完”。

**AI-expanded answer:** UI 不是执行闭环的上游。Core 调用工具并知道其完成，然后发事件。某些 listeners 只是展示，可以异步；durability-sensitive listeners 则需要 awaited barrier，确保副作用前已保存调用意图、结束后保存 observation。日志能识别 uncertain operation，但不等于能自动回滚。

### Concept: Steering、follow-up 与 abort

**Q:** Stateful tool loop 中的 steering / follow-up 是什么？

**User answer:** 未直接作答；这是退出 Socratic 模式后的强化追问。

**AI-expanded answer:** Steering 是 agent 运行中排队的方向修正：当前 assistant turn 及其已发出的工具完成后，在下一 turn 优先注入，例如“先不要改源码，只分析”。Follow-up 只在 agent 本来要结束时注入，例如“完成后再写摘要”。Abort 是另一条控制路径，用于取消当前 run。Steering 不是 preflight permission gate，也不会倒流撤销已执行副作用。

### Concept: Project trust 不是 sandbox

**Q:** Project trust 阻止加载未信任 extension，是否意味着 `bash/read/edit` 已进入 sandbox？

**User answer:** 先请求解释 sandbox，并正确选择受限容器更能控制损害；之后一度认为 trust “算” sandbox、OS 会拒绝访问项目外私人文件。通过“OS 是否知道 Pi 内部 trusted 状态”修正为不会拒绝，并最终填出：project trust 控制 extension，sandbox 控制文件与指令访问。

**AI-expanded answer:** Project trust 是应用层 code/resource loading policy；sandbox 是 OS、container、VM 或 policy engine 强制的 runtime authority boundary，控制 filesystem、process、network 与 credentials。Pi 默认继承启动用户权限，trust flag 本身不会改变 OS 权限。挂载目录是 sandbox 明确开放的通道，因此项目变化可见，而未挂载的 SSH key 不可见。

### Concept: 通用 runtime 与 coding product

**Q:** Pi 为什么叫 coding agent？能否用于 general/business agent？

**User answer:** 去掉 coding tools、换成业务工具后，“原理上从coding agent被改造为业务agent”。最初只列出 `read/bash/edit/write`；随后识别出还需要 AGENTS/Skills、JSONL sessions、compaction、Extensions 与交互端口。

**AI-expanded answer:** `pi-agent-core` 的 loop 不理解代码，可用于 general agent。`pi-coding-agent` 是一个具体产品 harness：加入 filesystem/shell/edit tools、项目 context discovery、skills、durable sessions、compaction、extension lifecycle 与 TUI/JSON/RPC/SDK ports。业务场景可在 core 之上建立独立的 `customer-service-agent` harness，而不是把业务规则写死进通用 loop。

**Q:** Pi 如何获得项目长期指导，退出后如何恢复会话？

**User answer:** 填出 `AGENTS.md`、`CLAUDE.md`，起初把 lazy resource 误答为 `.pi/SYSTEM.md`，后来确认是 Skill；恢复机制先答“memory”，再具体化为 append-only JSONL session tree 和 `SessionManager`。

**AI-expanded answer:** Context files 的内容进入 system prompt；Skill 通常先暴露 metadata，相关时再读取 `SKILL.md`；`.pi/SYSTEM.md` 属于 system-prompt customization。跨进程恢复依赖 SessionManager 管理的 append-only session tree，而不是一个抽象的“memory 模块”或默认向量库。

### Concept: `pi-ai`、`pi-agent-core`、`pi-coding-agent`、`pi-tui`

**Q:** 四个 package 分别负责什么？自己设计 agent 时是否都必须有？

**User answer:** Provider 差异先后误答为 `pi-agent-core`、`pi-coding-agent`，最终定位到 `pi-ai`；tool loop 是 `pi-agent-core`；coding harness 是 `pi-coding-agent`；terminal rendering 是 `pi-tui`。对于自己的 agent，最终总结：“看情况，具体情况具体分析；但是原则是让每个组件的边界清晰。”

**AI-expanded answer:** `pi-ai` 统一 model/provider I/O；`pi-agent-core` 持有 stateful tool loop 与 events；`pi-coding-agent` 组装 coding-specific product services；`pi-tui` 提供 terminal components/rendering。架构职责需要存在，但未必使用这四个具体包，也未必拆成四个发布单元。

**Q:** 后台客服 agent 应如何映射这些层？业务逻辑是否应写进 core？

**User answer:** 最初提出保留 `pi-ai`、`pi-agent-core`，省略 coding-agent，把 extension 写死进 core，并用 Web UI 替换 TUI；随后认识到这会强耦合，改为单独的 `customer-service-agent`，core 只负责 loop。最终映射为 `pi-ai → pi-agent-core → customer-service-agent → Web GUI`。

**AI-expanded answer:** 这是正确的 responsibility mapping。若永远只有单 provider，可以不用 `pi-ai` 具体包，但仍值得用薄 adapter 隔离 provider types/events。业务 tools、prompt、session policy 与 permissions 属于 product harness，Web/HTTP 属于交互端口。

### Concept: 为什么 tool-call representation 位于 `pi-ai`

**Q:** 为什么 tool call 也放在 `pi-ai`？它是不是 provider 提供的类似 `tool: ...` 的格式？

**User answer:** 未回答；这是退出 Socratic 模式后的主动追问。

**AI-expanded answer:** Tool call 是 model API 的结构化 I/O，不是普通文本。OpenAI、Anthropic、Google 各有自己的 tool/function-call request、streaming 与 response shape；`pi-ai` 把它们统一为 `{ type: "toolCall", id, name, arguments }`。`pi-agent-core` 消费这个统一 intention，负责注册表查找、验证、preflight、execution 与 `ToolResultMessage`。可记为：`pi-ai` 规范化“模型想调用什么”，core 保证“系统怎样执行”。

### Concept: `AGENTS.md` 如何进入模型上下文

**Q:** `pi-coding-agent` 加载 `AGENTS.md`，是写进 system prompt 吗？

**User answer:** 未回答；这是退出 Socratic 模式后的主动追问。

**AI-expanded answer:** 是。`DefaultResourceLoader` 从 global、cwd 与父目录发现 context files，`buildSystemPrompt()` 把完整内容包装在 `<project_context>` / `<project_instructions path="...">` 中。它不同于 Skill 的 metadata-first lazy loading，也不同于 `.pi/SYSTEM.md` 的基础 prompt customization；Extensions 仍可在 `before_agent_start` 修改最终 system prompt。

### Concept: Stateful、message conversion 与 event stream 的记忆锚点

**Q:** 如何快速记住 stateful tool loop、消息转换和事件流？

**User answer:** 未回答；这是退出 Socratic 模式后的强化请求。

**AI-expanded answer:** `State` 回答“执行机现在在哪里”，例如 model、tools、messages、streaming 与 pending calls；`Message` 回答“模型这次看到什么”，经过 context transform、LLM conversion 与 provider serialization；`Event` 回答“runtime 实际发生了什么”，供 UI、persistence、hooks 与 tracing 消费。Live state 不自动等于 durable session。

### Concept: Extensions 与四种产品端口

**Q:** `pi-coding-agent` 的 Extensions、TUI、JSON、RPC、SDK 分别是什么？

**User answer:** 未回答；这是退出 Socratic 模式后的强化请求。

**AI-expanded answer:** Extension 是可执行 TypeScript plugin，可注册 tools、commands、shortcuts、flags、providers、event handlers 与 UI；它不是 Skill，也不是 sandbox。TUI 是人在 terminal 中交互的 frontend。JSON mode 单向把 events 作为 JSONL 输出，适合 pipeline/log。RPC 通过 stdin/stdout JSONL 双向发送 commands、responses 与 events，适合非 Node host 或 IDE 子进程集成。SDK 让 Node/TypeScript 在同进程直接创建 `AgentSession`、subscribe 与 prompt，省去 subprocess 和 serialization。

**Q:** 这四种方式之间最简洁的区别是什么？

**User answer:** 未回答。

**AI-expanded answer:** TUI 是人类终端入口；JSON 是机器可读的单向观察口；RPC 是跨进程双向控制口；SDK 是同进程编程接口。它们共享同一个 AgentSession/runtime，不是四套不同 agent。

</div>

<hr class="socratic-provenance">

Generated by [PinkR1ver/socratic-learning](https://github.com/PinkR1ver/socratic-learning).

</details>
