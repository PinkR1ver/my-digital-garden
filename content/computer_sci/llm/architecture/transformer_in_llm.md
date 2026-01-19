---
title: Transformer in LLM
date: 2026-01-14
tags:
  - transformer
  - LLM
  - self-attention
  - attention
---
## Architecture

![Transformer模型架构图](computer_sci/llm/architecture/attachments/transformer-model-architecture.png)
<center>图1: 原始Transformer模型架构图</center>
## Architecture Detail

### Self-Attention

自注意力机制允许模型在处理一个词时，权衡输入序列中其他所有词的重要性。它通过为序列中的每个词计算一个“注意力分数”来实现这一点，从而动态地决定关注哪些词。

![](computer_sci/llm/architecture/attachments/self-attention-example.png)
<center>图2: 一个自注意力头的可视化，展示了模型在编码"it"时如何将注意力分配给"The"和"animal"</center>

self-attention的实现方式是Scaled Dot-Product Attention，核心是三个向量，$W^Q,W^K,W^V$; 这三个向量分别代表 Query - “我在寻找什么信息”，Key - “我能提供什么信息”，Value - “我包含的信息内容”；

单词向量（通过Embedding而来）$x$

> [!hint] 
>  **打个比方：** 你去图书馆找书（Query），书架上的标签就是 Key。当你发现某个标签和你的需求匹配时，你拿走的书中内容就是 Value。

具体计算过程，

1. 计算相似度: 将每个查询向量 Q 与所有键向量 K 进行点积，得到注意力分数。点积结果越高，说明这两个词越相关。
$$
\text{Score} = Q \cdot K^T
$$
2. 缩放（Scaling），将Score除以sqrt(d_k)（d_k是键向量的维度）以稳定梯度。
$$
\text{Scaled Score} = \frac{Q \cdot K^T}{\sqrt{d_k}}
$$
3. 归一化（Softmax），将Scpre转化为0-1的概率分布，代表每个单词对当前单词的“重要程度”；（Softmax后得到Attntion Weights，每一行都代表当前单词和剩下单词的关联程度的概率分布，每一行 sum = 1）
4. 加权求和（MatMul），将得到的权重乘以对应的 Value ($V$) 并求和。这样得到的向量就融合了全句的信息。

![](computer_sci/llm/architecture/attachments/Pasted%20image%2020260119150218.png)
<center>图3: Scaled Dot-Product Attention的计算流程图</center>

即，
$$
\text{Attention}(Q,K,V)=\text{softmax}(\frac{Q K^{T}}{\sqrt{d_k}})V
$$
> [!tip] 
>  Self-Attention有的优势在于，
>  * **捕捉长距离依赖：** 无论两个词离多远，计算复杂度都是常数级别的
>  * **消除歧义：** 比如在“The animal didn't cross the street because **it** was too tired”中，自注意力会让 “it” 更多地关注 “animal”，而不是 “street”。
>  * **并行化：** 不需要像 RNN 那样等待前一个词算完，所有词可以同时计算。

Self-Attention具体计算过程见：[self_attention_example](computer_sci/llm/architecture/self_attention_example.md)


## Interview-Question

### 为什么 Scaling 要除以 $\sqrt{d_k}$？

为了“防止梯度消失”，稳定梯度。

主要原因是因为Softmax的函数特性，如果不除以 $\sqrt{d_k}$，会造成**点积爆炸**；假设 $Q$ and $K$ 的维度 ($d_k$) 很大，比如 512。 当我们在做点积 ($Q \cdot K^T$) 时，是在将 512 个数字相乘再相加，会导致数值范围变得非常大。

Softmax函数公式是$\frac{e^x}{\sum e^x}$，对输入的数值大小非常敏感；例如[20,30]，$e^{20} \approx 4.8 \times 10^8$ $e^{30} \approx 1.0 \times 10^{13}$ ，权重：$\approx [0.00004, 0.99996]$；

Softmax 的分布变得像“**独热编码 (One-hot)**”一样极端。其中一个不仅拿走了所有权重，而且在数学上，Softmax 函数在趋近于 0 或 1 的位置，**导数（梯度）趋近于 0**。

