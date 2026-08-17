---
title: FinceptTerminal 入门笔记
date: 2026-08-16
tags:
  - fincept-terminal
  - finance
  - toolkit
  - trading
---

## 这是什么

FinceptTerminal 是 Bloomberg 式的桌面金融终端，开源版 AGPL-3.0，仓库在 [github.com/Fincept-Corporation/FinceptTerminal](https://github.com/Fincept-Corporation/FinceptTerminal)，当前 tag v4.4.0。

技术栈按源码（`fincept-qt/CMakeLists.txt`）逐条核对过：C++20、Qt 6.8.3、单个可执行文件 `FinceptTerminal`，无 Electron、无 Node.js 运行时。K 线/权益图表用 Qt WebEngine（内嵌 Chromium）渲染，这是唯一用到 WebEngine 的组件，可选编译；没有 WebEngine 时该组件退化为 QLabel 占位，屏幕层回退 Qt-Charts。

Python 3.11.9 **不是**编译进二进制的内嵌解释器：它由 uv 在首次运行时下载，建两套 venv（`venv-numpy1` 装旧依赖，`venv-numpy2` 是默认环境、yfinance 在里面），经 `PythonRunner` 用 QProcess 子进程 + JSON 协议调用。README 自己写「embedded Python」，实际是随包捆绑、子进程调用。

## 架构与模块化

官方 [ARCHITECTURE.md](https://github.com/Fincept-Corporation/FinceptTerminal/blob/v4.4.0/docs/ARCHITECTURE.md) 把它定义成 **modular monolith**（模块化单体）：一个可执行 target，内部按 14 个顶层目录划分，依赖方向单向，禁止反向。分层是：

`Presentation（screens/ui）→ Application（services）→ Data plane（datahub）→ Adapters（trading/mcp/python/network）→ Infrastructure（core/storage）→ Platform（Qt6）`

<iframe src="/toolkit/attachments/fincept_terminal_architecture.html" width="100%" height="620" scrolling="no" style="border: 1px solid var(--lightgray); border-radius: 8px; display: block;"></iframe>

`src/` 下 14 个顶层目录，职责如下（`config/` 是纯头文件目录，不含 .cpp）：

| 目录 | 职责 |
|---|---|
| `app` | 入口、`WindowFrame`、`DockScreenRouter`（屏幕注册表） |
| `core`（24 子目录） | 跨窗口基础设施：事件总线、日志、session、layout、window/panel、actions、keys、identity、telemetry |
| `ui` | 主题、widgets、charts（含 WebEngine K 线）、tables、markdown、navigation、command |
| `screens` | 52 个可导航屏幕，懒加载 |
| `services`（43 子目录） | 领域服务：行情、新闻、经济、AI、交易支撑 |
| `trading` | `IBroker` 抽象 + 22 家券商 + paper/live 引擎 + Hyperliquid |
| `storage` | SQLite 双库（`fincept.db` 51 个迁移 + `cache.db`）、SecureStorage（AES-256-GCM）、32 个 repository |
| `network` | `HttpClient`、`WebSocketClient`、cloud 同步客户端 |
| `datahub` | 进程内 pub/sub 数据层 |
| `mcp` | 36 组 MCP 工具注册与调度 |
| `python` | `PythonRunner` 子进程桥 + uv venv 管理 |
| `auth` | AuthManager、JWT、锁屏 |
| `algo_engine` | C++ 原生 F&O 算法引擎（`fno` 子命名空间） |
| `config` | 纯头文件目录，连接器 key 清单（`KeyedConnectorCredentials.inc`） |

三个机制：

**屏幕框架**。没有统一的 Screen 基类，屏幕就是普通 QWidget，需要持久化时挂 `IStatefulScreen` mixin。注册表是 `DockScreenRouter`，`WindowFrame_Setup.cpp` 里 52 个 `register_factory` 注册懒加载工厂，首次 `navigate(id)` 才实例化（ARCHITECTURE.md 仍写 54，已过期）。

**数据层**。`DataHub` 是进程内 pub/sub，topic 格式 `domain:subdomain:id`。服务实现 `Producer` 接口，UI 订阅 topic，one-fetch/many-subscribers：一次抓取，多个订阅者分用，带 TTL 缓存。

**服务定位器**。40 多个单例靠 `::instance()` 访问，`core/services/Services` 是迁移中的显式门面（`auth/events/db/secure_storage/hub` 五个入口），不是真正的 DI。

## 交易与实盘边界

22 家券商（17 家印度 NSE/BSE + 美股 alpaca/ibkr/tradier + 欧洲 Saxo + MT4 桥接），另有 Hyperliquid 一个 crypto DEX。paper/live 按账户 `trading_mode` 在 `UnifiedTrading` 分流。

一条要修正的常见说法：**「实盘下单只在 Enterprise、开源版没有」不成立**。实盘下单代码在开源树里完整存在（`LiveTradingTools` 暴露 15 个 live 工具，`UnifiedTrading::place_live_order` 直连 `IBroker::place_order`），没有任何 Enterprise/订阅/tier 门禁。「live broker routing 是 Enterprise」只出现在 AboutScreen 与 EnterprisePromo 的营销文案里。

真正的门禁是三层，跟付费无关：账户默认 `paper` 模式；MCP 破坏性工具默认关闭（`mcp/allow_destructive_tools`）；显式确认弹窗尚未落地——`AgentService` 对 Verified 及以上授权级别的调用当前一律拒绝。所以源码层面「能实盘」，产品层面默认不让你碰实盘，二者不是一回事。

## 数据源与免费边界

连接器清单在 `DataConnectorManifest.inc`：190 个连接器（127 需 key / 63 免 key），但清单自己标注「无真实调用点」，只是目录，不等于已接线的数据源。README 说的 100+ connectors 是营销口径。

免 key 就能用的公共源：DBnomics、AkShare、yfinance、World Bank、IMF DataMapper、多个政府门户。FRED 免费但要自己注册免费 key。Polygon、Databento 这类要付费 key。

QuantLib 的 18 个模块成立，但 `QuantLibClient` 实际是**远程 REST 客户端**，把请求发到 `api.fincept.in/quantlib/`，不是本地链接 QuantLib C++ 库（模块：Core、Pricing、Curves、Volatility、Models、Stochastic、Risk、Portfolio、Instruments、Solver、Economics、Regulatory、Scheduling、Numerical、Physics、Statistics、ML、Analysis）。本地分析（DCF、VaR、组合优化、衍生品定价）走 Python 脚本。

AI 侧：37 个 agent = EconomicAgents(6) + GeopoliticsAgents(20) + TraderInvestorsAgent(11) 三族 persona agent（README 口径），另有 finagent_core 16 个 config 与 hedgeFund 团队。全部要自带 LLM key（OpenAI / Anthropic / Gemini / DeepSeek / OpenRouter / Ollama），免费版不含 AI 额度。

## 打包与安装

- macOS：只发 arm64 的 dmg（release workflow 明确 arm64-only，`lipo -thin arm64`），没有 Intel 版。
- Windows：x64 的 .exe（QtIFW 安装器）。
- Linux：`.run`（本质是 linuxdeploy 产出的 AppImage，直接以 .run 命名输出）、.deb、.rpm，另有 Flatpak 配置。仓库有多架构 Dockerfile，但没有官方发布的镜像。
- PyPI 上的 `fincept-terminal` 是旧的 2.0.8，别装。
