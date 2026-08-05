---
title: Everything Desk｜Research 001A｜Agent Handoff：实时信息架构
description: 面向后续开发 Agent 的源码索引、版本快照、复用台账、目标接口草案、许可证约束与待验证实验
date: 2026-08-05
tags:
  - everythingdesk
  - development
  - research
  - agent-handoff
---

## Purpose

本文件是 [Everything Desk｜Research 001｜实时信息架构与前端增量更新](computer_sci/dev/everythingdesk/research_001_realtime_information_architecture.md) 的 Agent 交接稿。主笔记保存产品语境、横向比较和研究结论；本文件保存精确源码位置、commit、复用方式与下一轮实现入口。

研究目标：将现有 Everything Desk 代码从单领域工作区重构为全球新闻、多资产价格、宏观指标和 Agent 分析共存的信息工作台，同时保留安全能力边界，并使高频价格曲线只更新必要的前端区域。

非目标：本轮不修改应用代码，不选择正式数据供应商，不确定部署拓扑，不宣称吞吐或延迟指标，不开放 Agent 交易权限。

## Evidence Snapshot

外部仓库均在 2026-08-05 以 shallow clone 检查；下列 SHA 是本轮判断的固定证据点。

| Repository | Commit | Checked area | License status |
| --- | --- | --- | --- |
| `koala73/worldmonitor` | `0e8785c43e6a693990a14181ae0a16066c15fc8c` | smart poll、layout batch、Redis cache、bootstrap、seed publish | AGPL-3.0-only |
| `OpenBB-finance/OpenBB` | `3e071fcc2cd9f891cac6040ae60296dba76dab46` | Provider、Fetcher、RegistryLoader、QueryExecutor、standard models | AGPL-3.0 |
| `gloom-sh/gloomberb` | `b8ff0198c7f5d9ad015c9132ac3bb78b9fb0710e` | plugin API、capability types/registry/factories、pane state | MIT |
| `Ben05-sys/QuantPilot` | `2b7172bc99bd6d731638ed2cc86e99227e0007bd` | Provider Protocol、stream health、subscription scope、snapshot model | AGPL-3.0 |
| `hipcityreg/situation-monitor` | `74ad5c086da0258636269423e65b008ad6bfc614` | cache、deduplicator、circuit breaker、service client | No license file found |
| `finos/perspective` | `ce9b9a41a3f989816a588163b68275a7799ea9c1` | streaming example、table update/remove、viewer/worker | Apache-2.0 |
| `tradingview/lightweight-charts` | `ef7335a8007236eac38bd50cacddc305c7fcb293` | v5.2 API、realtime demo、NOTICE/README | Apache-2.0 + attribution requirement |
| `leeoniya/uPlot` | `0e5812c504430f5c804e0f993376d8999b26cc34` | v1.6.32 README、benchmarks、stream demos、API | MIT |
| `react-grid-layout/react-grid-layout` | `77c86481d7af759e2b07313e7228984bce14994b` | v2.2.4 hooks、layout persistence、dynamic panels | MIT |
| `freqtrade/freqtrade` | `a765493e1f10cd3ad75e7e468dd486b5174b1de3` | WebSocket message stream、trading-system boundary | GPL-3.0 |

Everything Desk 当前继承代码库：

| Field | Value |
| --- | --- |
| Local path | `/home/jude-homelab/Documents/proj/everythingdesk` |
| Branch | `main` |
| Commit | `784953a72f64dc3fe67e636eda2809e71084f71e` |
| Commit date | 2026-07-24 |
| Worktree at inspection | clean |
| Runtime | Next.js 16.2.6, React 19.2.6, TypeScript, vinext/Cloudflare |
| Agent dependencies | `pi-agent-core`, `pi-ai` |

Before implementation, reread `/home/jude-homelab/Documents/proj/everythingdesk/.agents/AGENTS.md` and relevant `.agents/spec/` files. The inherited repository still contains historical single-domain names; treat them as migration inputs, not current product terminology.

