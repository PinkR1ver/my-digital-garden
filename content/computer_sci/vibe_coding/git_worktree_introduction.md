---
title: Git Branch、HEAD 与 Worktree：多个 Agent 同时干活不打架
description: 解释 commit、branch、HEAD、index 与 worktree 的关系，以及怎样让多个 Agent session 各干各的互不覆盖
date: 2026-01-13
updated: 2026-08-05
tags:
  - vibe-coding
  - git
  - worktree
  - multi-agent
---

## Summary

Branch 与 worktree 解决的不是同一个问题。Branch 是一条可移动的历史引用，保存任务产生的 commit；worktree 是磁盘上的独立工作目录，隔离正在编辑、暂存和尚未被 Git 跟踪的文件。多个 Agent session 只创建不同 branch、却继续使用同一个目录，仍然会看到并影响彼此的未提交内容。

可写的并行任务采用“一项任务、一条 branch、一个 worktree”。各任务可以从同一个目标分支 HEAD 出发，在独立目录内开发，完成后再分别合回目标分支。只读检查可以直接使用现有目录，或建立 detached worktree；需要保留的修改不应长期停留在 detached HEAD。

## Git 中的几个对象

### Commit：不可变的历史节点

Commit 保存某一时刻的项目快照、父 commit 和作者信息。已有 commit 的内容不会因为之后切换 branch 或修改文件而变化。

```text
A ── B ── C
```

这里的 `A`、`B`、`C` 是三个 commit，`C` 的 parent 是 `B`，`B` 的 parent 是 `A`。

### Branch：指向 commit 的可移动引用

Branch 不是项目文件的副本，只是一个有名字的指针：

```text
A ── B ── C
          ↑
          v4
```

在 `v4` 上创建新 commit `D` 后，Git 将 `v4` 向前移动：

```text
A ── B ── C ── D
               ↑
               v4
```

从同一个 commit 可以创建多条 branch：

```text
                 D  feature/secret-notes
                /
A ── B ── C
                \
                 E  notes/everything-desk
```

两项任务共享起点 `C`，之后拥有不同的提交历史。

### HEAD：当前 worktree 正在操作的位置

通常，HEAD 指向当前 branch，branch 再指向 commit：

```text
HEAD → v4 → commit C
```

这表示：当前 worktree 打开了 `v4`，下一次 commit 会接在 `C` 后面，并推动 `v4` 前进。

每个 worktree 都有自己的 HEAD：

```text
Worktree A: HEAD → feature/a → commit D
Worktree B: HEAD → feature/b → commit E
Worktree C: HEAD → v4       → commit C
```

“从 v4 HEAD 开始”通常是在说“以 `v4` 当前指向的 commit 为起点”，并不意味着所有 worktree 都直接 checkout `v4`。

### Index：下一次 commit 的候选内容

Index 也叫 staging area。`git add` 会把工作目录中的选定内容写入 index，下一次 `git commit` 再从 index 创建 commit。

```text
HEAD commit
    ↓ checkout
Worktree files
    ↓ git add
Index / staging area
    ↓ git commit
New commit
```

每个 worktree 有独立的 HEAD 和 index。因此两个隔离的 worktree 可以分别 stage 文件，不会把另一项任务纳入自己的 commit。

### Worktree：实际编辑的文件目录

Worktree 是磁盘上可以打开、编辑和运行程序的目录。一个 Git repository 可以关联多个 worktree，它们共享 commits、remote 和 branch 数据，但拥有独立的：

- HEAD；
- index；
- tracked files 的 checkout 状态；
- unstaged changes；
- untracked files。

```text
Shared Git repository
├── main worktree       HEAD → v4
├── secret worktree     HEAD → feature/secret-notes
└── notes worktree      HEAD → notes/everything-desk
```

## Branch 不提供文件系统隔离

在同一个目录中执行 `git switch`，只会改变该目录 checkout 的 branch。它不会为另一个 session 创建新的文件夹。

假设 Session A 在共享目录创建了尚未跟踪的文件：

```text
toolkit/humanize_ai_writing_tools.md
```

Session B 随后切换到另一个 branch。Git 通常会保留这个 untracked 文件，因为任何 commit 都没有声明应当删除或替换它。结果是 Session B 仍然能看见它。

```text
同一个目录
├── Session A 创建 untracked file
├── Session B 切换 branch
└── untracked file 继续存在
```

因此：

- untracked 文件不属于当前 branch；
- unstaged 修改也没有进入 branch 历史；
- `git status` 展示的是当前目录相对 HEAD 的差异，不是“这条 branch 独占的任务清单”。

只有创建 commit 后，修改才成为某条 branch 历史的一部分。

## Worktree 为什么需要 Branch

Git 可以创建 detached worktree：

```bash
git worktree add --detach ../inspect-v4 origin/v4
```

