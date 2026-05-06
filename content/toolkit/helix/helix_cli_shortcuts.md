---
title: Helix Quick Learn
date: 2026-05-06
tags:
  - toolkit
  - helix
  - cli
  - linux
---

## Context

Linux desktop laptop 上，平时在 CLI 里改配置、脚本、Markdown、log 片段。Helix 就是 terminal 里的 editor。

最常见的入口：

```bash
hx file.md
hx path/to/config.toml
hx .
```

打开目录后再用 file picker 找文件：

```bash
cd ~/project
hx .
```

Helix 和 Vim 最大的手感差异：很多时候是先选中，再操作。比如 `x` 选中当前行，后面接 `d` 删除、`c` 改写、`y` 复制。[1]

## 启动 / 保存 / 退出

| 操作 | 快捷键 / 命令 | 备注 |
|---|---|---|
| 打开文件 | `hx file.md` | terminal 里直接开 |
| 打开当前目录 | `hx .` | 配合 `Space f` 找文件 |
| 进入编辑 | `i` / `a` | insert before / append after |
| 回到 normal | `Esc` | 做移动和修改前先回来 |
| 保存 | `:w` | write |
| 保存并退出 | `:wq` | write-quit |
| 不保存退出 | `:q!` | force quit |

常用打开方式：

```bash
cd ~/project
hx .
```

## 移动

| 操作 | 快捷键 | 备注 |
|---|---|---|
| 左 / 下 / 上 / 右 | `h` `j` `k` `l` | 少摸方向键 |
| 下一个 word | `w` | 命令、路径、变量名里常用 |
| 上一个 word | `b` | 回退 |
| 行首 | `gh` | goto line start |
| 第一个非空白字符 | `gs` | Markdown list、缩进后定位 |
| 行尾 | `gl` | goto line end |
| 文件开头 | `gg` | 回到顶部 |
| 文件最后一行 | `ge` | Vim 是 `G`，Helix 是 `ge` [2] |
| 第 42 行 | `42G` | 看报错行号 |
| 匹配括号 | `mm` | JSON、函数调用、Markdown link |

临时记法：

```text
top: gg
end: ge
line start/end: gh / gl
line number: 42G
```

## Selection 和行级编辑

| 操作 | 快捷键 | 备注 |
|---|---|---|
| 选中当前行 | `x` | 再接 delete / change / yank |
| 选中整个文件 | `%` | 全文件替换前用 |
| 进入扩展选择 | `v` | movement 会扩展 selection |
| collapse selection | `;` | 回到单点 |
| 只保留主 selection | `,` | 多光标收尾 |

常见动作：

| 操作 | 快捷键 |
|---|---|
| 删除当前行 | `xd` |
| 改写当前行 | `xc` |
| 复制当前行 | `xy` |
| 粘贴到后面 | `p` |
| 粘贴到前面 | `P` |
| 替换一个字符 | `r<char>` |

这几个比单独背 `d`、`c`、`y` 更好记：先 `x`，再处理这一行。

## 查找

| 操作 | 快捷键 |
|---|---|
| 文件内向后查找 | `/pattern` 然后 `Enter` |
| 文件内向前查找 | `?pattern` 然后 `Enter` |
| 下一个结果 | `n` |
| 上一个结果 | `N` |
| 用当前 selection 作为搜索词 | `*` |
| 项目 / workspace 全局搜索 | `Space /` |

当前词搜索可以用 selection + `*`。从 Vim 过来时先记 `be*n`：选到 word 边界，用 selection 作为搜索模式，再跳到下一个结果。[2]

查配置或代码时常搜这些：

```text
proxy
timeout
localhost
TODO
ERROR
```

当前文件内用 `/TODO`，整个 project 里用 `Space /` 搜 `proxy`、`ssh`、`docker`。

## 替换

Helix 里我先按这个流程记：

```text
选范围 -> s 搜匹配 -> c 改内容 -> Esc -> , 收尾
```

当前 selection 内替换：

```text
sfoo<Enter>cbar<Esc>,
```

- `sfoo<Enter>`：在当前 selection 内选中所有 `foo`。
- `cbar<Esc>`：把所有 selection 改成 `bar`。
- `,`：只保留主 selection。

全文件替换：

```text
%sfoo<Enter>cbar<Esc>,
```

`%` 是 select entire file，所以这个相当于全文件 search and replace。[2]

例子：把几行命令改成 checklist。

原文：

```text
docker ps
docker logs app
docker exec -it app bash
```

操作：

1. `x` 选中一行。
2. 用 `C` 向下加 cursor，覆盖三行。
3. `I- [ ] ` 在每一行开头同时插入 checklist 前缀。
4. `Esc,` 收尾。

## 文件、buffer、workspace

| 操作 | 快捷键 / 命令 |
|---|---|
| 打开文件 picker | `Space f` |
| 从当前工作目录打开 file picker | `Space F` |
| 打开 buffer picker | `Space b` |
| 下一个 buffer | `gn` |
| 上一个 buffer | `gp` |
| 打开文件 | `:o path/to/file.md` |
| 新建 scratch buffer | `:n` |
| 关闭当前 buffer | `:bc` |
| 重新从磁盘加载文件 | `:reload` |

操作顺序一般是：`hx .` -> `Space f` 找文件 -> `Space /` 搜关键词 -> `Space b` 切已经打开的文件。

## 写代码 / 配置时

| 操作 | 快捷键 |
|---|---|
| go to definition | `gd` |
| go to references | `gr` |
| hover documentation | `Space k` |
| rename symbol | `Space r` |
| code action | `Space a` |
| document symbols | `Space s` |
| workspace symbols | `Space S` |
| 下一个 diagnostic | `]d` |
| 上一个 diagnostic | `[d` |
| comment / uncomment | `Space c` |
| format file | `:fmt` |

LSP 快捷键依赖对应语言服务器。Markdown 文件不一定用得上；Python、Rust、TypeScript、config 文件更常用。

## Linux 配置

Helix 在 Linux 默认读取：

```text
~/.config/helix/config.toml
```

暂时只放两个 keymap：

```toml
[keys.normal]
C-s = ":w"

[keys.insert]
j = { k = "normal_mode" }
```

`Ctrl-s` 保存；`jk` 回 normal mode。先不大改默认键位，避免以后看文档对不上。[3]

## 常用组合

- `gg` / `ge` / `42G`
- `gh` / `gs` / `gl`
- `x` -> `d` / `c` / `y`
- `/` / `?` / `n` / `N`
- `%sfoo<Enter>cbar<Esc>,`
- `Space f` / `Space /` / `Space b`

## Reference

[1] [Helix docs - Using Helix](https://docs.helix-editor.com/usage.html)

[2] [Helix docs - Migrating from Vim](https://docs.helix-editor.com/master/from-vim.html)

[3] [Helix docs - Key remapping](https://docs.helix-editor.com/master/remapping.html)

[4] [Helix docs - Keymap](https://docs.helix-editor.com/keymap.html)

[5] [Helix docs - Commands](https://docs.helix-editor.com/commands.html)
