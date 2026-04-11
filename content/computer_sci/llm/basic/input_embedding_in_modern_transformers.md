---
title: Input Embedding in Modern Transformers
date: 2026-04-12
tags:
  - LLM
  - transformer
  - embedding
  - tokenizer
  - basic
---
## Overview

在现代 Transformer / LLM 系统里，**input embedding** 的任务不是“理解字符串”，而是把输入变成模型可以处理的**向量序列**。

Transformer block 真正接收的不是原始文本，而是形如：

$$
X \in \mathbb{R}^{T \times d}
$$

其中：

- $T$ 表示序列长度（token 数）
- $d$ 表示模型隐藏维度（例如 $d_{model}$）

所以从系统视角看，Transformer 并不绑定某一种唯一的 input embedding 方法。它只要求：**在进入 attention / MLP 之前，输入已经被表示成一串向量。**

---

## 一个最重要的边界

初学时最容易混在一起的，其实是下面五层：

1. **tokenizer granularity**：按 word、subword、byte、char，还是别的粒度切分
2. **vocab / token-id mapping**：哪些 token 合法、每个 token 对应哪个 id
3. **token embedding lookup**：把 token id 映射到向量
4. **position information integration**：如何引入位置信息
5. **transformer layers**：后续 attention / MLP 等计算

这五层相关，但不是同一件事。

尤其要区分：

- **tokenizer** 决定怎么切
- **vocab** 决定哪些 token 在系统字典里
- **embedding layer** 只负责把 id 变成向量
- **position handling** 决定序列位置信息如何进入模型

---

## 标准文本输入路径

最常见的文本路径可以写成：

```text
text -> tokenizer -> tokens -> token ids -> embedding lookup -> vectors
```

这是现代 LLM 中最常见、也最容易被误以为是“唯一方案”的做法。

### 标准 token embedding lookup

典型流程是：

1. 输入文本先经过 tokenizer
2. tokenizer 输出 token 序列以及对应的 token ids
3. 模型维护一个 embedding table

$$
E \in \mathbb{R}^{V \times d}
$$

其中：

- $V$ 是 vocabulary size
- $d$ 是 embedding dimension（通常与模型隐藏维度相关，或直接等于 $d_{model}$）

4. 通过 `nn.Embedding(V, d_model)` 或等价的查表操作，从第 `id` 行取出对应向量
5. 得到长度为 $T$ 的 embedding 序列

如果 token ids 为：

$$
[i_1, i_2, \dots, i_T]
$$

那么 lookup 后可得到：

$$
[x_1, x_2, \dots, x_T], \quad x_t \in \mathbb{R}^d
$$

堆起来后就是：

$$
X \in \mathbb{R}^{T \times d}
$$

这才是后续 Transformer 层真正接收的输入表示。

---

## vocab size 是怎么定下来的

vocab size 并不是运行时根据一句话临时生成的。

更准确地说，顺序通常是：

1. 先决定 tokenizer 方案
2. 再确定 vocabulary
3. 然后模型才据此建立 embedding table

所以：

- vocabulary 是**预先定义**的
- embedding table 的行数 $V$ 也是**事先固定**的
- 运行时只是在这个固定词表里查 id

对于现代模型，$V$ 往往是一个设计超参数，例如：

- 8k
- 32k
- 50k
- 100k+

不同模型选择不同 vocab size，通常和训练语料、语言覆盖范围、tokenizer 设计、推理效率等因素有关。

---

## sentence 是怎么切成 token 的

这一步主要不是 embedding layer 决定的，而是 tokenizer 决定的。

要明确分开看：

### 1. tokenizer 决定怎么切

同一句文本，不同 tokenizer 可能切出完全不同的 token 序列。

例如，一个 tokenizer 可能偏向：

- 更长的 subword
- 更细的 byte-level units
- 特定语言下更稳定的切分习惯

### 2. vocab 决定哪些 token 合法

tokenizer 的输出并不是任意字符串碎片，而是要落到一个预定义的 token vocabulary 上。

### 3. embedding layer 不负责切分

embedding layer 不关心原文本长什么样，也不负责决定 token 合法性。
它只做一件事：

- 输入 id
- 输出向量

所以 embedding 是一个**表示层**，不是一个**切词层**。

---

## unknown input 是怎么处理的

这里最好区分两种常见叙述。

### A. 教学简化版 / 老式方法：`<unk>`

在较早或较简化的 NLP 讲法里，词表外的词会被映射到一个特殊 token，例如：

```text
<unk>
```

对应地：

- 所有未知词共享同一个 unknown token id
- 也共享同一个 unknown embedding

这种方法实现简单，但信息损失很大。因为：

- “electromagnetics” 和 “blueberryism” 如果都不在词表里
- 最终可能都变成同一个 `<unk>`

模型自然无法区分它们。

### B. 现代 LLM 更常见的方法：继续拆分

现代 LLM 更常见的做法，不再强依赖“整词词表”。
它们通常使用：

- subword tokenizer
- BPE
- WordPiece
- SentencePiece / Unigram
- byte-level tokenizer

因此一个“整词不在 vocab 里”的输入，并不一定意味着“查不到”。
更常见的情况是：

- 整词不在 vocab 中
- 但它可以被拆成多个在 vocab 中的 token

也就是说，现代 LLM 中更准确的说法通常不是：

