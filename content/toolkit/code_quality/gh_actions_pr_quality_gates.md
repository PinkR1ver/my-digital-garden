---
title: GitHub Actions PR Quality Gates from Zero
date: 2026-07-31
tags:
  - ci-cd
  - github-actions
  - code-quality
  - devops
---

## 1. GitHub Actions from Zero

### 1.1 Anatomy of a Workflow File

每一个 workflow 文件放在 `.github/workflows/`，是 YAML 格式。GitHub 会自动发现并注册。

#### YAML 最小要点

```yaml
# key: value
name: CI

# boolean / string / number 不需要引号，但包含特殊字符时需要
on: [push, pull_request]

# list 用 - 开头
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "hello"
```

容易踩的坑：
- 缩进只能用空格，不能用 tab。
- YAML 会把 `on:` 里不带引号的 `yes/no/true/false/on/off` 当成 boolean，所以遇到这些作为字符串时一定要加引号。
- 多行字符串用 `|`（保留换行）或 `>`（折叠成单行）。

#### `on:` 触发器

```yaml
# push 到任意分支触发
on:
  push:

# push 到 main 时触发
on:
  push:
    branches: [main]

# PR 打开、reopen、新 commit 推送时触发
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main]

# 手动触发（在 GitHub UI 上点按钮）
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deploy target'
        required: true
        type: choice
        options: [staging, production]

# 定时触发（UTC 时间）
on:
  schedule:
    - cron: '0 6 * * 1'  # 每周一早 6 点 UTC

# 多个事件
on: [push, pull_request]
```

**关键区别**：`pull_request` 事件跑在 PR 合并后的虚拟分支上，权限受限。`pull_request_target` 事件跑在 base 分支的语境下，权限更高，但也更危险（不要轻易 check out PR 代码到 `pull_request_target`）。

#### `jobs:` 结构

```yaml
jobs:
  format:
    name: 'Check Formatting'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cargo fmt --check

  lint:
    name: 'Lint'
    needs: format          # 等 format 成功后才会跑
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cargo clippy -- -D warnings
```

`needs` 控制依赖顺序。不加 `needs` 的 job 会并行跑。

#### `steps:` 详解

```yaml
steps:
  # 使用社区 action
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0       # 完整 git 历史（某些工具需要）

  # 直接跑 shell
  - name: Install dependencies
    run: npm ci

  # 设置环境变量
  - name: Run tests
    run: npm test
    env:
      NODE_ENV: test
      DATABASE_URL: ${{ secrets.DATABASE_URL }}

  # 条件执行
  - name: Deploy
    if: github.ref == 'refs/heads/main'
    run: npm run deploy
```

#### `strategy.matrix`

同一个 job 在多个 OS / 工具链版本上并行跑：

```yaml
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node-version: [18, 20, 22]
      fail-fast: false     # 一个失败不取消其他
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm test
```

`fail-fast: false` 很重要：默认 `true` 意味着一旦有一个 matrix job 失败，GitHub 立刻取消所有剩余的。你几乎总是需要设成 `false` 才能看到完整的问题分布。

#### `env:` 和 `secrets:`

```yaml
# workflow 级别 env（所有 job 共享）
env:
  CARGO_TERM_COLOR: always

jobs:
  test:
    # job 级别 env
    env:
      RUST_BACKTRACE: 1
    # step 级别 env（最具体）
    steps:
      - run: echo $MY_VAR
        env:
          MY_VAR: hello

      # secrets 通过 ${{ secrets.XXX }} 引用
      - run: curl -H "Authorization: Bearer ${{ secrets.DEPLOY_TOKEN }}" ...
```

**注意**：secrets 不会自动出现在 `env:` 里。你必须显式传递：

```yaml
env:
  TOKEN: ${{ secrets.GITHUB_TOKEN }}  # 必须这样显式赋值
```

---

### 1.2 Essential Community Actions

