---
title: Self-Attention Detail Example
date: 2026-01-19
tags:
  - self-attention
  - basic
  - example
  - attention
---
全链路：

- **输入句子：** **"Time Machine"** (为了简单，假设句子只有这两个词)。    
- **维度设定：**
    
    - Embedding 维度 ($d_{model}$) = **4**
    - Q, K, V 的维度 ($d_k, d_v$) = **3** (注意：故意把维度变小，模拟“降维投影”的过程，这在[multi-head attention](computer_sci/llm/architecture/multi_head_attention.md)里常用)。

---

### 第一阶段：Embedding (词嵌入)

这是 Transformer 的大门。计算机不认识单词，只认识数字。
在模型训练之前，我们已经有一个巨大的 Embedding 表（这就好比一本字典，每个词对应一行数字）。
假设查表后得到的向量如下：

- **"Time" ($x_1$):** `[1, 0, 1, 0]`
- **"Machine" ($x_2$):** `[0, 2, 0, 1]`
    

我们将这两个向量拼成一个矩阵 $X$（输入矩阵）：
$$X = \begin{bmatrix} 1 & 0 & 1 & 0 \\ 0 & 2 & 0 & 1 \end{bmatrix} \begin{matrix} \leftarrow \text{Time} \\ \leftarrow \text{Machine} \end{matrix}$$

---

### 第二阶段：生成 Q, K, V

这是你最关心的部分：**向量是怎么变成 Q、K、V 的？**

Transformer 每一层都有三个可训练的权重矩阵：$W^Q, W^K, W^V$。

这些矩阵的形状是 [Embedding维度, QKV维度]，也就是 4 x 3。

假设（经过一轮随机初始化后）$W^Q$ 矩阵长这样：

