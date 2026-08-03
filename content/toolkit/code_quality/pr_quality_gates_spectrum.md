---
title: PR Quality Gates：从 fmt 到 AI review 的分级体系
date: 2026-07-31
tags:
  - pr-review
  - ci-cd
  - code-quality
  - devops
---

## 一个逃过了所有检查的 Bug

去年我在 opencode 项目里合了一个 PR，CI 全绿——lint 过、类型检查过、单元测试过。三周后用户报了 bug：某个 CLI 参数在 Windows 上静默失效，文件操作全部落到错误目录。

回看 diff，问题出在一行 `path.join(base, ...args)`。测试跑在 Linux runner 上，`base` 恰好是 POSIX 路径，一切正常。Windows 上 `base` 来自 `process.cwd()`，盘符前缀 `C:\` 被 `join` 吞掉了。没有测试覆盖 Windows 路径、`eslint` 不关心 `path.join` 的跨平台语义、TypeScript 看到的类型签名完全合法。四个 CI check 全部通过，一个生产 bug 准时抵达。

"CI 通过"和"代码正确"之间有一条沟。这条沟不是某个工具的缺陷——它是必然的。静态分析只能抓它被设计来抓的问题，测试只能抓你写了的测试用例，类型系统只能抓 schema 层的不一致。沟的另一边，是真实世界的文件系统分隔符、环境变量缺失、依赖版本漂移、业务逻辑里的隐式假设。

所以质量门禁不该是一个 boolean："CI 是否绿灯"。它是一个光谱：不同层级的问题需要不同层级的工具来拦截。每一层都只保护它负责的那一层。

## 30 分钟：你的第一个 Gate

先动手。这个 section 是 pair programming，你照着敲就行。

**目标**：一个最小质量门禁。PR 打开时，GitHub Actions 自动跑 `prettier --check`，格式不对就红叉。

### Step 1：创建测试仓库

```bash
mkdir pr-gate-lab && cd pr-gate-lab
git init
npm init -y
```

随便写点不规范的代码：

```bash
mkdir src
cat > src/main.ts << 'EOF'
function greet(name:string){
  const msg = "Hello, " + name + "!"
    console.log(msg)
  return  msg
}
EOF
```

故意不装 prettier、不写 `.prettierrc`。

### Step 2：写 workflow 文件

```bash
mkdir -p .github/workflows
```

创建 `.github/workflows/pr-gate.yml`：

```yaml
name: PR Quality Gate

on:
  pull_request:
    branches: [main]

jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx prettier --check .
```

### Step 3：Push，开 PR，观察红叉

```bash
git add -A && git commit -m "feat: add greet function"
git checkout -b feat/greet
```

推到 GitHub，开 PR 指向 `main`。Action 跑完，你会看到：

```text
[warn] src/main.ts
[warn] Code style issues found in the above file. Run Prettier to fix.
```

Job 红叉，你不应该合这个 PR。这就是 L0 gate 在干活。

### Step 4：修格式，观察绿勾

```bash
npx prettier --write src/main.ts
git add -A && git commit -m "style: format with prettier"
git push
```

两分钟后 Action 重跑，绿勾。你现在有一个工作的 L0 gate 了。

```text
Checking formatting...
All matched files use Prettier code style!
```

这四步就是核心循环：**定义规则 → 自动检查 → 不合格就拦截 → 修正后再检查**。L0 到 L4，每一层都是这个循环。

## 门禁设计三原则 + L0→L4 光谱

你刚搭的那个 gate 能干活，但你要知道它是整个光谱上最低的一层。设计一套门禁的时候，先记住三个原则。

### 原则一：Fail fast, fail cheap

Deterministic 的检查必须跑在 probabilistic 的检查前面。Prettier、eslint、clippy 是零误报、秒级完成——它们应该在 10 秒内给你反馈。如果一支测试需要 3 分钟、LLM review 需要 30 秒 API 调用加 20 秒推理，就别让它们排在前头。一个格式错误应该在 type check 之前暴露，一个 type error 应该在测试之前暴露。

这不是 performance optimization，是 developer experience。你不想等 8 分钟的 CI 只为了看 prettier 报错。

### 原则二：每层必须抓住下层抓不到的问题

L1 的 eslint 不应该重复 L0 的 format 规则——那是 `prettier` 的活，你甚至应该用 `eslint-config-prettier` 把冲突规则关掉。L2 的 Semgrep 不应该检查你用 `eslint` 已经拦截的 trivial 问题。每一层的价值在于它唯一的覆盖范围。层间冗余不是安全，是噪音和 CI 时间浪费。

### 原则三：渐进式采用

没有人需要 Level 4。一个两人项目的 CLI 工具，L0+L1+L2 就够了。你拿到 SOC 2 合规要求时再加 L3 coverage 门槛。团队学会写 good tests 之后再引入 L4 的 LLM review。门禁应该随着项目的风险暴露面增长，而不是在第一天就上一套全光谱。

### L0→L4 光谱

| Level | What | Tool examples | Nature |
|-------|------|--------------|--------|
| L0   | Format | prettier, cargo fmt, black | deterministic, should block |
| L1   | Code smells | eslint, clippy, ruff | deterministic, should block |
| L2   | Rule-based security & dependencies | Semgrep, `cargo audit`, CodeQL, `npm audit` | deterministic, should block |
| L3   | Tests pass + coverage direction | `cargo test`, vitest, coverage diff | deterministic, should block |
| L4   | Semantic / logic / design | LLM agent, human review | probabilistic, advisory |

L0→L3 都是 deterministic：它们不应该有假阳性。遇到 false positive，修规则，不要关检查。L4 天然有假阳性和漏报——你不能靠 ChatGPT 决定合不合 PR，但它能抓住 L0→L3 全绿下的逻辑断层：比如一个 refactor 改变了函数副作用顺序、一段代码读到了正确字段但字段来源的隐式假设在另一个 PR 里被打破了。

你刚才 30 分钟搭的那个 gate，跑的是 L0。接下来每一层往上加。

## 4. L0+L1 — fmt + lint：零争议的世界

这两层是最容易落地的质量门。因为它们没有灰色地带——formatter 不会跟你争论，linter 有显式规则，过就是过，不过就是不过。

### L0 — Format

Formatter 管的事情很窄，但每件都无争议：

- 缩进是 tab 还是 space、几个 space。
- 行宽有没有超过 80/100/120。
- 引号风格（`'` vs `"`）。
- 末尾逗号、分号、换行符。
- import 排序。

它不关心你的代码逻辑对不对。它只关心你的代码 *看上去* 是不是同一个团队写的。