此时 HEAD 直接指向 commit，而不是 branch：

```text
HEAD → commit C
```

Detached worktree 适合只读检查、构建、测试或一次性实验。如果在其中创建 commit，新 commit 没有长期 branch 名保护；切走之后，需要通过 commit hash 或 reflog 找回。

需要保存的任务通常在创建 worktree 时同时创建 branch：

```bash
git worktree add ../garden-secret-notes \
  -b feature/secret-notes \
  origin/v4
```

这条命令同时完成：

1. 从 `origin/v4` 创建 `feature/secret-notes`；
2. 创建独立目录 `../garden-secret-notes`；
3. 让新 worktree 的 HEAD 指向该 branch。

工作关系变成：

```text
HEAD → feature/secret-notes → origin/v4 当时的 commit
```

## 多 Session 的标准结构

每项任务使用一条临时 branch 和一个 worktree，但它们可以从同一个目标 HEAD 出发：

```text
                        feature/secret-notes ── D
                       /
origin/v4 HEAD ── C ──┼── notes/worktree-guide ── E
                       \
                        feature/search ── F
```

这样同时保留了两种隔离：

| Layer | Isolates |
| --- | --- |
| Branch | commit history、review 和 merge 边界 |
| Worktree | 实际文件、untracked changes、index 和运行环境 |

任务合并后，临时 worktree 与 branch 都可以删除；它们不是长期架构的一部分。

## 常用工作流

### 1. 同步目标分支

```bash
git fetch origin
```

使用 `origin/v4` 或 `origin/master` 作为基点，可以避免从过期的本地 branch 开始。

### 2. 创建 branch 与 worktree

Feature：

```bash
git worktree add ../garden-feature-search \
  -b feature/search \
  origin/v4
```

Note：

```bash
git worktree add ../garden-note-worktree-guide \
  -b notes/worktree-guide \
  origin/master
```

### 3. 在新目录中工作

```bash
cd ../garden-note-worktree-guide
git status --short --branch
```

编辑、构建、测试、stage 和 commit 都在该目录内完成。

### 4. 查看所有 worktree

```bash
git worktree list
```

输出会同时列出路径、commit 和 branch，可以检查某条 branch 是否已经被另一个 session 使用。

### 5. 提交时只 stage 目标文件

```bash
git add computer_sci/vibe_coding/git_worktree_introduction.md
git diff --cached
git commit -m "notes: explain branch head and worktree"
```

混合工作目录中不使用未经确认的 `git add -A`。

### 6. 合并与清理

任务被合并后：

```bash
git worktree remove ../garden-note-worktree-guide
git branch -d notes/worktree-guide
```

如果 worktree 中存在未提交或未跟踪文件，Git 通常会拒绝移除。不要用强制参数绕过，先确认文件归属。

## 构建也属于共享状态

一些生成器会清空并重建输出目录。例如 Quartz build 会重新生成 `public/`。即使 `public/` 被 `.gitignore` 忽略，在共享工作目录运行构建仍可能中断另一个 session 的 preview 或覆盖它正在检查的生成结果。

因此 build、formatter、generator 与 preview 也应在任务 worktree 中运行。Git 不跟踪某个目录，不代表该目录对并行 session 没有影响。

## 本 Digital Garden 的双仓库结构

这个项目的主目录中嵌套了一个独立的内容仓库：

```text
my-digital-garden/          root repository
└── content/                content repository
```

| Repository | Base branch | Owns |
| --- | --- | --- |
| Root | `v4` | Quartz、配置、组件和完整站点版本 |
| `content/` | `master` | 公开笔记内容 |

同一个物理文件会被两个 repository 以不同路径观察：

```text
Root sees:    content/toolkit/example.md
Content sees: toolkit/example.md
```

纯笔记任务先在 `content` repository 中从 `origin/master` 创建独立 worktree。需要进入完整网站版本时，再把同一范围的内容变更集成到 root `v4`。两个 repository 的 index、commit hash 和 remote branch 是独立的，不能把一次 `git add` 当作同时完成两边提交。

## 操作边界

| Situation | Handling |
| --- | --- |
| 只读查看当前代码 | 直接读取；通常不需要 branch 或 worktree |
| 对旧版本运行一次测试 | detached worktree |
| 新笔记或 feature | dedicated branch + dedicated worktree |
| 多个 Agent 并行写作 | 每个 Agent 使用不同 worktree |
| 共享目录中发现陌生文件 | 停止 stage/cleanup，先确认归属 |
| 目标 branch 已被远端推进 | fetch 后 merge/rebase，不强推覆盖 |
| worktree 中有未提交内容 | 不删除、不 reset、不强制 checkout |

最小规则可以压缩成一句话：

> 所有任务可以从同一个目标 branch HEAD 出发，但每个可写 session 必须拥有自己的临时 branch 和 worktree。