以至于为什么要除以$\sqrt{d_k}$，假设 $Q$ 和 $K$ 中的每个元素都是均值为 0，方差为 1 的随机变量。它们的点积 $Q \cdot K = \sum_{i=1}^{d_k} q_i k_i$。[根据统计学规律，如果你把 $d_k$ 个方差为 1 的数加起来，结果的方差会变成 $d_k$]((math/statistic/basic_concepot/var_addition.md)。这意味着点积结果的标准差变成了 $\sqrt{d_k}$，因此需要把结果除以标准差，让数值保持在 Softmax 喜欢的“舒适区”。

### 为什么要使用softmax归一化weight matrix？

但 Softmax 最终成为了 Transformer 的标准配置，主要原因不是因为它“好算”，而是因为它具备一个简单的归一化（Sum）无法提供的核心特性：**“赢家通吃” (Winner-Take-All) 的倾向性，同时又保持了可导性。**

#### 1.核心差异：放大信号，抑制噪声

注意力机制的本质是**“查字典”**。当我在找东西时，我希望找到那个**最匹配**的，而忽略掉那些**一般般**的。

假设我们算出来的 Score 是：`[10, 9, 2]`。

- **10** 是最相关的（目标）。
- **9** 是干扰项（只差一点点）。
- **2** 是完全不相关的背景噪声。
    

方案 A：直接按和分配 (Linear Normalization)

我们把它们加起来：$10+9+2 = 21$。

然后算权重：

- $w_1 = 10/21 \approx \mathbf{0.48}$
- $w_2 = 9/21 \approx \mathbf{0.43}$
- $w_3 = 2/21 \approx \mathbf{0.10}$
    

结果： 0.48 和 0.43 几乎没有区别！模型会变得**“犹豫不决”**。它混入了大量干扰项（9）的信息，导致最终提取出的特征变得模糊。

方案 B：Softmax

我们计算 $e^x$：

- $e^{10} \approx 22026$    
- $e^9 \approx 8103$
- $e^2 \approx 7$
- 总和 $\approx 30136$
    

权重：

- $w_1 \approx \mathbf{0.73}$
- $w_2 \approx \mathbf{0.27}$
- $w_3 \approx \mathbf{0.0002}$
    

**结果：**

1. **拉开差距：** 原始分数只差 1 (10 vs 9)，经过 Softmax 后，权重差距变成了近 3 倍 (0.73 vs 0.27)。Softmax 敏锐地放大了“稍微好一点”的那个选项。
2. **降噪：** 那个得分为 2 的噪声，被彻底压到了 0。
    

**结论：** Softmax 是一种 **“软性的最大值” (Soft Maximum)**。它让模型能够**聚焦 (Focus)**。如果用简单的 Sum，模型就变成了“雨露均沾”，失去了注意力的意义。

---

#### 2. 数学上的必须性：非负性 (Positivity)

“直接根据 Sum 来分配 weight”，公式大概是 $w_i = \frac{Score_i}{\sum Score}$。这里有一个巨大的隐患：**点积算出来的 Score 可以是负数！**

- 如果 $Q = [1, -1]$，$K = [-1, 1]$，点积是 $-2$。
- 如果你的 Score 列表是 `[10, -5, -8]`。
- 求和是 $-3$。
- 第一项的权重变成 $10 / -3 = -3.33$。
    

**权重变成了负数？** 这在注意力机制里解释不通。我们要的是“加权平均”，通常要求权重必须是正的且和为 1（凸组合），这样才能保证输出的向量 $V$ 不会飞出原本的特征空间。

Softmax 的优势：

$$e^x$$
永远是正数。不管你的点积算出 $-100$ 还是 $-10000$，Softmax 都能把它变成一个正的概率值（虽然很小），保证了加权求和在数学上的稳定性。

---

#### 3. 梯度的“选拔”作用

你说 Softmax 导致梯度需要缩放（防止梯度消失），这是它的缺点。但反过来看，**Softmax 的梯度特性正是它能训练出好模型的关键。**

Softmax 的导数特点是：**只有当两个分数的竞争非常激烈时，梯度才最大。**

- 如果一个是 100，一个是 0（胜负已分），Softmax 认为不需要调整了，梯度趋近 0。
- 如果一个是 10，一个是 9.9（难分伯仲），Softmax 会产生很大的梯度，告诉前面的层：“嘿，你得把这两个区分开！去更新权重，让 10 变得更大，让 9.9 变得更小！”

这种机制迫使模型去学习如何**区分**相似的词，而不是仅仅记住一堆平均值。

---

### 总结

为什么一定要 Softmax，哪怕要为了它专门搞一个 Scaling？

1. **非线性 (Non-linearity)：** 神经网络需要非线性才能拟合复杂函数。单纯的除以 Sum 是线性变换，能力有限。
2. **聚焦 (Selectivity)：** Softmax 能把微小的分数差异放大，让模型敢于“做决定”，关注最重要的那个词。
3. **非负性 (Positivity)：** $e^x$ 解决了点积出现负数时权重分配的数学灾难。
4. **可导的 Hardmax：** 我们其实最想要的是 `Hardmax`（只取最大的那个，其他全为0），但 Hardmax 不可导。Softmax 是我们能找到的、最接近 Hardmax 且处处可导的完美替代品。
    

所以，Scaling ($\div \sqrt{d_k}$) 就像是我们要使用 Softmax 这把“利剑”所必须支付的“保养费”。为了它的聚焦能力，这个代价是值得的。