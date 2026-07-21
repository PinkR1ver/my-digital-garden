---
title: AI 模型的内存、带宽与 Kimi K3 部署估算
date: 2026-07-21
tags:
  - LLM
  - inference
  - hardware
  - MoE
---

本地运行 AI 模型，不能只比较显卡算力。真正需要同时看的，是：

1. **内存容量**：模型能不能装下。
2. **内存带宽**：生成 Token 时，权重能多快送到处理器。
3. **计算能力**：提示词处理、矩阵计算和并发能力。

简单说：

```text
容量决定能不能跑
带宽影响生成速度
算力影响提示词处理和总体吞吐
```

## 参数量怎么换算成内存

只计算模型权重时：

```text
权重内存 = 参数量 × 每个参数占用的字节数
```

| 精度 | 每个参数 | 70B 模型 | 2.8T 模型 |
|---|---:|---:|---:|
| FP16 / BF16 | 2 Byte | 140 GB | 5.6 TB |
| FP8 / INT8 | 1 Byte | 70 GB | 2.8 TB |
| INT4 / MXFP4 | 0.5 Byte | 35 GB | 1.4 TB |

实际部署还需要 [[computer_sci/llm/inference/KV_cache|KV Cache]]、运行时缓冲区、通信空间、CUDA Graph 和显存碎片，因此不能把全部显存都拿来存权重。比较稳妥的做法，是让权重只占可用显存的约 75%～85%。

以 70B INT4 为例，纯权重约为 35 GB，也就是约 32.6 GiB。32 GB 显存无法把它完整放进 GPU，但仍可以用 CPU 内存卸载的方式运行，只是速度会明显下降。因此，“显存装不下”更准确的意思是**不能完整 GPU 加速**，不等于程序绝对无法启动。

## 独立显卡与统一内存

独立显卡通常拥有更高的显存带宽和矩阵算力，但显存容量有限。统一内存设备让 CPU 和 GPU 共用一块大内存，更容易装下大模型，代价通常是带宽和计算能力较弱。

对于单用户、小 batch 的 Decode，可以用下面的公式理解带宽上限：

```text
理论 Token 速度 ≈ 有效内存带宽 ÷ 每个 Token 需要读取的权重
```

例如，一个稠密模型每个 Token 需要读取约 40 GB 权重，设备有效带宽为 256 GB/s，那么理想上限约为 6.4 Token/s。真实速度还会受到计算、缓存、框架效率和内存利用率影响，一般低于这个数字。

## MoE 为什么不一样

MoE 需要区分 [[computer_sci/llm/architecture/activated_params_in_moe|总参数量和激活参数量]]：

- **总参数量**决定保存完整模型需要多少内存。
- **激活参数量**更接近每个 Token 的计算量和权重读取量。

MoE 每次只选择部分专家参与计算，因此可以让模型拥有很大的总容量，同时把单 Token 计算量控制在较低水平。不过，全部专家仍然必须存放在内存中，而且 Token 需要在不同 GPU 的专家之间路由。

所以 MoE 省的是计算，不是模型容量；它还会增加 Expert Parallel、All-to-All 通信和负载均衡的复杂度。

## Prefill 和 Decode 是两个瓶颈

- **Prefill**：先处理用户输入的提示词，可以并行计算，更容易受到算力限制。
- **Decode**：逐个生成 Token，低 batch 时更容易受到内存带宽和通信延迟限制。
- **KV Cache**：随着上下文长度和并发数增长，持续占用额外内存。

所以，大容量统一内存虽然能装下模型，却不一定有理想的首 Token 延迟和生成速度。长上下文还会同时增加 Prefill 时间与 KV Cache 占用。

## Kimi K3 的硬件需求

