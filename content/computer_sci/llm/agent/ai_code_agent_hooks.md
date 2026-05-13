---
title: AI Code Agent Hooks
date: 2026-05-13
tags:
  - llm
  - agent
  - codex
  - claude_code
  - tooling
---

## 写在前面

在 AI code agent 软件里，**hook** 可以理解成：

> 在 agent 运行生命周期的某些固定节点，自动触发用户定义脚本 / 回调 / 检查逻辑的机制。

它不是模型本身，也不是一个普通 tool。它更像 agent runtime 暴露出来的一组“插槽”：

```text
用户发 prompt
-> agent 读上下文
-> agent 准备调用 tool
-> hook 先检查
-> tool 真正执行
-> hook 再记录 / 验证
-> agent 准备结束
-> hook 做收尾检查
```

所以 hook 的重点不是“让模型更聪明”，而是让 agent 的执行过程更可控、更可审计、更像一个工程系统。

可以和 [[computer_sci/llm/agent/agent_SKILL_mechanism|agent SKILL mechanism]] 对照着看：

| 机制 | 主要回答什么问题 | 典型形态 |
| --- | --- | --- |
| `AGENTS.md` / rules | 这个项目里应该怎么做 | 长期说明文档 |
| skill | 遇到某类任务时怎么执行 | task-scoped prompt module |
| MCP / tools | agent 能调用什么外部能力 | API / CLI / server |
| hook | agent 执行到某个节点时，外部系统要不要介入 | lifecycle callback |

一句话区分：

- **skill 改变 agent 的工作流理解**
- **tool 扩展 agent 的手**
- **hook 约束和观测 agent 的动作**

---

## 1. Hook 到底 hook 在哪里

Hook 这个词来自软件工程里的“钩子”：主程序在关键节点留出一个扩展点，外部代码可以挂上去。

在 AI code agent 里，常见节点包括：

- session start：会话开始 / 恢复
- user prompt submit：用户刚提交 prompt
- pre tool use：工具调用之前
- permission request：agent 准备请求权限之前
- post tool use：工具调用之后
- stop：agent 准备结束这一轮回复
- subagent stop：子 agent 完成任务
- compact：上下文压缩前后

这些节点本质上都是 **agentic loop 的边界**。

传统 IDE 插件通常是围绕“文件保存”“代码补全”“测试运行”这些事件做扩展；AI code agent 的 hook 则围绕“模型准备行动”和“工具已经行动”这些事件做扩展。

---

## 2. 为什么 code agent 特别需要 hooks

因为 code agent 不只是聊天机器人，它会：

- 读文件
- 写文件
- 运行 shell command
- 调用 MCP tool
- 修改 git 工作区
- 在长任务里连续执行很多步

这些动作有真实副作用。只靠 prompt 让 agent “记得小心点”是不够的。

Hook 的价值在于把一部分规则从“模型自觉”变成“运行时机制”。

典型用途：

### 2.1 安全拦截

比如在 `PreToolUse` 阶段检查 Bash 命令：

```bash
rm -rf /
git push --force
curl ... | sh
```

如果命中危险模式，hook 返回 block / deny，让工具调用根本不执行。

### 2.2 自动格式化和检查

在 `PostToolUse` 阶段检测到文件被写入后，自动跑：

```bash
prettier --write
ruff format
go fmt
npm test -- --related
```

这类 hook 的逻辑是：tool 已经执行完了，hook 不能撤销副作用，但可以马上做修复、记录或给 agent 反馈。

### 2.3 动态注入上下文

在 `SessionStart` 或 `UserPromptSubmit` 阶段自动注入：

- 当前 git status
- 当前 sprint TODO
- 项目特殊规范
- 最近失败的 CI log
- 某个目录下的约定

这和 `AGENTS.md` 的区别是：`AGENTS.md` 更适合稳定规则，hook 更适合运行时动态信息。

### 2.4 审计和可观测性

Hook 可以把每次工具调用、命令、修改路径、耗时、失败原因写到日志系统里。

这对团队使用尤其重要，因为 agent 的执行不是单一“答案”，而是一串行动轨迹。

---

## 3. 以 Codex 为例

Codex 的 hooks 文档把它定义为一种 extensibility framework：用户可以把自己的脚本注入 agentic loop，用来做日志、prompt 扫描、自动记忆、回合结束时的校验、按目录定制提示等。[1]

Codex 当前通过 feature flag 开启：

```toml
[features]
codex_hooks = true
```

它会从配置层附近寻找 hook 配置，常见位置包括：

```text
~/.codex/hooks.json
~/.codex/config.toml
<repo>/.codex/hooks.json
<repo>/.codex/config.toml
```

项目本地 `.codex/` 的 hooks 只有在该项目配置层被信任时才加载；如果多个来源都匹配，Codex 会加载所有匹配 hook，而不是高优先级配置覆盖低优先级配置。[2]

### 3.1 Codex 的配置结构

Codex 的 hook 配置是三层：

