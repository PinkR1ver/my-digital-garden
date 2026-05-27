---
title: "Next-Token Prediction: 预训练的发动机"
date: 2026-05-27
tags:
  - LLM
  - training
  - next-token-prediction
  - pre-training
  - loss-function
---

## 前情提要：你有了一台发动机，怎么教它开车？

在 [Transformer in LLM](computer_sci/llm/architecture/transformer_in_llm.md) 里，我们拆解了 Decoder-only Transformer 的结构：Embedding → Causal Self-Attention → FFN → LayerNorm → ... → Logits。Tiny Transformer Lab 也跑通了一次 forward pass，最后输出的是一串 `logits` 向量。

但到这里为止，模型什么都不会。它的权重是随机初始化的，输出的 logits 跟掷骰子没区别。

预训练要解决的核心问题只有一个：**怎么让这套架构"学会续写"**。而且这件事的精妙之处在于——不需要人工标注，自然界已经给了我们无限的标注数据。

## 自监督学习的"免费午餐"

考虑一句话：

> "The cat sat on the mat"

如果你是一个语言模型，你在读这句话的时候，实际上就是在不断地做一件事：**根据上文，猜下一个词**。

| 上文（Input） | 要猜的词（Target） |
| :--- | :--- |
| `The` | `cat` |
| `The cat` | `sat` |
| `The cat sat` | `on` |
| `The cat sat on` | `the` |
| `The cat sat on the` | `mat` |

每一条文本，自己就是自己的"标准答案"。这就是自监督学习（Self-Supervised Learning）的核心洞察：**你不需要雇人去标注数据，互联网上的每一段文字、每一本书、每一行代码，都是天然的 (input → target) 训练样本**。

这也是为什么 GPT 里的 "P"（Pre-trained / Generative Pre-trained Transformer）如此重要。架构决定了模型能学什么，但预训练决定了模型学到了什么。

## 数据构建：滑动窗口

实际预训练时，语料会先被 tokenizer 切成 token IDs：

```
"The cat sat on the mat" → [464, 3797, 3820, 319, 262, 5152]
```

然后我们会用一个固定大小的**上下文窗口**（context window，比如 2048 个 token）在整段语料上滑动，切出训练样本。

对于一个 context window，每一个位置 i 都构成一个训练样本：
- **Input**: 前 i 个 token（通过 causal mask 自动实现）
- **Target**: 第 i+1 个 token

> [!tip]
> **重点：** 一个序列里的所有位置是**同时计算、同时监督**的。不是先算第 1 个词、再算第 2 个词——整个 context window 的所有位置并行计算 loss，然后加在一起反向传播。这是 Transformer 并行化的另一个优势，在训练时也会体现。

实际工程中还有一堆细节：document packing（把多个短文档塞进一个 context window）、EOS token 的处理、padding 策略等等。这些留到后续的数据工程笔记再展开。

## 从 Logits 到 Loss

这是预训练最核心的数学环节。在前向传播中，模型对每个位置 i 输出一个 logits 向量 $\mathbf{z}_i \in \mathbb{R}^{V}$，其中 $V$ 是词表大小（比如 GPT-3 的 50257）。

### Softmax：把 logits 变成概率

Logits 本身是无界的实数（可以是 -100，也可以是 100）。我们需要把它变成"每个词有多大概率是下一个词"。

$$
P(y_i \mid x_{<i}) = \text{softmax}(\mathbf{z}_i) = \frac{e^{z_{i,k}}}{\sum_{j=1}^{V} e^{z_{i,j}}}
$$

其中 $z_{i,k}$ 是第 i 个位置输出中、对应词表第 k 个词的 logit。

Softmax 确保输出满足：
- 每个值在 0 到 1 之间
- 所有值加起来等于 1

### Cross-Entropy Loss：衡量"猜得多准"

现在模型给出了一个概率分布，而我们知道正确答案是哪个词（比如 target token ID = 3797）。怎么衡量损失？

答案是**交叉熵（Cross-Entropy Loss）**。

假设正确答案是词表里的第 $y$ 个词，模型认为它的概率是 $P(y)$。那么损失就是：

$$
L = -\log P(y)
$$

直觉上：
- 如果模型非常有信心（$P(y) \approx 1$），那么 $-\log(1) = 0$，没有损失。
- 如果模型完全没想到（$P(y) \approx 0.0001$），那么 $-\log(0.0001) = 9.21$，损失很大。

