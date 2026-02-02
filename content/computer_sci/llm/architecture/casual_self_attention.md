---
title: Casual Self Attention
tags:
  - basic
  - LLM
  - self-attention
date: 2026-02-02
---
# Causal Self-Attention (因果自注意力)

## 1. 核心概念
**Causal Self-Attention**，也称为**Masked Self-Attention**，是标准Self-Attention的一个变体，专门用于**自回归模型**（如Transformer的解码器、GPT系列）。它的核心目的是：在生成序列时，确保对位置 $i$ 的预测**仅依赖于已知的前置位置** $1$ 到 $i-1$，而无法“看到”未来的信息。

**类比**：就像你读文章时，只能根据已经读过的文字来理解当前句子，而不能提前翻阅后面的内容。

## 2. 与普通Self-Attention的关键区别
| 特性 | 普通 Self-Attention | Causal Self-Attention |
| :--- | :--- | :--- |
| **信息流** | 双向，每个词可以关注序列中的所有其他词（包括过去和未来）。 | 单向，每个词只能关注它自身及之前的所有词。 |
| **主要用途** | Transformer的**编码器**，用于理解整个输入上下文（如翻译的源句子）。 | Transformer的**解码器**或纯解码器模型（如GPT），用于**生成**序列。 |
| **实现方式** | 无需特殊处理。 | 通过应用一个**因果掩码**来实现。 |

## 3. 因果掩码的工作原理

因果掩码是一个在Softmax步骤之前加在注意力分数矩阵上的矩阵。

*   **作用**：将未来位置的注意力分数设置为一个非常大的负数（如 `-1e9`），这样在经过Softmax函数后，未来位置的权重会趋近于0。
*   **可视化**：
    对于一个长度为4的序列，其因果掩码矩阵（`mask`）和效果如下：
    ```
    注意力分数 (QK^T)          + 因果掩码           = 掩码后的分数
    [ s11, s12, s13, s14 ]    [ 0, -inf, -inf, -inf ]    [ s11, -inf, -inf, -inf ]
    [ s21, s22, s23, s24 ]    [ 0,   0, -inf, -inf ]    [ s21,  s22, -inf, -inf ]
    [ s31, s32, s33, s34 ]  + [ 0,   0,   0, -inf ]  =  [ s31,  s32,  s33, -inf ]
    [ s41, s42, s43, s44 ]    [ 0,   0,   0,   0  ]    [ s41,  s42,  s43,  s44 ]
    ```
    *`-inf` 代表一个极大的负数*

    经过Softmax后，`-inf` 位置对应的权重几乎为0，从而实现了“看不到未来”。

## 4. 伪代码/关键实现步骤
```python
def causal_self_attention(query, key, value):
    # query, key, value: shape [batch_size, seq_len, d_model]
    
    # 1. 计算注意力分数
    scores = torch.matmul(query, key.transpose(-2, -1)) / sqrt(d_k)
    # scores shape: [batch_size, seq_len, seq_len]
    
    # 2. 创建并应用因果掩码
    seq_len = scores.size(-1)
    # 创建一个下三角矩阵，对角线及以下为0，以上为负无穷
    mask = torch.triu(torch.ones(seq_len, seq_len), diagonal=1).bool()
    scores = scores.masked_fill(mask, -1e9) # 将未来位置填充为负无穷
    
    # 3. 计算注意力权重
    attn_weights = F.softmax(scores, dim=-1)
    
    # 4. 应用注意力权重到Value上
    output = torch.matmul(attn_weights, value)
    
    return output, attn_weights
```

## 5. Forward流程总结

对于一个输入序列 $X$：
1.  生成 $Q, K, V$。
2.  计算 $QK^T$，得到注意力分数矩阵。
3.  **应用因果掩码**，屏蔽掉上三角部分（未来位置）。
4.  对每一行进行Softmax归一化，得到注意力权重（未来位置权重≈0）。
5.  将权重矩阵与 $V$ 相乘，得到输出。每个位置的输出都是基于它自身及之前所有位置信息的加权和。


# Interview Question

## Why mask important

这是一个非常核心的问题。简单直接的回答是：**如果你想让模型学会“生成”文字，Masked Self-Attention 是必须的；如果你只是想让模型“理解”文字，它反而不是最优解。**

### 为什么要“自残”不让看未来信息？

你问“无法看到未来信息的目的到底是什么”，其核心目的只有一个：**防止模型在训练阶段“作弊”。**

> [!hint] 
> 语言模型的本质：Next Token Prediction 

我们要训练的 Language Model，本质上是一个**概率预测器**。给它“A B”，它预测“C”。

- **训练时：** 我们手里有完整的句子“A B C D”。
- **推理（生成）时：** 模型手里的序列是不断增长的。它先根据“A”生成“B”，再根据“A B”生成“C”。在生成“B”的那一刻，“C”在现实世界中还没产生，它是真正的“未来信息”。
    

**如果没有 Mask 会发生什么？** 如果在训练阶段，你让模型在预测第 3 个词时能看到第 4 个词，模型会迅速发现一个“捷径”：**它不需要学习语法、逻辑或常识，它只需要直接把第 4 个位置的答案“抄”过来就行了。**

这样训练出来的模型，在测试（生成）阶段会彻底废掉。因为生成时没有“未来信息”给它抄，它根本没学会如何根据已有的词去推理下一个词。

### 3. 单纯训练一个理解语料库的模型需要它吗？

这取决于你对“理解”的定义：

- **如果你只是想做搜索、聚类或分类：** 你不需要 Masked Self-Attention。你可以用 **Encoder 架构**。让模型看到全貌，它能更精准地提取每一个词的特征。
- **如果你希望模型能跟你对话、写代码、推理：** 这种“理解”必须建立在“生成能力”之上。因为“对话”本质上就是一连串的“预测下一个词”。为了让模型在没有参考答案的情况下也能产出合理的逻辑，你**必须**在训练时模拟这种“看不见未来”的真实环境。