## Current Code Inventory

### Preserve and extend

#### `web/lib/agent/tool-registry.ts`

Current value:

- generic tool registration and lookup;
- capability/risk/timeout metadata;
- Artifact projection hook.

Change seam:

- add unregister cleanup;
- add operation kind `read | query | action | stream`;
- add side-effect classification separate from model-facing risk;
- allow one headless capability to project into Agent tool, UI data source or background task.

Avoid creating a parallel provider registry that duplicates validation, policy and invocation. Introduce a capability layer beneath the existing Agent projection.

#### `web/lib/agent/capability-policy.ts`

Keep capability and risk checks. Extend policy inputs only after defining side-effect metadata. Trading/order mutation must remain outside automatic Agent execution until proposal/approval semantics exist.

#### `web/lib/agent/tool-runner.ts`

Keep TypeBox validation, timeout, policy decision and result projection. Add stream subscription through a separate lifecycle API rather than forcing long-lived subscriptions into a one-shot runner result.

#### `web/lib/commands/command-registry.ts`

Use as the basis for both slash commands and the future keyboard command palette. A shared command descriptor needs id, label, aliases/keywords, input schema, capability requirement and execution surface.

#### `web/lib/cache/async-ttl-cache.ts`

Current implementation already provides:

- isolate-local TTL state;
- identical-request coalescing;
- per-caller abort waiting without cancelling the shared upstream request.

Additive work:

- freshness envelope;
- bounded negative cache;
- metrics for cache source/age/leader;
- persistent L2 interface rather than hard-coding Redis or SQLite;
- timeout around loader so an unresolved Promise cannot poison a key forever.

#### `web/lib/http/request-json.ts`

Keep as adapter primitive. It currently has JSON parsing, default timeout and a retry for selected gateway failures. Add per-provider retry policy, rate-limit metadata, typed failure reason and observation timing. Do not add provider-specific behavior to this file.

#### `web/lib/agent/loop.ts` and `web/lib/agent/events.ts`

The event translation pattern is reusable. Split two protocols:

1. finite Agent-run events;
2. persistent domain observations.

`encodeSse()` is a framing baseline only. Persistent streams require named events, event IDs, heartbeat, replay/gap semantics and connection cleanup.

### Replace or decompose

#### `web/lib/agent/artifacts.ts`

The union is effectively a single market Artifact. Replace with an Artifact registry or discriminated domain envelopes. Artifact is a durable UI projection of an Agent/tool result; it is not the transport event itself.

#### `web/lib/agent/runtime.ts`

The harness is structurally reusable but currently registers one domain and contains a hard-coded system prompt. Separate:

- runtime bootstrap;
- built-in capability registration;
- product prompt/config;
- session store;
- domain plugin loading.

#### `web/app/api/agent/route.ts`

This is a POST response stream scoped to one Agent turn. Keep it for Agent output. Do not extend it into the live-data connection.

#### `web/app/api/market-data/route.ts`

Replace with provider-neutral snapshot routes. The route currently encodes one domain and polling model. The new stream transport should be a separate endpoint or service.

#### `web/lib/markets/chart-scale.ts`

The y-axis assumes values within `[0,1]`. General prices, rates, volumes and indices require numeric domain calculation, zero-line policy, log scale option and unit formatting.

#### `web/app/PolydeskAgent.tsx`

Current characteristics:

- large component combining shell, session, market cards, trading controls and chart;
- React-rendered SVG `<polyline>` for history;
- order-book polling every 2 seconds;
- history polling every 15 seconds;
- manual parsing of a fetch response stream by splitting `\n\n`.

Decompose into Workspace Shell, Panel Registry, Composer, Session surface and domain Panels. Replace the SVG curve hot path with a chart instance managed by a dedicated Panel component. Use a standards-aware SSE parser or constrained event framing; arbitrary chunks need not align with event boundaries.