```yaml
# checkout：基本上每个 job 第一个 step
- uses: actions/checkout@v4

# Node.js 环境
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'          # 自动 cache node_modules

# Rust 工具链
- uses: dtolnay/rust-toolchain@stable
  with:
    toolchain: stable
    components: clippy, rustfmt

# Python
- uses: actions/setup-python@v5
  with:
    python-version: '3.12'
    cache: 'pip'

# 通用缓存
- uses: actions/cache@v4
  with:
    path: |
      ~/.cargo/registry
      ~/.cargo/git
      target
    key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
    restore-keys: |
      ${{ runner.os }}-cargo-

# 上传 artifact（跨 job 共享产物）
- uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/

# 下载 artifact
- uses: actions/download-artifact@v4
  with:
    name: coverage-report

# 路径过滤：只在特定文件变更时运行 job
- uses: dorny/paths-filter@v3
  id: changes
  with:
    filters: |
      frontend:
        - 'frontend/**'
      backend:
        - 'backend/**'
```

---

### 1.3 Debugging & Local Testing

#### 读取 CI 日志

GitHub Actions 日志里的关键信息位置：
- 点击 workflow run → 点击某个 job → 展开具体 step。
- 日志支持搜索（Ctrl+F / Cmd+F）。
- 失败 step 会折叠在一起，点击展开即可。

#### 本地运行：`act`

```bash
# 安装（macOS）
brew install act

# 在项目根目录下，模拟 push 事件
act push

# 模拟特定 job
act -j test

# 模拟 PR 事件
act pull_request

# 使用 medium 镜像（带更多预装工具）
act -P ubuntu-latest=catthehacker/ubuntu:act-latest
```

`act` 的局限性：
- 不是 GitHub 的精确副本。某些社区 action 可能不支持。
- secrets 需要通过 `--secret-file` 或 `.secrets` 文件提供。
- `GITHUB_TOKEN` 不会自动存在，需要传 `-s GITHUB_TOKEN=xxx`。

#### Lint workflow YAML：`actionlint`

```bash
# 安装（macOS）
brew install actionlint

# 运行
actionlint

# 常见输出示例
# .github/workflows/ci.yml:15:12: invalid key "runs-on" for "jobs" section
# 提供了具体行号和修复线索
```

`actionlint` 会检查：
- YAML 语法。
- `runs-on` 标签是否存在。
- shellcheck 类的 shell 语法问题。
- 常用 action 的 `with:` 参数是否正确。

```bash
# 集成 shellcheck（推荐）
actionlint -shellcheck "$(which shellcheck)"
```

#### 运行时调试

```yaml
# 方式 1：打开 step 调试日志
# 在 GitHub repo 的 Settings → Secrets and variables → Actions
# 添加 secret: ACTIONS_STEP_DEBUG = true
# 或 workflow 里：
env:
  ACTIONS_STEP_DEBUG: true

# 方式 2：用 tmate 开启交互式 SSH 到 CI runner
- uses: mxschmitt/action-tmate@v3
  # 加上 timeout 防止永远等待
  timeout-minutes: 15
```

`tmate` 会在 CI 跑到这个 step 时打印一个 SSH 连接字符串到日志里，你可以直接连进去调试文件系统、环境变量、工具链状态。

---

## 2. Building the Quality Gate Pipeline

### 2.1 Template Compliance Check

#### 创建 PR Template

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE.md -->

## Description

<!-- 请描述这个 PR 做了什么 -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue

<!-- 例如: Closes #123 -->

## Checklist

- [ ] I have tested my changes locally
- [ ] I have added tests for new functionality
- [ ] I have updated documentation if needed
```

#### 编写 check-standards action

```yaml
# .github/workflows/pr-standards.yml
name: PR Standards

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]

