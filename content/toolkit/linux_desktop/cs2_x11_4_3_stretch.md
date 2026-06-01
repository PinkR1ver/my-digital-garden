---
title: CS2 on X11 4:3 Stretch with GNOME Top Bar
date: 2026-06-02
tags:
  - toolkit
  - linux
  - x11
  - gaming
  - cs2
---

## What I Wanted

在 Linux X11 里玩 CS2，用 BenQ 打 4:3 stretched。

具体想要的是：

- 桌面平时还是正常双屏。
- BenQ 正常作为主屏，`1920x1080@144Hz`。
- CS2 里能选 `1440x1080@144Hz`。
- 游戏画面要横向拉伸到 BenQ 的整块 `1920x1080`。
- 不要出现 GNOME 顶部状态栏盖在游戏上。

一开始以为只要 Steam launch option 写：

```bash
-perfectworld -w 1440 -h 1080 -refresh 144 -fullscreen
```

但实际不是这样。CS2 确实能变成 1440x1080，不过不是我想要的真正 fullscreen stretched，经常会变成 fullscreen windowed，顶部还露着 GNOME bar。

## Machine Layout

当时显示器布局：

```text
DP-0   BenQ ZOWIE XL LCD   1920x1080 @ 144Hz   left
HDMI-0 AOC 24B1W1          1920x1080 @ 75Hz    right
```

NVIDIA 里看到的名字：

```text
DP-0   -> DPY-2
HDMI-0 -> DPY-1
```

平时我要 BenQ 是主屏：

```bash
xrandr --output DP-0 --primary
```

GNOME workspace 最后保留的是：

```bash
gsettings set org.gnome.mutter dynamic-workspaces true
gsettings set org.gnome.mutter workspaces-only-on-primary true
```

也就是只让主屏切 workspace，副屏固定。GNOME 原生做不到我脑子里那种“两个屏幕各自独立动态 workspace”，所以这里没有继续钻。

## What We Tried

试过几种方向：

- 只改 CS2 启动项：能出 `1440x1080`，但是不一定是真全屏，顶栏还在。
- 直接切显示模式：可以拉伸，但 GNOME top bar 和窗口 focus 很烦。
- 试图藏 GNOME top bar：效果不稳定，而且有点过度 hack。
- 反复用脚本抢窗口 / 抢 primary：会导致两个屏幕狂闪。
- `gnome-shell --replace` 这种也碰过，桌面体验太危险，不适合留作方案。

最后比较稳定的想法是：不要和 GNOME 在同一个屏幕上抢 top bar。

## Final Compromise

平时：

- BenQ 是 primary。
- BenQ 原生 `1920x1080@144Hz`。
- AOC 是右边副屏。

开 CS2 时：

- 先把 AOC 临时设成 primary。
- 这样 GNOME top bar 会去 AOC。
- BenQ 变成副屏，但用 NVIDIA MetaMode 做 `1440x1080 -> 1920x1080` 横向拉伸。
- 再让 CS2 通过 SDL display index 开在 BenQ 上。

退出 CS2 后：

- 恢复 BenQ primary。
- 恢复 BenQ 原生 `1920x1080@144Hz`。

这个不是完美 fullscreen 方案，但日常打 CS2 基本够用。启动和退出时屏幕会闪一下，因为 NVIDIA MetaMode 在切；只要不是持续狂闪，就可以接受。

## Steam Launch Option

现在 Steam 里 CS2 的启动项：

```bash
/home/jude/bin/cs2-43-stretch-launch %command% -perfectworld
```

这个 wrapper 负责在 CS2 前后切显示状态。

## Wrapper Notes

脚本位置：

```text
/home/jude/bin/cs2-43-stretch-launch
```

里面主要有两个 MetaMode：

```bash
native_metamode='DPY-2: 1920x1080_144 @1920x1080 +0+0 { ViewPortIn=1920x1080, ViewPortOut=1920x1080+0+0 }, DPY-1: 1920x1080_75 @1920x1080 +1920+0 { ViewPortIn=1920x1080, ViewPortOut=1920x1080+0+0 }'
stretch_metamode='DPY-2: 1920x1080_144 @1440x1080 +0+0 { ViewPortIn=1440x1080, ViewPortOut=1920x1080+0+0 }, DPY-1: 1920x1080_75 @1920x1080 +1440+0 { ViewPortIn=1920x1080, ViewPortOut=1920x1080+0+0 }'
```

启动前切到 stretch：

```bash
nvidia-settings --assign "CurrentMetaMode=$stretch_metamode"
xrandr --output HDMI-0 --primary
```

启动 CS2：

```bash
"$@" -w 1440 -h 1080 -refresh 144 -full -fullscreen +sdl_displayindex 1
```

退出后恢复：

```bash
nvidia-settings --assign "CurrentMetaMode=$native_metamode"
xrandr --output DP-0 --primary
```

这里 `+sdl_displayindex 1` 很关键，因为开游戏时 AOC 已经临时变成 primary 了。我们要的是 CS2 仍然去 BenQ。

## CS2 Config Values

wrapper 也会顺手改 CS2 的配置，避免 Steam/CS2 自己把值写回去。

大概就是这些：

```text
"setting.defaultres"                 "1440"
"setting.defaultresheight"           "1080"
"setting.refreshrate_numerator"      "144"
"setting.refreshrate_denominator"    "1"
"setting.fullscreen"                 "1"
"setting.coop_fullscreen"            "0"
"setting.nowindowborder"             "0"
"setting.monitor_index"              "1"
"setting.aspectratiomode"            "1"
```

另一个 config 里：

```text
sdl_displayindex "1"
```

## Things Worth Remembering

- `-fullscreen` 在 CS2/Linux/GNOME 这里不一定等于真正绕过桌面环境。
- top bar 问题最后不是靠隐藏解决，而是靠把 primary 临时挪到另一个屏幕解决。
- 不要写循环一直抢 primary，会闪到没法用。
- 这个方案的核心妥协是：CS2 运行时 BenQ 不当 GNOME primary，只当游戏屏。
- 如果以后 CS2 又跑到 AOC，先试着把 `sdl_displayindex` 和 `monitor_index` 在 `0` / `1` 之间换一下。

## Current Result

现在的状态：

- 平时 BenQ 主屏正常用。
- 开 CS2 后，AOC 临时变主屏，BenQ 跑 `1440x1080@144` stretched。
- 顶部栏不再盖在 BenQ 的 CS2 上。
- 退出后自动恢复。

不是 100% 干净，但已经是这套 X11 + GNOME + NVIDIA + CS2 组合下比较稳的 95% 方案。