> 这个词不在词表里，所以模型没法表示。

而是：

> 这个整词不作为单个 token 存在，但 tokenizer 还可以继续拆，直到表示为合法 token 序列为止。

这也是为什么现代系统在开放词汇、拼写变体、稀有词、代码、混合语言等场景下，比老式 `<unk>` 机制稳得多。

---

## “是不是从最大的开始” 该怎么理解

很多人在直觉上会把 tokenizer 理解为：

> 从左到右，优先挑最大的合法 token。

这个说法**对某些 tokenizer 的输出直觉是近似成立的**，但不能当成统一原理。

更准确的表述应该是：

> 很多 tokenizer 的结果看起来像是在优先使用较大的、较常见的合法 token，但底层是否是简单的 longest-match-first，要看具体算法。

原因在于不同 tokenizer 机制并不完全一样：

- **BPE**：基于 merge 规则，结果常常表现出“倾向较长子词”的效果
- **WordPiece**：常被描述为偏向能带来更好整体匹配的子词分解
- **Unigram / SentencePiece**：更像是在候选分解中选择概率更合适的一种
- **byte-level tokenizer**：会把可表示性进一步下放到底层字节

所以“像是在选最大的”可以作为经验直觉，但不应把它误写成所有 tokenizer 的共同底层机制。

---

## Transformer 并不绑定单一 embedding 方法

对 Transformer 而言，关键不是“是不是 token embedding lookup”，而是：

- 输入能否被表示为向量序列
- 后续 attention 能否在这些向量上工作

因此 Transformer 可以接收多种来源的输入表示。

### 常见形式

#### 1. token embedding lookup

最标准的文本做法：

- token ids
- 查 embedding table
- 得到 token vectors

#### 2. token embedding + positional embedding

经典 Transformer 会把 token embedding 与 positional embedding 相加，再送入后续层。

#### 3. token embedding + RoPE-style positional handling

现代 LLM 中，位置处理不一定是在输入层做简单相加。
像 [[computer_sci/llm/architecture/RoPE_detail|RoPE]] 这样的方案，是在 attention 内部对 $Q/K$ 注入位置信息，而不是把“位置向量”直接并到初始输入上。

这说明：

- token embedding
- position handling

是两层不同的问题。

#### 4. word / subword / byte / char level inputs

只要最后能形成向量序列，Transformer 都可以工作。
差别主要在于：

- token 粒度
- sequence length
- vocabulary 设计
- 训练效率和泛化行为

#### 5. multimodal patch embeddings

Transformer 也并不绑定文本。
在视觉或多模态系统里，输入可能是：

- image patches
- audio frames
- 其他模态的离散或连续单元

这些输入经过各自的前端处理后，同样可以变成向量序列，再交给 Transformer。

因此从更高层看，Transformer 接收的是 **sequence of vectors**，而不是“字符串专用接口”。

---

## position handling 不是 input embedding 的同义词

这是另一个很容易混淆的点。

在很多口头表达里，“embedding” 会被宽泛地拿来指代“输入前的一切处理”。但更严格地区分时：

- **token embedding**：把 token id 映射为向量
- **position handling**：把位置信息整合进表示
- **transformer computation**：在这些表示上做 attention / MLP

例如：

- 原始 Transformer 常写成 `token embedding + positional embedding`
- 现代 LLM 可能使用 [[computer_sci/llm/architecture/RoPE_detail|RoPE]] 这类机制

这两种做法都服务于“位置信息进入模型”，但实现层级并不相同。

因此在读论文或代码时，最好不要把“embedding layer”“tokenizer”“position encoding / RoPE”混为一谈。

---

## 一个更稳的层次图

如果想把这套东西记清楚，可以按下面这条链路理解：

```text
tokenizer granularity
    -> vocab / token-id mapping
    -> token embedding lookup
    -> position information integration
    -> transformer layers
```

这条链路有两个好处：

1. 能看清每一层各自负责什么
2. 能解释为什么“tokenizer 在变、embedding 在变、position handling 在变”并不表示它们是同一层设计

---

## Summary

关于现代 Transformer / LLM 的 input embedding，可以抓住下面几条：

1. **Transformer 不要求唯一的 input embedding 方法**
   - 它真正要求的是向量序列输入

2. **最常见的文本方案是 token embedding lookup**
   - `text -> tokenizer -> token ids -> embedding table -> vectors`

3. **vocab size 是预先设计好的，不是运行时现决定的**
   - tokenizer 与 vocabulary 先定，模型再建立 embedding table

4. **unknown input 在现代 LLM 中通常不是直接退化成 `<unk>`**
   - 更常见的是继续拆成 subword / byte-level token

5. **很多 tokenizer 看起来像优先使用较长 token，但底层机制并不统一**
   - 是否真是 longest-match-first，要看具体算法

6. **tokenizer、embedding、position handling、Transformer layers 是不同层次的问题**
   - 这组边界如果不分开，后面几乎一定会越学越乱

---

## Related

- [[computer_sci/llm/basic/tokenizer_in_modern_llms|Tokenizer in Modern LLMs]]
- [[computer_sci/llm/architecture/transformer_in_llm|Transformer in LLM]]
- [[computer_sci/llm/architecture/RoPE_detail|Rotary Positional Embedding - Detail Explanation]]
- [[computer_sci/llm/appendix/embed_vs_transform|Embed vs. Transform]]