jobs:
  validate-template:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate PR template
        uses: actions/github-script@v7
        with:
          script: |
            const body = context.payload.pull_request.body;

            // 检查必填字段
            const checks = [
              { label: 'Description', pattern: /## Description\s*\n\s*\S/ },
              { label: 'Type of Change (at least one checked)', pattern: /- \[[xX]\] / },
              { label: 'Related Issue', pattern: /## Related Issue/ },
            ];

            const failures = [];
            for (const { label, pattern } of checks) {
              if (!pattern.test(body)) {
                failures.push(`Missing or empty: ${label}`);
              }
            }

            if (failures.length > 0) {
              core.setFailed(`PR validation failed:\n${failures.join('\n')}`);
            }
```

关键 API：
- `context.payload.pull_request.body` — PR 的 body 文本。
- `github.rest.issues.createComment(...)` — 给 PR 加评论。
- `github.rest.issues.addLabels(...)` — 加 label。
- `github.rest.pulls.update(...)` — 更新 PR 状态。

#### 编写 check-compliance action

```yaml
# .github/workflows/pr-compliance.yml
name: PR Compliance

on:
  pull_request:
    types: [opened]

jobs:
  label-and-check:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const pr = context.payload.pull_request;
            const body = pr.body || '';

            // 检查 checklist 是否全部打勾
            const unchecked = [...body.matchAll(/- \[ \] /g)];
            if (unchecked.length > 0) {
              await github.rest.issues.addLabels({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: pr.number,
                labels: ['needs-checklist'],
              });

              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: pr.number,
                body: `Please complete all checklist items before merging. ${unchecked.length} items remain unchecked.`,
              });
            }
```

#### 自动关闭过期的 non-compliant PR

```yaml
# .github/workflows/stale-prs.yml
name: Stale PR Cleanup
on:
  schedule:
    - cron: '0 8 * * 1'   # 每周一

jobs:
  close-stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          stale-pr-message: 'This PR has been marked stale. It will be closed in 7 days if no activity.'
          days-before-stale: 14
          days-before-close: 7
          only-labels: 'needs-checklist'
```

---

### 2.2 Code Format / Lint / Type-Check / Test

#### 起点：一个命令

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
```

#### 进化到多 job

```yaml
name: CI
on: [push, pull_request]

jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx prettier --check .

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx eslint .

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    needs: [lint, typecheck]    # 先跑便宜的快检查
    strategy:
      matrix:
        node-version: [18, 20, 22]
        os: [ubuntu-latest, macos-latest]
      fail-fast: false
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

这个结构的设计逻辑：
1. `format` 和 `lint` 并行跑，因为它们互相独立。
2. `typecheck` 和 `lint` 也并行。
3. `test` 等所有轻量检查通过后再跑（`needs`），因为它最慢，且矩阵意味着多个 runner 同时启动，不便宜。
4. `fail-fast: false` 确保能同时看到所有 OS/版本组合的结果，而不是只看第一个失败的。

---

### 2.3 CODEOWNERS & Branch Protection

#### CODEOWNERS

```text
# .github/CODEOWNERS
# 格式：路径 用户/团队
# 最后匹配的规则生效

*                       @org/core-team
/docs/                  @org/docs-team
/src/backend/           @org/backend-team
*.rs                    @org/rust-team
```

规则：
- 文件放在 `.github/CODEOWNERS`（注意没有后缀）。
- 可以使用 `docs/`、`src/` 前缀来自动扩大范围。
- GitHub 团队需要以 `@org/team-name` 格式引用。
- 最后匹配的规则生效，所以把通用规则放前面，特定规则放后面。

#### Branch Protection Rules（操作步骤）

1. 进入 repo → Settings → Branches → "Add branch protection rule"。
2. Branch name pattern: `main`（或你的默认分支名）。
3. 勾选：
   - **Require a pull request before merging** — 禁止直接 push 到 main。
   - **Require approvals** — 至少 N 个 approved review。
   - **Dismiss stale pull request approvals when new commits are pushed** — 新 commit 后之前 approve 作废。
   - **Require review from Code Owners** — 关联到 CODEOWNERS 的文件必须 owner approve。
   - **Require status checks to pass before merging** — 搜索并选择你想阻塞合并的 job 名称（如 `format`, `lint`, `test`）。
   - **Require branches to be up to date before merging** — PR 必须先跟 main 同步。
   - **Do not allow bypassing the above settings** — 管理员也不能跳过这些规则。

#### Rulesets（新方案，推荐）

Rulesets 是 Branch Protection Rules 的现代替代，更灵活：

```
Repo → Settings → Rules → Rulesets → New ruleset
```

可以：
- 按分支名 pattern 匹配（`main`, `release/**`）。
- 多套规则叠加（一套管主分支，一套管 release 分支）。
- 精细控制：强制签名提交、封锁 force push、限制删除分支、要求 linear history。
- 支持"Evaluate"模式先试运行。

实际项目通常两者并用：Rulesets 做粗粒度分支级规则 + Branch Protection 做合并前检查门控。

---

## 3. Recipes for Common Scenarios

### 3.1 Rust Project

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  CARGO_TERM_COLOR: always
  RUST_BACKTRACE: 1

jobs:
  format:
    name: cargo fmt --check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt
      - run: cargo fmt --all -- --check

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

  test:
    name: test (${{ matrix.os }})
    needs: [format, clippy]
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        rust: [stable, nightly]
      fail-fast: false
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@master
        with:
          toolchain: ${{ matrix.rust }}
      - uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/registry
            ~/.cargo/git
            target
          key: ${{ runner.os }}-${{ matrix.rust }}-cargo-${{ hashFiles('**/Cargo.lock') }}
      - run: cargo test --all-features

  audit:
    name: cargo audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: rustsec/audit-check@v2.0.0
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

  coverage:
    name: coverage
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

