---
title: 在 Ubuntu 上运行 FIFA 11：Wine、DXVK、手柄与双机 LAN
date: 2026-08-12
tags:
  - toolkit
  - linux
  - gaming
  - wine
  - fifa
---

## 完成后的状态

这套配置用于 Ubuntu GNOME 桌面，完成后应当同时满足：

- FIFA 11 从独立的 32-bit Wine prefix 启动；
- D3D9 由 DXVK 渲染，画面以 1920×1080 填满屏幕；
- USB 手柄在启动前接入即可使用；
- `Ctrl + ←/→` 不再触发 GNOME workspace 快捷键；
- 两台接入同一物理局域网的 Ubuntu 电脑可以互相发现 LAN 房间；
- 安装社区球员数据库或球衣资源后，可以重建 BH，避免启动白屏。

已验证过的两台机器分别使用 GTX 1660 Super / Wine Staging 11.x 和 RTX 3060 / Ubuntu Wine 10.x，二者都运行 DXVK 3.0.2。这里的版本是工作快照，不是最低版本要求。

> [!important]
> 需要自行准备合法取得、可以正常安装的 FIFA 11 文件。本文不提供游戏本体、序列号、替换可执行文件、球员数据库、脸型或球衣资源。先完成原版游戏的首次启动，再处理社区内容包。

## 路径约定

后面的命令统一使用以下三个变量。只在当前终端设置，不要写进全局 shell profile。

```bash
export FIFA_ROOT="$HOME/Games/FIFA11"
export WINEPREFIX="$HOME/Games/fifa11-prefix"
export GAME_DIR="$WINEPREFIX/drive_c/Program Files/EA Sports/FIFA 11/Game"
mkdir -p "$FIFA_ROOT"
```

| 路径 | 内容 |
| --- | --- |
| `$FIFA_ROOT` | launcher、安装包、备份和诊断日志 |
| `$WINEPREFIX` | 只给 FIFA 11 使用的 32-bit Wine 环境 |
| `$GAME_DIR` | `fifa.exe`、`data*.big`、`data*.bh` 所在目录 |

不要在已有的默认 `~/.wine` 上直接施工。需要重做时，换一个新的 prefix 路径；不要删除仍有用的旧 prefix。

## 1. 准备 Wine 与 32-bit Vulkan

先启用 i386 软件包架构并安装基础工具：

```bash
sudo dpkg --add-architecture i386
sudo apt update
sudo apt install wine64 wine32:i386 winetricks vulkan-tools \
  libvulkan1 libvulkan1:i386 p7zip-full iputils-arping uuid-runtime
```

显卡驱动还必须提供 32-bit Vulkan userspace：

- NVIDIA：通过 Ubuntu 的 Additional Drivers 安装推荐驱动，并安装与驱动版本一致的 `libnvidia-gl-<版本>:i386`；
- AMD / Intel：通常安装 `mesa-vulkan-drivers mesa-vulkan-drivers:i386`。

检查当前会话和 Vulkan：

```bash
wine --version
echo "$XDG_SESSION_TYPE"
vulkaninfo --summary
```

本配置优先使用 X11。`echo "$XDG_SESSION_TYPE"` 应输出 `x11`；如果是 `wayland`，注销，在登录界面的齿轮菜单选择 **Ubuntu on Xorg** 后重新登录。`vulkaninfo --summary` 中必须出现真实显卡，不能只有 `llvmpipe`。

