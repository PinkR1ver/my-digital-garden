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

![](computer_sci/llm/architecture/attachments/self-attention-cal-del.png)
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


### Multi-Head Attention

单头注意力只能从一个“视角”来关注信息。为了让模型能从多个不同的角度理解数据（例如，同时关注语法结构、语义关系等），Transformer引入了多头注意力。

它通过在多个“子空间”中并行进行注意力计算来实现。每个头独立学习不同的注意力模式，然后将所有头的输出拼接起来，通过一个线性变换得到最终结果。

![](computer_sci/llm/architecture/attachments/multi-head-attention.png)
<center>图4: 多头注意力机制示意图，输入被投影到多个头，并行计算注意力后拼接输出</center>


具体例子见：[multi_head_attention](computer_sci/llm/architecture/multi_head_attention.md)


### Positional Encoding

#### Traditional Positional Encoding

Positional Encoding的传统做法（《Attention Is All You Need》原论文中）如下：

- **单词变向量：** $X_{embed} = \text{Embedding}(X)$
- **生成位置向量：** $P = \text{Positional Encoding}(pos)$
- **暴力相加：** $Input = X_{embed} + P$

其中，位置向量不是通过简单的 $1, 2, 3, 4$（数值会无限变大，破坏权重）,也不想用训练式的 Embedding（当时认为这无法处理比训练集更长的句子）。

对于第 $pos$ 个位置（比如第 5 个词），它的位置向量 $PE$ 的第 $i$ 个维度（偶数维度用 sin，奇数维度用 cos）的计算方式是：

$$PE_{(pos, 2i)} = \sin\left(\frac{pos}{10000^{2i/d_{model}}}\right)$$
$$PE_{(pos, 2i+1)} = \cos\left(\frac{pos}{10000^{2i/d_{model}}}\right)$$

- $pos$: 单词在句子中的位置（0, 1, 2...）。
- $i$: 向量维度的索引。
- $d_{model}$: 向量的总维度（比如 512）。

为了理解这个公式，别看数学，看**物理逻辑**。
想象一下我们要用数字表示位置：

- **十进制：** 0, 1, 2, ..., 9, 10 (个位变了，十位才变)。
- **二进制：**
    
    - 00**0**
    - 00**1** (最后一位变化最快)
    - 01**0** (中间位变化慢一点)
    - 01**1**
    - 10**0** (第一位变化最慢)
        

Transformer 的这套公式，其实就是**连续版本的二进制**。

- **低维度（$i$ 很小）：** 分母小，频率高。正弦波震荡得非常快。这就像时钟的**秒针**，稍微动一下位置，数值就变了。
- **高维度（$i$ 很大）：** 分母大 ($10000^{...}$)，频率低。正弦波震荡得非常慢。这就像时钟的**时针**，走了很多步，数值才变一点点。

结论：

每一个位置 $pos$，都会生成一个独一无二的波纹指纹。模型看到这个指纹，就能反推出：“哦，你是第 5 个词”。

![](computer_sci/llm/architecture/attachments/Absolute%20Positional%20Encoding.gif)
<center>图5: 位置编码热力图</center>


原作者选择正弦函数，不仅仅是因为它有周期性，更因为一个**黄金数学性质**：**它可以让模型学会“相对位置”。**
在三角函数公式中：

$$\sin(\alpha + \beta) = \sin\alpha \cos\beta + \cos\alpha \sin\beta$$
$$\cos(\alpha + \beta) = \cos\alpha \cos\beta - \sin\alpha \sin\beta$$

这意味着：

位置 $pos+k$ 的编码，可以表示为位置 $pos$ 的编码的线性变换（Linear Function）。

虽然我们给的是绝对位置（第1个，第2个...），但因为这个数学性质，模型在 Attention 做矩阵乘法时，理论上能够自动推导出来：“只要知道了我在 pos，我就能轻松算出 pos+k 的特征。
这就是为什么 Google 当时认为这套方案是完美的：既给了绝对位置，又隐含了相对位置信息。

**第一反应可能是：** _“等等，Embedding 是语义信息（比如‘猫’），P 是位置信息（比如‘第1个’）。直接把这两个向量加起来，难道不会把‘猫’的含义搞乱吗？”_

**答案是：不会（或者说影响可控）。**

- **高维空间的稀疏性：** Transformer 的维度通常很大（比如 512 或 4096）。在这个高维空间里，语义信息和位置信息往往分布在不同的子空间里。虽然数值加在一起了，但模型在训练中能学会把它们“拆”开来看。


