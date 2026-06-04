---
title: Minimal Agent Socket
date: 2026-06-04
tags:
  - llm
  - agent
  - codex
  - chatops
  - feishu
---

## 起因

这次想做的东西很小：在飞书里发一句话，让本地 Codex 在指定 repo 里跑一次任务，然后把结果回到原来的聊天。

不是完整 agent，不处理长期会话，也不先上 MCP。第一版只要这条链路能跑：

```text
Feishu text message
-> local service
-> codex exec
-> Feishu reply
```

真正需要认真收住的是中间那层 service。我这里先把它叫做 **Agent Socket**：它负责把外部消息接进来，但不是直接把消息扔给 agent，而是先做一圈很朴素的检查和转换。

这次项目对应的是 `feishu-agent-socket`，一个 Node.js + TypeScript 的小服务。

## 第一版链路

实际跑起来的链路是这样：

```text
Feishu message
-> WSClient long connection
-> normalize message
-> allowlist / mention / dedupe
-> queue
-> codex exec
-> split output
-> send message back
```

看起来步骤不少，但代码其实都很窄。飞书入口在 `index.ts`，消息解析在 `message.ts`，Codex CLI 包在 `codex.ts`，回复切块在 `reply.ts`。

## Feishu 入口：先用 long connection

这里没有折腾公网 webhook。对本地服务来说，飞书官方 SDK 的 long connection 省事很多：不用先准备 callback URL，也不用拿 ngrok 之类的东西把本机暴露出去。

入口代码大概就是：

```ts
const eventDispatcher = new Lark.EventDispatcher({}).register({
  'im.message.receive_v1': async (data: unknown) => {
    const message = normalizeMessage(data as Parameters<typeof normalizeMessage>[0]);
    // gates...
    queue.push(message);
  },
});

const wsClient = new Lark.WSClient({
  appId: config.feishuAppId,
  appSecret: config.feishuAppSecret,
  domain: config.feishuDomain,
  autoReconnect: true,
});

await wsClient.start({ eventDispatcher });
```

第一版只订阅 `im.message.receive_v1`。这样它不是一个“大而全”的飞书 bot，只是一个文本消息入口。

## 把飞书事件压成内部消息

飞书事件原始结构不适合在整个项目里到处传，所以我先把它压成一个内部的 `NormalizedMessage`：

```ts
{
  messageId,
  chatId,
  chatType,
  senderOpenId,
  text,
  mentionedBot,
}
```

这一层只接受文本消息。`message.content` 里再 JSON parse 出真正的 `text`，同时把 sender 的 `open_id` 和 `chat_id` 拿出来。

群聊里还有一个小问题：用户发给 bot 的正文会带 mention key。如果直接把整段文本丢给 Codex，prompt 里会混着 `@bot` 这类东西。所以 `message.ts` 里做了一次 mention stripping：

```ts
function stripMentionKeys(text: string, mentions: Array<{ key?: string }>): string {
  return mentions
    .reduce((current, mention) => {
      if (!mention.key) {
        return current;
      }
      return current.replaceAll(mention.key, ' ');
    }, text)
    .replace(/\s+/g, ' ')
    .trim();
}
```

于是群里发：

```text
@bot inspect this repo
```

最后交给 Codex 的就是：

```text
inspect this repo
```

## 真正关键的是几行 if

第一版最重要的代码其实不是调用 Codex，而是入口处这几行：

```ts
if (!message) {
  logger.warn('ignored empty or unsupported message');
  return;
}
if (deduper.seen(message.messageId)) {
  logger.info('ignored duplicate message', { messageId: message.messageId });
  return;
}
if (!isAllowedSender(message.senderOpenId, config.allowedOpenIds)) {
  logger.warn('ignored unauthorized sender', {
    messageId: message.messageId,
    senderOpenId: message.senderOpenId,
  });
  return;
}
if (message.chatType === 'group' && !message.mentionedBot) {
  logger.info('ignored group message without bot mention', { messageId: message.messageId });
  return;
}
```

这几行决定“哪条飞书消息真的会变成本地 Codex 任务”。

我现在只放过四类条件：

- 能解析成内部 text message
- `message_id` 没见过
- sender 在 `FEISHU_ALLOWED_OPEN_IDS`
- 群聊消息必须 mention bot

`open_id` allowlist 是必须的。这个服务背后接的是本地 Codex，就算后面有 sandbox，也不应该让任意飞书用户都能发 prompt 进来。

群聊 mention 这里现在还是一个简化实现：因为第一版没配置 bot 自己的 open_id，所以只要事件里有 mentions metadata，就认为这是发给 bot 的。够用，但以后要严谨一点，应该检查 mention 里具体是不是这个 bot。

