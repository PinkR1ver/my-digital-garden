---
title: DeepSeek V4 Architecture Tricks
date: 2026-04-29
tags:
  - LLM
  - architecture
  - attention
  - long-context
  - MoE
  - DeepSeek
---

DeepSeek V4 的重点不是单纯把 MoE 做得更大，而是围绕 **1M-token context** 重新设计 attention、KV cache、训练优化和 agent 工具链。它代表了开源模型架构的一个新方向：模型不只要 benchmark 分数高，还要能在长上下文、多轮工具调用、长时间 agent 任务里跑得动。

截至 2026-04-29，DeepSeek V4 Preview 包括两个开源权重模型：

| Model | Total Params | Activated Params | Context |
|---|---:|---:|---:|
| DeepSeek-V4-Pro | 1.6T | 49B | 1M tokens |
| DeepSeek-V4-Flash | 284B | 13B | 1M tokens |

这里的 Activated Params 指每个 token 实际参与前向计算的参数量，详见 [[computer_sci/llm/architecture/activated_params_in_moe|Activated Params in MoE Models]]。

官方报告里最关键的效率数字是：在 1M-token context 下，DeepSeek-V4-Pro 相比 DeepSeek-V3.2 只需要约 **27% single-token inference FLOPs** 和 **10% KV cache**；DeepSeek-V4-Flash 进一步降到约 **10% FLOPs** 和 **7% KV cache**。如果和常见 BF16 GQA8 attention baseline 比，报告声称 KV cache 大约可以降到 **2%**。

## 总体设计思路

V4 继承了 DeepSeek-V3 的几个基础设计：

- Transformer decoder-only 架构。
- DeepSeekMoE：细粒度 routed experts + shared experts。
- MTP（Multi-Token Prediction）训练目标。
- Auxiliary-loss-free load balancing。

V4 的新增重点主要是：

- **Hybrid Attention**：CSA + HCA，把长上下文 attention 的计算和存储降下来。
- **mHC**：Manifold-Constrained Hyper-Connections，增强 residual path 的表达力和训练稳定性。
- **Muon optimizer**：大部分模块从 AdamW 转向 Muon，提高大模型训练收敛和稳定性。
- **FP4 / FP8 混合精度**：MoE expert weights 和 CSA indexer 的关键路径用 FP4，KV 多数维度用 FP8。
- **定制 KV cache 管理**：为 CSA/HCA/SWA 的异构 KV 设计 layout、eviction 和 on-disk prefix cache。
- **Agent-oriented post-training**：长上下文不仅用于读长文，也用于保存工具调用和 reasoning trajectory。

## Hybrid Attention

传统 full attention 在 1M context 下最大的问题是：每生成一个 token，都要和前面巨大历史做 attention，FLOPs 和 KV cache 都很难承受。DeepSeek V4 的核心 trick 是把 attention 分成两种机制，并在层间交错使用。

### CSA: Compressed Sparse Attention

CSA 的流程可以理解为：

```text
原始 token KV
  -> 每 m 个 token 压缩成 1 个 compressed KV entry
  -> lightning indexer 选择 top-k compressed KV entries
  -> query 只 attend 这些被选中的 compressed entries
  -> 额外接 sliding window branch 处理最近 token
```

在 DeepSeek-V4-Pro 的配置里：

- CSA compression rate `m = 4`。
- attention top-k = `1024`。
- indexer query heads = `64`。
- indexer head dimension = `128`。

这里有两个叠加收益：

1. 先把序列长度压缩到 1/4，KV cache 直接变短。
2. 再用 sparse attention 只看 top-k compressed blocks，不对所有 compressed entries 做 full attention。

CSA 适合保留比较细粒度的长程检索能力。它不像纯 sliding window 只看最近窗口，也不像极端压缩那样只保留很粗的摘要。

### HCA: Heavily Compressed Attention

HCA 更激进：

```text
原始 token KV
  -> 每 m' 个 token 压缩成 1 个 compressed KV entry
  -> query dense attend 所有 compressed entries
  -> 额外接 sliding window branch 处理最近 token
```

在 V4-Pro / V4-Flash 里，HCA compression rate `m' = 128`。因为序列已经被压得很短，所以 HCA 不再需要 sparse top-k selector，可以直接对 compressed stream 做 dense attention。

HCA 的直觉是：远距离上下文常常只需要粗粒度全局记忆，不需要逐 token 细节。因此 HCA 用 128:1 的压缩率换来极低的全局 attention 成本。