L0 应该永远是 blocking 的。不存在"这次格式有点问题，但逻辑是对的，先合了吧"——formatter 不会引入 bug，它有问题的代码在你本地 `fmt --check` 就已经拦住了。合并未格式化的代码只有一个后果：下次有人改了同一行，diff 里混进了格式变更和逻辑变更，reviewer 得费劲分辨。

这跟你用 prettier 还是 cargo fmt 还是 gofmt 无关。工具可以换，规则必须是 blocking。

```yaml
# .github/workflows/ci.yml — format job
format:
  name: Format
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'
    - run: npm ci
    - run: npx prettier --check .
```

```yaml
# Rust 版本
format:
  name: cargo fmt --check
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
      with:
        components: rustfmt
    - run: cargo fmt --all -- --check
```

几个实践细节：

- `prettier --check` 只检查不修改，CI 里应该用这个而不是 `--write`。
- `cargo fmt --check` 同理。如果 CI 里跑了 `cargo fmt` 并 commit 回去，等于绕过了 review。
- 不要在 format job 里放别的逻辑。它应该只做一件事，失败时你一眼就知道是格式问题。

### L1 — Lint

Linter 比 formatter 多想一层。它不问"代码长什么样"，它问"代码有没有可疑的写法"：

- 未使用的变量、import、参数。
- 潜在的错误模式（`==` vs `===`，未处理的 Promise）。
- 复杂度阈值（圈复杂度 > N、函数长度 > M 行）。
- 禁用特定 API（`console.log` 在生产代码里、`any` 类型标注）。
- 框架最佳实践（React Hooks 规则、Vue component 命名）。

```yaml
# ESLint — TypeScript 项目
lint:
  name: ESLint
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'
    - run: npm ci
    - run: npx eslint .
```

```yaml
# Clippy — Rust 项目（openCode、cc-switch 都在用）
clippy:
  name: cargo clippy
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
      with:
        components: clippy
    - uses: actions/cache@v4
      with:
        path: |
          ~/.cargo/registry
          ~/.cargo/git
          target
        key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
    - run: cargo clippy --all-targets --all-features -- -D warnings
```

`-D warnings` 是关键。默认 clippy 的 warning 不会让 CI 失败，把它升级成 deny 才能做真正的 blocking gate。

---

L0 和 L1 的核心价值不是它们查出来的问题有多严重——单个格式违规、一个 unused import，它不致命。真正的价值在于 **它把 reviewer 的注意力从机器能解决的问题上解放出来**。

**Anti-pattern**：CI 是绿的，但 review 里有人反复留 formatting nit。"这里少个空格""这个 import 应该放前面"。每一次这样的 comment 都在消耗 reviewer 的耐心和信任。Reviewer 的精力应该花在设计的正确性、边界条件、错误处理上——这些事机器做不了。

如果你现在的项目没有 L0 和 L1，从这里开始。它们加起来跑不到 30 秒，没有任何技术债务需要还。`prettier --check . && eslint .` 或 `cargo fmt --check && cargo clippy -- -D warnings`，两条命令的事情。

---

## 5. L2 — 规则驱动的安全与依赖检查

L2 是四层里最被低估的一层。在 lint 和 test 之间，有一大片可以被确定性地、自动化地、不需要写测试就能检查的空间。

### 依赖安全（SCA — Software Composition Analysis）

一个 CVE 不一定要在攻击路径上才值得修。关键是：**它今天不在攻击路径上，不代表半年后也不在**。

```yaml
# cargo audit — Rust 项目
audit:
  name: cargo audit
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: rustsec/audit-check@v2.0.0
      with:
        token: ${{ secrets.GITHUB_TOKEN }}
```

```yaml
# npm audit — TypeScript 项目（生产中建议只关注高危）
audit:
  name: npm audit (high + critical)
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'
    - run: npm ci
    - run: npm audit --audit-level=high
```

几个实际选择：

- `npm audit` 太吵了——关注 `high` 和 `critical` 就够了。`moderate` 级别的报告会变成背景噪音。
- Dependabot / Renovate 的自動 PR 只是一半答案。如果沒有人 review 和 merge 这些 PR，CVE 依然留在依赖树里。正确的做法是把 audit check 放进 CI，让含已知 CVE 的 PR 无法合并。
- `cargo audit` 用的是 RustSec Advisory Database，覆盖面不如 npm，但对于 Rust 项目的关键依赖（`tokio`、`hyper`、`openssl`）足够了。

### 自定义安全规则（SAST — Static Application Security Testing）

通用 SAST 工具（CodeQL、SonarQube）覆盖面广但噪音大。更有价值的做法是针对你代码库的具体模式写规则。

一个真实例子：React 项目里 `innerHTML` 几乎总是 XSS 入口。你可以写一条 Semgrep 规则来拦截：

```yaml
# .semgrep/no-innerhtml.yml
rules:
  - id: no-dangerous-innerhtml
    severity: ERROR
    message: "Use textContent or React's JSX interpolation instead of innerHTML to prevent XSS."
    languages:
      - typescript
      - javascript
    patterns:
      - pattern-either:
          - pattern: $X.innerHTML = $Y
          - pattern: $X.outerHTML = $Y
    metadata:
      category: security
      cwe: "CWE-79"
```

```yaml
# CI 里跑 Semgrep
semgrep:
  name: Semgrep
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: pip install semgrep
    - run: semgrep ci --config .semgrep/
```

Semgrep 的语法类似代码本身——不需要学一套新的 AST 描述语言。花 10 分钟写一条规则，永久拦截一种你团队不会用的 pattern，比每次在 review 里提醒"不要用 innerHTML"高效得多。

其他推荐写 Semgrep 规则的场景：

- 禁止 `unwrap()` / `expect()` 在生产代码里（openCode 的真实痛点——一个 `unwrap()` 能把整个 TUI panic 掉）。
- 禁止直接访问 `process.env` 而非通过配置模块。
- 强制异步函数命名以 `async` 结尾。
- 检查 SQL 查询是否使用了参数化。

### 破坏性变更检测

这对 Rust/Go/TypeScript package 作者尤其重要。一个看似无害的改动——比如给一个 public struct 加了个 `required` field——对下游就是编译错误。

```yaml
# cargo semver-checks — Rust 项目
semver:
  name: cargo semver-checks
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
    - uses: obi1kenobi/cargo-semver-checks-action@v2
```

`cargo semver-checks` 会对比当前分支和 base 分支的 API 签名，自动检测是否引入了 breaking change。效果类似 TypeScript 的 API Extractor diff，但语义更精确——它知道 Rust 的 trait impl、type alias、feature gate 等概念。

### 许可证合规

OSS 项目如果用了 GPL/AGPL 依赖，可能影响下游的商用闭源场景。`cargo-deny` 或 FOSSA 可以在 CI 里自动检查许可证白名单：

```yaml
license-check:
  name: License Check
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: EmbarkStudios/cargo-deny-action@v2
      with:
        command: check licenses
```

