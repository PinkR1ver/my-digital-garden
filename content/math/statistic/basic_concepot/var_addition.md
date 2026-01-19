---
title: Var Addition Theory
tags:
  - basic
  - math
  - statistics
  - self-attention
date: 2026-01-17
---
## 方差的可加性

对于 **相互独立** 的随机变量 $X_1, X_2, ..., X_n$，它们之和的方差等于各自方差之和。

$$
\text{Var}\left(\sum_{i=1}^{n} X_i\right) = \sum_{i=1}^{n} \text{Var}(X_i)
$$

**证明**：
设这些随机变量的期望分别为 $\mu_i = E[X_i]$。
根据定义，和的方差为：
$$
\begin{aligned}
\text{Var}\left(\sum_{i=1}^{n} X_i\right) &= E\left[ \left( \sum_{i=1}^{n} (X_i - \mu_i) \right)^2 \right] \\
&= E\left[ \sum_{i=1}^{n} \sum_{j=1}^{n} (X_i - \mu_i)(X_j - \mu_j) \right] \\
&= \sum_{i=1}^{n} \sum_{j=1}^{n} E\left[ (X_i - \mu_i)(X_j - \mu_j) \right]
\end{aligned}
$$
其中 $E[(X_i - \mu_i)(X_j - \mu_j)]$ 就是协方差 $\text{Cov}(X_i, X_j)$。
当 $i \neq j$ 时，由于变量相互独立，协方差为 0。
当 $i = j$ 时，协方差就是方差 $\text{Var}(X_i)$。
因此：
$$
\text{Var}\left(\sum_{i=1}^{n} X_i\right) = \sum_{i=1}^{n} \text{Var}(X_i)
$$
**证毕**。

**重要前提**：此性质成立的关键条件是随机变量 **相互独立**。如果变量之间存在相关性，则和的方差公式需包含协方差项：$\text{Var}(\sum X_i) = \sum \text{Var}(X_i) + 2\sum_{i<j}\text{Cov}(X_i, X_j)$。

## 在 Self-Attention 中的应用

在 Transformer 的 Self-Attention 机制中，注意力得分通过查询向量 $\mathbf{q}$ 和键向量 $\mathbf{k}$ 的点积计算，二者维度均为 $d_k$。

通常我们假设 $\mathbf{q}$ 和 $\mathbf{k}$ 的每个分量是**独立**的随机变量，且方差均为 1。即：
- 对于 $i = 1, ..., d_k$, $q_i$ 的方差 $\text{Var}(q_i) = 1$
- 对于 $i = 1, ..., d_k$, $k_i$ 的方差 $\text{Var}(k_i) = 1$
- 同时，我们通常也假设 $q_i$ 与 $k_i$ 独立，且 $E[q_i] = E[k_i] = 0$。

那么，点积 $\mathbf{q} \cdot \mathbf{k} = \sum_{i=1}^{d_k} q_i k_i$ 中，每一项 $q_i k_i$ 的方差是多少？

由于 $q_i$ 与 $k_i$ 独立且均值为0，有：
$$
\text{Var}(q_i k_i) = E[(q_i k_i)^2] - (E[q_i k_i])^2 = E[q_i^2]E[k_i^2] - 0 = \text{Var}(q_i) \cdot \text{Var}(k_i) = 1 \times 1 = 1
$$
这里利用了 $E[q_i^2] = \text{Var}(q_i)$（因为均值为0）。

现在，我们将 $d_k$ 个方差为 1 的**独立**随机变量 $q_i k_i$ 相加。根据方差可加性定理：
$$
\text{Var}\left(\mathbf{q} \cdot \mathbf{k}\right) = \text{Var}\left(\sum_{i=1}^{d_k} q_i k_i\right) = \sum_{i=1}^{d_k} \text{Var}(q_i k_i) = \sum_{i=1}^{d_k} 1 = d_k
$$

**结论**：$d_k$ 个方差为 1 的独立随机变量之和，其方差确实为 $d_k$。

### 为何需要缩放因子 $\frac{1}{\sqrt{d_k}}$

在 Self-Attention 的原始论文 *Attention Is All You Need* 中，注意力得分的计算公式为：
$$
\text{Attention}(\mathbf{Q}, \mathbf{K}, \mathbf{V}) = \text{softmax}\left(\frac{\mathbf{Q}\mathbf{K}^T}{\sqrt{d_k}}\right)\mathbf{V}
$$

**缩放的原因**：
1.  如上所证，点积 $\mathbf{Q}\mathbf{K}^T$ 的结果方差随 $d_k$ 线性增长 ($\text{Var} = d_k$)。
2.  Softmax 函数对输入的幅度非常敏感。如果输入值的方差过大（即数值的尺度很大），softmax 的梯度会变得非常小（进入饱和区），导致训练困难，即所谓的“梯度消失”问题。
3.  为了稳定训练，需要将点积结果的方差控制在一个合理的尺度（如1附近）。
4.  将点积结果除以 $\sqrt{d_k}$，相当于将其标准差（方差的平方根）归一化：
    $$
    \text{Var}\left(\frac{\mathbf{q} \cdot \mathbf{k}}{\sqrt{d_k}}\right) = \frac{1}{d_k} \times \text{Var}(\mathbf{q} \cdot \mathbf{k}) = \frac{1}{d_k} \times d_k = 1
    $$
    这样，缩放后的注意力得分具有单位方差，有利于 softmax 函数的稳定计算和梯度流动。