同时，Absolute Positional Encoding有个大问题是，“I walk my dog every day”和“every day I walk my dog”，这两个含义完全相同的句子，tokens却获得了全新的位置编码；因此 Relative Positional Encoding非常关键，可以帮助我们知道sequence order而无需担心它们的精确位置

#### PoRE(Rotary Positional Embedding)

PoRE的设的设计初衷是**直接保证并利用相对位置信息**，这是它相较于传统绝对位置编码（如Sinusoidal PE）的核心优势。

传统方法将位置信息“加”到词嵌入上，模型需要从绝对位置中“学习”相对关系。而PoRE的设计哲学是：**让Attention分数（即$Q$和$K$的点积）本身就只依赖于词向量内容和它们之间的相对位置**，从而在机制上先天保证相对位置的建模。

这可以用一个关键公式来说明。在应用PoRE后，处于位置$m$的词$Q_m$和处于位置$n$的词$K_n$，它们的点积计算结果是：

$$
Q_m^T K_n = (\boldsymbol{R}_{\theta, m} \boldsymbol{W}_q \boldsymbol{x}_m)^T (\boldsymbol{R}_{\theta, n} \boldsymbol{W}_k \boldsymbol{x}_n)
$$

其中，$\boldsymbol{R}_{\theta, m}$和$\boldsymbol{R}_{\theta, n}$是分别由位置$m$和$n$决定的旋转矩阵。这个设计的精妙之处在于，利用旋转矩阵的性质（$\boldsymbol{R}_{\theta, m}^T \boldsymbol{R}_{\theta, n} = \boldsymbol{R}_{\theta, n-m}$），上面的公式可以简化为：

$$
Q_m^T K_n = (\boldsymbol{W}_q \boldsymbol{x}_m)^T \boldsymbol{R}_{\theta, n-m} (\boldsymbol{W}_k \boldsymbol{x}_n)
$$

**这个最终公式清晰地揭示了PoRE的设计初衷：** 词$m$对词$n$的注意力分数$Q_m^T K_n$，**仅仅依赖于**原始的词向量投影$(\boldsymbol{W}_q \boldsymbol{x}_m)$、$(\boldsymbol{W}_k \boldsymbol{x}_n)$以及它们之间的**相对位置差$(n-m)$**。

**总结一下：**
*   **初衷：** 让自注意力机制能够直接、显式地建模**相对位置**关系，而不是依赖模型从绝对位置中推断。
*   **实现方式：** 通过对每一层的$Q$和$K$向量施加旋转变换（而非在输入层简单相加）。
*   **核心公式体现：** $Q_m^T K_n = (\boldsymbol{W}_q \boldsymbol{x}_m)^T \boldsymbol{R}_{\theta, n-m} (\boldsymbol{W}_k \boldsymbol{x}_n)$。这个结果保证了注意力分数是词内容与相对位置$(n-m)$的函数，完美达成了设计目标。这使得模型在处理如“I walk my dog every day”和“every day I walk my dog”这样的句子时，能更好地理解词序变化下的语义一致性。

![](computer_sci/llm/architecture/attachments/RoPE.png)
<center>图6: PoRE</center>

---


在实现detail上， PoRE**不在输入层，而在每一层的 Attention 内部。**

- **传统：** `Embedding + Position` $\to$ 进入 Layer 1。
- **RoPE：** `Embedding` $\to$ 变成 $Q, K, V$ $\to$ **只对 $Q$ 和 $K$ 进行旋转** $\to$ 计算 $Q \cdot K^T$。

$$x \xrightarrow{\text{Linear}} Q, K \xrightarrow{\text{RoPE (旋转)}} Q', K' \xrightarrow{\text{Dot Product}} \text{Attention Scores}$$

RoPE 的核心思想是将向量看作复数平面上的点，通过**旋转角度**来注入位置信息。

- **分组：** 把 $Q$ 和 $K$ 向量两两分组（比如 64 维分为 32 对）。
- **定义角度：** 第 $m$ 个位置的 token，旋转角度为 $m\theta$。
- **旋转：** 对每一对数值 $(x_1, x_2)$ 乘以一个旋转矩阵：
    
    $$\begin{pmatrix} \cos m\theta & -\sin m\theta \\ \sin m\theta & \cos m\theta \end{pmatrix} \begin{pmatrix} x_1 \\ x_2 \end{pmatrix}$$
例如，
$$Q = [\mathbf{1.0}, \mathbf{0.0}, \mathbf{1.0}, \mathbf{0.0}]$$
RoPE 的第一步是 “切分” (Pairing)：它把这个 4 维向量，切成了 2 对 双胞胎。