### CSA 和 HCA 为什么要混用

V4-Pro 有 61 层：

- 前 2 层使用 HCA。
- 后续层 CSA 和 HCA 交替。
- MTP block 使用 sliding-window only。

这说明 DeepSeek 没有假设所有层都需要同一种 attention pattern。不同层可能承担不同角色：

- HCA 层维护便宜的全局摘要。
- CSA 层做更细粒度的稀疏长程检索。
- Sliding window branch 保留最近上下文的精细 token-level 信息。

这个设计比“所有层都 sparse”或“所有层都 window attention”更灵活。

## 压缩 KV 的具体 trick

CSA/HCA 不是简单平均池化 KV。它们会学习 compression weights 和 positional bias，再做 softmax-gated pooling。

粗略形式是：

```text
hidden states -> KV candidates
hidden states -> compression weights
compression weights + learnable positional bias -> softmax
weighted sum -> compressed KV entry
```

这意味着模型可以学习“一个 block 内哪些 token 对压缩摘要更重要”，而不是机械平均。

CSA 还用了 overlapped compression：压缩当前 block 时，也会看相邻前一个 block 的候选 KV。这可以缓解 block boundary 上的信息损失。

## Sliding Window Branch

压缩 attention 有一个天然问题：query 对自己所在 compressed block 内的其他 token 访问不够细，而且最近 token 往往最重要。V4 的解决方式是在 CSA/HCA 外加一条 sliding-window attention branch。

在 V4-Pro / V4-Flash 中，window size `nwin = 128`。

可以把 V4 attention 想成：

```text
long-range memory: compressed KV entries
short-range detail: uncompressed sliding window KV
```

这个组合很像人类读长文：远处内容记摘要，近处内容看原文。

## Partial RoPE 和 Attention Sink

V4 在 CSA/HCA 中只对部分维度使用 RoPE：

- 对 query、KV entry、core attention output 的最后 64 维应用 RoPE。
- RoPE 维度在 KV cache 中保持 BF16。
- 其他 KV 维度使用 FP8。

原因是位置相关维度对精度更敏感；其余维度可以低精度存储来省 KV cache。

V4 还用了 attention sink。每个 head 有 learnable sink logits，可以让注意力总质量不必严格分配给历史 token。换句话说，模型可以选择“这次没有必要强行 attend 某些历史信息”。这对超长上下文很重要，因为不是每个 query 都需要从 1M tokens 里找东西。

## mHC: Manifold-Constrained Hyper-Connections

传统 Transformer block 通常是：

```text
x_{l+1} = x_l + F_l(x_l)
```

mHC 把 residual stream 扩展成多个通道，再通过动态生成的映射进行混合：

```text
X_l: n_hc 个 residual channels
A_l: 把多个 residual channels 混成当前 layer input
B_l: residual channels 之间的状态转移
C_l: 把 layer output 写回 residual channels
```

V4 的 mHC expansion factor `n_hc = 4`。

关键 trick 是把 residual mapping `B_l` 约束到 doubly stochastic matrix 的流形上，也就是 Birkhoff polytope：

- 每行和为 1。
- 每列和为 1。
- 元素非负。

这个约束带来一个重要性质：mapping 的 spectral norm 被限制住，残差状态传播不会无限放大。普通 Hyper-Connections 在深层堆叠时容易不稳定，mHC 用这个数学约束换稳定性。

直觉上，mHC 是在 residual path 上增加“多条记忆通道”，但禁止这些通道用不受控的方式互相放大。

## DeepSeekMoE 的小改动

V4 继续使用 DeepSeekMoE，但做了一些工程上重要的小调整：

- affinity score activation 从 `Sigmoid` 改为 `Sqrt(Softplus)`。
- 继续使用 auxiliary-loss-free load balancing。
- 增加轻微 sequence-wise balance loss，避免单个 sequence 内专家极端不均衡。
- 取消 routing target nodes 数量约束，重新设计并行策略。
- 前 3 个 MoE layers 用 Hash routing。

V4-Pro 配置：

- 1 shared expert。
- 384 routed experts。
- 每 token 激活 6 个 routed experts。
- expert intermediate hidden dimension = 3072。

V4-Flash 配置：

- 1 shared expert。
- 256 routed experts。
- 每 token 激活 6 个 routed experts。
- expert intermediate hidden dimension = 2048。

这里的趋势是：MoE 本身不是新东西，但为了超大规模训练和 agent workload，需要更稳定的 load balance 和更可控的早期层 routing。

