---
title: "Scaling Laws: 模型、数据、算力的三角博弈"
date: 2026-05-27
tags:
  - LLM
  - training
  - scaling-laws
  - chinchilla
  - pre-training
---

## 前情提要：训练一个 7B 模型，凭什么正好是 7B？

在 [Next-Token Prediction](computer_sci/llm/training/next_token_prediction.md) 里，我们走通了预训练的核心 loop：数据 → forward → loss → backward → 更新参数 → 重复。现在，模型能"学会续写"了。

但如果我们真的要烧钱训练一个模型，第一个问题不是"怎么学"，而是"该做多大"。

为什么 GPT-3 是 175B？为什么 Llama 2 选了 7B、13B、70B？为什么 Mistral 是 7B？这些数字不是拍脑袋决定的——背后有一整套数学理论在指导，这就是 **Scaling Laws（规模法则）**。

> [!abstract] 核心问题
> 给定一个固定的计算预算（Compute Budget，单位是 FLOPs），我应该：
> - 造一个**大模型**训练**少量数据**？
> - 还是造一个**小模型**训练**海量数据**？
> 
> 答案会直接影响你的 GPU 采购清单、训练时长估算和最终的模型质量。

## 为什么需要 Scaling Laws？

在 Scaling Laws 出现之前，AI 实验室的训练决策是这样的：

- "我们有钱，就做大一点" 
- "我觉得数据和参数差不多 1:1 比较好" 
- "先试试，看 loss 怎么样了再说"

这不是工程，这是炼丹。Scaling Laws 要做的就是**把炼丹变成工程学**——用数学精确描述模型大小、数据量、计算预算和最终 loss 之间的关系。

更具体地说，如果你的老板批了 100 万美元的算力预算，你要回答：
- 训练多大的模型？
- 准备多少 token 的数据？
- 最终的 loss 大概是多少？
- 如果预算翻倍，应该加模型还是加数据？

Scaling Laws 就是这些问题的计算器。

## 损失函数的形式：一个幂律世界

大量实验发现，语言模型的测试 loss 和模型参数量 $N$、训练数据量 $D$ 之间存在**幂律关系（Power Law）**：

$$
L(N, D) = E + \frac{A}{N^\alpha} + \frac{B}{D^\beta}
$$

其中：
| 符号 | 含义 |
| :--- | :--- |
| $L(N, D)$ | 测试集上的 loss（越低越好） |
| $E$ | **不可约损失（Irreducible Loss）**：即使模型无限大、数据无限多，loss 也不能低于这个值——这是文本本身的固有熵 |
| $N$ | 模型参数量（不含 embedding） |
| $D$ | 训练数据量（token 数） |
| $\alpha, \beta$ | 幂律指数，控制收益递减的速度 |
| $A, B$ | 比例常数 |

这个公式告诉我们两件事：
1. **加参数有用，但收益递减**：$1/N^\alpha$ 意味着从 1B 加到 2B 的效果，远大于从 100B 加到 101B
2. **加数据也有用，同样递减**：第 1T 数据很值钱，第 100T 数据就没那么值钱了

## Kaplan et al. (2020)：OpenAI 的开山之作

Jared Kaplan 等人在 OpenAI 发表了第一篇系统性的 Scaling Laws 研究[1]。他们的核心发现：

1. **模型大小比数据量更重要**——对于固定算力预算，应该优先扩大模型
2. 给定算力预算增加 10×，模型大小应增加约 5.6×，数据量只增加约 1.8×
3. 最优配置下，$N \propto C^{0.73}$，$D \propto C^{0.27}$

按这个配方，如果你有算力训练 GPT-3 (175B)，你就应该把所有预算烧在模型上，数据用大约 300B token 就够了。

这也正是 GPT-3 时代的做法：**大模型 + 相对少的数据**。

## Chinchilla (2022)：DeepMind 的"纠正"

2022 年，DeepMind 的 Hoffmann 等人发表了 Chinchilla 论文[2]，直接推翻了 Kaplan 的结论。

他们的核心论点是：**Kaplan 算错了**——Kaplan 的实验中只增加了模型大小而没有相应增加训练数据，导致结论偏向"模型越大越好"。

Chinchilla 重新做了大规模实验（模型从 70M 到 16B），得出了截然不同的配方：

> [!important] Chinchilla 最优
> 对于计算最优的训练，**模型参数量和数据量应该等比例增长**：每增加 1 个参数，大约需要 20 个 token 的数据。
> 
> 换句话说：**一个 7B 的模型，应该用约 140B token 来训练。**

更通俗的换算：