- **第一对双胞胎 (Pair 1):** 取前两个数 $[1.0, 0.0]$。
    
    - 这里 $x_1 = 0.0$
    - 这里 $x_2 = 1.0$
        
- **第二对双胞胎 (Pair 2):** 取后两个数 $[1.0, 0.0]$。
    
    - 这里 $x_1 = 1.0$
    - 这里 $x_2 = 0.0$
        

**这就是 $(x_1, x_2)$ 的真面目：它们就是向量里原本就有的数字，只是被我们两个两个地拎出来处理了。**

 第二步，计算“转速” $\theta$（这是变慢的关键！）。RoPE 规定，每一对的旋转基础角度 $\theta_i$ 是通过固定公式算出来的：

$$\theta_i = \frac{1}{10000^{2i/d}}$$

- $d = 4$ (总维度)
- $i$ = 当前是第几对

#### 1. 第 0 对 ($i=0$) 的转速：

$$\theta_0 = \frac{1}{10000^{2 \times 0 / 4}} = \frac{1}{10000^0} = \frac{1}{1} = \mathbf{1}$$

结论： 第 0 对的基础转速是 1 弧度/步（约 57 度）。非常快！

#### 2. 第 1 对 ($i=1$) 的转速：

$$\theta_1 = \frac{1}{10000^{2 \times 1 / 4}} = \frac{1}{10000^{0.5}} = \frac{1}{\sqrt{10000}} = \frac{1}{100} = \mathbf{0.01}$$

结论： 第 1 对的基础转速是 0.01 弧度/步（约 0.57 度）。超级慢！

第一对每次转 57 度，像风扇一样狂转。 第二对每次只转 0.5 度，像乌龟一样挪动。这就是“频率衰减”。

现在从第一个单词开始，所以 $m=1$。 我们需要旋转的总角度是：$\text{总角度} = m \times \theta$。

**处理第 0 对：高速组 $[1.0, 0.0]$**
- **旋转角度：** $1 \times 1 = 1$ 弧度。
- **计算：**
    
    $$ \begin{pmatrix} x'_0 \\ x'_1 \end{pmatrix} = \begin{pmatrix} \cos(1) & -\sin(1) \\ \sin(1) & \cos(1) \end{pmatrix} \begin{pmatrix} 1.0 \\ 0.0 \end{pmatrix}$$
    
    (查表得：$\cos(1) \approx 0.54, \sin(1) \approx 0.84$)
    
    $$ x'_0 = 1.0 \times 0.54 - 0.0 \times 0.84 = \mathbf{0.54}$$
    
    $$x'_1 = 1.0 \times 0.84 + 0.0 \times 0.54 = \mathbf{0.84}$$
    
    **结果：** 向量从 $[1, 0]$ 变成了 $[0.54, 0.84]$。**变化非常大！**

**处理第 1 对：低速组 $[1.0, 0.0]$**

- **旋转角度：** $1 \times 0.01 = 0.01$ 弧度。
- **计算：**
    $$ \begin{pmatrix} x'_2 \\ x'_3 \end{pmatrix} = \begin{pmatrix} \cos(0.01) & -\sin(0.01) \\ \sin(0.01) & \cos(0.01) \end{pmatrix} \begin{pmatrix} 1.0 \\ 0.0 \end{pmatrix}$$
    
    (近似：$\cos(0.01) \approx 1.0, \sin(0.01) \approx 0.01$)
    
    
    $$ x'_2 = 1.0 \times 1.0 - 0.0 \times 0.01 \approx \mathbf{1.0}$$
    $$ x'_3 = 1.0 \times 0.01 + 0.0 \times 1.0 \approx \mathbf{0.01}$$
    **结果：** 向量从 $[1, 0]$ 变成了 $[1.0, 0.01]$。**几乎没动！**

我们把最终结果拼起来看：

- **原始向量：** `[1.0, 0.0, 1.0, 0.0]`
- **RoPE后向量：** `[0.54, 0.84, 1.0, 0.01]`
    

**这说明了什么？**

1. 前两维（快针）：**它是“秒针”**。 如果单词从位置 1 挪到位置 2，这两维的数值会剧烈跳变（比如转到负数去）。它们负责告诉模型：**“我是第 1 个词，不是第 2 个词”。**（区分近距离）
2. 后两维（慢针）：**它是“时针”**。 单词从位置 1 挪到位置 2，它几乎不动。只有当单词挪到第 100 个位置时，它才会转过明显的角度。它们负责告诉模型：**“我在句子的前半段，不在后半段”。**（区分长距离）
    