---

**Anti-pattern**："先记个 ticket，我们下个 sprint 修这个漏洞。" 三个月后，那个有 CVE 的包被五个中间依赖间接引用，已经拆不出来。你本来只需要 `cargo update` 或 `npm update` 就能解决的问题，现在变成了一个架构迁移任务。

L2 层的逻辑不是"每个安全问题都必须立刻修"，而是 **"不要让已知问题悄无声息地进入 main 分支"**。一个 audit 失败了但被手动 override——这是一个有意识的 trade-off，留下了记录。一个 audit 根本没跑——你只是不知道有问题。

---

## 6. L3 — 测试策略：不是覆盖率数字

### "测试通过"只是门槛

"CI 绿了"不等于"代码没问题"。它只说明你写的测试通过了——问题在于你写了什么测试、没写什么测试。

- 一个 PR 改了核心支付逻辑，但只加了一个 `it("renders without crashing")` 测试。
- 一个 PR 改了错误处理路径，但所有测试都走 happy path。
- 一个 PR 加了一个新 API endpoint，但测试只验证了 200 返回，没测 400/401/500。

这些情况"测试通过"都是绿色的，但代码质量可能比没测试更差——因为它给了虚假的安全感。

### 覆盖率作为方向，不是目标

"我们要到 80% 覆盖率"是一个虚荣指标。正确的指标是：

> **覆盖率不得在改动文件上降低。**

这意味着加代码必须加测试。删除代码可以降低覆盖率。这个规则不追求某个绝对值，但它确保代码库在每次合并后都**不比之前更差**。

```yaml
# vitest — 生成覆盖率报告，CI 里可以配合 coverage comment bot
test:
  name: vitest + coverage
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'
    - run: npm ci
    - run: npx vitest --coverage
    - uses: davelosert/vitest-coverage-report-action@v2
      with:
        json-summary-path: coverage/coverage-summary.json
```

```yaml
# cargo tarpaulin — Rust 项目
coverage:
  name: Coverage
  needs: [test]
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: dtolnay/rust-toolchain@stable
    - run: cargo install cargo-tarpaulin
    - run: cargo tarpaulin --out xml
    - uses: codecov/codecov-action@v5
      with:
        token: ${{ secrets.CODECOV_TOKEN }}
```

Coverage comment bot 的价值不是数字本身——是它告诉你**这次 PR 改动的具体行哪些被覆盖了，哪些没有**。Reviewer 可以直接点进 report 看未覆盖行，判断"这块逻辑没测到，但看起来不危险"还是"这块逻辑没测到，绝对不能合"。

### 好测试长什么样

- **特定的**：一个测试验证一个行为。`it("returns 401 when token is expired")`，不是 `it("handles auth")`。
- **确定性的**：同样的输入，永远同样的结果。不依赖网络、时间、文件系统顺序、随机数（除非 mock 或 seeded）。
- **行为测试，非实现测试**：测试 public API 的输入和输出，不测试 internal helper 是怎么实现的。当你重构内部实现时，行为测试不应该改。

```typescript
// 好：测试行为
it("applies discount when cart total exceeds 100", () => {
  const cart = new Cart([{ price: 60 }, { price: 50 }])
  expect(cart.finalTotal()).toBe(99) // 10% off
})

// 坏：测试实现
it("calls applyDiscount with 0.9 when total > 100", () => {
  const spy = vi.spyOn(cart, "applyDiscount")
  cart.calculate([{ price: 60 }, { price: 50 }])
  expect(spy).toHaveBeenCalledWith(0.9)
})
```

### 坏测试长什么样

- **Flaky**：5 次跑 1 次失败，跑还是失败取决于 CI runner 的 CPU 频率、网络延迟、async 调度的顺序。Flaky tests 的破坏力比没有测试更大——它们教团队忽略 CI 红色。
- **过度指定**：mock 了内部调用的第三个参数、验证了中间状态的具体值、依赖了某个 helper 的命名和参数顺序。
- **测试框架而非被测代码**：`expect(mockFn).toHaveBeenCalled()` 没有验证调用结果是否正确。

### 什么时候 mock

在外部边界 mock——HTTP、数据库、支付、文件系统、第三方 SDK。在这些地方的内部，不要 mock。

```typescript
// mock 外部边界
vi.mock("@/lib/payment", () => ({
  charge: vi.fn().mockResolvedValue({ id: "ch_123", status: "succeeded" }),
}))

// 不要 mock 被测的东西
const order = new Order(items) // 真实的 Order 实例，不是 mock
```

---

**Anti-pattern**："覆盖率 85%，没问题。" 打开 coverage report 一看，85% 覆盖的是 utils 里的 `formatDate()` 和 `capitalize()`，而核心的 `calculateTax()` 只有 happy path 测试，edge case 全是空白。覆盖率的数字是绿色的，但最危险的代码没有任何保护。

Reviewer 看 PR 时的问题不是"测试覆盖率够不够"，是"这次改动最容易出错的地方，有没有测试守住"。覆盖率数字告诉你跑到了哪些行，不告诉你测试写得够不够狠。

---

## 7. L4 — LLM Review：当 L0–L3 不够用时

L0 管格式，L1 管可疑写法，L2 管已知漏洞和破坏性变更，L3 管行为正确性。这四层覆盖了绝大多数"可以写成确定性规则"的问题。剩下的——逻辑漏洞、错误处理缺失、设计与实现不一致、微妙的 anti-pattern——这些没有现成的 lint rule 可以写。L4 是对这一层的补充。

### LLM 擅长什么

- "这个 `unwrap()` 在生产路径上，应该改成 `?` 或显式错误处理。"（L1 的 clippy 可能不会报，因为它不是每个 unwrap 都有问题。）
- "docstring 说返回 `Result<T, E>`，但实现里三种错误路径都 return 了 `None`。"
- "这个函数做了太多事：解析输入、调 API、格式化输出、写日志。拆成三个函数会更可读。"
- "PR 描述说修复了 race condition，但改动里没有任何 lock/tokio::sync 相关的变更——可能修的地方不对。"

### LLM 不擅长什么

- 新颖的架构决策——如果代码库之前的 pattern 不存在于训练数据里，LLM 的判断会偏保守，建议你回到"常见做法"。
- 深度领域逻辑——科学计算、金融模型的正确性，LLM 无法从 diff 里判断。
- 性能微优化——LLM 可以说"这里可以预分配 vector 容量"，但无法 benchmark。

### 基本架构

```
PR webhook → git diff → chunk (每个文件一片) → LLM → structured JSON → PR comment
```

你可以用 CodeRabbit（成品），也可以自己搭。自己搭的核心是一个 workflow + 一个系统 prompt。

