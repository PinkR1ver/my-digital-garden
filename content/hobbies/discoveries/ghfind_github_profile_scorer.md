---
title: ghfind.com — GitHub Profile Scorer
date: 2026-07-03
tags:
  - web-tool
  - github
  - ai-agent
  - discovery
---

## 这是什么

[ghfind.com](https://ghfind.com/en) 是一个给 GitHub Profile 打分并 AI 吐槽的趣味网站。输入任意 GitHub 用户名，它会基于公开活动数据给出一个 0-100 的分数，附带一段毒舌点评。

- 分级标签：GOD / SOLID / TRASH 等
- Leaderboard：24h / 7d / 30d / all-time，Linus Torvalds 排第 5（95.2 分）
- Head-to-Head 对比模式
- 可以填自己的 LLM API Key，纯浏览器端运行

页面底部写着 "Powered by [LobeHub](https://lobehub.com/)"，顺藤摸瓜了解了一下这个平台。

## LobeHub 是什么

LobeHub 是 LobeChat（78K+ GitHub stars 的开源 AI 聊天框架）演进出来的 Agent 平台。定位是 "Chief Agent Operator"——不只是聊天，而是编排多个 Agent 协作、定时调度、7×24 运行。

背后开源的 ghfind 评分逻辑是一个 LobeHub Skill（`github-account-value`），ghfind 本质上就是 LobeHub 平台能力的一个 Demo。

## 核心问题

### Agent 资源免不免费？

**免费，而且有两种方式：**

1. **自部署（LobeChat Community Edition）**：完全开源免费，Docker 一行脚本部署。自己带 API Key（OpenAI / Claude / Gemini 等），只付底层模型的钱，平台不收费。

2. **LobeChat Cloud（lobehub.com 托管）**：免费层每月 **500,000 credits**，新用户额外一次性送 450,000 credits。免费层能用轻量模型（Claude Haiku, Gemini Flash, DeepSeek V4, GPT-5.4 mini 等），但不能用旗舰模型（Claude Opus/Sonnet 4.5+, GPT-5.5 Pro 等）。Agent 功能在所有层级都可以用，限制只是 credit 消耗。

付费层：Basic $12.90/月 → Advanced $24.90/月 → Ultimate $49.90/月，差别在于 credit 额度和可用模型。

### 和 Codex CLI / Claude Code 的差异化

**LobeHub 和 Codex / Claude Code 不是同一类东西。它是编排层，不是编程 Agent 本身。**

| | LobeHub | Claude Code | Codex CLI |
|---|---|---|---|
| 类别 | Agent 编排平台 | 终端编程 Agent | 终端编程 Agent |
| 界面 | 桌面端 + Web + 移动端 | 终端 (TUI) | 终端 (CLI) |
| 角色 | 管理多个 Agent 组成团队 | 单 Agent 深度编程 | 单 Agent 深度编程 |
| 模型锁定 | 无 — 30+ 提供商随意切换 | 仅 Anthropic (Claude) | 仅 OpenAI (GPT/o-series) |

**LobeHub 能做的：**
- **Multi-Agent 团队协作**：planner / coder / reviewer 多个 Agent 并行或串行工作，每个可以指定不同模型
- **离线定时调度**：Agent 可以在你没在线的时候定时运行
- **统一对话管理和分支**：所有 Agent 交互在一个工作区，可 fork 对话探索不同方向
- **IM 接入**：Slack, Discord, Telegram, WeChat, iMessage 等
- **跨模型灵活切换**：一个项目里规划 Agent 用 GPT，写码 Agent 用 Claude，审查 Agent 用本地 Ollama
- **White-Box 记忆**：结构化、可编辑、跨会话持久化
- **全平台**：有 iOS 和 Android App

**Codex / Claude Code 能做的：**
- **深度单 Agent 编程**：专门为代码生成、编辑、调试、重构优化——这是它们的核心能力
- **LobeHub 自己承认**（官方博客）："Our own Agent in coding isn't matching Claude Code yet, but give us ~3 months and we think we can catch up."
- **完整文件系统访问**：直接在本地文件上运行构建、测试、lint
- **模型深度集成**：Claude Code 和 Anthropic API 联合设计，Codex CLI 针对 GPT-5.2 的 400K 上下文和 128K 输出做了深度优化——这种深度绑定带来的编码效果，模型无关的编排层还做不到

### 正在融合的趋势

2026 年中，LobeHub 新增了对 Claude Code 和 Codex CLI 作为外部运行时的支持（RFC 153 — Heterogeneous Agent Runtime）。意思是可以用 LobeHub 的界面来做规划、prompt、review、跟进，实际编码执行交给 Claude Code 或 Codex CLI。

**LobeHub 像 "技术主管"，Codex / Claude Code 像 "一线工程师"——两者正在打通。**

## 我的判断

ghfind 作为一个 viral Demo 很成功——让我知道了 LobeHub。但对我的日常 workflow 来说：

- **编程场景**：Claude Code 仍然是主力，LobeHub 的编程 Agent 还赶不上
- **LobeHub 的价值点**：如果你需要多个 Agent 协作完成复杂任务、跨模型切换、离线定时跑、或者在移动端和 IM 里使用 Agent——这些是 Claude Code 做不到的
- **未来可能的用法**：LobeHub 做任务规划和多 Agent 编排 + Claude Code 做具体编程执行，这个组合有意思

目前 LobeHub 先收藏关注，ghfind 作为有趣的发现记录下来。