## Comparator Source Index

### World Monitor

Repository: <https://github.com/koala73/worldmonitor>

| File | Mechanism | Adaptation note |
| --- | --- | --- |
| `src/services/smart-poll-loop.ts` | visibility-aware scheduling, no overlap, abort, backoff, jitter | Independently implement as shared scheduler; unit-test visibility transitions and aborted requests |
| `src/utils/layout-batch.ts` | separate measure/mutate queues flushed in one rAF | Reimplement small local utility; use for Panel resize and layout reads/writes |
| `server/_shared/redis.ts` | cache read, negative sentinel, local fallback, in-flight map, loader timeout | Extend local `AsyncTtlCache`; do not transplant AGPL source |
| `api/bootstrap.js` | Redis pipeline batch GET and envelope unwrap | Useful only if first screen needs many shared keys; avoid premature bootstrap endpoint |
| `scripts/_seed-utils.mjs` | staging → canonical → cleanup, retry, metadata | Apply to scheduled ingestion if persistent cache is introduced |
| `ARCHITECTURE.md` | seed/cache/upstream hierarchy and health model | Architecture reference |

Implementation warning: do not reproduce the full World Monitor operational surface before actual source count and cadence require it.

### OpenBB

Repository/docs: <https://github.com/OpenBB-finance/OpenBB>, <https://docs.openbb.co/odp/python/developer/extension_types/provider>

| Area | Mechanism | Everything Desk translation |
| --- | --- | --- |
| `Fetcher[Q, R]` | transform query → extract → transform data | `SourceAdapter<Query, Raw, Domain>` with three independently testable methods |
| `Provider.fetcher_dict` | maps standard model to implementation | capability manifest maps domain operation to adapter |
| `RegistryLoader.from_extensions()` | extension discovery via package entry points | static built-ins first; dynamic plugins only after trust/update model is defined |
| `QueryExecutor` | explicit provider/model resolution and credential filtering | resolution policy returns chosen source and reason; no silent fallback |
| Standard models | preserve domain semantics and provider extensions | domain-specific models inside common observation envelope |

Avoid a single `UniversalData` type. Normalization must not discard exchange/session/revision semantics.

### Gloomberb

Repository: <https://github.com/gloom-sh/gloomberb>

| File | Mechanism | Reuse mode |
| --- | --- | --- |
| `PLUGINS.md` | `GloomPlugin`, setup/dispose, contribution APIs | Architecture contract reference |
| `src/capabilities/types.ts` | operation kind, side effects, parser schemas, subscribe cleanup | MIT code/type adaptation possible with notice |
| `src/capabilities/registry.ts` | register/unregister, priority, invoke, subscribe, teardown | Strongest direct external reuse candidate; fit to existing Tool Registry |
| `src/capabilities/factories.ts` | wraps providers into typed operations | Recreate minimal factories only for implemented domains |
| `src/components/layout/shell/layout-state.ts` | docked/floating/hidden pane state | Observe separation of pane state from capability state |

Do not import the whole plugin framework. First implementation should support built-in statically imported plugins. Dynamic third-party loading, sandboxing and dependency resolution are separate security work.

### QuantPilot

Repository: <https://github.com/Ben05-sys/QuantPilot>

| File / section | Mechanism | Independent implementation |
| --- | --- | --- |
| `app/providers/base.py` | minimal quote/bars protocol; `lag_seconds`; pre/post separation | Carry observation timestamps and session-specific fields in domain schema |
| `app/stream.py` | viewport + pinned subscriptions; cap; reconnect sequence; poll fallback | Subscription budget service driven by Panel visibility |
| README architecture | snapshot-first, two-pass repricing, append-only SQLite snapshots | First render from snapshot, then live overlay; keep revision/freshness visible |