dedupe 也是先用内存。单实例本地跑没问题；多实例部署再换 Redis。

## 为什么要 queue

收到消息以后，我没有直接在 event callback 里跑 `codex exec`，而是先 push 到队列：

```ts
queue.push(message);
```

worker 再慢慢处理：

```ts
const output = await runCodexExec(message.text, {
  cwd: config.codexCwd,
  model: config.codexModel,
  sandbox: config.codexSandbox,
  timeoutMs: config.codexTimeoutMs,
});
```

这个 queue 不是为了做复杂调度，只是为了让飞书事件入口保持轻一点。Codex 任务可能跑几分钟，event handler 不应该在那里卡着。

默认 `WORKER_CONCURRENCY=1`。对我这个个人 bot 来说，这反而是比较合理的默认值：一个本地 coding agent 同时跑多个任务，很容易把机器、repo 状态和输出都搅在一起。

## codex exec 这一层

第一版 backend 直接用 `codex exec`：

```ts
const args = ['exec', '--cd', options.cwd];
if (options.model) {
  args.push('--model', options.model);
}
args.push('--sandbox', options.sandbox, prompt);
```

这里的好处是没有 session 管理。一条飞书消息就是一次 Codex 任务，跑完就把 stdout 回去。

代价也清楚：它不记得上一条消息，不知道飞书 thread 历史，也没法自然做 `/cancel` 或 streaming status。但第一版先不解决这些。

## 执行边界先写死

这层最重要的配置是：

```text
CODEX_CWD
CODEX_SANDBOX
CODEX_TIMEOUT_MS
```

`CODEX_CWD` 把 Codex 固定到一个 repo：

```ts
const args = ['exec', '--cd', options.cwd];
```

`CODEX_SANDBOX` 只接受两个值：

```text
read-only
workspace-write
```

`danger-full-access` 在 config 解析时直接拒掉：

```ts
function parseSandbox(value?: string): 'read-only' | 'workspace-write' {
  if (!value) {
    return 'workspace-write';
  }
  if (value === 'read-only' || value === 'workspace-write') {
    return value;
  }
  throw new Error('CODEX_SANDBOX must be read-only or workspace-write');
}
```

这个限制很粗暴，但第一版就应该粗暴一点。入口来自 IM，不能让一个聊天消息绕过本地权限边界。

`codex.ts` 里还给子进程加了 timeout 和 buffer 上限：

```ts
execFile(
  'codex',
  args,
  {
    cwd: options.cwd,
    timeout: options.timeoutMs,
    maxBuffer: 1024 * 1024 * 10,
    env: {
      ...process.env,
      NO_COLOR: '1',
    },
  },
  // ...
);
```

这样至少不会因为一条消息让 Codex 无限跑下去。

## 回复：切块发回原 chat

Codex 输出回来后，服务用原来的 `chat_id` 发消息：

```ts
await sendTextReply(client, message.chatId, output);
```

飞书文本消息不能无限长，所以 `reply.ts` 里先按 3500 字符切块：

```ts
const DEFAULT_MAX_TEXT_CHARS = 3500;
```

超过长度的回复会加上 `[1/3]` 这种前缀。这个逻辑不应该放在 Codex 层，因为它只是飞书这个出口的格式限制。

## 文件拆分

最后代码被拆成这些小文件：

| 文件 | 做什么 |
| --- | --- |
| `index.ts` | long connection、event handler、queue wiring |
| `config.ts` | env parsing、domain、sandbox validation |
| `message.ts` | text message normalization、mention stripping、allowlist |
| `codex.ts` | `codex exec` 参数、timeout、stdout/stderr |
| `reply.ts` | 飞书 text reply、长输出切块 |
| `queue.ts` | worker concurrency |
| `dedupe.ts` | `message_id` 去重 |

这里最值得单独测的是 `message.ts` 和 `codex.ts`：一个管入口能不能进来，一个管最后会以什么参数执行 Codex。`reply.ts` 的 chunking 也要测，不然长输出很容易在真实聊天里失败。

## 这一版不解决什么

现在这个东西更像：

```text
IM-triggered one-shot Codex runner
```

它还不是一个持续会话 agent。没有 session map，没有 memory，没有 MCP client，也没有 command layer。

后面如果继续做，最自然的升级路径是把 `codex exec` 换成 `codex mcp-server`，然后用 `chat_id` 或 `chat_id + sender_open_id` 维护 session。再往后才是 `/cancel`、`/status`、rate limit、approval before write 这些控制面。

但第一版先到这里就够了。把消息入口、allowlist、固定 cwd、sandbox、timeout、队列和回复这几件事收住，就已经是一个能实际用的 minimal agent socket。