这里 cache key 里加了 `${{ matrix.rust }}` 是因为 nightly 和 stable 的编译产出不同，混用 cache 会出问题。

**这就是你在 cc-switch 看到的基础模式**：fmt → clippy → test matrix，每个 job 独立，并行该并行的，串行该串行的。

---

### 3.2 TypeScript / Node Project

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  format:
    name: Prettier
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx prettier --check .

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

  typecheck:
    name: tsc --noEmit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx tsc --noEmit

  test:
    name: vitest (Node ${{ matrix.node-version }}, ${{ matrix.os }})
    needs: [lint, typecheck]
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest]
        node-version: [18, 20, 22]
      fail-fast: false
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npx vitest --coverage

  build:
    name: Build
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run build
```

**关键决策**：为什么 test 需要 `needs: [lint, typecheck]`？

如果代码连类型都通不过，跑测试就不划算。先让便宜的快检查通过，再启动耗时且按矩阵计费的 test job。这节省的不仅仅是 GitHub Actions 分钟数，更重要的是减少认知负荷——你不会同时看到 lint 失败和 test 失败而不知道先修哪个。

---

### 3.3 PR Template Validator Script

```yaml
# .github/workflows/pr-validator.yml
name: PR Validator

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            const body = context.payload.pull_request.body || '';

            const requiredSections = [
              {
                name: 'Description',
                // 描述不能是空的（模板默认文字不算）
                pattern: /## Description\s*\n(?![*\s]*<!--)/,
                hint: 'Please write a meaningful description, not just the template placeholder.',
              },
              {
                name: 'Type of Change',
                pattern: /## Type of Change[\s\S]*?- \[[xX]\].+?[\r\n]/,
                hint: 'Please check at least one change type.',
              },
              {
                name: 'Related Issue',
                pattern: /(Closes|Fixes|Resolves)\s+#\d+/,
                hint: 'Please reference a related issue (e.g., "Closes #42").',
              },
            ];

            const missing = [];
            for (const section of requiredSections) {
              if (!section.pattern.test(body)) {
                missing.push(`- **${section.name}**: ${section.hint}`);
              }
            }

            if (missing.length > 0) {
              core.setFailed(
                `PR template validation failed:\n\n${missing.join('\n')}`
              );
            } else {
              core.info('PR template validated successfully.');
            }
```

**这里用的是 `actions/github-script@v7`**，它给你一个 pre-authenticated 的 octokit 和可以直接用的 `context`, `core`, `github` 对象。不需要自己处理 token。

---

### 3.4 Multi-Service Monorepo

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  changes:
    runs-on: ubuntu-latest
    outputs:
      frontend: ${{ steps.filter.outputs.frontend }}
      backend: ${{ steps.filter.outputs.backend }}
      docs: ${{ steps.filter.outputs.docs }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            frontend:
              - 'frontend/**'
              - 'packages/shared/**'
            backend:
              - 'backend/**'
              - 'packages/shared/**'
            docs:
              - 'docs/**'
              - '*.md'

  frontend-test:
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Running frontend tests..."
      - run: npm ci --prefix frontend
      - run: npm test --prefix frontend

  backend-test:
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "Running backend tests..."
      - run: cd backend && cargo test
```