```yaml
# .github/workflows/llm-review.yml
name: LLM Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Get diff
        run: git diff origin/${{ github.base_ref }}...HEAD > diff.txt
      - name: LLM Review
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require("fs")
            const diff = fs.readFileSync("diff.txt", "utf8")

            const response = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": "${{ secrets.CLAUDE_API_KEY }}",
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 2048,
                system: `You are a senior engineer reviewing a PR. Only flag correctness bugs, missing error handling, logic flaws, and security issues. Do not comment on formatting, naming, or code style. Return JSON: { "comments": [{ "file": "...", "line": 1, "severity": "high|medium|low", "message": "..." }] }. If you find nothing, return empty comments array.`,
                messages: [{ role: "user", content: `Review this PR diff:\n\n${diff}` }],
              }),
            })

            const data = await response.json()
            const review = JSON.parse(data.content[0].text)

            if (review.comments.length > 0) {
              for (const comment of review.comments) {
                await github.rest.pulls.createReviewComment({
                  owner: context.repo.owner,
                  repo: context.repo.repo,
                  pull_number: context.payload.pull_request.number,
                  body: `**${comment.severity}** — ${comment.file}:${comment.line}\n\n${comment.message}`,
                  commit_id: context.payload.pull_request.head.sha,
                  path: comment.file,
                  line: comment.line,
                })
              }
            }
```

### 系统 Prompt 结构

好的 prompt 控制四个维度：

1. **角色**：你是一个 senior engineer，review Rust/TypeScript PR。只关注实质性缺陷，不讨论风格偏好。
2. **审查维度**：正确性、错误处理、安全性、可读性、与代码库一致性。每个维度 1-2 句话说明关注什么。
3. **输出格式**：严格的 JSON。`{ "comments": [{ "file": "...", "line": N, "severity": "high|medium|low", "message": "..." }], "summary": "..." }`。不要输出 markdown，不要输出自然语言摘要以外的内容。
4. **约束**：不要 comment 格式问题（L0 已经管了）。不要 comment 未使用的变量（L1 已经管了）。不要建议加新功能——只 review 本次改动。如果 diff 没发现任何问题，返回空的 comments 数组。

### 成本

- 单 agent（Sonnet/4o，~20k token 输入）：$0.02-0.03 / PR。
- 多 agent（两个模型互审，或用不同维度拆给不同 agent）：$0.08-0.12 / PR。
- 如果你有 50 个 PR / 月，月度成本不超过 $5-6。这个数字低于大多数 CI runner 的月账单。

### 关键设计决策：advisory，不是 blocking

L4 应该**只发评论，不拒绝合并**。原因：

- LLM 有幻觉——它可能指出的"问题"是它理解错了 context。
- L4 的价值是提醒，不是裁决。如果 L4 是 blocking 的，每次误报都会导致团队绕过它（关掉 check、无视 review）——结果比 advisory 更差。
- 把决策权留给作者和 reviewer。如果 reviewer 看了 L4 comment 觉得有道理，在 review 里引用即可。

---

**Anti-pattern**："AI review 太吵了，所有人都不看。" 如果你的 prompt 是"review this PR for any issues"而不加任何粒度约束，LLM 会在每一个可能的点上发表意见——缩进多了一个空格、变量名可以更长、注释可以更详细 —— 然后每条 comment 都是 noise。正确的 prompt 是"review this PR for correctness bugs, missing error handling, and logic flaws. Do not comment on formatting, naming preferences, or code style." 宁可漏一个 minor issue，也不要让 reviewer 养成"看到 bot comment 就跳过"的习惯。

### CodeRabbit vs 自己搭

- **CodeRabbit**：成品，开箱即用，支持 incremental review（只看增量变更）、支持多模型、有 web dashboard。免费 tier 够个人项目用。代价是 prompt 不可控，有时候偏向 verbose。
- **自己搭**：完全控制 prompt、JSON schema、输出语气。可以针对代码库定制（例如"这是一个 Rust TUI 项目，注意 `terminal` crate 的 lifecycle"）。代价是需要维护 workflow 和 prompt 迭代。

openCode 项目自己搭的是后者——因为它的代码库风格特殊（TUI + async + streaming），通用的 review prompt 会产生大量误报。如果你的代码库是标准的 web service 结构，CodeRabbit 可能更省时间。

## 8. CI Pipeline 如何承载这一切

前面几节定义了每一层 gate（L0 到 L4），现在该把这些 gate 穿成一条实际能跑的 pipeline。

### 核心设计：快 gate 先跑

Pipeline 的 shape 本身就是设计哲学的表达。如果 L2（security audit）跑在 L1（lint）前面，你就是在用慢反馈惩罚开发者。

正确的顺序：

```
format (5s) → lint (15s) → typecheck (30s) → audit (60s) → test matrix (3-5min) → LLM review (async, non-blocking)
```

format 最快——缩进错了、尾空格多了，5 秒内告诉你，不用等 5 分钟才发现。lint 也很便宜，15 秒跑完 clippy/eslint。typecheck 稍贵但比 test 便宜太多——类型不通过，跑测试就是浪费。

LLM review 放在最后且 non-blocking：它不应该阻止 merge。它是 advisory gate，给你建议，不是给你障碍。

### 生产级 ci.yml（Rust 项目）

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  merge_group:
    types: [checks_requested]

env:
  CARGO_TERM_COLOR: always
  RUST_BACKTRACE: 1

