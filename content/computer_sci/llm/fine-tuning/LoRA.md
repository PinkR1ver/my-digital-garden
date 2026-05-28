---
title: "LoRA：大模型微调的数学魔法"
date: 2026-05-28
tags:
  - LLM
  - fine-tuning
  - LoRA
  - QLoRA
---

## 问题：全量微调有多贵？

在 [从 GPT 到 ChatGPT](computer_sci/llm/training/alignment.md) 里我们看到，SFT 就是把 base model 在对话数据上继续训练——loss 不变，优化器不变，变的只是数据。

听起来很简单，但全量微调 7B 模型需要多少显存？

| 组件 | 占用（FP16） |
| :--- | :--- |
| 模型权重 $W$ | 14 GB |
| 梯度 $\nabla W$ | 14 GB |
| Adam 动量 $m_t$ + 方差 $v_t$（FP32） | 28 GB + 28 GB |
| **总计** | **~84 GB** |

一块 H100 (80GB) 才刚好够，一块 1080 Ti (11GB) 差了将近 8 倍。

但这还不是最荒诞的部分：**花了 84GB 显存和几天时间，你得到的不过是一个"和 SFT 之前差不多"的模型**。7B 参数的基座已经是很好的语言引擎了，微调只是在它上面加一层薄薄的"任务适配"——就像在一幅快要完成的画上做最后几笔润色。为了这几笔而搬动整幅画的每一块颜料，实在太浪费了。

这就是 LoRA 要解决的问题。

## 核心洞察：ΔW 天生是低秩的

微调的数学定义很简单：给定预训练权重 $W_0 \in \mathbb{R}^{d \times k}$，微调就是学习一个更新量 $\Delta W$，使得：

$$
W_{\text{fine-tuned}} = W_0 + \Delta W
$$

全量微调直接学习 $\Delta W$ 的每一个元素——一个 $d \times k$ 的稠密矩阵。对于 Llama 7B 的一个 attention 投影层（$d=4096$），$\Delta W$ 的大小是 $4096 \times 4096 = 16\text{M}$ 参数，光这一层的梯度就 32MB。

**LoRA 的核心假设**：$\Delta W$ 虽然维度高，但它的**信息量并不高**——它存在于一个低维子空间里。也就是说，$\Delta W$ 可以用两个瘦矩阵的乘积来近似：

$$
\Delta W = B \cdot A
$$

其中：
- $B \in \mathbb{R}^{d \times r}$
- $A \in \mathbb{R}^{r \times k}$
- $r \ll \min(d, k)$，通常 $r \in \{4, 8, 16, 32\}$

算一下参数量变化：

| | 全量 $\Delta W$ | LoRA ($r=16$) | 压缩比 |
| :--- | :--- | :--- | :--- |
| 参数量 | $4096 \times 4096 = 16.8\text{M}$ | $4096 \times 16 \times 2 = 131\text{K}$ | **128×** |
| 梯度显存 | 33.6 MB | 0.26 MB | **128×** |
| Adam 状态 | 134.4 MB | 1.0 MB | **128×** |

> [!tip] 低秩是合理的吗？
> 是的。大量实验发现，预训练语言模型在适配下游任务时，权重变化矩阵 $\Delta W$ 确实具有很低的"内在维度"（intrinsic dimension）[1]。换句话说，模型有几十亿个参数，但"学会一个新任务"实际上只需要动几百个自由度就够了。LoRA 把这个观察变成了可训练的结构。

## 怎么训练：前向传播和前向后向的完整流程

对于一个 attention 层的原始权重 $W_0$（冻结，不更新）：

**前向传播**：

$$
h = W_0 x + \underbrace{B A x}_{\text{LoRA 路径}}
$$

原始路径 $W_0 x$ 照常计算。LoRA 路径 $BAx$ 是额外加上的——先投影到 $r$ 维再投影回来。因为 $r$ 很小，这一路的计算量几乎是零。

**反向传播**：梯度只流经 $B$ 和 $A$，不碰 $W_0$。$W_0$ 不需要梯度，不需要 Adam 状态——这就是 84GB 变成 15GB 的根本原因。

**初始化**：$A$ 用随机高斯初始化，$B$ 初始化为全零。这保证了训练开始时 $\Delta W = 0$，LoRA 不会干扰基座模型的输出。

**推理**：$W = W_0 + BA$ 直接加在一起，没有额外延迟。

## LoRA 的三个设计决策

### 1. 在哪里插 LoRA？

原始论文[2] 只在 attention 的 $Q$ 和 $V$ 投影上加了 LoRA。后来的实践发现，$Q, K, V, O$ 四个投影全加效果更好，而且参数量依然很小。

也可以在 MLP 层加，但收益递减——attention 层才是任务适配的关键瓶颈。

### 2. rank r 选多大？

| r | 每层可训参数 | 效果 | 适用场景 |
| :--- | :--- | :--- | :--- |
| 4 | ~33K | 够用 | 简单指令微调 |
| 8 | ~66K | 好 | 通用微调 |
| 16 | ~131K | 更好 | 垂域适配 |
| 64+ | ~524K | 边际递减 | 几乎用不到 |