**解决周期性问题**：如果所有维度都像“秒针”一样高速旋转，那么位置$m$和位置$m+360$的编码在经过360度旋转后会变得完全相同，模型将无法区分它们。**低速维**的存在避免了这一点，因为它们在长距离内才会累积出显著变化，从而为超长序列中的每个位置生成一个**几乎唯一**的复合编码“指纹”。

**实现多尺度感知**：模型可以同时利用不同频率的维度。当判断两个词是否相邻时，它更依赖**高速维**的显著差异；当判断两个词是否属于同一个长段落或章节时，它则参考**低速维**的相似性。

---


同时，RoPE技术还跟Training Context Length有很大的关系，这部分我们详细见：[RoPE_detail](computer_sci/llm/architecture/RoPE_detail.md)


## Transformer Arch

### Encoder-Decoder

2017 年《Attention is All You Need》论文中的原始形态，最初是为**机器翻译**设计的。

* ***Encoder（编码器）：** 负责“理解”。它通过多层 Self-Attention 查看整个输入句子，把每个词转化成包含上下文信息的向量。
* **Decoder（解码器）：** 负责“生成”。它比 Encoder 多了一个 **Cross-Attention（交叉注意力）** 层。
	* **Cross-Attention：** Decoder 会拿着自己已经生成的词，去询问 Encoder：“原文里哪些信息对我生成下一个词最重要？”


- **输入端：** Input $\rightarrow$ Embedding + Positional Embedding $\rightarrow$ Encoder。
- **中间桥梁：** Encoder 输出的“特征矩阵”被送往 Decoder 的每一层。
- **输出端：** Decoder 结合已生成的词和 Encoder 的信息，逐个预测下一个词。

### Encoder-only & Decoder-only

随着研究深入，人们发现这两个模块其实可以拆开单独使用，这也开启了 NLP 的两个大时代。

#### Encoder-only (代表作：BERT)

- **结构：** 只保留左半边。
- **特点：** “全向看”。计算某个词时，它能看到句子中左边和右边所有的词。
- **擅长：** 文本分类、命名实体识别、阅读理解。因为它能透彻地理解上下文，但由于它“预知了未来（看到了右边的词）”，所以很难用来做流畅的文本生成。
    

#### Decoder-only (代表作：GPT 系列)

- **结构：** 只保留右半边，但去掉了 Cross-Attention（因为没有 Encoder 了）。
- **特点：** “向左看”。由于使用了 **Masked Self-Attention（掩码自注意力）**，它在生成第 $n$ 个词时，只能看到前 $n-1$ 个词。
- **擅长：** 预测下一个词。


### LLM：Decoder-only？

从 BERT（Encoder-only）统治世界到 GPT（Decoder-only）一统江湖，主要有以下几个深层原因：

#### A. 训练效率与规模化（Scalability）

Encoder-Decoder 结构虽然强大，但参数量分布在两个模块中。研究发现，将所有参数集中在一个统一的 Decoder 架构下，模型在海量数据上的学习效率更高。随着参数规模达到千亿级，Decoder-only 展现出了更强的**涌现能力（Emergent Abilities）**。

#### B. 任务的统一性

LLM 的本质是“文本续写”。

- **Encoder-only** 适合判别任务，但生成能力弱。
- **Encoder-Decoder** 适合翻译，但在处理复杂的开放式对话、逻辑推理时，Encoder 的预处理有时反而限制了模型生成的自由度。
- **Decoder-only** 把一切任务（翻译、分类、代码、创作）都转化成了“预测下一个词”。这种极简的逻辑在工程实现上极其稳定。
    
#### C. 零样本推理（Zero-shot Learning）

Decoder-only 架构在预训练阶段就是在做“根据上文填空”。这让它天然适应 Prompt（提示词）模式。你给它一段指令，它会自然而然地沿着指令往下补全，这种特性是 BERT 等模型很难模拟的。


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


## Refernece

* [Understanding Transformer Sinusoidal Position Embedding](https://medium.com/@hirok4/understanding-transformer-sinusoidal-position-embedding-7cbaaf3b9f6a)
* [Understanding Positional Encoding in Transformers](https://erdem.pl/2021/05/understanding-positional-encoding-in-transformers)
* [How Rotary Position Embedding Supercharges Modern LLMs](https://www.youtube.com/watch?v=SMBkImDWOyQ)
* [RoPE PPT Slides](computer_sci/llm/architecture/attachments/RoPE.pptx)