整个 context window 的 loss 是所有位置的平均：

$$
\mathcal{L} = \frac{1}{N} \sum_{i=1}^{N} -\log P(y_i^* \mid x_{<i})
$$

其中 $y_i^*$ 是第 i 个位置的真实下一个 token，$N$ 是序列长度。

> [!hint]
> **换个角度理解交叉熵：** 假设你在跟朋友玩"20 Questions"。你的朋友心里想了一个词，你要通过问问题来猜。交叉熵本质上是衡量"你还需要问多少 bit 的信息才能完全确定答案"。当你 100% 确定时，还需要 0 bit；当你需要从 50257 个词中完全随机猜时，你需要 $\log_2(50257) \approx 15.6$ bit。

### 为什么用交叉熵而不是别的？

对这个部分感兴趣的话，可以回看 transformer_in_llm.md 里关于"为什么 Softmax"的讨论。交叉熵在数学上有几个关键优势：

1. **等价于最大似然估计（MLE）：** 在分类问题中，最小化交叉熵等价于最大化真实分布下的对数似然——这正是统计学习理论里最自然的优化目标。
2. **梯度性质好：** $-\log(\cdot)$ 在概率接近 1 时梯度平缓，在概率接近 0 时梯度陡峭。这意味着模型做了"离谱预测"时会收到强烈的修正信号。
3. **非负性保证：** 概率在 [0, 1] 之间，负对数值一定 ≥ 0。损失永远是非负的，不会出现"损失为负"这种别扭的情况。

## 反向传播：到底是谁在"学"？

现在有了 loss $\mathcal{L}$，下一步是反向传播（Backpropagation）。

反向传播的核心可以用链式法则一句话总结：**从 loss 出发，逐层计算每个参数对 loss 的"责任"（梯度），然后朝能减少 loss 的方向微调这些参数。**

对于 Transformer 来说，梯度会流经：

```
Loss
  ↑
Softmax + CrossEntropy
  ↑
lm_head (vocab_size × d_model 的大矩阵)
  ↑
最后的残差 + LayerNorm
  ↑
FFN (W₁, W₂) → 残差 → LayerNorm → Self-Attention (W_Q, W_K, W_V, W_O) → ...
  ↑
... (重复 L 层)
  ↑
Token Embedding → 输入
```

每一步梯度都会精确地告诉每一个参数："你往这个方向改一点点，loss 就会变小"。

然后是**参数更新**。最常见的是 **AdamW** 优化器：

- 维护每个参数的"动量"（过去梯度的指数移动平均），解决梯度震荡问题
- 维护每个参数的"自适应学习率"（不同参数用不同的步长）
- 加入 Weight Decay（权重衰减），防止参数无限膨胀

每个参数 $\theta$ 的更新：

$$
\theta_{\text{new}} = \theta_{\text{old}} - \eta \cdot \frac{m}{\sqrt{v} + \epsilon} - \eta \lambda \cdot \theta_{\text{old}}
$$

其中 $\eta$ 是学习率，$m$ 是动量，$v$ 是二阶矩，$\lambda$ 是 weight decay 系数。

> [!tip]
> **关键直觉：** 一个 7B 参数的模型，每处理一个 batch（比如 400 万个 token），就要为这 70 亿个参数各计算一个梯度、各做一次更新。所有参数在每一轮都在变——Embedding 表里的每一个数字、每一层注意力里的每一个 W_Q 值、FFN 里的每一个权重……全都在学习。这就是为什么预训练需要那么多 GPU。

## 训练过程中，模型到底学到了什么？

预训练不是一个魔法——模型的知识获取有一个明显的**阶段性递进**，可以从 loss 曲线和下游能力测试中观察到。

### 第一阶段：掌握"这个词后面大概率是那个词"

最初的几百到几千步，loss 会从极高的初始值（≈ 随机猜词，词表大小的对数）急速下降。模型在学最粗粒度的统计规律：冠词后面常跟名词、逗号后面有空格、英文句号的首字母大写等等。

这时候模型的输出看上去仍然像乱码，但它已经知道了语言的最基本骨架。

### 第二阶段：语法成形，句式稳定

接下来几千到几万步，loss 继续稳定下降，模型开始掌握：
- 主谓一致（"he *is*" vs "they *are*"）
- 从句结构
- 正确的词序

