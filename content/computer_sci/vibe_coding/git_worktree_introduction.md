---
title: Git Worktree in Vibe Coding
date: 2026-01-13
tags:
  - vibe-coding
  - git
---
## Git Worktree Theory

传统的 Git 流程中，一个仓库文件夹（Working Tree）通常只能同时切到一个分支。如果你想在写功能 A 的时候去修 Bug B，通常要 `git stash` 暂存或者新开一个 `git clone`。

git worktree允许用户为一个本地仓库关联**多个工作区**。

- **共享数据**：所有的工作区都指向同一个 `.git` 目录。这意味着它们共享对象数据库（commits, blobs）和远程分支信息。
- **独立环境**：每个 Worktree 都有自己独立的 `HEAD` 指针、暂存区和文件树。
- **互不干扰**：你可以在 `worktree-A` 里跑测试，在 `worktree-B` 里改代码，两者物理隔离，不会因为切分支导致依赖项频繁变动。

常用指令

```bash
git worktree add ../new-feature main #创建新工作区
git worktree list #查看列表
git worktree remove <path> #移除工作区
```

## Git Worktree in Vibe Coding

在 Vibe Coding 中，我们不再追求“一次写对”，而是追求“**概率成功**”。

### 多模型抽卡

你可以同时给 **Claude 3.7**, **GPT-4o**, 和 **DeepSeek-V3** 下达同一个指令（比如：_“写一个支持断点续传的 React 上传组件”_）。 由于每个模型的训练数据和逻辑不同，它们会生成三种不同的方案。你只需要在三个“分身工作区”里分别预览结果，哪个效果好（Vibe 对了），就保留哪个。

### 核心步骤

1. **并行分发**：利用 IDE 插件或脚本，将 Prompt 同时发给 N 个模型。
2. **隔离执行**：每个模型的改动被应用到不同的 **Git Worktree** 中。
3. **视觉/自动化筛选**：你在不同窗口预览运行效果，选出最满意的代码。
4. **合回主线**：确认满意后，将该 Worktree 的改动 Commit 并合并。