## Muon Optimizer

V4 的另一个大变化是训练优化器。它不是全模型都用 AdamW：

- AdamW：embedding、prediction head、RMSNorm weights、部分 mHC 参数。
- Muon：其他大部分模块。

Muon 的核心思想是对 update matrix 做近似正交化，让参数更新方向更稳定。V4 使用 hybrid Newton-Schulz iterations：

- 前 8 步用一组激进系数，快速把 singular values 推近 1。
- 后 2 步用更稳定的系数，把 singular values 稳住。

V4 还提到，因为 attention queries 和 KV entries 直接做 RMSNorm，attention logits 不容易爆，所以不需要额外 QK-Clip。

这说明现在前沿开源模型的“架构”已经不只是 layer design，还包括 optimizer 与 normalization 的配合。

## FP4 / FP8 Quantization-Aware Training

V4 在 post-training 阶段加入 FP4 QAT，主要用于两处：

1. **MoE expert weights**：专家权重是显存大头，FP4 可以明显降低部署成本。
2. **CSA indexer 的 QK path**：长上下文里 top-k selector 本身也很贵，QK activations 缓存、加载、乘法都用 FP4。

它还把 index scores 从 FP32 降到 BF16，报告中称 top-k selector 有约 2x speedup，并保持 99.7% KV entry recall。

一个值得注意的工程 trick 是：FP4 expert weights 会 dequantize 到 FP8 计算，而报告认为 FP4 到 FP8 的 dequantization 可以是 lossless，因为 FP8 有更大的 exponent range，能吸收细粒度 scale 信息。

## Heterogeneous KV Cache Layout

V4 的 attention 不是单一 KV cache：

- CSA compressed KV。
- HCA compressed KV。
- CSA indexer KV。
- SWA uncompressed KV。
- compression branch 里还没凑够 block 的 uncompressed tail states。

这破坏了传统 PagedAttention 的一个重要假设：每层、每请求的 KV block 大小和访问策略比较统一。V4 因此做了定制 KV layout：

- **Classical KV cache**：存 CSA/HCA 的 compressed KV。
- **State cache**：存 SWA KV 和还没完成压缩的 tail tokens。
- 每个 classical cache block 覆盖 `lcm(m, m')` 个原始 token，以同时对齐 CSA/HCA 的压缩粒度。

对于 prefix cache，V4 还用了 on-disk KV cache：

- CSA/HCA：把 compressed KV entries 存盘，命中 shared prefix 时读取复用。
- Tail incomplete block：因为未压缩 KV 没存，仍要重算。
- SWA：提供三种策略：
  - Full SWA caching：全存，计算零冗余，但写入压力大。
  - Periodic checkpointing：每隔 `p` tokens 存最近窗口，命中后从 checkpoint 恢复再重算尾部。
  - Zero SWA caching：不存 SWA，只靠 cached CSA/HCA 重算最近窗口。

这说明长上下文模型的服务端 cache 已经从“存不存 KV”变成“不同 attention 分支分别怎么存、怎么淘汰、怎么重算”的系统问题。

## Agent-oriented Post-training

V4 的长上下文不是只为了长文档问答，也明显是为了 agent。

### Three reasoning modes

V4 支持三种 reasoning effort：

| Mode | 设计目标 | 格式 |
|---|---|---|
| Non-think | 快速响应，适合日常任务 | `</think> summary` |
| Think High | 中等复杂问题，显式 reasoning | `<think>...</think> summary` |
| Think Max | 最大推理预算，探索模型能力边界 | system prompt + `<think>...</think> summary` |

Think Max 本质上是把 test-time compute 做成产品形态：同一个模型根据推理预算切换行为。

### DSML tool-call schema

V4 引入 `|DSML|` special token 和 XML-style tool call schema。它的目标是降低传统 JSON tool-call 的 escaping failure。

设计上区分：

- string parameter：原样传，`string="true"`。
- 非 string parameter：JSON 格式传，`string="false"`。

这不是模型 backbone 的架构，但属于 agent model 的接口架构。对 agent 来说，工具调用格式的稳定性会直接影响任务完成率。

### Interleaved thinking

V3.2 的策略是：工具结果轮次之间保留 reasoning trace，但新 user message 到来时丢弃旧 thinking。

V4 在工具调用场景下改成：跨工具轮次、跨用户消息都保留完整 reasoning history。普通聊天场景仍然在新 user message 到来时清理旧 thinking，避免上下文浪费。

