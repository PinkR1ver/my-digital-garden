---
title: Git Collaboration Workflow
date: 2026-05-27
tags:
  - git
  - collaboration
---

## Core idea

不要直接往 `master` / `main` 这种主分支提交代码。主分支应该始终保持稳定、可发布、可回滚；日常开发要从主分支切出自己的 feature branch，在分支里完成代码、测试、检查和 review，再通过 PR 合并回主线。

## Flow

### 1. 从主分支切一个 feature branch

```bash
git switch main
git pull
git switch -c feature/confession
```

分支名要能说明这次改动在做什么。视频里的例子是 `feature/confession`。

### 2. 在分支里写代码

所有功能代码都应该先落在自己的分支里，不要直接 commit 到 `main` / `master`。

如果改动没有稳定下来，也不要急着推到共享主线。feature branch 是可以重写、整理、试错的地方；主分支不是。

### 3. 补单元测试和集成测试

至少要覆盖这次改动的核心路径。视频里提到的标准是：

- 单元测试和集成测试都要写。
- [代码覆盖率](toolkit/code_quality/code_coverage.md)至少达到 95%。

这里的 95% 不一定是所有项目的绝对标准，但意思很明确：不要把没有测试保护的功能直接丢给别人 review。

### 4. 跑 [Linter](toolkit/code_quality/linter.md) 和静态检查

提交前先让机器检查一遍：

```bash
npm run lint
npm test
```

具体命令按项目来。重点不是命令本身，而是不要把低级格式问题、明显类型错误、测试失败留给 reviewer 发现。

### 5. commit message 遵守 Conventional Commits

视频里要求 commit message 遵循 Conventional Commits 规范。常见格式：

```text
type(scope): summary
```

例子：

```text
feat(auth): add login callback
fix(api): handle empty response
docs(git): add collaboration workflow
test(parser): cover invalid input
```

这样做的好处是历史记录更容易扫读，也方便自动生成 changelog 或 release note。

### 6. push 到自己的远程分支

```bash
git push -u origin feature/confession
```

推送的是自己的 feature branch，不是主分支。

### 7. 开 PR，写清楚改了什么

PR 描述至少要讲清楚：

- 这次改动的功能点。
- 实现思路。
- 测试方式。
- 可能影响到的地方。

不要只写一句 “update” 或 “fix bug”。PR 描述是给 reviewer、未来的自己、以及事故回溯看的。

### 8. 等待 code review

视频里提到至少要有多个 reviewer 审查。review 过程中要处理评论，不能留下未解决的 thread。

如果 reviewer 提了问题：

- 修完后 push 新 commit 到同一个 feature branch。
- 回复评论说明处理方式。
- 确认所有 conversation / thread 都 resolved。

### 9. 等 CI/CD 全部通过

CI 是 Continuous Integration，持续集成。可以理解成：每次有人 push 代码或者开 PR，服务器自动把代码拉下来，跑 lint、测试、构建这些检查，确认这次改动没有把项目弄坏。

CD 是 Continuous Delivery / Continuous Deployment，持续交付或持续部署。它接在 CI 后面：如果代码检查通过，就自动打包、发布到测试环境、预览环境，甚至直接部署到生产环境。简单说，CI 负责“代码能不能合”，CD 负责“代码能不能发”。

合并前要等自动化检查跑完。包括但不限于：

- lint
- unit test
- integration test
- build
- deployment preview

CI 红了就先修，不要绕过检查强行合并。

### 10. squash and merge 到 develop 或主线分支

视频里提到 `squash and merge` 到 `develop`，再等待下一个版本发布。

这个流程适合希望主线历史干净的团队：feature branch 里可以有很多 WIP commit，最终合并时压成一个语义清楚的 commit。

如果项目没有 `develop`，也可以按团队约定合并到 `main`。关键是通过 PR 和自动化检查进入主线，而不是本地直接推。

## Never do this

```bash
git push --force origin main
```

`force push` 到 `main` / `master` 会改写共享历史，可能直接覆盖别人的提交，让 CI、部署和回滚都变得混乱。除非团队明确进入事故处理流程，否则不要对主分支 force push。

## Checklist before merge

- [ ] 分支从最新 `main` / `develop` 切出。
- [ ] 改动只在 feature branch 上完成。
- [ ] 测试已补齐，核心路径被覆盖。
- [ ] Linter / formatter / type check 已通过。
- [ ] commit message 符合 Conventional Commits。
- [ ] PR 描述写清楚功能、实现和测试。
- [ ] review comments 都已处理。
- [ ] CI/CD 全绿。
- [ ] 使用团队约定方式合并，例如 squash merge。

## References

[1] 这篇是从 xyspg 的 B 站短视频 [“你为啥直接 commit 到我的 master 分支啊”](https://www.bilibili.com/video/BV1pwC6BxEeb/) 整理出来的 Git 协作规范笔记。
