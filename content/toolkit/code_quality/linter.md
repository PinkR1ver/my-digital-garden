---
title: Linter
date: 2026-05-27
tags:
  - code-quality
  - tooling
---

## What

Linter 是自动检查代码风格和常见问题的工具。它不会像测试一样运行完整业务逻辑，而是直接扫描源代码，找出一些机器可以提前发现的问题。

常见例子：

- 没有用到的变量。
- 不一致的缩进、引号、分号风格。
- 可能写错的条件判断。
- 不符合团队约定的 import 顺序。
- 某些容易出 bug 的写法。

## Linter vs Formatter

Formatter 主要负责“代码长什么样”，例如缩进、换行、空格。典型工具是 Prettier。

Linter 更偏“代码有没有可疑问题”，例如 ESLint 会检查 JavaScript / TypeScript 里的未使用变量、危险写法、React Hooks 规则等。

实际项目里两者经常一起用：

```bash
npm run lint
npm run format
```

有些 Linter 也能自动修一部分格式问题：

```bash
npm run lint -- --fix
```

## Why teams care

Linter 的价值是把低级问题提前交给机器处理。这样 code review 就不用反复纠结缩进、命名、漏 import 这种小问题，可以把注意力放到设计、业务逻辑和边界条件上。

在 Git 协作流程里，Linter 通常会放进 CI。PR 一提交，服务器自动跑 lint；如果 lint 失败，就先修掉再合并。

## Practical note

不要把 Linter 当成“风格警察”。它真正有用的地方是让团队少争论、少漏错，并且让代码库长期保持一致。