**核心机制**：`dorny/paths-filter` 输出一个 JSON map，被 capture 到 `jobs.changes.outputs`，后面的 job 通过 `if:` 条件判断是否运行。

注意 `packages/shared/**` 同时出现在 frontend 和 backend 的 filter 里——因为 shared package 的改动应该触发两边的测试。

---

## 4. Common Mistakes & Troubleshooting

### 4.1 The Top 10 CI Failures Beginners Hit

#### 1. YAML 缩进错误

```yaml
# 错误 — 缩进不一致
jobs:
  test:
    runs-on: ubuntu-latest
      steps:                     # steps 应该和 runs-on 同级
        - run: echo hi

# 正确
jobs:
  test:
    runs-on: ubuntu-latest
    steps:                       # steps 对齐 runs-on
      - run: echo hi
```

**工具**：用 `actionlint` 在 push 前检查。

#### 2. 拼错 `runs-on` 标签

```yaml
# 错误
runs-on: ubuntu-lasted    # typo

# 正确
runs-on: ubuntu-latest
```

支持的标签：`ubuntu-latest`（或 `ubuntu-24.04`）、`macos-latest`、`windows-latest`。

#### 3. 忘记 `actions/checkout`

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      # 没有 checkout — runner 里没有你的代码
      - run: npm test

# 正确
    steps:
      - uses: actions/checkout@v4
      - run: npm test
```

error 表现是 `npm test` 找不到 `package.json`，或 `cargo test` 说"当前目录不是 Rust project"。

#### 4. `GITHUB_TOKEN` 权限不足

```yaml
# 默认 GITHUB_TOKEN 的权限比较保守
# 如果你需要写 PR comment、加 label，必须显式声明

jobs:
  comment:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write       # 必须声明
      issues: write
    steps:
      - uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.createComment({...});
```

或者去 repo Settings → Actions → General → Workflow permissions → 选 "Read and write permissions"。但更安全的做法是每个 job 显式声明 `permissions`。

#### 5. Cache 不失效

```yaml
# 问题：key 里没有依赖文件的 hash
- uses: actions/cache@v4
  with:
    path: node_modules
    key: node-modules-cache    # 永远命中，永远不更新

