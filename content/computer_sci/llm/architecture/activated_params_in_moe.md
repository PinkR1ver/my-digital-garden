---
title: Activated Params in MoE Models
date: 2026-04-29
tags:
  - LLM
  - architecture
  - MoE
  - inference
---

Activated Params 指的是：**模型在处理一个 token 时，实际参与前向计算的参数量**。

它通常出现在 MoE（Mixture of Experts）模型里。MoE 模型会有很多 expert，但每个 token 只路由到其中一小部分 expert。因此，一个模型可以有非常大的 total params，但每个 token 实际只激活其中一部分参数。

## Total Params vs Activated Params

| 概念 | 含义 | 影响 |
|---|---|---|
| Total Params | 模型 checkpoint 中所有参数的总量 | 权重存储、加载、显存/内存占用、分布式部署复杂度 |
| Activated Params | 单个 token 前向计算时实际用到的参数量 | 单 token 计算量、推理吞吐、训练 FLOPs 的主要估计 |

对于 dense model，这两个数通常很接近。比如一个 70B dense Transformer，生成每个 token 时大部分参数都会参与计算，所以可以粗略说：

```text
total params ~= activated params
```

但对 MoE model，不同：

```text
total params >> activated params
```

例如 [[computer_sci/llm/architecture/deepseek_v4_architecture_tricks|DeepSeek V4]] [[5]](#ref-deepseek-v4):

| Model | Total Params | Activated Params |
|---|---:|---:|
| DeepSeek-V4-Pro | 1.6T | 49B |
| DeepSeek-V4-Flash | 284B | 13B |

意思是：V4-Pro 的 checkpoint 里一共有 1.6T 参数，但每处理一个 token 时，实际参与计算的大约是 49B 参数。

## 这个概念的历史

Activated params 不是 DeepSeek V4 才提出的。更准确地说，它来自更早的 **conditional computation** 和 **sparse MoE** 思路：模型总容量可以很大，但每个输入只激活其中一部分子网络 [[1]](#ref-bengio2013)。

### 1990s: Mixture of Experts 的早期形式

MoE 本身很早就有。早期 Mixture of Experts 主要是把多个 expert network 组合起来，由 gating network 决定不同输入应该交给哪些 experts [[2]](#ref-jacobs1991)。这个时期的重点是“分而治之”和专家组合，还不是今天 LLM 里常说的 trillion-parameter sparse model。

### 2017: Sparsely-Gated MoE 明确提出 conditional computation

Shazeer et al. 的 **Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer** 是现代大规模 MoE 的关键节点 [[3]](#ref-shazeer2017)。它明确把 sparse gating 和 conditional computation 结合起来：每个 example 只激活一部分 experts，从而在不同比例增加计算量的情况下扩大模型容量。

这里已经有 activated params 的核心思想：

```text
model capacity 很大
but per-example active computation 很小
```

只是当时更常用的说法是 active experts、conditional computation、sparsely-gated MoE，而不是今天模型卡片里常见的 `active params` 指标。

### 2021: Switch Transformer 把 trillion params 和 sparse activation 绑定

Google 的 **Switch Transformer** 把这个概念推到 trillion-parameter language model 的语境里 [[4]](#ref-switch2021)。它用 top-1 routing：每个 token 在 MoE layer 里只选择 1 个 expert。

这篇论文的重点不是“每个 token 有多少 activated params”这个表格字段，而是：

```text
可以把 total params 扩到非常大，同时让每 token 的计算成本近似保持不变
```

所以 Switch Transformer 让大众第一次强烈感受到：一个 1T+ 参数模型不一定意味着每个 token 都要计算 1T+ 参数。

### 2021-2022: GLaM 开始用 total vs active 解释 LLM MoE

Google 的 **GLaM: Efficient Scaling of Language Models with Mixture-of-Experts** 更接近现在的表达方式 [[5]](#ref-glam2022)。GLaM 最大模型有约 1.2T total params，但每个 token 只激活其中一小部分参数。它也系统地把 MoE 和 dense GPT-3 这类模型做 compute / quality 对比。

从这个阶段开始，“总参数量”和“实际激活参数量”成为理解 MoE LLM 的关键对照。

### 2023-2024: Mixtral 让 open-weight 社区熟悉 active params

Mistral 的 **Mixtral 8x7B** 对开源社区影响很大 [[6]](#ref-mixtral2023)。它是一个 Sparse MoE：每层有 8 个 experts，每个 token 选 2 个。模型大约有 46.7B total params，但每个 token 只使用约 12.9B active params。

这时 `total params / active params` 变成模型介绍、硬件需求、推理速度讨论里的常见表达。很多人第一次因为 Mixtral 产生这个问题：

> 为什么 8x7B 模型不是 56B dense model 的速度和显存逻辑？

答案就是 activated params 和 total params 是两回事。

### 2024-2026: DeepSeek、DBRX、Qwen-MoE 等继续普及这个指标

后续开源 MoE LLM 普遍会同时报告 total params 和 activated params。例如 DeepSeek 系列、DBRX、Qwen-MoE、Mixtral 后续模型等。到了 DeepSeek V4 这种模型，`1.6T total / 49B activated` 已经是标准宣传格式 [[7]](#ref-deepseek-v4)。

所以可以这样理解历史：

```text
MoE idea: 1990s
sparse conditional computation at scale: 2017 Sparsely-Gated MoE
trillion-parameter sparse LLM: 2021 Switch Transformer
total vs active params as common LLM metric: 2021-2022 GLaM, 2023 Mixtral 后广泛普及
```

因此，Activated Params 不是一个独立于 MoE 的新概念；它基本是 sparse MoE / conditional computation 在大模型时代的一个指标化表达。

## 为什么 MoE 会有这个区别

Transformer 的一层通常有两个大模块：

```text
Attention
FFN / MLP
```

在 dense Transformer 里，每层的 FFN 是固定的。每个 token 都会通过同一个 FFN。

MoE 把 FFN 替换成多个 experts：

```text
token hidden state
  -> router / gate
  -> select top-k experts
  -> selected experts compute
  -> combine expert outputs
```

假设一层有 256 个 experts，但每个 token 只激活 6 个 experts，那么这个 token 不会计算剩下 250 个 experts。那些 experts 的参数存在于模型里，但没有被当前 token 使用。

这就是 activated params 小于 total params 的核心原因。

## 一个简化例子

假设一个 toy MoE layer：

- Attention 参数：1B。
- Router 参数：很小，可以先忽略。
- 有 8 个 FFN experts。
- 每个 expert 2B 参数。
- 每个 token 只选 2 个 experts。

那么这一层相关的 total params 是：

```text
1B attention + 8 * 2B experts = 17B
```

但单个 token 的 activated params 大约是：

```text
1B attention + 2 * 2B selected experts = 5B
```

所以：

```text
total params = 17B
activated params = 5B
```

这个模型的“容量”像 17B，但单 token 计算成本更接近 5B。

## 为什么要关心 activated params

### 1. 它更接近推理计算成本

推理时，每生成一个 token，真正要做矩阵乘法的是 activated path 上的参数。因此 activated params 比 total params 更接近单 token FLOPs。

不过它不是完整推理成本。真实推理还包括：

- attention FLOPs，尤其长上下文下很重要。
- KV cache 读写。
- router 计算。
- expert dispatch / combine 的通信开销。
- batch size 和 token routing 是否均衡。
- 低精度 kernel 的实际效率。

所以 activated params 是一个有用的近似，但不是 latency 的完整解释。

### 2. 它解释了“巨大模型为什么还能跑”

MoE 的主要卖点是：

```text
大 total params -> 大知识/能力容量
小 activated params -> 可接受的单 token 计算量
```

DeepSeek-V4-Pro 这种 1.6T total params 的模型，如果每个 token 都要计算 1.6T 参数，部署成本会非常夸张。MoE 让它每 token 只激活 49B 左右，从而让超大模型变得更可运行。

### 3. 它也解释了 MoE 的部署难点

Activated params 小，不代表部署就简单。

因为 total params 仍然要存放在某个地方。即使每个 token 只用一小部分 experts，服务系统也要能：

- 保存全部 experts 权重。
- 快速找到当前 batch 需要的 experts。
- 把 token dispatch 到对应 expert 所在设备。
- 处理不同 experts 负载不均衡。
- 在多 GPU / 多节点之间做通信。

因此 MoE 是用“系统复杂度”换“单 token 计算效率”。

## Activated Params 怎么估算

一个粗略公式：

```text
activated params
≈ always-on params + selected expert params
```

其中 always-on params 包括：

- embedding / output head。
- attention layers。
- layer norm / RMSNorm。
- router / gate。
- shared experts。
- 其他每个 token 都会经过的模块。

selected expert params 包括：

```text
每层被选中的 routed experts 参数量之和
```

如果每层有 `E` 个 experts，每个 token 选 `k` 个 experts，那么该层 FFN 部分的激活比例大约是：

```text
k / E
```

但真实模型里还会有 shared expert、不同层 expert 规模不同、attention 参数始终激活等因素，所以不能直接用 `total_params * k / E` 得出 activated params。

## 容易误解的点

### Activated params 不是显存占用

即使每 token 只激活 49B 参数，模型服务仍然需要存放完整 1.6T 权重，或者通过分布式、offload、分层加载等方式访问完整权重。

所以：

```text
activated params -> compute cost
total params -> storage / deployment footprint
```

### Activated params 不是每次都完全一样

在 MoE 中，不同 token 会被 router 分配到不同 experts。单 token 激活的 experts 数量通常固定，但具体是哪几个 experts 会变化。

如果某些 experts 被大量 token 选中，会造成负载不均衡，影响吞吐和延迟。因此 MoE 训练里常见 load balancing 技术。

### Activated params 不能单独判断模型速度

两个模型即使 activated params 相同，速度也可能差很多，因为：

- attention 结构不同。
- context length 不同。
- KV cache 大小不同。
- expert 分布是否跨节点。
- precision 是 BF16、FP8 还是 FP4。
- kernel 是否优化。

DeepSeek V4 就是一个好例子：它除了 activated params 外，还通过 CSA/HCA、FP4/FP8、定制 KV cache 来降低长上下文成本。

## 和 Dense Model 对比

| 维度 | Dense Model | MoE Model |
|---|---|---|
| 参数是否全部参与每个 token | 基本全部参与 | 只有部分 experts 参与 |
| Total params 与 activated params | 大致接近 | total 远大于 activated |
| 能力扩展方式 | 增加 dense 参数，计算也一起增加 | 增加 experts，提高容量，但每 token 计算增长较慢 |
| 推理系统复杂度 | 相对简单 | 需要 expert routing、dispatch、load balance |
| 典型瓶颈 | 矩阵计算、attention、KV cache | expert 通信、负载均衡、权重存储、attention/KV cache |

## 我的理解

Activated params 是理解现代 MoE 模型的关键指标。它回答的是：

> 这个巨大的模型，在每个 token 上到底用了多少“有效计算路径”？

Total params 更像模型的总知识容量和部署体量；activated params 更像单 token 的计算预算。

所以看到 “1.6T total / 49B activated” 时，不应该理解为“这个模型跑起来像 1.6T dense model”，也不应该理解为“它只需要 49B 模型的显存”。更准确的理解是：

> 它保存了 1.6T 的专家参数容量，但每个 token 只通过约 49B 参数的计算路径。

这也是 MoE 的核心 trade-off：**用更复杂的路由和分布式系统，换更大的模型容量与较低的单 token 计算成本。**

## Related

- [[computer_sci/llm/architecture/deepseek_v4_architecture_tricks|DeepSeek V4 Architecture Tricks]]
- [[computer_sci/llm/inference/KV_cache|KV cache]]

## Sources

- <a id="ref-bengio2013"></a>[1] Bengio, Y., Léonard, N., & Courville, A. (2013). [Estimating or Propagating Gradients Through Stochastic Neurons for Conditional Computation](https://arxiv.org/abs/1308.3432). arXiv.
- <a id="ref-jacobs1991"></a>[2] Jacobs, R. A., Jordan, M. I., Nowlan, S. J., & Hinton, G. E. (1991). [Adaptive Mixtures of Local Experts](https://doi.org/10.1162/neco.1991.3.1.79). Neural Computation, 3(1), 79-87.
- <a id="ref-shazeer2017"></a>[3] Shazeer, N., Mirhoseini, A., Maziarz, K., et al. (2017). [Outrageously Large Neural Networks: The Sparsely-Gated Mixture-of-Experts Layer](https://arxiv.org/abs/1701.06538). arXiv.
- <a id="ref-switch2021"></a>[4] Fedus, W., Zoph, B., & Shazeer, N. (2021). [Switch Transformers: Scaling to Trillion Parameter Models with Simple and Efficient Sparsity](https://arxiv.org/abs/2101.03961). arXiv.
- <a id="ref-glam2022"></a>[5] Du, N., Huang, Y., Dai, A. M., et al. (2022). [GLaM: Efficient Scaling of Language Models with Mixture-of-Experts](https://proceedings.mlr.press/v162/du22c.html). ICML 2022.
- <a id="ref-mixtral2023"></a>[6] Mistral AI. (2023). [Mixtral 8x7B Model Card](https://docs.mistral.ai/models/model-cards/mixtral-8x7b-0-1).
- <a id="ref-deepseek-v4"></a>[7] DeepSeek-AI. (2026). [DeepSeek-V4: Towards Highly Efficient Million-Token Context Intelligence](https://huggingface.co/deepseek-ai/DeepSeek-V4-Pro/blob/main/DeepSeek_V4.pdf). Technical report.
