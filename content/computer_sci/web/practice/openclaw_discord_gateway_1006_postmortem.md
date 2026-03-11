---
title: OpenClaw Discord Bot 1006 断连修复复盘（Clash + DNS + TUN）
tags:
  - openclaw
  - discord
  - clash
  - dns
  - websocket
  - proxy
  - curl
  - troubleshooting
date: 2026-03-11
---

> 目标：解释为什么 Telegram 正常、Discord 反复离线，以及最终如何修复。  
> 场景：OpenClaw 网关在 Linux 主机上，通过 Clash/Mihomo 出海。

---

## 1. 现象与关键症状

### 现象
- Telegram bot 基本可用。
- Discord bot 显示 offline / 间歇上线后又掉线。

### 日志中的关键报错
- `discord gateway: WebSocket connection closed with code 1006`
- `discord gateway error: AggregateError`
- `ETIMEDOUT ...:443`
- `Client network socket disconnected before secure TLS connection was established`
- 曾出现 `ERR_TLS_CERT_ALTNAME_INVALID`（证书域名与 gateway.discord.gg 不匹配）

这些都指向：**Discord Gateway（WSS 长连接）链路不稳定或被错误代理路径污染**。

---

## 2. 为什么 Telegram 能用，Discord 不稳？

- **Telegram Bot API** 主要走 HTTPS 请求（轮询/短连接），对网络抖动容忍更高。
- **Discord Bot** 依赖长期 WebSocket（`wss://gateway.discord.gg`），对 TLS/代理稳定性更敏感。

所以会出现：
- `curl` 到 Discord API 看起来通（401 正常）
- 但 WebSocket 仍持续 1006 掉线

---

## 3. DNS 层踩坑总结

### 3.1 systemd-resolved 的 127.0.0.53
- `/etc/resolv.conf` 中的 `127.0.0.53` 不是外部 DNS，而是本机 DNS stub。
- 真正上游 DNS 由 networkd/netplan/DHCP 决定。

### 3.2 netplan 在这次问题里的作用（重点）
这次一个关键学习点：**Linux 上“改 DNS”不只是改 `/etc/resolv.conf`**。

在 `systemd-networkd + netplan` 环境下，推荐通过 netplan 管理 DNS：

```yaml
network:
  version: 2
  ethernets:
    enp15s0:
      dhcp4: true
      dhcp4-overrides:
        use-dns: false
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1
```

应用方式：

```bash
sudo netplan generate
sudo netplan apply
sudo resolvectl flush-caches
```

验证方式：

```bash
resolvectl status
resolvectl query discord.com
```

### 3.3 典型误区
- `nslookup discord.com 8.8.8.8` 成功，不代表系统默认解析就正常。
- `ping discord.com` 失败，可能是系统 resolver 仍在用错误上游。
- Telegram/聊天软件会吞掉 YAML 缩进，远程复制配置时极易写坏 netplan 文件。

### 3.4 结论
- 必须确认 `resolvectl query discord.com` 在系统默认路径下也正常。
- 需要“持久”改 DNS 时，优先用 netplan/networkd，而不是临时命令。

---

## 4. Clash fake-ip/TUN 踩坑总结

### 4.1 fake-ip 现象
曾出现 `gateway.discord.gg -> 198.18.x.x`（fake-ip 网段），并伴随 TLS 异常。

### 4.2 fake-ip 工作原理（这次最关键的知识点）
`fake-ip` 本质是 Clash 的 DNS 劫持/映射机制：

1. 应用查询域名（比如 `gateway.discord.gg`）
2. Clash DNS 不直接返回真实公网 IP，而是返回一个保留地址（常见 `198.18.0.0/16`）
3. 当应用连这个 fake IP 时，Clash 再在内部映射回真实域名与上游目标，并按规则转发

优点：
- 规则命中更稳定（尤其域名规则）
- 减少真实 DNS 泄漏

代价与风险：
- 某些协议/客户端对 fake-ip 路径敏感（特别是长连接、严格 TLS/SNI 场景）
- 一旦映射链路异常，会出现“DNS 看似正常、TLS/WS 失败”的诡异问题

### 4.3 核心原则
对 Discord 这类敏感长连接域名，建议加入 `fake-ip-filter`，避免 fake-ip 路径造成歧义：

```yaml
dns:
  fake-ip-filter:
    - "+.discord.com"
    - "+.discord.gg"
    - "+.discordapp.com"
    - "+.discord.media"
    - "+.gateway.discord.gg"
```

### 4.3 TUN 与 env proxy 的关系
- 开启 TUN 后，不代表环境变量代理失效。
- 如果 `HTTP_PROXY/HTTPS_PROXY` 仍在，部分应用仍可能优先走 7890。
- 结论：可并存；排障时要明确到底走哪条路径。

---

## 5. 真正根因（这次）

最终定位到：**代理出口路径不稳定/混杂**，导致 Discord Gateway TLS/WS 反复异常。  
表现为：
- 有时能登录 Discord
- 随后 1006 + 反复 backoff 重连
- 偶发证书 altname 异常（说明经过了不应出现的中间路径）

---

## 6. 有效修复策略（实践版）

1. **恢复干净配置文件**（不要在损坏 YAML 上继续补丁）
2. **保持 TUN 启用**（统一接管流量）
3. **为 Discord 单独规则固定出口**（不要走 balancer/自动切）
   - `gateway.discord.gg`
   - `discord.com`
   - `discord.gg`
4. **Discord 域名加入 fake-ip-filter**
5. 重启 Clash + OpenClaw 网关
6. 观察日志 2~3 分钟，确认不再出现 `1006/AggregateError/TLS` 错误

---

## 7. 推荐的验证命令清单

### DNS 与 HTTP
```bash
resolvectl query discord.com
resolvectl query gateway.discord.gg
curl -I --max-time 10 https://discord.com/api/v10/gateway/bot
```

### Gateway 可达性（参考）
```bash
curl -v --max-time 10 "https://gateway.discord.gg/?v=10&encoding=json"
```

> 注意：这里返回 404 并不一定等于故障；要结合 WS 日志判断。

### OpenClaw 核心观测
```bash
openclaw status --deep
openclaw logs --follow | grep -Ei "discord|1006|AggregateError|ETIMEDOUT|TLS|logged in to discord"
```

---

## 8. 这次修复的关键经验（可写进博客）

- `curl 通` ≠ `WebSocket 稳`。
- Telegram 可用不代表 Discord 也可用（协议模型不同）。
- DNS、fake-ip、代理出口组（尤其 balancer）会叠加影响。
- 先把配置恢复干净，再做最小可验证改动，效率最高。
- 排障标准要看“持续稳定日志”，不是单次成功。

---

## 9. 一句话结论

这次不是 OpenClaw 配错，而是 **Discord Gateway 长连接对代理链路稳定性要求更高**；通过 **干净配置 + TUN + Discord 专用固定出口 + fake-ip 过滤** 才能稳定上线。