如果你在这个阶段采样，输出看起来已经是"像英语"的了——语法基本正确，但内容空洞、逻辑涣散、事实错误随处可见。这个阶段的模型就像一个小学生，能造句但言之无物。

### 第三阶段：事实知识和世界模型

这是预训练过程中最长也最关键的阶段——可能占总训练步数的 80% 以上。模型开始内化训练数据中的事实知识、概念关联和推理模式。

- "Paris 是法国的首都"这类事实被编码进了 FFN 层的权重中[1]
- 在代码语料上训练的模型学会了编程语言的语法和惯用模式
- 数学推理能力开始涌现

这个阶段的 loss 下降会变慢，但下游能力提升显著——**loss 在变，能力在涨**。

### 第四阶段：精细化与饱和

接近训练终点，loss 趋于平坦。进一步训练的收益递减，可能出现"数据吃透"或"模型容量饱和"的现象。这时候就需要 Scaling Laws 来回答：该加数据还是加模型？这个我们后续专门开一篇讲。

### 一条真实的 Loss 曲线告诉我们什么？

<iframe src="/computer_sci/llm/training/attachments/loss_curve_phases.html" width="100%" height="420" frameborder="0"></iframe>

关键观察点：
- **Sharp drop**：开头几分钟的事，模型学会了停用词、标点、常见搭配
- **Steady descent**：真正的学习发生在这里，知识在积累
- **Plateau**：模型已经学会了数据中有价值的大部分模式

## 为什么"猜下一个词"就够了？

这是很多人困惑的地方：**"预测下一个词"这么简单的任务，怎么可能训练出一个能推理、能编程、能写诗的模型？**

答案可以从几个角度来理解。

### 1. 语言是世界的压缩表示

英语里有句话："To bake a cake, you need flour, eggs, sugar, and butter." 如果你要预测出 "flour" 这个词，你不仅需要语法知识，还需要**世界知识**——你知道蛋糕是由这些原料做的。这意味着任何事实知识，只要在文本中出现过，就可以通过 next-token prediction 学到的。

### 2. 推理是长程依赖的极端形式

考虑这个例子：

> "If Alice has 5 apples and gives 2 to Bob, then buys 3 more from Carol, Alice now has __ apples."

要预测出正确的数字，模型需要在 token 序列中隐式地执行算术运算——这就是推理。Next-token prediction 通过海量训练中的模式匹配和隐式计算，让模型"学会"了如何做这件事。

### 3. 涌现能力（Emergent Abilities）

研究发现[2]，很多能力——比如翻译、摘要、代码生成——并不是被显式训练的，而是在模型规模超过某个临界点后"涌现"出来的。预测下一个词这个单一目标，在足够大的模型和足够多的数据下，催生出了意料之外的泛化能力。

> [!tip]
> **换个角度看：** 如果说人类通过语言把知识和思维模式编码成了文字，那么 next-token prediction 就是要把这些文字里隐含的一切——语法、事实、逻辑、风格、甚至是情感——全部解码回一个神经网络的权重里。这个解码过程不需要别的，只需要"猜下一个词"这一个监督信号。

## 小结 & 预告

这篇笔记覆盖了预训练的核心 loop：

1. 语料 → 滑动窗口 → (input, target) 训练样本
2. Forward pass → logits → softmax → cross-entropy loss
3. Backprop → 梯度流经全部参数 → AdamW 更新
4. 重复几十万步，模型从乱码到语法到知识到推理

但这个 loop 放到实际的大规模训练中，还有很多问题没回答：多大的模型配多少数据最划算？为什么 70 亿参数不是 7 万也不是 7 万亿？训练一个 7B 模型到底要多少 GPU 和多少钱？这些问题留到接下来的笔记里。

下一篇预告：**Scaling Laws**——模型大小、数据量、计算预算之间的数学关系，以及它如何指导所有 LLM 公司的训练决策。

## Reference

[1] Meng, K., Bau, D., Andonian, A., & Belinkov, Y. (2022). [Locating and Editing Factual Associations in GPT](https://arxiv.org/abs/2202.05262). NeurIPS 2022.

[2] Wei, J., Tay, Y., Bommasani, R., et al. (2022). [Emergent Abilities of Large Language Models](https://arxiv.org/abs/2206.07682). TMLR 2022.
