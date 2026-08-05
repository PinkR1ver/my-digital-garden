---
title: SSH + Ghostty 剪贴板未共享排查
date: 2026-08-05
tags:
  - ssh
  - terminal
  - ghostty
  - tmux
  - opencode
  - troubleshooting
---

## 工作链路

OSC 52 是一种终端控制序列，允许终端里的程序请求终端模拟器读写剪贴板。在当前场景中，远程程序不能直接操作 Mac 的系统剪贴板，而是通过下面这条链路间接完成复制：

```text
远程 opencode
    ↓ 输出 OSC 52 控制序列
tmux
    ↓ 转发
SSH
    ↓ 传输终端输出
本地 Ghostty
    ↓ 识别 OSC 52
macOS 剪贴板
```

SSH 只负责传输终端输出；真正将内容写进 macOS 剪贴板的是本地 Ghostty。因此，这条链路中的任意一层没有正确转发或接受 OSC 52，远程的 `/copy` 都不会反映到本地剪贴板。

## 问题场景

- 本地：macOS + Ghostty
- 远程：Linux，经 SSH 连接
- 终端复用：tmux
- 失败操作：在远程运行的 opencode 中使用 `/copy`，内容没有进入 macOS 剪贴板

这里需要共享的是“远程复制 → 本地粘贴”。SSH 本身不会同步两端的系统剪贴板，这条链路依赖 OSC 52。

## 已确认的服务端状态

远程 tmux 的配置和能力正常：

- tmux 版本为 3.6。
- 正在运行的 tmux server 已启用 `set-clipboard external`，不是只修改了配置文件却未加载。
- 各 session 位于同一个 tmux server，配置一致。
- terminfo 包含 `Ms`（OSC 52）能力，tmux 也识别到了终端的 clipboard feature。
- tmux 鼠标相关按键绑定为默认绑定，没有发现覆盖复制流程的自定义配置。

因此，暂时没有证据指向 SSH 或远程 tmux 配置错误。

## opencode 的 `/copy` 做了什么

检查本机安装的 opencode 1.18.13 后确认，其文本复制流程会先向 TTY 输出 OSC 52；检测到 `TMUX` 或 `STY` 时，还会加上对应的 tmux passthrough 包装。随后它才尝试调用运行环境里的系统剪贴板工具。

也就是说，在“远程 Linux + SSH + tmux + 本地 Ghostty”的场景里，`/copy` 能否写入 macOS 剪贴板，关键仍是 OSC 52 是否顺利到达并被 Ghostty 接受，而不是远程 Linux 是否拥有 macOS 的 `pbcopy`。

## 最小定位测试

在当前远程终端中执行：

```bash
printf '\033]52;c;aGVsbG8=\007'
```

这条命令通过 OSC 52 将 Base64 编码的 `hello` 写入终端侧剪贴板。执行后在 macOS 任意位置粘贴：

| 结果 | 说明 | 下一步 |
| --- | --- | --- |
| 粘贴出 `hello` | OSC 52、SSH 和 Ghostty 链路正常 | 继续检查 opencode `/copy` 的具体输出、版本或 tmux passthrough |
| 没有变化 | 问题位于 Ghostty 或 macOS 剪贴板侧的概率最高 | 检查 Ghostty 配置与版本 |

当前记录中尚未执行这项测试，因此定位还没有完全闭环。

## 客户端侧检查

先在 macOS 的 Ghostty 配置中搜索剪贴板设置：

```bash
grep -n "clipboard-write" ~/.config/ghostty/config
```

重点确认没有设置：

```ini
clipboard-write = deny
```

Ghostty 默认允许终端程序写入剪贴板。如果配置中没有相关项，继续检查：

1. Ghostty 是否为较旧版本，升级后再测试。
2. 是否存在多份 Ghostty 配置或启动参数覆盖了主配置。
3. macOS 剪贴板是否能在 Ghostty 本地会话中正常使用。
4. 暂时退出 tmux，在普通 SSH shell 中执行同一条 OSC 52 测试，以区分“Ghostty/SSH”与“tmux passthrough”两段链路。

## 分段验证顺序

```text
远程普通 SSH shell 执行 OSC 52
        │
        ├─ 失败 → 检查 Ghostty 配置、版本和 macOS 剪贴板
        │
        └─ 成功 → 进入 tmux 再执行 OSC 52
                     │
                     ├─ 失败 → 检查 tmux passthrough
                     │
                     └─ 成功 → 检查 opencode /copy 的具体行为
```

这套顺序比反复修改 tmux 配置更有效：每一步只增加一个变量，可以明确是哪一段吞掉了 OSC 52。

## 当前判断

服务端 tmux 配置已基本排除；opencode `/copy` 也确实会输出 OSC 52。最高优先级是执行最小测试，并检查 macOS Ghostty 是否拒绝了 clipboard write。测试结果出来前，不宜把问题归因于 tmux 或直接修改按键绑定。