Wine 和 DXVK 的官方文档分别见文末 [1](#references)、[2](#references)。

## 2. 创建 prefix 并安装游戏

创建纯 32-bit prefix：

```bash
export WINEARCH=win32
wineboot -u
winecfg
```

在 `winecfg` 中先保持 Windows version 为默认值，关闭窗口后检查架构标记：

```bash
grep '^#arch=win32' "$WINEPREFIX/system.reg"
```

预期输出：

```text
#arch=win32
```

运行自己的安装程序，例如：

```bash
wine /path/to/FIFA11/setup.exe
```

安装路径使用默认的：

```text
C:\Program Files\EA Sports\FIFA 11
```

安装结束后先确认关键文件，而不是直接写 launcher：

```bash
test -f "$GAME_DIR/fifa.exe" && echo "fifa.exe: OK"
find "$GAME_DIR" -maxdepth 1 -type f -name 'data?.big' -printf '%f\n' | sort
```

从 `Game` 目录做第一次启动：

```bash
cd "$GAME_DIR"
WINEDEBUG=-all wine fifa.exe
```

此时的通过标准是进入主菜单。若这里已经报 CD/DVD 检查错误，先处理安装介质或游戏版本问题；DXVK、球员包和 LAN 都不能修复一个尚未完成授权检查的可执行文件。

## 3. 安装 DXVK 并固定 X11

从 DXVK 官方 release 下载压缩包 [2](#references)，解压后把 **x32** 版本的 `d3d9.dll` 放进纯 32-bit prefix 的 `system32`：

```bash
export DXVK_DIR=/path/to/dxvk-release
install -m 0644 "$DXVK_DIR/x32/d3d9.dll" \
  "$WINEPREFIX/drive_c/windows/system32/d3d9.dll"

wine reg add 'HKCU\Software\Wine\DllOverrides' \
  /v '*d3d9' /t REG_SZ /d native /f

wine reg add 'HKCU\Software\Wine\Drivers' \
  /v Graphics /t REG_SZ /d x11 /f
```

确认 DLL architecture 和 override：

```bash
file "$WINEPREFIX/drive_c/windows/system32/d3d9.dll"
wine reg query 'HKCU\Software\Wine\DllOverrides' /v '*d3d9'
```

第一条应包含 `PE32`，第二条应显示 `native`。随后打开一次带 DXVK 日志的游戏：

```bash
mkdir -p /tmp/fifa11-dxvk-log
cd "$GAME_DIR"
DXVK_LOG_LEVEL=info DXVK_LOG_PATH=/tmp/fifa11-dxvk-log \
  WINEDEBUG=-all wine fifa.exe
```

退出游戏后检查日志：

```bash
grep -E 'DXVK:|Adapter|Actual swapchain' /tmp/fifa11-dxvk-log/fifa_d3d9.log
```

日志应显示 DXVK 版本、真实 GPU，以及创建成功的 swapchain。

## 4. 设置正确的画面大小

FIFA 11 会从安装目录的默认配置和 Wine Documents 下的用户配置读取分辨率。只改其中一份，游戏可能继续以 800×600 启动，画面看起来就像缩在屏幕角落。

把安装目录中所有默认配置同步到 1920×1080：

```bash
find "$WINEPREFIX/drive_c/Program Files/EA Sports/FIFA 11" \
  -path '*/fifasetup/fifasetup_default.ini' -print0 |
while IFS= read -r -d '' config; do
  sed -i -E \
    -e 's/^RESOLUTIONWIDTH[[:space:]]*=.*/RESOLUTIONWIDTH = 1920/' \
    -e 's/^RESOLUTIONHEIGHT[[:space:]]*=.*/RESOLUTIONHEIGHT = 1080/' \
    -e 's/^ASPECTRATIO[[:space:]]*=.*/ASPECTRATIO = 1.77778/' \
    "$config"
  echo "updated: $config"
done
```

再找到 Wine 实际映射的 Documents：

```bash
DOCS_WIN="$(wine cmd /c 'echo %USERPROFILE%\My Documents' | tr -d '\r')"
DOCS_DIR="$(winepath -u "$DOCS_WIN")/FIFA 11"
mkdir -p "$DOCS_DIR"
printf '%s\n' \
  'RESOLUTIONWIDTH = 1920' \
  'RESOLUTIONHEIGHT = 1080' \
  'ASPECTRATIO = 1.77778' \
  'RENDERINGQUALITY = 0' \
  'WAITFORVSYNC = 1' \
  'VOICECHAT = 1' \
  > "$DOCS_DIR/fifasetup.ini"

printf 'Windows Documents: %s\nLinux path: %s\n' "$DOCS_WIN" "$DOCS_DIR"
```

启动一场离线比赛。通过标准是菜单和比赛都填满目标显示器；不要只看启动画面。

## 5. 创建日常 launcher

下面的 launcher 会固定 prefix 和 working directory，并在游戏期间临时移除 GNOME 与 FIFA 冲突的快捷键。游戏正常退出或收到 `HUP`、`INT`、`TERM` 时，`trap` 会恢复启动前的精确值。

保存为 `$FIFA_ROOT/play-local.sh`：

```bash
#!/usr/bin/env bash
set -u

export WINEPREFIX="$HOME/Games/fifa11-prefix"
export WINEARCH=win32
export WINEDEBUG=-all

GAME_DIR="$WINEPREFIX/drive_c/Program Files/EA Sports/FIFA 11/Game"
LOG="$HOME/Games/FIFA11/fifa11.log"

WM_SCHEMA=org.gnome.desktop.wm.keybindings
SHELL_SCHEMA=org.gnome.shell.keybindings
saved_left="$(gsettings get "$WM_SCHEMA" switch-to-workspace-left 2>/dev/null)"
saved_right="$(gsettings get "$WM_SCHEMA" switch-to-workspace-right 2>/dev/null)"
saved_overview="$(gsettings get "$SHELL_SCHEMA" toggle-overview 2>/dev/null)"

restore_shortcuts() {
  [ -n "$saved_left" ] && gsettings set "$WM_SCHEMA" switch-to-workspace-left "$saved_left" 2>/dev/null
  [ -n "$saved_right" ] && gsettings set "$WM_SCHEMA" switch-to-workspace-right "$saved_right" 2>/dev/null
  [ -n "$saved_overview" ] && gsettings set "$SHELL_SCHEMA" toggle-overview "$saved_overview" 2>/dev/null
}
trap restore_shortcuts EXIT HUP INT TERM

gsettings set "$WM_SCHEMA" switch-to-workspace-left \
  "['<Super>Page_Up', '<Super><Alt>Left', '<Control><Alt>Left']" 2>/dev/null
gsettings set "$WM_SCHEMA" switch-to-workspace-right \
  "['<Super>Page_Down', '<Super><Alt>Right', '<Control><Alt>Right']" 2>/dev/null
gsettings set "$SHELL_SCHEMA" toggle-overview "[]" 2>/dev/null

if [ ! -f "$GAME_DIR/fifa.exe" ]; then
  printf 'fifa.exe not found: %s\n' "$GAME_DIR/fifa.exe" >&2
  exit 1
fi

printf '=== FIFA 11 %s ===\n' "$(date --iso-8601=seconds)" >> "$LOG"
cd "$GAME_DIR" || exit 1
wine fifa.exe >> "$LOG" 2>&1
```

```bash
chmod +x "$FIFA_ROOT/play-local.sh"
"$FIFA_ROOT/play-local.sh"
```

测试 `Ctrl + ←/→` 后正常退出游戏，再确认 GNOME 快捷键已经恢复。如果机器突然断电，shell 来不及执行 `trap`；这时到 GNOME Settings 重新设置 workspace shortcuts，或从备份值手动恢复。

## 6. 配置 USB 手柄

手柄必须先通过 Linux、再通过 Wine、最后通过 FIFA 的设备名称匹配。按这三层排查。

### 6.1 Linux 能看到设备

```bash
lsusb
ls -l /dev/hidraw*
```

记下手柄的 vendor ID 和 product ID。例如这次使用的 Zikway 是 `3537:1041`。为单一型号创建 udev rule：

```bash
sudo tee /etc/udev/rules.d/70-fifa11-gamepad.rules >/dev/null <<'EOF'
SUBSYSTEM=="hidraw", ATTRS{idVendor}=="3537", ATTRS{idProduct}=="1041", TAG+="uaccess", MODE="0660"
EOF

sudo udevadm control --reload-rules
sudo udevadm trigger
```

使用其他手柄时必须替换两个 ID；不要给所有 `hidraw` 设备统一开放权限。重新插入手柄后继续。

### 6.2 Wine 能看到设备

```bash
WINEPREFIX="$WINEPREFIX" wine control joy.cpl
```

在 Game Controllers 中记下完整名称并测试按键。若这里没有设备，继续检查 udev、USB 线和 `/dev/hidraw*`，不要先修改 FIFA 文件。

### 6.3 FIFA 能匹配设备名称

FIFA 11 在两份 `buttonDataXenon.ini` 中按名称找映射：

```bash
map_files=(
  "$GAME_DIR/buttonDataXenon.ini"
  "$WINEPREFIX/drive_c/Program Files/EA Sports/FIFA 11/buttonDataXenon.ini"
)

controller_name='Zikway HID gamepad'
for file in "${map_files[@]}"; do
  [ -f "$file" ] || { echo "missing: $file"; continue; }
  grep -Fq "AddAlias \"$controller_name\"" "$file" ||
    sed -i "/AddAlias \"XInput Controller\"/a\\    AddAlias \"$controller_name\"" "$file"
  grep -F "AddAlias \"$controller_name\"" "$file"
done
```

把 `controller_name` 改成 `joy.cpl` 显示的精确名称。

FIFA 11/Wine 10 的实际限制是：游戏运行中拔掉手柄后，Wine 仍可能持有已经删除的旧 hidraw descriptor，重新插入不会恢复输入。手柄应在启动前接好；一旦拔过，退出 FIFA，等 `joy.cpl` 再次识别后重启游戏。输入球员名称时可以让键盘和手柄同时连接，没有必要拔掉手柄。

## 7. 安装球员数据库、球衣和脸型

这一阶段必须在原版离线比赛通过之后进行。社区包之间通常共享 `data/`、BIG 和 BH，不能把几个压缩包直接无差别覆盖。

### 7.1 先保留整套回滚点

```bash
backup="$FIFA_ROOT/backups/pre-content-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup"
cp -a "$GAME_DIR" "$backup/Game"
cp -a "$DOCS_DIR" "$backup/FIFA-11-Documents"
printf 'backup: %s\n' "$backup"
```

游戏目录安装完整赛季包后可能超过 30 GiB，先确认目标磁盘空间：

```bash
df -h "$FIFA_ROOT" "$WINEPREFIX"
```

### 7.2 每个压缩包先解到 staging

```bash
archive=/path/to/community-patch.7z
staging="$(mktemp -d)"
7z t "$archive"
7z x "$archive" -o"$staging"
find "$staging" -maxdepth 3 -type f | sed -n '1,80p'
```

找到压缩包中与 `$GAME_DIR` 对应的目录。例如它位于 `$staging/FIFA 11/Game` 时：

```bash
export PATCH_GAME_DIR="$staging/FIFA 11/Game"
test -d "$PATCH_GAME_DIR/data"

# 先 dry-run；检查将新增和覆盖的路径。
rsync -an --itemize-changes "$PATCH_GAME_DIR/" "$GAME_DIR/" |
  sed -n '1,160p'

# 确认层级正确后再执行，不使用 --delete。
rsync -a --itemize-changes "$PATCH_GAME_DIR/" "$GAME_DIR/"
```

不同资源包的顶层目录不统一，`PATCH_GAME_DIR` 必须人工确认；不能用 `find` 到的第一个 `Game` 目录直接覆盖。安装顺序：

1. 完整赛季包，作为统一的图形和资源基线；
2. 更新的 `fifa_ng_db.db` 与配套 meta/xml；
3. miniheads、minikits、脸型等小型覆盖层；
4. 对当前最终文件树重建全部 root BH；
5. 移走旧的 `Settings`、`Squads`、`Tournament` 和 `Manager` 存档，再建立新 profile。

已验证的组合是 2023/24 All-In-One 资源基线、February 2026 roster、25/26 minikits、FC26 miniheads 和 Yamal face。压缩包仍需由操作者自行取得和审计。

### 7.3 重建 BH，避免启动白屏

如果社区包提供的 `data?.bh` 是按另一版 `data?.big` 生成的，FIFA 可能在读取 `locale.big` 后停在白屏。最终 BH 必须针对**当前安装中的 BIG 和 loose-file tree**生成。

使用 Universal FIFA Regenerator CLI 时，命令形态如下：

```bash
export REGEN_DIR="$FIFA_ROOT/tools/universal-fifa-regenerator"
test -f "$REGEN_DIR/regen-cli.exe"
test -f "$REGEN_DIR/FifaLibrary14.dll"

WINEPREFIX="$WINEPREFIX" wine "$REGEN_DIR/regen-cli.exe" \
  --gamedir 'C:\Program Files\EA Sports\FIFA 11\Game'
```

工具结束后应存在 8 个 root BH：

```bash
for n in {0..7}; do test -s "$GAME_DIR/data${n}.bh" || echo "missing: data${n}.bh"; done
sha256sum "$GAME_DIR"/data?.bh | sort
```

重新启动游戏并进入一场比赛。若白屏，立即恢复整套 `Game` 备份；不要只还原一两个 BH，也不要把不同游戏版本的 BIG、BH 和 `fifa.exe` 混在一起。

更新数据库后，旧 squads/career 可能覆盖新 roster。先把旧存档移到备份目录，再创建新 profile。看到 Mbappé、Yamal 等球员只能证明数据库已经加载；mini kit 是选队缩略图，不等于比赛内球衣也已更新。

## 8. 配置两台机器的 LAN 房间发现

先保证两台机器：

- 通过有线网口接在同一个物理子网；
- 都能单机进入比赛；
- 游戏内容版本一致，尤其是 database、`data?.big` 和 `data?.bh`；
- 使用不同的 Windows computer name 和 `MachineGuid`。

FIFA 11 在有 Ethernet、Tailscale、Docker、LXC 和代理 TUN 的主机上可能选错网卡。解决办法是让游戏运行在临时 network namespace 中，里面只放一张连接物理 LAN 的 macvlan。

### 8.1 为两台机器分配参数

| 参数 | Machine A | Machine B |
| --- | --- | --- |
| `PARENT_IF` | 实际有线接口，例如 `enp4s0` | 实际有线接口，例如 `enp3s0` |
| `LAN_ADDR` | 未占用地址，例如 `192.168.1.240/24` | 未占用地址，例如 `192.168.1.241/24` |
| `GATEWAY` | 当前 LAN gateway | 同一 LAN gateway |
| `GAME_USER` | 本机桌面用户 | 本机桌面用户 |
| `LAUNCHER` | 本机 `play-local.sh` | 本机 `play-local.sh` |

查看接口和路由：

```bash
ip -br link
ip -4 route
```

分配地址前在每台机器上做 duplicate-address probe：

```bash
sudo arping -D -I enp4s0 -c 3 192.168.1.240
```

替换接口和地址。预期没有其他主机回应；出现 reply 就换一个地址。

### 8.2 安装 root helper

在两台机器上运行 `sudoedit /usr/local/sbin/fifa11-lan-run`，写入下面的脚本。每台机器只修改开头六个站点参数：

```bash
#!/usr/bin/env bash
set -euo pipefail

PARENT_IF="enp4s0"
LAN_ADDR="192.168.1.240/24"
GATEWAY="192.168.1.1"
GAME_USER="replace-with-desktop-user"
GAME_HOME="/home/replace-with-desktop-user"
LAUNCHER="$GAME_HOME/Games/FIFA11/play-local.sh"

NS="fifa11-lan"
NS_IF="fifa11mv"

if [ "$#" -ne 0 ]; then
  echo "This helper accepts no arguments." >&2
  exit 64
fi

exec 9>/run/lock/fifa11-lan.lock
flock -n 9 || { echo "FIFA 11 LAN is already running." >&2; exit 75; }

cleanup() {
  ip netns delete "$NS" 2>/dev/null || true
}
trap cleanup EXIT HUP INT TERM

if ip netns list | grep -q "^${NS}\\b"; then
  if [ -n "$(ip netns pids "$NS" 2>/dev/null)" ]; then
    echo "The old namespace still contains a process." >&2
    exit 1
  fi
  ip netns delete "$NS"
fi

ip netns add "$NS"
ip link add "$NS_IF" link "$PARENT_IF" type macvlan mode bridge
ip link set "$NS_IF" netns "$NS"
ip -n "$NS" link set lo up
ip -n "$NS" address add "$LAN_ADDR" dev "$NS_IF"
ip -n "$NS" link set "$NS_IF" up
ip -n "$NS" route add default via "$GATEWAY" dev "$NS_IF"

game_uid="$(id -u "$GAME_USER")"
runtime_dir="/run/user/$game_uid"
shell_pid="$(pgrep -n -u "$game_uid" gnome-shell || true)"

session_value() {
  local key="$1"
  [ -n "$shell_pid" ] || return 0
  tr '\0' '\n' < "/proc/$shell_pid/environ" |
    sed -n "s/^${key}=//p" | head -n 1
}

display="$(session_value DISPLAY)"
wayland_display="$(session_value WAYLAND_DISPLAY)"
dbus_address="$(session_value DBUS_SESSION_BUS_ADDRESS)"
xauthority="$(session_value XAUTHORITY)"

[ -n "$display" ] || display=":0"
[ -n "$wayland_display" ] || wayland_display="wayland-0"
[ -n "$dbus_address" ] || dbus_address="unix:path=$runtime_dir/bus"
if [ -z "$xauthority" ]; then
  xauthority="$(find "$runtime_dir" -maxdepth 1 -type f \
    -name '.mutter-Xwaylandauth.*' -print -quit)"
fi

ip netns exec "$NS" runuser -u "$GAME_USER" -- env \
  HOME="$GAME_HOME" \
  USER="$GAME_USER" \
  LOGNAME="$GAME_USER" \
  DISPLAY="$display" \
  WAYLAND_DISPLAY="$wayland_display" \
  XDG_RUNTIME_DIR="$runtime_dir" \
  DBUS_SESSION_BUS_ADDRESS="$dbus_address" \
  XAUTHORITY="$xauthority" \
  "$LAUNCHER"
```

安装并检查脚本：

```bash
sudo chown root:root /usr/local/sbin/fifa11-lan-run
sudo chmod 0755 /usr/local/sbin/fifa11-lan-run
sudo bash -n /usr/local/sbin/fifa11-lan-run
```

脚本必须由 root 持有，且不接受参数。这样 sudoers 规则不会变成任意网络命令入口。

### 8.3 只放行这一条 sudo 命令

```bash
printf '%s ALL=(root) NOPASSWD: /usr/local/sbin/fifa11-lan-run\n' "$USER" |
  sudo tee /etc/sudoers.d/fifa11-lan >/dev/null
sudo chmod 0440 /etc/sudoers.d/fifa11-lan
sudo visudo -cf /etc/sudoers.d/fifa11-lan
```

不要把 sudo 密码写进 launcher。创建 `$FIFA_ROOT/play-lan.sh`：

```bash
#!/usr/bin/env bash
exec sudo -n /usr/local/sbin/fifa11-lan-run
```

```bash
chmod +x "$FIFA_ROOT/play-lan.sh"
```

### 8.4 排除克隆 prefix 的身份冲突

两边分别运行：

```bash
wine hostname
wine reg query 'HKLM\Software\Microsoft\Cryptography' /v MachineGuid
```

如果两台机器的 `MachineGuid` 完全相同，只在其中一台生成新值：

```bash
new_guid="$(uuidgen)"
wine reg add 'HKLM\Software\Microsoft\Cryptography' \
  /v MachineGuid /t REG_SZ /d "$new_guid" /f
```

### 8.5 比较两边内容并进入房间

两台机器分别生成清单：

```bash
cd "$GAME_DIR"
sha256sum fifa.exe data?.big data?.bh data/db/fifa_ng_db.db |
  sort > "$FIFA_ROOT/lan-content.sha256"
```

把两份清单放到同一台机器后执行 `diff -u`，需要没有输出。若某些文件明确是 host-specific，再单独记录例外；不要在不知道用途时忽略差异。

最后按这个顺序进入游戏：

1. 两边都先插好手柄；
2. 两边运行各自的 `play-lan.sh`；
3. 两边使用新建 profile，不加载旧 squads；
4. Machine A 进入 LAN mode 并创建 room；
5. Machine B 刷新房间列表并加入；
6. 交换主客机再测试一次；
7. 进入比赛并至少运行几分钟后再判定成功。

`ping` 或 UDP broadcast 成功只证明网络层可达，不能代替 FIFA 房间发现测试。退出游戏后检查临时 namespace 已被删除：

```bash
ip netns list | grep fifa11-lan || echo "namespace cleaned"
```

## 故障定位

| 现象 | 检查命令 / 文件 | 处理 |
| --- | --- | --- |
| 只有屏幕角落一小块画面 | `find "$WINEPREFIX" -iname 'fifasetup*.ini'` | 同步默认配置和实际 Documents 下的用户配置 |
| DXVK 没有加载 | `file d3d9.dll`、Wine `*d3d9` override、`fifa_d3d9.log` | 使用 x32 DLL；确认 32-bit Vulkan driver |
| 启动白屏 | `sha256sum data?.big data?.bh` | 恢复完整备份；对当前最终文件树重建全部 BH |
| 报找不到 CD/DVD | `ls -l "$WINEPREFIX/dosdevices"` | 区分安装介质/DRM 问题和测试后残留的盘符链接 |
| GNOME 桌面仍显示 FIFA volume | `mount`、`losetup -l`、`lsof /dev/loopN` | 先结束仍占用镜像的 installer/Wine 进程，再正常 unmount/eject |
| `Ctrl + ←/→` 切换桌面 | `gsettings get ... switch-to-workspace-left` | 使用 launcher 临时改键并在退出时恢复 |
| `joy.cpl` 有手柄，FIFA 没输入 | 两份 `buttonDataXenon.ini` | 加入与 `joy.cpl` 完全一致的 `AddAlias` |
| 拔插后手柄失效 | `lsof /dev/hidraw*` | 退出游戏；手柄稳定重连后重新启动 |
| 两台机器互相 ping 但没有房间 | `ip netns list`、`MachineGuid`、内容 hash | 使用单网卡 namespace；确保身份与内容一致 |
| 有新球员但 LAN 仍只有固定俱乐部 | 新 profile 与原版 LAN 菜单 | 这是 roster 与游戏模式入口的区别，不是网络故障 |

## 最终验收

按顺序打勾；前一项失败时不要继续叠加下一层修改。

```text
[ ] Wine prefix 明确为 win32
[ ] vulkaninfo 能看到真实 GPU
[ ] 原版 FIFA 11 能从 Game 目录进入主菜单
[ ] fifa_d3d9.log 证明 DXVK 正在渲染
[ ] 菜单和离线比赛均为目标分辨率
[ ] joy.cpl 与 FIFA 都能接收手柄输入
[ ] Ctrl+arrow 留在游戏内，退出后 GNOME 快捷键恢复
[ ] 社区内容安装后可以进入比赛，没有白屏
[ ] 两台机器的关键内容 hash 一致
[ ] 两台机器的 computer name 与 MachineGuid 不同
[ ] 双方都能创建、发现并加入 LAN room
[ ] LAN 比赛可以实际运行数分钟
[ ] 退出后 fifa11-lan namespace 被清理
```

## References

1. [WineHQ Wiki](https://gitlab.winehq.org/wine/wine/-/wikis/home)
2. [DXVK repository and installation notes](https://github.com/doitsujin/DXVK)
3. [DXVK releases](https://github.com/doitsujin/dxvk/releases)