```text
event -> matcher group -> hook handler
```

例如：

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/pre_tool_use_policy.py\"",
            "statusMessage": "Checking Bash command"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "/usr/bin/python3 \"$(git rev-parse --show-toplevel)/.codex/hooks/post_tool_use_review.py\"",
            "statusMessage": "Reviewing Bash output"
          }
        ]
      }
    ]
  }
}
```

这里的 `matcher` 可以理解成“这个 hook 只关心哪些事件实例”。在 tool hooks 里通常匹配 tool name，比如 `Bash`、`apply_patch`、`Edit|Write`、`mcp__filesystem__read_file`。[3]

### 3.2 Codex 里的关键事件

当前对日常 coding 最有用的是：

| Event | 触发点 | 适合做什么 |
| --- | --- | --- |
| `SessionStart` | 会话开始 / 恢复 | 注入项目状态、TODO、环境提示 |
| `UserPromptSubmit` | 用户提交 prompt | 记录请求、追加动态上下文 |
| `PreToolUse` | 支持的工具执行之前 | 拦截危险命令、检查路径、做安全策略 |
| `PermissionRequest` | Codex 准备请求权限 | 自动允许低风险命令，拒绝高风险命令 |
| `PostToolUse` | 支持的工具执行之后 | 格式化、lint、日志、失败分析 |
| `Stop` | agent 准备停止 | 检查任务是否真的完成、生成摘要 |

Codex 的 command hook 会从 `stdin` 收到 JSON，包括 `session_id`、`cwd`、`hook_event_name`、`model` 等公共字段；tool 相关 hook 还会收到 `turn_id`、`tool_name`、`tool_use_id`、`tool_input`。[3]

### 3.3 Codex 的 PreToolUse 要注意边界

`PreToolUse` 很容易被误解成“绝对安全闸门”。Codex 文档明确说它更像 guardrail，而不是完整 enforcement boundary：它目前可拦截 Bash、通过 `apply_patch` 做的文件编辑、MCP tool calls，但还不能覆盖所有 shell、`WebSearch` 或其他非 shell / 非 MCP 工具路径。[4]

这点很关键：

> Hook 可以提高确定性，但不能替代权限模型、sandbox、代码 review 和最小权限原则。

Codex 的 `PreToolUse` 可以通过 JSON 返回 deny，也可以用 exit code `2` 并把原因写到 `stderr` 来阻止工具调用。[4]

例子：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Destructive command blocked by hook."
  }
}
```

但一些看起来像 Claude Code 的高级输出字段，在 Codex 里不一定已经支持。比如 `permissionDecision: "allow"` / `"ask"`、`updatedInput`、`additionalContext`、`continue: false` 等在 `PreToolUse` 里目前是 parsed but not supported。[5]

---

## 4. 以 Claude Code 为例

Claude Code 的 hooks 更成熟，也更像一个完整的事件系统。

Anthropic 的解释很直接：hook 是用户创建的 custom shell command，会在 Claude Code session 里的目标事件发生时自动执行，比如 Claude 准备写文件、用户提交 prompt 等；它通过 stdin 接收事件信息，通过 exit code 和 stdout 与 Claude Code 通信。[6]

Claude Code 常见 hook 事件包括：

| Event | 触发点 | 常见用途 |
| --- | --- | --- |
| `PreToolUse` | tool 执行之前 | block 危险命令、检查路径、改写参数 |
| `PermissionRequest` | 权限弹窗之前 | 自动批准测试命令、拒绝敏感路径 |
| `PostToolUse` | tool 完成之后 | formatter、linter、日志 |
| `PreCompact` | 上下文压缩前 | 备份 transcript、保存重要决策 |
| `SessionStart` | 会话开始 / 恢复 | 注入 git status、TODO、环境上下文 |
| `Stop` | Claude 准备结束 | 检查任务是否完成、跑测试、生成总结 |
| `SubagentStop` | 子 agent 完成 | 验证子任务输出、触发后续动作 |
| `UserPromptSubmit` | 用户提交 prompt | 注入 sprint context、校验请求 |

### 4.1 Claude Code 的 exit code 语义

Claude Code 的 command hook 也通过 `stdin` 接收 JSON。比较重要的是 exit code：

- `0`：成功，继续
- `2`：blocking error，是否能阻止取决于 event
- 其他非零值：多数情况下是 non-blocking error

例如 `PreToolUse` 里 exit code `2` 会阻止 tool call；`PostToolUse` 已经发生在工具执行之后，所以不能阻止刚才那个副作用，只能把 stderr 展示给 Claude。[7]

### 4.2 Claude Code 的 additionalContext 更强