jobs:
  # ── L0: 路径过滤（决定哪些 job 需要跑） ──
  changes:
    runs-on: ubuntu-latest
    outputs:
      src: ${{ steps.filter.outputs.src }}
      docs: ${{ steps.filter.outputs.docs }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            src:
              - 'src/**'
              - 'Cargo.toml'
              - 'Cargo.lock'
              - '.github/workflows/**'
            docs:
              - 'docs/**'
              - '**.md'

  # ── L1: Format (最快，5s) ──
  format:
    name: cargo fmt --check
    needs: changes
    if: needs.changes.outputs.src == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt
      - run: cargo fmt --all -- --check

  # ── L1: Lint (15s) ──
  clippy:
    name: cargo clippy
    needs: changes
    if: needs.changes.outputs.src == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy
      - uses: Swatinem/rust-cache@v2
      - run: cargo clippy --all-targets --all-features -- -D warnings

  # ── L1: 类型检查 (30s，Rust 项目里 clippy 已覆盖，这里独立跑 doc tests 的检查) ──
  check:
    name: cargo check
    needs: changes
    if: needs.changes.outputs.src == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - run: cargo check --all-targets --all-features

  # ── L2: Security audit (60s，依赖已知漏洞) ──
  audit:
    name: cargo audit
    needs: changes
    if: needs.changes.outputs.src == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rustsec/audit-check@v2.0.0
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

  # ── L3: Test matrix (最贵，3-5min，等便宜检查全过再跑) ──
  test:
    name: test (${{ matrix.os }}, ${{ matrix.rust }})
    needs: [format, clippy, check, audit, changes]
    if: needs.changes.outputs.src == 'true'
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        rust: [stable]
      fail-fast: false
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@master
        with:
          toolchain: ${{ matrix.rust }}
      - uses: Swatinem/rust-cache@v2
      - run: cargo test --all-features

  # ── L4: LLM review (non-blocking, async) ──
  llm-review:
    name: LLM review
    needs: changes
    if: |
      needs.changes.outputs.src == 'true' &&
      github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          command: |
            Review this PR diff. Focus on:
            1. Logic errors and edge cases
            2. Missing error handling
            3. Test coverage gaps
            Output findings as a concise PR review comment.
            Do not comment on formatting or style — the linter handles that.
```

### 路径过滤：docs-only PR 不触发 test matrix

```yaml
# 在 changes job 里
filters: |
  src:
    - 'src/**'
    - 'Cargo.toml'
    - 'Cargo.lock'
    - '.github/workflows/**'
  docs:
    - 'docs/**'
    - '**.md'
```

后续每个 job 加 `if: needs.changes.outputs.src == 'true'`。纯文档 PR（改 README、写 design doc）只触发 llm-review，跳过 format/lint/test/audit。省下的不仅是 runner 时间，更是 CI 列的噪音——你不会在等 CI 的时候看到一排和修改无关的 job。

### Merge queue：防止 "green on branch, broken on main"

场景：3 个 PR 同时通过 CI，排队 merge。但如果 PR #42 和 #43 各改了同一个模块的不同部分，单独测都绿，合在一起可能冲突。

**Merge queue 做的事**：把 PR 排进队列，串行 merge 到 main 的快照上，跑 CI。如果 #42 过了，把它合进 main；然后 #43 是合在 "main + #42" 之上再跑一次 CI。如果这次 #43 红了，它被自动踢出队列，不污染 main。

配置很简单——workflow 里加 `merge_group` 触发器：

```yaml
on:
  merge_group:
    types: [checks_requested]
```

然后在 repo Settings → Branches → 勾选 "Require merge queue"，选 "Build instantly" 或 "Only build when required"。

Merge queue 把 "CI 通过" 从 "分支上通过" 升级到 "合并后通过"。这是一个质的区别——前者保证的是 PR 自己的代码能编译，后者保证的是整个 main 能编译。

### 时间预算

一个合理配置的 CI pipeline 应该：

| Gate | 耗时 | 累积 |
|------|------|------|
| format | ~5s | 5s |
| clippy | ~15s | 15s |
| check | ~30s | 30s |
| audit | ~60s | 60s |
| test matrix | ~3min | ~4min |
| LLM review | async | - |

**关键阈值：5 分钟**。如果 CI 跑一次要 20 分钟，开发者会找绕过它的办法——admin override、`[skip ci]`、降低检查严格度。5 分钟以内，等一等是可以接受的。超过 10 分钟，你就不是在保护质量，你是在培养开发者对 CI 不认真的习惯。

---

## 9. 实施路线图

一个目前零 gate 的团队，按周推进，5 周建完完整的 PR quality gate 体系。

### Week 1: L0 + L1 — 格式和 lint

**做什么**：
- 添加 `.github/workflows/ci.yml`，只跑 `cargo fmt --check` 和 `cargo clippy -- -D warnings`（Rust）或 `prettier --check` + `eslint`（TS）。
- 建 `.github/PULL_REQUEST_TEMPLATE.md`，至少包含 Description、Type of Change、Checklist 三个 section。
- 在 repo Settings 加 branch protection：require PR before merging，勾选 format 和 lint 两个 status check。

**为什么从这里开始**：缩进、命名、未用变量——review 里最常见的 nit，机器能一秒扫完。把 reviewer 的注意力还给逻辑和设计。

**修改的文件**：
```
.github/workflows/ci.yml           # 新建
.github/PULL_REQUEST_TEMPLATE.md    # 新建
```

**预估时间**：2 小时（包括等第一次 CI run 和修 broken windows——现有的格式问题）。

---

### Week 2: L2 — 安全审计 + 一条自定义规则

**做什么**：
- 加 `cargo audit`（Rust）或 `npm audit --audit-level=high`（TS）到 CI。
- 加一条 Semgrep 自定义规则，抓你们项目最常见的 bug pattern。不是随便一条——是你过去三个月 code review 里反复出现的那个问题。cc-switch 里是 "在 ISR handler 里用 `println!`"，我们写了一条 Semgrep rule 禁止它。

```yaml
# .semgrep/rule.yml
rules:
  - id: no-println-in-interrupt
    pattern: println!($...ARGS)
    paths:
      include:
        - "src/interrupt/**"
    message: "Use defmt or log crate in ISR context — println blocks"
    severity: ERROR
```

**修改的文件**：
```
.github/workflows/ci.yml           # 加 audit job
.semgrep/rule.yml                   # 新建，一条规则
```

**预估时间**：3 小时。audit 本身 10 分钟加好。Semgrep rule 的编写和测试是主要耗时——你需要在本地用真实 bug 代码验证规则能命中。

---

### Week 3: L3 baseline — 测试 + 覆盖率方向

**做什么**：
- 确保所有已有测试在 CI 里跑（test matrix）。
- 加覆盖率方向检查：coverage 不能下降。用 `cargo-tarpaulin` + `codecov/codecov-action`，或 vitest 内置 coverage + Codecov。设置 `threshold: 0%`——不允许降，但不设目标数字。

**不要做**：追逐 80% 覆盖率。覆盖率是方向指标，不是目标。一个项目 coverage 从 45% 降到 43%，值得问为什么。从 45% 升到 46% 因为加了一堆 assert true，不值得庆祝。

```diff
# .github/workflows/ci.yml
+  coverage:
+    name: coverage
+    needs: [test]
+    runs-on: ubuntu-latest
+    steps:
+      - uses: actions/checkout@v4
+      - uses: dtolnay/rust-toolchain@stable
+      - uses: Swatinem/rust-cache@v2
+      - run: cargo install cargo-tarpaulin
+      - run: cargo tarpaulin --out xml
+      - uses: codecov/codecov-action@v5
+        with:
+          token: ${{ secrets.CODECOV_TOKEN }}
```

**修改的文件**：
```
.github/workflows/ci.yml           # 加 coverage job
codecov.yml                         # 新建，设 threshold
```

**预估时间**：4 小时，但严重依赖已有测试的质量。如果现有测试本身就是 flaky 的（random failure），先修测试再加 gate。flaky test + CI gate = 团队对 CI 失去信任。

---

### Week 4: L4 实验 — LLM review 在 advisory 模式

**做什么**：
- 设置 LLM review agent 在 PR 上跑，non-blocking（不阻止 merge）。
- 先在 10 个已有 PR 上跑一遍，对比 agent 的发现和 human reviewer 的发现。
- 调 prompt。最常见的问题：agent 太啰嗦（每个 PR 出 30 条 comments，其中 25 条是 nit）、agent 抓到 human 已经发现的问题但不区分优先级、agent 建议改代码风格但和团队惯例冲突。
- 设定信号质量标准：agent 的 comments 里，有几条真正有用？human reviewer 是否因为有了 agent 而找到了更多真正的问题？

**判断 L4 是否值得保留的标准**：如果 agent 跑了一个月，提的问题 80% 被 human reviewer 标记为 useful（not just correct, but actionable and non-obvious），就值得保留。如果主要是 nit，先别开 blocking 模式。

**修改的文件**：
```
.github/workflows/ci.yml           # 加 llm-review job
.github/llm-review-prompt.md        # 新建，存放调好的 prompt
```

**预估时间**：4 小时（搭 agent + 跑 10 个 PR 的 benchmark），加 ongoing 的 prompt tuning。prompt tuning 不是一次性工作——你需要根据 human 反馈迭代。

---

### Week 5: 加固 — 从 "有 gate" 到 "信 gate"

**做什么**：
1. **Branch protection 规则完整化**：
   - Require all status checks (format, clippy, check, audit, test, coverage)。
   - Dismiss stale reviews when new commits are pushed。
   - Require branches to be up to date。
   - Do not allow bypassing。

2. **Merge queue 上线**：
   - 加 `merge_group` trigger 到 ci.yml。
   - Settings → Branches → 勾选 "Require merge queue"。

3. **CODEOWNERS**：
   ```text
   # .github/CODEOWNERS
   *               @team/core
   /src/backend/   @team/backend
   *.rs            @team/rust
   ```

4. **CI 性能优化**：
   - Cache（`Swatinem/rust-cache@v2` 比手写 `actions/cache` 更智能）。
   - 路径过滤（docs-only PR 不触发全量 test）。
   - 并行化：lint 和 check 并行跑（独立 job，不等彼此）。
   - 测量：在 workflow summary 里加一个 timing report step。
   - 目标：所有 required checks < 5 分钟。

**修改的文件**：
```
.github/workflows/ci.yml           # 加 merge_group, cache, timing
.github/CODEOWNERS                  # 新建
```

**预估时间**：4 小时。主要是 merge queue 的调试——你需要用两个同时 push 的 PR 测试它是否真的在合入前重新跑 CI。

---

### Week 5 之后：CI 是活的东西

这不是一次性的配置。新 bug pattern → 新 Semgrep rule。某个 audit 反复报同一类问题但团队接受风险 → 加 ignore。某个 job 开始变慢 → profiler 找原因。有人说"这个 gate 是噪音"→ 认真对待这个反馈。

---

## 10. 常见反模式（按违背原则归类）

回顾 Section 3 的三个原则：
1. **Fail cheap first** — 便宜的处理应该先跑。
2. **Complementarity, not redundancy** — 每一层 gate 应该抓到上一层漏掉的问题。
3. **Team-wide adoption** — gate 是所有人的工具，不是一个人的领地。

下面的反模式，每个都违背了至少一条。

---

### 1. Gate proliferation — 每发现一个 bug 就加一个 gate

**什么样子**：CI 里有 27 个 required status check。每次 PR push 等 40 分钟。3 个 check 永远 flaky，5 个是 deprecated 项目的残留。

**违背原则**：原则 2（complementarity）。Gate 不是越多越好。当一个 bug 发生后，直觉是 "加一个 check 阻止它再次发生"。但这个 check 是否独立抓到问题？还是它只是重复了已有 check 的工作？如果 format check 已经阻止了所有尾空格，再加一个 "whitespace linter" 就是噪音。

**怎么修**：每次想加新 gate 时，先问：已有的 gate 能抓到这个问题吗？如果不能，新 gate 最少能抓到什么（最小 viable gate）？如果新 gate 和旧 gate 有 80% 的重叠，不加——改进旧 gate 的 coverage。

---

### 2. L4 before L1 — AI review 在格式化之前

**什么样子**：团队在 PR 上接了一个 LLM review agent，但它每天在 comment "line 42 尾空格" 和 "import 没排序"。Human reviewer 花了 15 分钟忽略 AI 的噪音，而不是修复实际逻辑问题。

**违背原则**：原则 1（fail cheap first）。LLM review 是慢且贵的（对于大 PR，可能要 1-2 分钟跑一次）。用 1 分钟的 AI 时间抓尾空格，不如用 5 秒的 prettier 自动格式化。先让机器做机器擅长的事（格式、lint、类型），再让 AI 做 AI 擅长的事（逻辑审查、测试建议）。

**怎么修**：严格执行 L0 → L1 → L2 → L3 → L4 的顺序。Format 不过，lint 不跑。Lint 不过，test 不跑。All checks pass 后，AI review 才出场——它看到的已经是干净代码，而不是一堆格式问题。

---

### 3. Coverage-as-target — 追逐 80% 而不是有意义覆盖

**什么样子**：coverage 79.8%，manager 说要过 80% 的门槛。开发者加了两行 `assert true` 测试，coverage 到 80.1%，CI 通过。测试真的保护了任何东西吗？没有。

**违背原则**：原则 2（each level must be genuine）。Coverage 作为 gate 的意义是 "覆盖率不能下降"——它捕捉的是 "你加了一个新模块但没有测试它"。但如果 gate 设成一个固定数字，开发者会逆向优化数字，而不是优化质量。

**怎么修**：
```yaml
# codecov.yml — 只设方向，不设目标
coverage:
  status:
    project:
      default:
        threshold: 0%     # 不允许降，但不强制升
    patch:
      default:
        target: 80%       # 新代码必须 80%，但整体不强制
```

区别：`threshold: 0%` 说 "整体不能降"，`target: 80%` 说 "这次 PR 的新代码本身必须被测试"。前者是方向，后者是要求。

---

### 4. CI owner bottleneck — 一个人拥有全部 CI 配置

**什么样子**：.github/workflows/ 的所有改动都要经过 Alice review。Alice 休假的时候，CI 坏了两周没人能修。Bob 想加一个 lint rule，但不敢碰 CI 配置——"那是 Alice 的东西"。

**违背原则**：原则 3（adoption should be team-wide, not gatekept）。Gate 是团队的工具。如果 team 不能改 gate，gate 最终会和团队脱节。

**怎么修**：
1. CI workflow 放在 code 里，随 PR 一起 review。它不是 ops 的独占领地。
2. CODEOWNERS 设成 team，不是个人：`* @team/core`，不是 `* @alice`。
3. 把 CI 知识写进团队 onboarding 文档——每个人都要能加一条 lint rule。
4. 如果 Alice 的 knowledge 是瓶颈，做一次 pairing session：Alice 带一个新人在 CI 上改一个非关键配置，PR 由 Alice review 但不 blocking。

---

### 5. False positive fatigue — SAST 标了 200 个 "问题"，190 个是 false positive

**什么样子**：CI 跑完 security audit，输出 200 条 warning。团队建了一个 `.gitleaks.toml` 的排除列表，逐条加排除。三个月后排除列表比代码还长。开发者看到 security job 红了先不去看——"肯定是 false positive"。

**违背原则**：原则 2（noisy gates aren't real gates）。Gate 的意义在于 "红 = 有事要处理"。如果 95% 的红都是 false positive，红就失去了信号意义。开发者学会忽略它。

**怎么修**：
1. 第一周：在 audit 输出基础上，团队坐下来把 false positive 分类。哪些是真的？哪些是规则太宽泛？
2. 第二周：调敏感度。`cargo audit` 只报 `critical` 和 `high`。Semgrep rule 调 `severity: ERROR`，不要太宽泛的 pattern。
3. 目标：CI 红的时候，开发者看一眼就能开始修，而不是先花 10 分钟判断 "这真的有问题吗？"

---

### 6. Green check ≠ good code — 所有 gate 绿了，但新功能没测试

**什么样子**：PR 的 5 个 status check 全绿。但 PR 加了一个 200 行的函数，没有任何测试。"测试存在" 的 check 是 "是否有 test job 并不过的 PR"——但如果 test job 跑的是已有测试而新代码没有被 cover，所有 check 仍然绿。

**违背原则**：原则 2（the gate must actually catch what it claims to catch）。"Test passes" 不等于 "new code is tested"。Coverage patch check（`target: 80%`）能部分解决这个问题，但它仍然只是 proxy——新代码有 100% 覆盖但测试全是 happy path，gate 也绿。

**怎么修**：
1. 把 coverage patch check 设成 blocking：新代码必须有一定覆盖。
2. Human review 的时候 explicit check："你加的测试覆盖了哪些 edge case？"
3. 长期上，用 mutation testing（如 `cargo mutants`）作为 periodic check（不是 per-PR，太慢）。如果 mutation 不被现有测试杀死，测试太弱。

---

### 7. Flaky test as background noise — 一个 test 30% 概率失败，大家都点 re-run

**什么样子**：CI 有一个 integration test，每次大约 70% 的概率通过。红了就点 re-run，通常第二次就绿了。三个月后，负责这个 test 的人离职了。又三个月后，没有人记得这个 test 是 flaky 还是 "随机暴露了一个真 bug"。最后 test 被 delete——不是因为修好了，而是因为没人信它了。

**违背原则**：原则 2 和原则 3。Test 是 contract：绿表示代码对，红表示代码错。Flaky test 破坏了 contract，进而破坏了整个 CI 的可信度。

**怎么修**：
1. Flaky test 是 P0 bug。不是 "以后修"——它是阻止 CI 正常运作的 bug。
2. 如果暂时修不了（等上游 patch），把 test 用 `#[ignore]` 或 `it.skip()` 标记掉，而不是让它在 CI 里随机失败。
3. 加 retry mechanism 只在有明确理由时（网络抖动），且 hard limit（最多 retry 一次）。不是 "re-run until green"。
4. 在 test 的注释里写：为什么这个 test 被 ignore / 为什么有 retry。

---

### 8. Zero gates on legacy code — 新代码严格、旧代码无约束

**什么样子**：新模块要求 80% coverage。旧模块 12% coverage 且 CI 不管。团队 70% 的时间在维护旧代码，但所有 quality gate 都只在 PR 改动的新文件上生效。两个世界：新代码像瑞士钟表，旧代码像废品堆放场。

**违背原则**：原则 3（adoption is team-wide）。Gate 不是 "新人的规矩"。如果旧代码享受更低的 bar，团队在旧代码上工作时没有任何保护——这是团队最脆弱的地方，bug 在那里出现概率最高。

**怎么修**：
1. 把 old code 的 coverage baseline 记录下来（即使只有 12%），在 Codecov 上设这个数字为 baseline。然后加 `threshold: 0%`——不让它继续掉。
2. 每次修旧代码的 bug 时，顺手加一个 regression test。这不是 "stop the world and test everything"——这是 "每次碰旧代码，留一个测试再走"。
3. 长期上：如果某个旧模块一直在改（active maintenance），它的 coverage 自然会升。如果旧模块三年没改过——可能不需要测试，也可能这个模块本身就是 dead code，该删了。

<details class="socratic-learning-session">
<summary><span class="socratic-marker"></span>Socratic Learning - PR Quality Gates 分层体系 — 2026-08-03</summary>

<div class="socratic-summary">

- **Source**: `content/toolkit/code_quality/pr_quality_gates_spectrum.md`
- **Sessions covered**: 2026-08-03 (单次)
- **Key takeaways**:
  - L0→L4 五层质量门禁的职责边界：format → code smells → security/deps → tests → AI review
  - 三条设计原则（fail cheap first, complementarity, progressive adoption）作为 pipeline 排序和选层的根逻辑
  - Deterministic vs probabilistic 的区分：L0-L3 可 blocking，L4 必须 advisory，否则假阳性会逼迫团队绕过或关掉它
  - "被绕过的 gate 比没有 gate 更差"——这是整个 blocking-vs-advisory 论证的核心洞察，用户自主推导得出
- **Concepts that improved**: 从逐层命名到"blocking 会导致关掉 L4"的自主推导，到三原则串联为 pipeline 排序逻辑——理解的推进路径清晰
- **Recurring weak spots**: 对 GitHub Actions CI 的具体操作机制（如何绕过 blocking check）不熟悉；渐进式采用在具体场景中的落地判断依赖经验，没有固定答案
- **Open questions**: 暂无明显未解决问题——用户确认"概念和原则我懂了"
- **Suggested next focus**: 可在 GH Actions 实践笔记（`gh_actions_pr_quality_gates.md`）上做一轮 quiz，从"为什么"过渡到"怎么做"

</div>

<div class="socratic-qa">

### Concept: CI 绿了 ≠ 代码正确 —— 问题的本质

**Q:** 那个 bug 逃过了 lint、type check、单元测试，四个 CI check 全绿。这意味着"CI 通过"和"代码正确"之间的那条沟，本质上是由什么造成的？

**User answer:** 只能抓到设计抓到的问题。

**AI-expanded answer:** 每种工具（lint、typecheck、test）只能抓到它被**设计来**抓的那一类问题。lint 抓局部语法模式——它不懂跨平台语义；test 抓写下来的假设——你没写 Windows 测试，它就不知道；type check 抓 schema 层不一致——`path.join` 的类型签名在 Windows 和 POSIX 上完全一样。四层都绿，不代表四层覆盖了所有维度。沟的本质是：**每层 coverage 之间存在系统性盲区**，这些盲区不是工具的 bug，而是工具设计边界的必然产物。

---

### Concept: L0→L4 光谱 —— 各层职责

**Q:** 你的笔记里把质量门禁分成了 L0 到 L4 五层。L0 管的是什么？

**User answer:** format

---

**Q:** L1 管的是什么？（不是工具名，而是问题类别）

**User answer:** code smell

---

**Q:** L2 管的是什么？

**User answer:** Rule-based security & dependencies

---

**AI-expanded answer (L0-L4 全景):**

| Level | 管辖范围 | 工具示例 | 性质 |
|-------|---------|---------|------|
| L0 | Format（缩进、引号、换行） | prettier, cargo fmt | deterministic, blocking |
| L1 | Code smells（可疑写法、复杂度、禁用 API） | eslint, clippy | deterministic, blocking |
| L2 | 规则驱动的安全与依赖（CVE、自定义 SAST、semver） | cargo audit, Semgrep, CodeQL | deterministic, blocking |
| L3 | 测试 + 覆盖率方向（行为正确性） | vitest, cargo test, coverage diff | deterministic, blocking |
| L4 | 语义 / 逻辑 / 设计（review 性审查） | LLM agent, human review | probabilistic, advisory |

---

### Concept: Deterministic vs Probabilistic —— blocking 与 advisory 的分界线

**Q:** L0→L3 是 deterministic，L4 是 probabilistic。为什么这个区分很重要？如果某个团队把 L4 也设成 blocking，会发生什么？

**User answer (after asking for clarification on "blocking"):** 因为这里是逻辑性的设计，可能会有假阳，即便绿了也不一定可以 PR，要 human test and review。

**AI-expanded answer:** 用户抓住了假阳性这个核心。更深一层：一个 blocking 但不可靠的 gate 会触发"绕过"行为。团队不会一直等一个随机误报消掉，他们会寻求绕过——要么关掉这个 check，要么养成无视其输出的习惯。**被绕过的 gate 比没有 gate 更差**，因为你不只看不到它的信号，你还在训练自己"这个信号不重要"。这正是笔记里把 L4 设计为 advisory 的原因：把决策权还给 reviewer，AI 的建议是输入，不是判决。

---

**Q:** 如果 L4 是 blocking 的，团队会怎么"绕过"它？

**User answer:** 我不太清楚哎 → 我会强行 PR → （发现做不到）那该怎么办呢，感觉路被堵死了

**AI-expanded answer:** 用户从"不知道怎么绕过"到"路被堵死"，实际上自己体验了 blocking gate 的设计困境。具体的绕过路径包括：（1）在 repo Settings 里取消勾选该 status check 的 required 状态；（2）用 admin 权限 override branch protection；（3）删掉或 disable 该 workflow。无论哪种，结果都一样——gate 不再提供保护，而且没人再看它的输出。用户的困惑正好证明了"blocking + probabilistic = 徒劳"。

---

**Q:** 你从"不知道怎么绕过"到"绕过会让 L4 没意义"，中间想通的那个环节是什么？

**User answer:** 设计者会直接取消 L4。

**AI-expanded answer:** 这是整个 session 中最有价值的自主推导。用户从"会被堵死"跳到了"设计者会关掉 L4"——跳过了具体操作细节，直接到达了设计层面的必然结果。这个洞察直接对应笔记中的论断：L4 应该 advisory，不是 blocking。advisory 的底层信任模型是：**决策权在人类手中**，AI 负责提醒，reviewer 负责裁决。

---

**Q:** formatter（L0）可以 blocking，AI review（L4）不行——本质上是什么不同？

**User answer:** 如果 block 了，我们会绕过。导致 L4 没意义了。

**AI-expanded answer:** 用户把原因归结为后果——blocking 会导致绕过。补充一个更根本的区别：**确定性不同**。Prettier 不会产生假阳性：行宽超过 100 就是超过，没有争议。LLM review 天然有假阳性和漏报——它可能误判一个正确的设计，也可能漏掉一个真正的 bug。确定性工具的 blocking 是可靠的（绿=该层真没问题），概率性工具的 blocking 不可靠（绿不意味没问题，红不意味有问题），所以后者只能 advisory。

---

### Concept: 三条设计原则

**Q:** 三个门禁设计原则中，第三个是什么？

**User answer:** 原则三是渐进式采用。

---

**Q:** 这个原则在 5 周路线图中怎么体现？为什么不是所有人都需要 L4？

**User answer:** 你拿到 SOC 2 合规要求时再加 L3 coverage 门槛。团队学会写 good tests 之后再引入 L4 的 LLM review。门禁应该随着项目的风险暴露面增长，而不是在第一天就上一套全光谱。

**AI-expanded answer:** 用户准确复述了笔记原文。渐进式采用的本质是：**gate 的层数应该匹配风险暴露面**。两人项目的内部 CLI 工具不需要 L4——代码出了 bug 影响的只是自己和队友。一个面向外部客户的 SaaS 产品，bug 直接影响 revenue 和 reputation，L4 的投资回报才合理。笔记中 Week 1 只做 L0+L1 的原因不是技术能力不够，而是这两个 layer 立即解放 reviewer 的注意力——这是所有项目无论规模都能获益的最小投资。

---

**Q:** 如果只在这篇笔记里保留一个核心观点，你会留什么？

**User answer:** 分层设计。

---

**Q:** 为什么分层是核心？如果 L0 和 L1 有 80% 重叠，分层还有意义吗？

**User answer:** 要有原则，每层负责不同，不要重复。cheap 在先。

**AI-expanded answer:** 用户把三个原则串在一起回答了"为什么分层有意义"：（1）每层互补不重复——L1 不应该重复 L0 的格式规则（用 `eslint-config-prettier` 关掉），L2 不应该检查 L1 已拦截的 trivial 问题；（2）便宜的在前——deterministic 且秒级完成的排在 probabilistic 且耗时的前面，开发者不会为 format 错误等 8 分钟；（3）渐进式采用——选层而不是层层都上。"分层"不是把工具堆在一起，而是**按职责和代价排序的防御纵深**。

---

### Concept: 综合反思

**Q:** 哪个概念在你脑子里现在最清晰、站得最稳？有没有哪个点还说不清楚？

**User answer:** 概念和原则我懂了。

---

**Q:** 哪一部分你可以不需要翻笔记就跟别人讲清楚？

**User answer:** 分层原则。

</div>

<hr class="socratic-provenance">

Generated by [PinkR1ver/socratic-learning](https://github.com/PinkR1ver/socratic-learning).

</details>