截至 2026-07-21，Kimi 官方公布的 K3 信息包括 [[1]](#ref-kimi-k3)：

- 2.8T 总参数。
- 896 个 MoE 专家，每个 Token 激活 16 个。
- Kimi Delta Attention、Attention Residuals 和 Stable LatentMoE。
- 原生视觉能力和 1M Token 上下文。
- 从 SFT 阶段开始进行量化感知训练，使用 MXFP4 权重和 MXFP8 激活。
- 建议部署在包含 64 个或更多加速器的 Supernode 上。
- 完整权重与更多技术细节计划于 2026-07-27 发布。

### FP16 权重容量

如果假设存在完整的 FP16 权重：

```text
2.8T × 2 Byte = 5.6 TB ≈ 5.09 TiB
```

这是纯权重容量。考虑运行时空间：

| 场景 | 建议聚合 HBM |
|---|---:|
| 勉强加载、极低并发 | 约 6～7 TB |
| 低并发推理 | 约 7～8 TB |
| 长上下文或生产服务 | 约 10～14 TB |

K3 使用 KDA 和 Gated MLA，官方尚未发布完整配置，因此暂时无法精确计算 1M 上下文的 KV Cache。上述数字是容量规划值，不是官方最低配置。

### FP16 带宽估算

官方只公布了 `16 / 896` 的专家选择比例，没有公布精确的 activated params。若先假设专家权重占总参数的绝大部分：

```text
2.8T × 16 / 896 ≈ 50B
```

这只是 routed experts 的近似下限，没有完整计入始终激活的 Attention、共享专家和其他稠密参数。按照约 50B 估算，FP16 每 Token 至少需要读取约 100 GB 激活权重：

| 单路 Decode 目标 | FP16 最低有效带宽 | MXFP4 专家权重下限 |
|---:|---:|---:|
| 5 Token/s | 0.5 TB/s | 0.125 TB/s |
| 10 Token/s | 1 TB/s | 0.25 TB/s |
| 20 Token/s | 2 TB/s | 0.5 TB/s |
| 50 Token/s | 5 TB/s | 1.25 TB/s |

这些数字表示理想情况下真正用于读取激活权重的**有效聚合带宽**，不是购买硬件时直接把标称带宽相加就一定能获得的速度。K3 的实际瓶颈还包括专家路由、KDA、计算 kernel、跨 GPU 通信和 batch 中的专家复用。

## 推荐配置

### 生产部署：GB300 NVL72

一套 NVIDIA GB300 NVL72 包含 72 张 Blackwell Ultra GPU，提供 20 TB HBM、最高 576 TB/s 聚合 HBM 带宽和 130 TB/s NVLink 带宽 [[2]](#ref-gb300)。它满足 Kimi 官方提出的 `64+ accelerators`，并让 72 张 GPU 处于同一个大 NVLink 域，适合高稀疏 MoE 的 Expert Parallel。

对于 K3 FP16，这套配置有足够空间容纳约 5.6 TB 权重，并为 KV Cache、通信缓冲区和并发留下较大余量。

### 较低成本：GB200 NVL72

GB200 NVL72 同样提供一个 72 GPU NVLink 域，拥有约 13.4 TB HBM、576 TB/s 聚合 HBM 带宽和 130 TB/s NVLink 带宽 [[3]](#ref-gb200)。它也足以部署 FP16 K3，但面对 1M 上下文和较高并发时，显存余量少于 GB300。

普通的多台八卡服务器也可以凑出足够显存，但每个 NVLink 域通常只有 8 张 GPU，跨节点依赖 InfiniBand。对于 K3 这种每 Token 选择 16 个专家的高稀疏模型，通信拓扑可能比显存容量更早成为瓶颈。

## 最实际的结论

Kimi K3 并不是面向家用电脑或普通八卡服务器的本地模型。它的 FP16 权重约为 5.6 TB，合理的部署单位已经是一整套 72 GPU Supernode。

而且 K3 本身针对 MXFP4 权重进行了量化感知训练。MXFP4 的纯权重理论下限约为：

```text
2.8T × 0.5 Byte = 1.4 TB
```

实际 checkpoint 还会包含量化比例尺、非量化层和其他数据。更重要的是，如果官方只发布 MXFP4 权重，把它展开成 FP16 只会放大存储和带宽需求，不能恢复量化前的信息，也不一定提高模型质量。

因此，真正准备部署 Kimi K3 时，应该优先选择：

```text
官方 MXFP4 checkpoint
+ 64/72 GPU Supernode
+ 大 NVLink 域
+ 针对 KDA 与 Expert Parallel 优化的推理框架
```

FP16 更适合作为硬件容量的理论估算，不是 Kimi K3 最合理的生产部署精度。

## References

<a id="ref-kimi-k3"></a>[1] Moonshot AI, [Kimi K3: Open Frontier Intelligence](https://www.kimi.com/blog/kimi-k3), 2026-07-16.

<a id="ref-gb300"></a>[2] NVIDIA, [NVIDIA GB300 NVL72](https://www.nvidia.com/en-us/data-center/gb300-nvl72/).

<a id="ref-gb200"></a>[3] NVIDIA, [NVIDIA GB200 NVL72](https://www.nvidia.com/en-us/data-center/gb200-nvl72/).