# 修正：用 hashFiles() 让 key 随 lockfile 变化
    key: ${{ runner.os }}-node-${{ hashFiles('package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

`restore-keys` 是 fallback：如果精确 key 没命中，尝试前缀匹配。这样改了 lockfile 后会 cache miss → 重新安装 → 重新 cache。

#### 6. Matrix `fail-fast: true` 隐藏 bug

默认 `fail-fast: true`。如果你有一个 `os: [ubuntu, macos, windows]` 的 matrix，而 macOS 上失败，GitHub 会立即取消 Windows job。你只看到一个失败，不知道 Windows 是否也有同样的问题。

```yaml
strategy:
  fail-fast: false    # 几乎总是需要
```

#### 7. Workflow 文件不在默认分支

GitHub 只会从默认分支（通常是 `main`）读取 workflow 定义。如果你在一个 feature branch 上新建了 `.github/workflows/ci.yml`，push 后发现没触发——那是因为还没合并到 main。

对于 `pull_request` 事件，PR 分支上的 workflow 修改会被使用（这是例外）。

#### 8. `pull_request` vs `pull_request_target` 混淆

| 特性 | `pull_request` | `pull_request_target` |
|------|---------------|----------------------|
| 代码来源 | PR 分支（被审查） | base 分支（已审查） |
| secrets 访问 | 受限 | 完全 |
| 用途 | 跑测试、lint | 给 PR 加 label/评论 |
| 安全性 | 安全（沙箱） | 危险（如果 checkout PR 代码） |

**规则**：永远不要在一个 `pull_request_target` workflow 里 checkout 或执行 PR 分支的代码。只用于需要 secrets 的元操作（加评论、加标签）。

#### 9. 环境变量在 shell 里没加引号

```bash
# 错误 — 如果 $PASSWORD 含空格或特殊字符，会出问题
run: psql -c "ALTER USER admin WITH PASSWORD $PASSWORD"

# 正确
run: psql -c "ALTER USER admin WITH PASSWORD '${{ secrets.PASSWORD }}'"
```

#### 10. `if:` 条件里类型错误

```yaml
# 错误 — 字符串 'true' 不等于 boolean true
if: steps.filter.outputs.frontend == true

# 正确 — dorny/paths-filter 输出的是字符串 'true' / 'false'
if: steps.filter.outputs.frontend == 'true'
```

GitHub Actions 里 `if:` 条件会自动转换类型。但社区 action 的 outputs 始终是字符串。所以和 outputs 比较时，用字符串。

---

## 5. Practical Project: Build Your Own from Scratch

这里是一个 ~5 天的练习路线。每天大约 1-2 小时。

### Day 1: First Workflow

```bash
# 创建新 repo
mkdir my-ci-lab && cd my-ci-lab && git init

# 创建最简单的 Node 项目
npm init -y
echo 'console.log("hello");' > index.js
echo '{"test": "echo ok"}' >> package.json    # 垃圾但能跑的 "test"

# 创建 .github/workflows/ci.yml
mkdir -p .github/workflows
```

```yaml
# .github/workflows/ci.yml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm test
```

把代码 push 到 GitHub，观察 Actions tab。

**练习**：
1. 故意写一个失败的测试，看日志什么样。
2. 加一个 `workflow_dispatch` 触发器，手动跑。
3. 改成 `pull_request` 触发器，建一个 PR 看自动触发。

### Day 2: Multi-Job + Matrix

把 `ci.yml` 升级成多 job：

```yaml
jobs:
  format:
    # 加 prettier
  lint:
    # 加 eslint（随便装一个，即使没实际代码）
  test:
    needs: [format, lint]
    strategy:
      matrix:
        node-version: [18, 20, 22]
      fail-fast: false
```

**练习**：
1. 故意在一个 job 里失败，看 `needs` 怎么阻止下游运行。
2. 加 `matrix`，看到多个 job 同时跑。
3. 试 `fail-fast: true` vs `false`，看差异。

### Day 3: PR Quality Gates

```yaml
# 新建 .github/PULL_REQUEST_TEMPLATE.md
# 新建 .github/workflows/pr-validator.yml

# 用 actions/github-script 写一个简单的 validator
# 检查 body 里是否有 "## Description" 且不为空
```

**练习**：
1. 建一个 PR 用空 body，看 validator 报错。
2. 解掉所有 checklist，看 check 通过。
3. 用 `github.rest.issues.createComment` 给 PR 加一条自动评论。

### Day 4: CODEOWNERS + Branch Protection

```text
# .github/CODEOWNERS
* @your-username
```

去 Settings → Branches → 加 branch protection for `main`：
- 勾选 "Require a pull request before merging"
- 勾选 "Require status checks to pass before merging"
- 搜索并选择你 workflow 里的 job 名称

**练习**：
1. 尝试直接 push 到 `main` → 应该被拒绝。
2. 建一个 PR，故意让一个 check 失败 → 看 merge 按钮变灰。
3. 把 check 修好 → merge 按钮恢复。

### Day 5: Real Project Integration

拿一个你自己的实际项目，添加完整的 CI pipeline：

**Rust 项目**：实现 Section 3.1 的完整 pipeline。
**TypeScript 项目**：实现 Section 3.2 的完整 pipeline。

**额外练习（选做）**：
- 加 `actions/cache`，对比有 / 无缓存时的 CI 耗时。
- 加 `dorny/paths-filter`，只跑相关 job。
- 把 `pr-validator.yml` 集成到已有 workflow 里。
- 在本地安装 `act` 和 `actionlint`，养成 push 前本地验证的习惯。

### 验证清单

完成后你应该能回答：

1. 我的 CI 是什么事件触发？每次触发后哪些 job 会跑，哪些需要等待？
2. 有人提交一个违反格式的 PR——CI 在哪一步阻止了他？日志里怎么找到具体错误？
3. 有人提交了一个只有 frontend 改动的 PR——backend test 是否浪费了 runner 时间？
4. cache key 什么时候会 miss？miss 后 runner 做什么？
5. 如果有人 fork 了我的 repo、提交了包含恶意代码的 PR，我的 secrets 安全吗（pull_request vs pull_request_target）？