Claude Code 支持 hook 返回 `additionalContext`，把运行时信息注入到 Claude 的上下文里。比如在 `PostToolUse` 后告诉 Claude：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "This file is generated. Edit src/schema.ts and run `bun generate` instead."
  }
}
```

这类机制让 hook 不只是“拦截器”，也可以成为动态记忆 / 动态规则注入层。[8]

### 4.3 Claude Code 还有 prompt / agent hook

Claude Code 不只支持 command hook，还支持 `http`、`mcp_tool`、`prompt`、`agent` 等 hook 类型。Prompt-based hook 会把 hook input 和你的 prompt 发给一个快模型，让它返回结构化 JSON 决策；agent hook 则可以启动一个有工具权限的 verifier。[9]

这说明 Claude Code 的 hook 已经不只是 shell callback，而是在往“可编排的 agent runtime policy layer”发展。

---

## 5. Hook vs permission vs sandbox

这三个东西容易混在一起：

| 机制 | 作用 | 失败后果 |
| --- | --- | --- |
| permission | 用户 / 策略是否允许某动作 | 不该执行的动作可能被批准 |
| sandbox | 动作即使执行，也被限制在隔离环境 | 逃逸或配置错误会扩大影响 |
| hook | 在动作前后插入自定义逻辑 | 漏覆盖、脚本 bug、配置未加载 |

我的理解：

- **permission 是门禁**
- **sandbox 是围栏**
- **hook 是门口的检查员和摄像头**

Hook 不应该被当成唯一安全机制。尤其在 code agent 里，模型可能通过另一条工具路径完成近似动作，所以真正严肃的安全要同时依赖：

- 最小权限
- repo trust
- sandbox
- shell command allowlist / denylist
- secret scanning
- code review
- CI

---

## 6. 实用 hook 模式

### 6.1 Dangerous command blocker

放在 `PreToolUse`。

检查：

- `rm -rf`
- `sudo`
- `chmod -R 777`
- `git push --force`
- `curl | sh`
- 写入 `.env`、私钥、生产配置

### 6.2 Auto formatter

放在 `PostToolUse`。

当文件被写入后，按扩展名跑：

```text
.ts/.tsx -> prettier
.py -> ruff format
.go -> gofmt
.rs -> cargo fmt
```

### 6.3 Test reminder / completion gate

放在 `Stop`。

如果本轮改了源码但没有跑测试，就让 agent 继续：

```text
You changed source files but did not run verification. Run focused tests or explain why tests are skipped.
```

### 6.4 Project memory updater

放在 `Stop` 或 `SessionEnd`。

从 transcript 里抽取：

- 新的项目约定
- 踩坑记录
- 用户偏好
- 未解决问题

但这类 hook 要特别注意不要把秘密、私人 ID、未公开材料写进长期记忆。

### 6.5 Agent observability

放在 `PreToolUse` / `PostToolUse`。

记录：

- 什么 tool 被调用
- 输入摘要
- 输出是否成功
- 耗时
- 修改了哪些文件
- 哪一步失败

这对团队评估 agent 行为比“最后答案看起来不错”可靠得多。

---

## 7. 我自己的 mental model

我会把 AI code agent 的 runtime 想成四层：

```text
Policy layer:
  system prompt, AGENTS.md, settings, permissions

Reasoning layer:
  model decides next action

Action layer:
  tools, shell, file edits, MCP

Lifecycle layer:
  hooks observe / block / inject / validate around actions
```

Hook 属于 lifecycle layer。

它最适合处理这些事情：

- “每次都要做”的工程流程
- “不能只靠模型记忆”的安全规则
- “需要基于运行时状态”的动态上下文
- “需要留下记录”的审计行为

它不适合处理这些事情：

- 复杂产品需求理解
- 大范围架构设计
- 模型应该如何思考
- 完整安全边界

如果说 `AGENTS.md` 是告诉 agent “这个项目怎么工作”，skill 是告诉 agent “这类任务怎么做”，那么 hook 就是告诉 runtime：

> 当 agent 真的要动手时，先让我看一眼；动完之后，也让我检查一下。

---

## References

[1] OpenAI Developers, [Hooks - Codex](https://developers.openai.com/codex/hooks), "Run deterministic scripts during the Codex lifecycle".

[2] OpenAI Developers, [Hooks - Codex: Where Codex looks for hooks](https://developers.openai.com/codex/hooks).

[3] OpenAI Developers, [Hooks - Codex: Matcher patterns and input fields](https://developers.openai.com/codex/hooks).

[4] OpenAI Developers, [Hooks - Codex: PreToolUse](https://developers.openai.com/codex/hooks).

[5] OpenAI Developers, [Hooks - Codex: PermissionRequest and unsupported PreToolUse fields](https://developers.openai.com/codex/hooks).

[6] Anthropic, [Claude Code power user customization: How to configure hooks](https://claude.com/blog/how-to-configure-hooks).

[7] Anthropic, [Claude Code hooks reference: exit code behavior](https://code.claude.com/docs/en/hooks).

[8] Anthropic, [Claude Code hooks reference: additionalContext](https://code.claude.com/docs/en/hooks).

[9] Anthropic, [Claude Code hooks reference: prompt-based hooks](https://code.claude.com/docs/en/hooks).
