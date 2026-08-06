---
title: ACP 与 stdio JSON-RPC
date: 2026-08-07
tags:
  - acp
  - json-rpc
  - agent-protocol
  - tool-review
---

## 这是什么

[ACP](https://agentclientprotocol.com)（Agent Client Protocol）是一个让编辑器和 AI agent 互通的开放协议。底层用的是 stdio JSON-RPC——两个老东西拼一起，但拼法很聪明。

## stdio

Agent 进程通过 stdin / stdout 和外部通信。不监听端口，不走 HTTP。

好处很明显：不暴露网络端口、不需要配防火墙、进程退出连接就断。编辑器 fork 一个 `opencode acp` 子进程，往 stdin 写 JSON，从 stdout 读 JSON。简单，零配置。

## JSON-RPC

JSON-RPC 是一种极简的 RPC 协议。一个请求长这样：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "agent/prompt",
  "params": {
    "message": "解释这段代码"
  }
}
```

响应：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": "这段代码做了..."
  }
}
```

就三个字段：调哪个方法、传什么参数、回什么结果。没有 SOAP 的 XML hell，没有 REST 的 URL 设计争论。

## 为什么这个组合重要

在 ACP 之前，每个 agent 有自己的通信方式。要接入一个新工具，agent 开发者得专门适配，工具开发者也得逐个对接 agent。N × M 问题。

stdio JSON-RPC 把这个问题简化成：agent 实现一套 ACP methods，工具也实现同一套。任何 agent 进任何 ACP 兼容的工具，开箱即用。

Buzz 只是其中一个受益者——它不用为 Codex、Claude Code、OpenCode 各写一套接入逻辑，一个 `buzz-acp` 全搞定。反过来，一个 OpenCode agent 也可以同时接入 Buzz、Zed、JetBrains，不需要任何改动。