r=4 已经常常够用了——这反过来验证了"ΔW 确实低秩"的假设。如果你需要 r=64 才能追平全量微调，说明这个任务可能不适合 LoRA。

### 3. 缩放因子 α

LoRA 在前向里给更新量乘了一个缩放：

$$
h = W_0 x + \frac{\alpha}{r} \cdot B A x
$$

$\alpha/r$ 控制 LoRA 更新对原始输出的"音量"：
- $\alpha = r$ → 缩放为 1，纯叠加
- $\alpha > r$ → 放大 LoRA 的贡献
- $\alpha < r$ → 抑制 LoRA 的贡献

实践中 $\alpha$ 常取 $r$ 的 2-8 倍。这个因子让调 rank 和调学习率之间多了一个自由度——改变 $r$ 的时候调整 $\alpha$ 可以保持更新幅度不变。

## 效果的实证

以 Llama 2 7B 为例，r=16，只给 Q 和 V 加 LoRA [2]：

| | 可训参数 | 显存 | 训练时间 |
| :--- | :--- | :--- | :--- |
| 全量微调 | 7B | ~84 GB | 基准 |
| LoRA ($r=16$) | 4.2M | ~14 GB | 约快 30%（少算梯度） |
| QLoRA ($r=16$, 4-bit) | 4.2M | ~6 GB | 略慢于 LoRA（解量化的开销） |

而效果上，LoRA 在绝大多数任务上达到甚至超过全量微调的水平。

## 从 LoRA 到 QLoRA

LoRA 的最大瓶颈是：**基座模型仍然需要 FP16 存着**——7B × 2 bytes = 14GB，已经超了 1080 Ti 的 11GB。

QLoRA [3] 在 LoRA 的基础上做了一件事：**把冻结的基座模型量化到 4-bit**。基座 14GB → 3.5GB，加上 LoRA 适配器 ~几百 MB，再加上一些开销，总共 ~5-7GB。1080 Ti 终于能跑了。

具体实现：
1. **NF4 (NormalFloat 4-bit)**：因为预训练权重通常是正态分布，标准均匀量化会浪费信息。NF4 专门为正态分布设计码表，信息损失远小于标准 4-bit
2. **双重量化**：连量化用的缩放常数也再做一次量化，又省出 ~0.4GB
3. **分页优化器**：训练中如果 GPU 显存不够，自动把 optimizer states offload 到 CPU

训练效果上，QLoRA 和 LoRA 几乎没有差距——4-bit 的精度损失在低秩适配这个场景下不是瓶颈。

## 和其他方法的关系

| 方法 | 做法 | 可训参数 | 效果 |
| :--- | :--- | :--- | :--- |
| 全量微调 | 训练全部 $W$ | 100% | 上限最高，显存爆炸 |
| 逐层冻结 | 只训最后 $N$ 层 | 10-30% | 不稳定，依赖人工选层 |
| Adapter [4] | 在 transformer 里插入小 MLP | 2-5% | 推理慢（多了串行计算） |
| Prefix Tuning [5] | 在输入前面拼接可学习 token | <1% | 占用 context 空间 |
| **LoRA** | 低秩适配器加在 attention 外 | <1% | 推理零开销，显存友好 |

LoRA 相比 Adapter 的核心优势：$W_0$ 和 $BA$ 可以并行计算然后相加——推理时没有任何额外延迟。Adapter 是一层小 MLP 插在 transformer block 中间，必须串行等待，每个 layer 都多等几毫秒，累积起来就是显著的延迟。

## 小结

LoRA = 假设 $\Delta W$ 低秩 + 只训练 $B$ 和 $A$ + 推理时合并为零开销。

三条记住就够：

1. **$r=8$ 或 $16$ 几乎永远是正确选择**——不需要调，除非极端场景
2. **只加 attention 层的 Q/K/V/O**——MLP 的收益不值得多倍的参数量
3. **QLoRA 是 1080 Ti 的唯一解**——4-bit 基座 + LoRA，7B 模型在 ~6GB 里跑通

## Reference

[1] Aghajanyan, A., Zettlemoyer, L., Gupta, S. (2021). [Intrinsic Dimensionality Explains the Effectiveness of Language Model Fine-Tuning](https://arxiv.org/abs/2012.13255). ACL 2021.

[2] Hu, E. J., Shen, Y., Wallis, P., et al. (2021). [LoRA: Low-Rank Adaptation of Large Language Models](https://arxiv.org/abs/2106.09685). ICLR 2022.

[3] Dettmers, T., Pagnoni, A., Holtzman, A., et al. (2023). [QLoRA: Efficient Finetuning of Quantized Language Models](https://arxiv.org/abs/2305.14314). NeurIPS 2023.

[4] Houlsby, N., Giurgiu, A., Jastrzebski, S., et al. (2019). [Parameter-Efficient Transfer Learning for NLP](https://arxiv.org/abs/1902.00751). ICML 2019.

[5] Li, X. L., Liang, P. (2021). [Prefix-Tuning: Optimizing Continuous Prompts for Generation](https://arxiv.org/abs/2101.00190). ACL 2021.