$$W^Q = \begin{bmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 1 & 0 & 1 \\ 0 & 0 & 1 \end{bmatrix}$$

现在的任务：计算 Query (Q) 矩阵。

公式：$Q = X \cdot W^Q$

我们来手算一下 **"Time"** 这个词的 Query 向量：

$$\begin{aligned} q_{\text{Time}} &= [1, 0, 1, 0] \cdot W^Q \\ &= [(1\cdot1 + 0\cdot0 + 1\cdot1 + 0\cdot0), \quad (1\cdot0 + 0\cdot1 + 1\cdot0 + 0\cdot0), \quad (1\cdot0 + 0\cdot0 + 1\cdot1 + 0\cdot1)] \\ &= [\mathbf{2}, \mathbf{0}, \mathbf{1}] \end{aligned}$$

_解读：通过乘以 $W^Q$，我们将 4 维的原始向量压缩成了 3 维的查询向量。_

同理，计算出所有 Q, K, V（这里我直接给出假设的计算结果，方便后续步骤）：

**Q (查询 - 我在找什么):**

$$Q = \begin{bmatrix} 2 & 0 & 1 \\ 1 & 2 & 1 \end{bmatrix} \begin{matrix} \leftarrow \text{Time} \\ \leftarrow \text{Machine} \end{matrix}$$

K (键 - 我有什么特征):
( $X \cdot W^K$ 的结果)

$$K = \begin{bmatrix} 1 & 0 & 1 \\ 0 & 1 & 0 \end{bmatrix} \begin{matrix} \leftarrow \text{Time} \\ \leftarrow \text{Machine} \end{matrix}$$

V (值 - 我的实际内容):
( $X \cdot W^V$ 的结果)

$$V = \begin{bmatrix} 10 & 2 & 0 \\ 2 & 5 & 8 \end{bmatrix} \begin{matrix} \leftarrow \text{Time} \\ \leftarrow \text{Machine} \end{matrix}$$

---

### 第三阶段：计算相关性 ($Q \cdot K^T$)

现在我们要看看 "Time" 和 "Machine" 之间的关系。

公式：$Q \times K^T$

**1. 计算 "Time" (Row 1) 的得分：**

- **Time vs Time:** $2\times1 + 0\times0 + 1\times1 = \mathbf{3}$
- Time vs Machine: $2\times0 + 0\times1 + 1\times0 = \mathbf{0}$
    
    (这说明在这个简单的例子里，Time 的 Query 和 Machine 的 Key 完全不匹配)
    

**2. 计算 "Machine" (Row 2) 的得分：**

- **Machine vs Time:** $1\times1 + 2\times0 + 1\times1 = \mathbf{2}$
- **Machine vs Machine:** $1\times0 + 2\times1 + 1\times0 = \mathbf{2}$
    

**得分矩阵 (Scores):**

$$\text{Scores} = \begin{bmatrix} 3 & 0 \\ 2 & 2 \end{bmatrix}$$

---

### 第四阶段：缩放与归一化 (Scale & Softmax)

1. Scaling:

我们的 $d_k = 3$，所以 $\sqrt{d_k} \approx 1.73$。
为了方便计算，我们粗略取值为 1.7。

$$\text{Scaled} = \begin{bmatrix} 3/1.7 & 0/1.7 \\ 2/1.7 & 2/1.7 \end{bmatrix} \approx \begin{bmatrix} 1.76 & 0 \\ 1.17 & 1.17 \end{bmatrix}$$

2. Softmax (按行):

将这些分数转换成概率。

- 第一行 ("Time"):
    
    输入 $[1.76, 0]$。
    $e^{1.76} \approx 5.8$, $e^0 = 1$。总和 $6.8$。
    权重 $\approx [\mathbf{0.85}, \mathbf{0.15}]$
    (解读：Time 主要关注自己，稍微关注一点点“Machine”)
    
- 第二行 ("Machine"):
    
    输入 $[1.17, 1.17]$。
    数值一样，权重平分。
    权重 $= [\mathbf{0.5}, \mathbf{0.5}]$
    (解读：Machine 50% 关注 Time，50% 关注自己)
    

**注意力权重矩阵 (Attention Weights):**

$$\text{Weights} = \begin{bmatrix} 0.85 & 0.15 \\ 0.50 & 0.50 \end{bmatrix}$$

---

### 第五阶段：提取信息 —— 加权求和 ($W \cdot V$)

最后，用算出来的权重去“混合” V 矩阵里的信息。

**回顾 V 矩阵：**

$$V = \begin{bmatrix} 10 & 2 & 0 \\ 2 & 5 & 8 \end{bmatrix} \begin{matrix} \leftarrow \text{Time的信息} \\ \leftarrow \text{Machine的信息} \end{matrix}$$

1. 计算 "Time" 的新向量 (Output 1):

它是 $0.85 \times (\text{Time的V}) + 0.15 \times (\text{Machine的V})$。

- 第一维: $0.85 \times 10 + 0.15 \times 2 = 8.5 + 0.3 = 8.8$    
- 第二维: $0.85 \times 2 + 0.15 \times 5 = 1.7 + 0.75 = 2.45$
- 第三维: $0.85 \times 0 + 0.15 \times 8 = 0 + 1.2 = 1.2$
    

"Time" 的新向量 = $[8.8, 2.45, 1.2]$

(原始 V 是 $[10, 2, 0]$。你看，它吸收了“Machine”的一些特征，第三维从 0 变成了 1.2)

2. 计算 "Machine" 的新向量 (Output 2):

它是 $0.5 \times (\text{Time的V}) + 0.5 \times (\text{Machine的V})$。

- 直接取平均: $[(10+2)/2, (2+5)/2, (0+8)/2] = [6, 3.5, 4]$
    

**"Machine" 的新向量 = $[6, 3.5, 4]$**

---

### 总结：数据是怎么流动的？

1. **Embedding:** `[1, 0, 1, 0]` (我是单词 "Time")
2. **Projection:** 乘以 $W^Q, W^K, W^V$ 变成了三个小向量 $q, k, v$。
3. **Attention:** 拿我的 $q$ 去和大家的 $k$ 比较，发现我和自己最相关，和“Machine”不太熟。
4. **Output:** 既然不太熟，我就只拿一点点“Machine”的 $v$，主要保留我自己的 $v$。最终输出了一个混合向量。
    

这个**混合向量**，就是下一层网络的输入（或者下一层 Transformer Block 的输入）。这个过程重复 6 次（或更多），模型就深刻理解了整句话的含义。