这个设计依赖 1M context。没有便宜长上下文，保留完整 agent trajectory 会非常昂贵。

## 对开源架构趋势的判断

DeepSeek V4 体现了几个新的开源 LLM 架构趋势：

### 1. Long context 从窗口大小竞争变成成本竞争

以前说模型支持 128K / 1M context，重点像是在比最大长度。V4 的核心是：1M context 必须让单 token decode 成本和 KV cache 成本可接受，否则 agent 用不起。

### 2. Attention 开始走混合形态

单一 full attention、单一 sliding window、单一 sparse attention 都不够。新方向是：

```text
compressed global memory + sparse retrieval + local exact window
```

这种组合比纯扩 context 更接近真实任务需求。

### 3. KV cache 成为模型架构的一部分

KV cache 不再只是推理实现细节。CSA/HCA/SWA 的设计会直接决定：

- cache entry 的形态。
- cache hit 的粒度。
- on-disk cache 怎么存。
- prefix 命中后要重算哪些 tail states。

这和 [[computer_sci/llm/inference/llm_cache_hit|LLM cache hit]] 直接相关。

### 4. Residual path 也成为 scaling axis

mHC 的思路说明，除了加深、加宽、加专家，residual stream 本身也可以扩展和约束。它给模型提供更多跨层信息通道，但必须用 manifold constraint 保稳定。

### 5. 训练优化器和架构开始共同设计

Muon、RMSNorm on Q/KV、去掉 QK-Clip、mHC 稳定化，这些不是独立 trick，而是配套系统。大模型训练越来越像“architecture + optimizer + numerical format”的联合设计。

### 6. Agent 能力需要接口和基础设施配合

V4 的 agent 改进不只是模型变聪明，还包括：

- DSML tool-call schema。
- interleaved thinking context policy。
- DSec sandbox。
- preemptible rollout service。
- token-granular WAL。

开源模型如果要追上闭源 agent 表现，可能不只需要权重，还需要完整的工具调用协议、sandbox 和训练环境。

## Quick Reference

| Trick | 解决的问题 | 核心做法 | 代价 / 风险 |
|---|---|---|---|
| CSA | 长上下文细粒度检索太贵 | 4:1 KV compression + sparse top-k attention | indexer 和压缩器更复杂 |
| HCA | 1M 全局上下文存储和计算太贵 | 128:1 KV compression + dense attention on compressed stream | 远程细节损失更大 |
| Sliding window branch | 压缩 attention 损失局部细节 | 最近 128 tokens 保留未压缩 KV | 仍需维护额外 SWA cache |
| Partial RoPE | 位置维度需要高精度，KV 又要省 | RoPE 维度 BF16，其余 FP8 | cache layout 更异构 |
| Attention sink | 超长上下文里不必强制 attend 历史 | learnable sink logits | 行为解释更复杂 |
| mHC | residual path 表达不足或不稳定 | 多 residual channels + doubly stochastic constraint | 实现复杂，需要投影/归一化 |
| Muon | 大模型训练收敛和稳定性 | update matrix orthogonalization | 分布式实现复杂 |
| FP4 QAT | expert weights 和 indexer 太占资源 | MoE experts / QK path 用 FP4 | 需要 QAT 适配 |
| On-disk KV cache | shared prefix 反复 prefill 太贵 | compressed KV 存盘，SWA 分策略恢复 | 命中粒度和重算逻辑复杂 |
| DSML tool schema | 工具调用解析错误 | special token + XML-style tool call | 生态需要适配 |

## 我的理解

DeepSeek V4 的核心贡献可以总结为一句话：

> 把长上下文从“模型参数能力”变成“可部署系统能力”。

它的架构 trick 不是孤立的。CSA/HCA 降低 attention 成本，FP4/FP8 降低存储和计算成本，mHC/Muon 让模型能稳定训练，定制 KV cache 让服务端能利用 shared prefix，DSML/DSec 让 agent rollout 和工具调用更可靠。

这也是未来开源 LLM 架构的一个重要方向：**模型结构、推理 cache、训练优化器、工具协议和 sandbox 基础设施会越来越难分开讨论。**

## Sources

- [DeepSeek V4 Preview Release](https://api-docs.deepseek.com/news/news260424)
- [DeepSeek_V4 Technical Report](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main/DeepSeek_V4.pdf)
- [DeepSeek-V4: a million-token context that agents can actually use](https://huggingface.co/blog/deepseekv4)