Do not use undocumented Yahoo endpoints as the product's commercial data foundation. Data license, display, caching and redistribution rights require a separate provider review.

### Situation Monitor

Repository: <https://github.com/hipcityreg/situation-monitor>

| File | Mechanism | Note |
| --- | --- | --- |
| `src/lib/services/cache.ts` | memory + localStorage, TTL + stale window | localStorage only for small config; use IndexedDB for larger browser data |
| `src/lib/services/deduplicator.ts` | in-flight Promise map | Already present locally in stronger form |
| `src/lib/services/circuit-breaker.ts` | closed/open/half-open state | Reimplement after defining per-provider failure taxonomy |
| `src/lib/services/client.ts` | cache → SWR → circuit → dedupe → retry → stale fallback | Useful orchestration order |

No license file was found at the inspected commit. Treat all source as non-copyable unless the owner clarifies licensing.

### Perspective

Repository: <https://github.com/finos/perspective>

| File | Mechanism | Evaluation |
| --- | --- | --- |
| `examples/blocks/src/streaming/streaming.js` | worker table, `limit: 500`, repeated `table.update()` | Build a standalone spike for streaming blotter only |
| `docs/md/explanation/table/update_and_remove.md` | append without index; partial row update with index; missing columns omitted | Good fit for keyed observations and rolling tables |
| `packages/react/` | React integration | Prefer web component/client boundary unless React package materially simplifies lifecycle |

Admission criterion: Perspective must outperform a virtualized table + selector store for an actual analytical workload, not merely render the same small quote list.

### Lightweight Charts

Repository: <https://github.com/tradingview/lightweight-charts>

Current API facts from `src/api/iseries-api.ts`:

- `setData(data)` fully replaces ordered series data;
- `update(bar)` adds a newer point or replaces the latest point when timestamps match;
- earlier-point modification requires `historicalUpdate: true` and is documented as slower;
- `subscribeDataChanged()` fires after `update` or `setData`.

Relevant files:

| File | Use |
| --- | --- |
| `src/api/iseries-api.ts` | authoritative update semantics |
| `website/tutorials/demos/realtime-updates.mdx` | official simulated realtime pattern |
| `website/tutorials/demos/realtime-updates.js` | chart instance and update example |
| `NOTICE` and README License section | required TradingView attribution/link |

Integration must preserve the notice and expose the required attribution on a user-visible page. Prefer direct library API behind a local React hook over an unverified third-party wrapper.

### uPlot

Repository: <https://github.com/leeoniya/uPlot>

Version `1.6.32`. The library is a small Canvas time-series renderer. Its public benchmark is useful for forming experiments but is not an Everything Desk result. It deliberately excludes data parsing, aggregation and statistical processing; the application owns those concerns.

Evaluation focus:

- aligned array conversion cost;
- sliding-window allocation and garbage collection;
- cursor/tooltip synchronization across panels;
- overlay and annotation implementation cost;
- same workload versus Lightweight Charts on target hardware.

### React Grid Layout

Repository: <https://github.com/react-grid-layout/react-grid-layout>

Version `2.2.4` is a TypeScript rewrite. Relevant v2 surfaces:

- `useContainerWidth`;
- `useGridLayout`;
- `useResponsiveLayout`;
- pluggable compactor and position strategy;
- dynamic add/remove;
- serialized/restored layouts.

Panel content should use its own `ResizeObserver`. Persist layout only on resize/drag stop or a debounced stable state; continuous persistence during interaction creates unnecessary writes.

## Reuse Ledger