| 模型大小 | Chinchilla 最优数据量 |
| :--- | :--- |
| 1B | ~20B tokens |
| 7B | ~140B tokens |
| 13B | ~260B tokens |
| 70B | ~1.4T tokens |
| 175B (GPT-3) | ~3.5T tokens |

对比现实：**GPT-3 只用了约 300B token——按 Chinchilla 的标准，它严重"训练不足"（undertrained）**。

> [!tip]
> 这直接解释了为什么 Chinchilla 只用 70B 参数 + 1.4T token 就在大多数 benchmark 上打败了 175B 的 GPT-3：不是模型不够大，是 GPT-3 没吃饱。这也催生了"小模型 + 多数据"的新范式。

## 核心结论：把曲线画出来

下面的可视化展示了 scaling laws 的核心关系——给定固定算力，如何分配模型大小和训练数据才能达到最低 loss。

<iframe src="/computer_sci/llm/training/attachments/scaling_laws_interactive.html" width="100%" height="450" frameborder="0"></iframe>

关键观察：
- **左边**：模型太小、数据很大 → 模型容量不够，学不动
- **右边**：模型太大、数据不够 → 过拟合，浪费参数
- **底部凹陷**：最优配置的甜蜜点（sweet spot）

## Chinchilla 之后的现实

Chinchilla 发表后，几乎所有主流模型都开始**往"数据更充足"的方向倾斜**：

| 模型 | 参数量 | 训练数据 | 是否 Chinchilla 最优 |
| :--- | :--- | :--- | :--- |
| GPT-3 (2020) | 175B | ~300B | 远远不够 |
| Chinchilla (2022) | 70B | 1.4T | ✅ |
| Llama 2 (2023) | 7B | 2T | **远超** Chinchilla |
| Llama 3 (2024) | 8B | 15T+ | **远超** Chinchilla |

有意思的是，Llama 2/3 的训练数据量远超 Chinchilla 公式的推荐。这不是说 Chinchilla "错了"，而是说明我们已经进入了 **"数据多多益善"的新时代**——Chinchilla 给出的是"给定算力预算下的计算最优"，但如果你的目标是"不惜代价做到最好"，Chinchilla 的公式就不再是你的上限。

## 为什么 Chinchilla 不是终点？

Scaling Laws 本身也在不断演进：

### 1. 数据重复的问题

Chinchilla 假设所有训练数据都是"新鲜的"——模型只会见每个 token 一次。但在实践中：
- Llama 2 在 2T token 上训练 7B 模型，远超 Chinchilla 推荐的 140B
- 这意味着数据开始"重复"——同一个 token 被模型见了多次
- 重复数据依然有效，但效率会下降[3]

### 2. 数据质量 vs. 数据数量

Chinchilla 的公式里没有"数据质量"这个变量。但实践反复证明：**经过筛选的高质量数据，效果远优于原始网络数据**。Phi 系列模型（1.3B 参数却能媲美 7B 模型）就是"数据质量 > 数据数量"的极端证明。

### 3. Inference-Time Scaling

Brown et al. (2024)[4] 发现，推理时的计算量（inference-time compute）也遵循 scaling laws——通过 chain-of-thought、self-consistency 等技术，你可以在不改变模型参数的情况下，用更多的推理计算换取更好的答案。这意味着 scaling 的故事不只在训练阶段成立。

## 小结

Scaling Laws 是 LLM 训练决策的计算器：

1. **幂律世界**：Loss 和 N、D 之间是 $L(N, D) = E + A/N^\alpha + B/D^\beta$ 的关系
2. **Kaplan → Chinchilla 的范式转变**：从"砸参数"到"数据和参数要匹配"
3. **经验公式**：每 1 个参数配约 20 个 token（Chinchilla 最优）
4. **现实超越理论**：Llama 2/3 的实践证明，充足甚至"过量"的数据加上高质量筛选，是当前的最优解
5. **Scaling 不会停**：数据质量、推理时计算、合成数据……新的维度还在不断被发现

## Reference

[1] Kaplan, J., McCandlish, S., Henighan, T., et al. (2020). [Scaling Laws for Neural Language Models](https://arxiv.org/abs/2001.08361). arXiv.

[2] Hoffmann, J., Borgeaud, S., Mensch, A., et al. (2022). [Training Compute-Optimal Large Language Models](https://arxiv.org/abs/2203.15556). NeurIPS 2022. (The "Chinchilla" paper)

[3] Muennighoff, N., Rush, A. M., Barak, B., et al. (2023). [Scaling Data-Constrained Language Models](https://arxiv.org/abs/2305.16264). NeurIPS 2023.

[4] Brown, B., Juravsky, J., Ehrlich, R., et al. (2024). [Scaling Scaling Laws with Board Games](https://arxiv.org/abs/2402.08902). arXiv.
