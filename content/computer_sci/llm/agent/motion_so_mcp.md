---
title: Motion MCP：把视频工作室接进 Agent
date: 2026-07-23
tags:
  - llm
  - agent
  - mcp
  - video
  - tooling
---

`motion.so` 的 Motion 是 Mosaic AI Labs 做的 motion design Agent。它和常见 text-to-video 产品的差别，在于生成单个镜头并不是它想解决的全部问题。Motion 试图接管的是一条更长的视频生产链：理解 brief、研究品牌、写脚本、规划场景、制作动画、加入配音与音乐，再根据反馈修改成片。[1](#ref-1)

Motion MCP 则把这条生产链暴露给 ChatGPT、Claude、Cursor 等 MCP host：

```text
MCP host
   │  prompt / assets / style reference
   ▼
Motion MCP server
   │  create job / follow up / inspect status
   ▼
Motion cloud agent
   │  research → script → storyboard → render
   ▼
editable project + MP4
```

这里的 MCP 只是 integration layer。它负责让 host 发现和调用工具；真正的视频理解、规划与渲染都发生在 Motion 的云端系统里。这是 [[computer_sci/llm/agent/model_context_protocol_mcp|MCP]] 作为 remote capability adapter 的一个很完整的例子。

## Motion 在视频工具谱系里的位置

Motion 更接近一个自动化 motion design studio，而不是本地视频编辑器。

| 产品形态 | 主要控制对象 |
| --- | --- |
| text-to-video model | 一个镜头或一段生成画面 |
| timeline editor | layer、track、keyframe、transition |
| Motion | 从 brief 到成片的一次 production run |

它的目标内容也明显偏向设计驱动的视频：product launch、产品 demo、explainer、promo、social clip、article-to-video。输入可以很轻，只是一句 prompt；也可以带产品网站、品牌素材、已有音视频和 YouTube 风格参考。

这解释了为什么 Motion 的核心对象叫 `session` / `job`，而不是 project timeline 或 render frame。调用者提交的不是一组精确剪辑指令，而是一份交给制作 Agent 的 brief。

## Tool surface

Motion MCP 的视频工具很少：

| Tool | 对应的 production action |
| --- | --- |
| `create_video` | 启动一次新的视频制作 |
| `create_followup` | 对已完成的一版提出修改 |
| `upload_asset` | 把本地素材变成 Motion 可读取的临时附件 |
| `get_session_status` | 重新打开 job，读取状态和输出 |
| `job_status` | 供交互式 widget 刷新状态，不直接给模型使用 |

`create_video` 接受一个 1–12,000 字符的 prompt，并可以附带：[2](#ref-2)

- 画幅：`16:9`、`9:16`、`1:1`、`4:5`、`21:9`
- 时长档：`<10s`、`10-30s`、`30s-1min`、`1-5min`
- 内置 design system
- 自定义 `DESIGN.md`
- 一个 YouTube 风格参考
- 最多 10 个图片、视频、音频或文件附件

内置 design system 包括 Apple、Linear、Stripe、Figma、Notion 等预设。这里的名字更像现成的视觉语言入口，不等于输出获得了对应品牌的官方认可。

工具数量少并不代表后端简单。恰恰相反，Motion 把脚本、镜头规划、素材获取、配音、音乐和渲染隐藏在一次 durable job 后面。MCP 暴露的是 production boundary，而不是内部每一道工序。

## 一次 job 的生命周期

`create_video` 是异步调用。它先返回 `job_id`，后台任务随后经历：

```text
queued
  ↓
created
  ↓
running
  ├─→ awaiting_user_input
  ├─→ failed
  └─→ completed
          ↓
   output.download_url
```

API client 需要轮询状态；支持 MCP Apps 的 host 可以显示一个自动刷新的 video widget。任务完成后，widget 直接播放结果并提供下载按钮，Agent 不需要持续占着对话轮询。[2](#ref-2)

修改也是 session lifecycle 的一部分。`create_followup` 只能作用于已经 `completed` 的 job；如果上一版还在生成，服务器会返回 `409 followup_requires_completed_job`。[3](#ref-3) 因此这里的交互节奏是：

```text
生成一版 → 看成片 → 提 revision → 再生成一版
```

它不是在生成过程中逐帧导演，也没有通过 MCP 暴露 layer、keyframe 或 timeline 级操作。Motion Web 里的手动可编辑能力，与 MCP 当前提供的 Agent 控制粒度并不是同一个 surface。

## 素材如何进入 Motion

Motion 运行在云端，不能读取本机 `file://` 路径。本地图片、视频和音频要先通过 `upload_asset` 取得 signed upload URL，上传完成后，再把返回的 `attachment_url` 放进 job。[4](#ref-4)

当前文档中的素材边界：

| 类型 | 单文件上限 |
| --- | ---: |
| video | 5 GB |
| audio | 500 MB |
| image | 50 MB |

- 每个 job 最多 10 个附件；
- upload URL 有效 1 小时；
- attachment URL 有效 7 天；
- 每个用户 5 小时内最多上传 30 次；
- 上传文件 14 天后自动删除。

这套 upload flow 是临时 ingest channel，不是文件存储服务。对私有 repo、未发布产品界面或客户素材而言，关键问题也从“Agent 能不能读本地文件”变成了“这些文件是否允许进入 Motion 的云端系统”。

## 输出与 source audit

完成后的公开输出是一个 MP4 signed download URL。job 状态还可能带 `sources` 数组，记录素材来自 Getty、Pexels、网页搜索、用户上传或生成模型，以及素材被放在了哪个 scene 和时间段。[3](#ref-3)

这个设计很像生成流程里的 provenance log：

```text
source
  ├─ provider
  ├─ source URL
  ├─ rights status
  └─ usages[] → scene / timeline range
```

但 `sources` 是 additive field，也可能为空。它可以辅助审查，不应被理解为完整的版权清单或法律担保。尤其是 web search、user-provided 和 `unknown` 来源，仍然需要单独确认使用权。

## MCP Apps 不只是 JSON tool calling

Motion 同时展示了 MCP Apps 的一层 UI 能力。

普通 MCP host 调用工具后只能拿到结构化结果；支持 MCP Apps 的 host 可以在对话中渲染 Motion 提供的 `ui://motion/*.html` 资源：

- generation widget：显示 job、自动刷新、播放和下载视频；
- plans widget：显示套餐、余额、充值和支付设置。

因此一次 `create_video` 调用可以在对话里留下一个持续更新的 UI，而不是一串需要模型重复解释的 JSON status。[2](#ref-2)

这里的分工很清楚：

```text
model          决定何时调用、参数是什么
MCP tool       启动或查询远程任务
MCP App widget 承担长任务的状态 UI
Motion backend 持续执行视频 workflow
```

对于长时间运行的媒体生成任务，这比让模型循环调用 `get_status` 更自然。

## 认证和 control plane

Motion MCP endpoint 是：

```text
https://mcp.motion.so/mcp
```

默认连接方式是 OAuth 2.1。MCP client 发起浏览器授权，用户批准 scopes 后，Agent 代表该 Motion 账号工作并消耗对应 credits，不需要复制 API key。[2](#ref-2)

它还支持两种身份：

- service account：Agent 有独立身份、credits 和 billing，通过 `client_credentials` 无人值守运行；
- Motion API key：使用 `motion_...` bearer token，作为 OAuth 不可用时的 fallback。

有意思的是，Motion MCP 不只暴露 production tools，也暴露了一套 account control plane：

| 领域 | Tools |
| --- | --- |
| credits | `get_credit_balance`、`purchase_credits` |
| plans | `list_plans`、`subscribe_to_plan` |
| billing | `setup_payment_method`、`set_auto_topup` |
| identity | `register_service_account`、`whoami` |
| credentials | `list_api_keys`、`create_api_key`、`revoke_api_key` |

视频生成和付费管理因此出现在同一个 MCP server 里。官方 ChatGPT App 文档把 payment、auto-top-up、subscription 和 revoke actions 标为 destructive。[5](#ref-5)

这部分比视频生成本身更值得留意：service account 可以绑定支付方式，`purchase_credits` 可以从已保存的卡直接扣款，`set_auto_topup` 则让后续消费不再需要人工结账。MCP host 是否支持逐工具授权、是否会对 destructive action 二次确认，直接决定了这套自动化的风险边界。

## Credits

2026-07-23 查到的 credits 说明是：

- `$5 = 200 credits`
- 200 credits 大约对应 1–2 个视频
- 5,000 credits 大约对应 18–20 个视频

这只是量级，不是固定单价。时长、高级模型、配音和 follow-up 都会改变消耗。[6](#ref-6) 一个视频 job 的预算很难在提交 brief 时精确算出；revision loop 越长，成本越不稳定。

在自主 Agent 场景里，credits 是比 LLM token 更直接的执行预算。视频生成、购买 credits、设置自动充值最好被视为三个不同权限，而不是一次授权。

## MCP 与 API

Motion API 的 public surface 很小：上传素材、创建 session、提交 follow-up、轮询状态。API 使用 `motion_` key，调用方自己实现 orchestration、polling、错误处理与 UI。[3](#ref-3)

MCP 没有替代这套 API，而是在上面补了：

- tool discovery 和 schema；
- OAuth / service account；
- account 与 credits tools；
- MCP Apps widgets；
- 让通用 Agent 决定何时创建或修改视频。

因此两者对应的是不同操作者：

```text
API → application code 操作 Motion
MCP → general-purpose agent 操作 Motion
```

## 尚待验证的边界

- Motion Web 所说的“每个元素都可编辑”，有多少能通过 `create_followup` 精确保留和修改？
- 同一 job 多轮 follow-up 的 credits 曲线如何变化？
- `sources` 在不同素材获取方式下有多完整？
- 自定义 `DESIGN.md` 对字体、布局、转场和品牌一致性的约束力有多强？
- 生成 1–5 分钟视频时，脚本连贯性和视觉重复度如何？
- MCP host 对 purchase、auto-top-up 和 key management 的审批粒度是否足够？

从当前 tool surface 看，Motion MCP 最清晰的定位不是“AI 视频模型接口”，而是一个可以被通用 Agent 调度的 **remote video production service**。它把整间视频工作室压缩成了少数几个 job-level actions，同时也把这间工作室的素材入口、身份和预算一起交给了 Agent。

## References

<a id="ref-1"></a>[1] Motion, [Introducing Motion: the frontier agent for motion design](https://motion.so/blog/introducing-motion), 2026-06-18.

<a id="ref-2"></a>[2] Mosaic Motion, [MCP Server & AI Agents](https://docs.motion.so/guides/mcp).

<a id="ref-3"></a>[3] Mosaic Motion, [Full documentation for LLMs](https://docs.motion.so/llms-full.txt).

<a id="ref-4"></a>[4] Mosaic Motion, [Attachments](https://docs.motion.so/guides/attachments).

<a id="ref-5"></a>[5] Mosaic Motion, [ChatGPT App](https://docs.motion.so/guides/chatgpt-app).

<a id="ref-6"></a>[6] Mosaic Motion, [Credits](https://docs.motion.so/guides/credits).