| ID | Asset | Origin | Mode | Target | Preconditions | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Tool Registry / policy / runner | Local | Direct refactor | `core/capabilities` + Agent projection | preserve current tests and safety boundary | unit tests for register/invoke/policy/unregister |
| R-02 | Async TTL cache | Local | Direct extension | L1 cache | loader timeout, metadata, bounded negative cache | concurrent caller + abort + rejection tests |
| R-03 | JSON request helper | Local | Direct extension | Provider HTTP client | failure taxonomy and rate-policy hook | retry/timeout/abort tests |
| R-04 | Capability operation types | Gloomberb | Adapt under MIT | capability manifest | include license notice; reconcile TypeBox/Zod choice | compile-time fixtures and lifecycle tests |
| R-05 | Capability registry lifecycle | Gloomberb | Adapt under MIT | shared invoke/subscribe service | no duplicate core registry; teardown guaranteed | subscription cleanup/leak test |
| R-06 | Lightweight Charts | TradingView | Dependency | Price Panel | attribution/link, resize lifecycle, bar aggregation | visual/perf spike |
| R-07 | uPlot | uPlot | Dependency benchmark | Dense Line Panel | aligned-array adapter | comparative benchmark |
| R-08 | Perspective | FINOS | Optional dependency | Analytics Table Panel | real aggregation workload | worker startup, update latency, memory test |
| R-09 | React Grid Layout | RGL | Dependency | Workspace Shell | layout schema/version migration | resize and persistence test |
| R-10 | smart polling | World Monitor | Independent implementation | fallback scheduler | no AGPL copying; shared visibility hub | fake-timer and visibility tests |
| R-11 | freshness semantics | QuantPilot | Independent implementation | observation envelope/UI | source timestamp availability varies | stale/delayed/disconnected fixtures |
| R-12 | circuit-breaker orchestration | Situation Monitor pattern | Independent implementation | Provider client | define retriable vs terminal failures | state transition tests |

## Interface Sketch

This is a starting contract, not a frozen spec.

```typescript
type ObservationKind = "quote" | "bar" | "article" | "event" | "indicator"

interface ObservationEnvelope<T> {
  id: string
  kind: ObservationKind
  source: string
  sourceTimestamp: number | null
  observedAt: number
  receivedAt: number
  sequence?: string
  revision?: string
  data: T
}

interface SourceAdapter<Q, Raw, T> {
  id: string
  transformQuery(query: Q): ProviderRequest
  extractData(request: ProviderRequest, signal: AbortSignal): Promise<Raw>
  transformData(raw: Raw, context: ObservationContext): T
}

type OperationKind = "read" | "query" | "action" | "stream"
type SideEffect = "none" | "local-write" | "network-write" | "external-trade" | "external-side-effect"

interface CapabilityOperation<I, O> {
  id: string
  kind: OperationKind
  sideEffect: SideEffect
  inputSchema: unknown
  outputSchema: unknown
  invoke?: (input: I, context: CapabilityContext) => Promise<O>
  subscribe?: (
    input: I,
    emit: (event: ObservationEnvelope<O>) => void,
    context: CapabilityContext,
  ) => Promise<() => void> | (() => void)
}

interface PanelContribution {
  id: string
  title: string
  requiredCapabilities: string[]
  defaultLayout: { w: number; h: number }
  suspendWhenHidden: boolean
  component: unknown
}
```

Provider resolution should return metadata, not only data:

```typescript
interface Resolution<T> {
  value: T
  providerId: string
  cache: "memory" | "persistent" | "fresh" | "stale-fallback"
  ageMs: number | null
  selectionReason: "explicit" | "priority" | "fallback"
}
```

Silent fallback between providers can change semantics and entitlement. Record the selected provider and reason in telemetry and, where relevant, the UI.

## Proposed Module Seams

The names below are exploratory and should be reconciled with the existing tree before file creation.

```text
web/lib/
  capabilities/
    types.ts
    registry.ts
    policy.ts
    agent-projection.ts
  observations/
    envelope.ts
    freshness.ts
    sequence.ts
  providers/
    protocol.ts
    registry.ts
    http-client.ts
    rate-policy.ts
  streams/
    hub.ts
    replay-buffer.ts
    sse.ts
    subscription-budget.ts
  cache/
    async-ttl-cache.ts
    persistent-cache.ts
  workspace/
    panel-registry.ts
    command-registry.ts
    layout-schema.ts
  charts/
    bar-aggregator.ts
    frame-buffer.ts
    chart-adapter.ts
```

Avoid placing data-source code under `app/` components. Route handlers should resolve registered capabilities; adapters and lifecycle state live under `lib/`.

## Experiment Queue

### E-01: end-to-end price path

Build one source adapter and one synthetic source with deterministic sequence gaps. Flow:

```text
snapshot → subscription → event envelope → frame buffer → chart adapter
```

Record source timestamp, server receive, enqueue, browser receive and post-paint time. Produce p50/p95/p99 and dropped/reordered counts.

### E-02: chart comparison

Same generated data and UI controls for Lightweight Charts and uPlot:

- 1, 4, 12 and 24 panels;
- 1k, 10k and 100k visible points;
- 10, 100 and 1,000 input events/s;
- current-bar update plus late historical correction;
- resize, crosshair, tooltip and news marker overlay.

Measure main-thread time, frame misses, heap, interaction latency and integration code size. Do not compare repository benchmark claims.

### E-03: transport recovery

Test SSE first for named events and short replay. Inject disconnects, duplicate IDs, out-of-order events and retention-window expiry. Add WebSocket only for workloads requiring dynamic subscription or throughput not met by SSE.

### E-04: Workspace lifecycle

Use React Grid Layout with a Panel Registry. Verify drag/resize does not recreate chart instances or duplicate subscriptions. Compare keep-mounted/pause versus unmount/reload for off-screen panels.

### E-05: provider cache behavior

Extend `AsyncTtlCache` with loader timeout, negative cache and metadata. Test 100 same-key callers, caller abort, loader rejection, stale fallback and process restart with a mock persistent cache.

## Decision Gates

No architectural choice becomes durable solely from this research. Record a Decision note when one of these gates closes:

| Decision | Evidence required |
| --- | --- |
| Default chart renderer | E-02 results on target desktop hardware |
| SSE-only or hybrid transport | E-01/E-03 event rate, reconnect and command-direction results |
| Persistent cache technology | deployment topology, dataset size, multi-process need, retention policy |
| Workspace grid library | E-04 lifecycle behavior and desired docking model |
| Perspective adoption | analytical workload demonstrating value beyond virtualized table |
| First production providers | coverage, latency, cost, display/cache/redistribution rights |

## Handoff Checklist

- Read project-local `.agents/AGENTS.md` before code changes.
- Confirm the inherited repo commit and dirty state; preserve user changes.
- Start with one vertical slice, not the full plugin/data-provider matrix.
- Keep Agent response streaming separate from persistent observation streaming.
- Preserve capability policy and explicit confirmation boundaries.
- Record source, source timestamp, receive timestamp and selected provider.
- Do not call stale data “live”.
- Add license notices when introducing MIT/Apache code or dependencies.
- Do not copy AGPL/GPL/no-license source into a differently licensed product without an explicit licensing decision.
- Update `.agents/spec/README.md` when implementation changes feature status.

## Source Links

- [World Monitor](https://github.com/koala73/worldmonitor)
- [OpenBB provider extension docs](https://docs.openbb.co/odp/python/developer/extension_types/provider)
- [Gloomberb PLUGINS.md](https://github.com/gloom-sh/gloomberb/blob/main/PLUGINS.md)
- [QuantPilot](https://github.com/Ben05-sys/QuantPilot)
- [Situation Monitor](https://github.com/hipcityreg/situation-monitor)
- [FINOS Perspective](https://github.com/finos/perspective)
- [Lightweight Charts](https://github.com/tradingview/lightweight-charts)
- [uPlot](https://github.com/leeoniya/uPlot)
- [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout)
- [Freqtrade](https://github.com/freqtrade/freqtrade)
