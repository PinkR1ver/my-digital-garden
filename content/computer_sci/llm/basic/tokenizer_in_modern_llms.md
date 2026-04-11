---
title: Tokenizer in Modern LLMs
date: 2026-04-12
tags:
  - LLM
  - transformer
  - tokenizer
  - NLP
  - basic
---
## Overview

在现代 LLM 系统里，**tokenizer** 的工作不是“理解语义”，而是把原始输入文本转成模型内部可处理的**离散符号序列**。

它处在原始文本与神经网络之间，承担的是一种**表示接口**的角色：

```text
text -> tokenizer -> tokens -> token ids -> embedding lookup -> vectors
```

因此 tokenizer 本身并不是 Transformer 层，也不是 embedding layer。它更像是模型输入管线里的**离散化与编码步骤**。

---

## 一个最重要的核心问题

tokenizer 解决的不是“词义如何进入模型”，而是：

> 原始文本如何稳定地映射成一个有限 vocabulary 中的 token 序列？

只要这个问题没解决，后面的：

- token id
- embedding lookup
- Transformer layers

都无从谈起。

所以 tokenizer 是输入链条的第一层，而不是一个可有可无的前处理工具。

---

## tokenizer 到底在做什么

从功能上看，tokenizer 主要做三件事：

1. **把文本切成 token units**
   - 这些 unit 可以是 word、subword、character、byte，或者它们的某种变体

2. **把 token 映射为 token ids**
   - 每个合法 token 都在 vocabulary 中有一个编号

3. **保证输入能落到模型可接受的离散空间里**
   - 模型本身并不直接处理字符串
   - 它需要的是一串 id，后续再通过 embedding layer 变成向量

也就是说，tokenizer 的职责不是“给每个 token 生成向量”，而是：

- 决定怎么切
- 决定切出来的单位如何落到既定词表上

向量化是在后面的 embedding lookup 中发生的。

---

## tokenizer、vocab、embedding layer 的边界

这三个概念经常被混在一起，但其实是三层不同的问题。

### 1. tokenizer

负责：

- 文本切分
- 把可切分结果映射到合法 token 序列

### 2. vocabulary

负责：

- 定义哪些 token 是系统认可的基本单位
- 定义每个 token 对应哪个 id

可以把它理解成一个固定字典：

```text
token <-> id
```

### 3. embedding layer

负责：

- 把 token id 映射成向量

例如：

$$
E \in \mathbb{R}^{V \times d}
$$

其中：

- $V$ 是 vocab size
- $d$ 是 embedding 维度

所以这三者的关系应该理解成：

```text
text
  -> tokenizer
  -> token sequence
  -> token ids (defined by vocab)
  -> embedding lookup
  -> vectors
```

如果这三层不分开，后面很容易误以为：

- tokenizer 在“学语义”
- vocab 是运行时临时生成的
- embedding layer 同时负责切词和表示

这些理解都不准确。

---

## vocab 是如何得到的

现代 LLM 的 vocabulary 通常不是手工逐词硬编码出来的，而是和 tokenizer 方案一起设计或训练出来的。

大致过程可以理解为：

1. **收集训练语料**
2. **选择 tokenizer family**
   - 例如 BPE、WordPiece、Unigram、byte-level 等
3. **根据语料统计特征构建 token inventory**
4. **确定 vocabulary size**
   - 例如 8k、32k、50k、100k+
5. **为每个 token 分配 id**
6. **模型再据此建立 embedding table**

因此 vocab 不是“模型边跑边长出来”的，而是通常在训练前就已经定好。

更准确地说：

- tokenizer 方案决定 token 的形成机制
- vocabulary 决定最终允许哪些 token 存在
- embedding table 再把这些 token ids 映射为向量

---

## 为什么不直接按单词切

早期 NLP 经常使用 word-level tokenization，但它在现代大模型里有明显问题。

### 1. 词表会非常大

自然语言里的词形变化、专有名词、拼写变体、长尾词太多。
如果直接按整词建表，vocab 会迅速膨胀。

### 2. OOV 问题严重

只要输入里出现一个词表外单词（out-of-vocabulary word），系统就很容易失去表示能力。

### 3. 多语言与开放词汇场景很差

现代 LLM 经常要处理：

- 稀有词
- 新词
- 混合语言
- 代码
- URL
- 拼写错误
- 表情与符号

纯 word-level 做法在这些场景下很笨重。

所以现代 LLM 往往更偏向：

- subword
- byte-level
- 或其他更具开放词汇能力的 tokenization 方案

---

## BPE、WordPiece、Unigram、byte-level 的差别

这些方法都在解决同一个问题：

> 如何把开放的原始文本，稳定地映射成有限词表中的 token 序列？

但它们的建模方式并不完全一样。

### 1. BPE

**Byte Pair Encoding** 最初来自压缩领域，在 NLP 中通常可以理解为一种基于频繁合并的 subword 方法。

直觉上：

- 从较小单位开始
- 统计哪些相邻片段经常一起出现
- 不断把高频组合 merge 成更大的 token

结果上，BPE 往往会形成很多常见 subword，并在实际切分时表现出“倾向较长、较常见 token”的样子。

### 2. WordPiece

WordPiece 常见于 BERT 一系。

它和 BPE 的外观结果有点像，也会把词拆成 subword，但通常更强调：

- 通过词表中已有子词来组成输入词
- 倾向选择整体上更合适的分解

在直觉层面，可以把它理解成一种“受词表约束的 subword 匹配”方法。

### 3. Unigram / SentencePiece

Unigram 的思路更接近：

- 先有一个较大的候选子词集合
- 再通过概率模型保留更有解释力的 token
- 对给定输入，在多个可能分解中选择概率更高的一种

这和“不断 merge”的 BPE 逻辑不完全一样。

### 4. byte-level tokenizer

byte-level 方法进一步放松了“字符或子词必须先被语言学切开”的要求。

它的重要好处是：

- 几乎任何输入都能被表示
- 对稀有词、拼写错误、代码、符号、跨语言文本更稳

代价通常是：

- 序列可能更长
- 某些局部可读性对人类不如 subword 直观

---

## “是不是从最大的开始” 为什么只是近似直觉

很多人第一次接触 tokenizer 时，会形成一个直觉：

> 它是不是从左到右，优先匹配最大的合法 token？

这个说法**有一定解释力**，但不能当成统一原理。

### 为什么这个直觉会出现

因为很多 tokenizer 的输出结果看起来确实像：

- 能用一个较长且常见的 token 时，就不会拆成很多小块
- 一个高频词块常常被整体保留

所以人会自然总结成“从最大的开始”。

### 为什么它不够准确

不同 tokenizer 的底层机制不同：

- **BPE**：来源于 merge 规则
- **WordPiece**：更像受词表与分解策略共同约束
- **Unigram**：本质上更接近概率选择问题
- **byte-level**：可表示性下限更低，不必依赖整词或长子词优先

因此更稳妥的说法是：

> 很多 tokenizer 的结果看起来像是在优先使用较大的合法 token，但底层是否真是简单的 longest-match-first，要看具体算法。

这句话既保留了直觉，也避免把不同方法误说成同一机制。

---

## 为什么现代 LLM 很少把 `<unk>` 当主角

在较老或较简化的 NLP 教材里，常见讲法是：

- 如果词不在词表里，就映射到 `<unk>`

这在教学上很方便，因为它明确、简单，也容易解释 OOV 问题。

但在现代 LLM 里，`<unk>` 通常不再是主角，原因主要有两个。

### 1. subword / byte-level 方案能继续拆

现代 tokenizer 通常不会因为“整词不在 vocab 里”就彻底失败。
更常见的是：

- 这个整词不在词表里
- 但它可以继续拆成若干个合法 token

所以系统面对未知词时，更像是在做：

- fallback decomposition
- 而不是统一丢进一个黑箱 `<unk>`

### 2. `<unk>` 信息损失太大

如果所有未知词都压成同一个 token：

- 模型无法区分它们之间的差别
- 表示能力会明显下降

这在现代开放词汇场景里代价太高。

因此现代 LLM 更偏好的不是“未知词统一归零”，而是“尽量继续分解到可表示为止”。

---

## tokenizer 输出影响什么

tokenizer 不只是一个前处理小工具，它实际上会影响很多后续性质。

### 1. 序列长度

切得越细，token 数越多。
这会直接影响：

- context window 消耗
- attention 计算量
- 推理成本

### 2. 表示粒度

不同 token 粒度会改变模型看到语言的方式。
例如：

- 更粗的 token 可能保留更完整的常见词块
- 更细的 token 可能在开放词汇和拼写噪声下更鲁棒

### 3. 跨语言与跨域能力

代码、数学符号、拼音、emoji、混杂文本等场景，对 tokenizer 的要求并不相同。

所以 tokenizer 不是纯工程细节，它其实会影响模型的输入分布、训练效率与泛化表现。

---

## 一个实用的理解顺序

如果要把这套东西记清楚，比较稳的顺序是：

1. **原始文本先经过 tokenizer**
2. **tokenizer 输出 token 序列**
3. **这些 token 在 vocabulary 中对应 id**
4. **embedding layer 再把 id lookup 成向量**
5. **position 信息随后以某种方式进入模型**
6. **Transformer layers 才开始处理这些表示**

这也是为什么 [[computer_sci/llm/basic/input_embedding_in_modern_transformers|Input Embedding in Modern Transformers]] 和 tokenizer 这篇最好成对看：

- 前者讲“输入表示整体是如何形成的”
- 这篇讲“离散 token 序列本身是如何产生的”

---

## Summary

关于现代 LLM 的 tokenizer，可以抓住下面几条：

1. **tokenizer 负责把文本变成离散 token 序列，不负责直接生成向量**
2. **vocab 定义 token-id mapping，embedding layer 再把 id 变成向量**
3. **现代 vocab 通常是与 tokenizer 方案一起设计或训练出来的**
4. **BPE、WordPiece、Unigram、byte-level 都在解决“开放文本如何映射到有限词表”这个问题**
5. **“从最大的开始”只是很多 tokenizer 输出效果的近似直觉，不是统一底层机制**
6. **现代 LLM 很少把 `<unk>` 当主角，因为更常见的策略是继续拆分到可表示为止**

---

## Related

- [[computer_sci/llm/basic/input_embedding_in_modern_transformers|Input Embedding in Modern Transformers]]
- [[computer_sci/llm/architecture/transformer_in_llm|Transformer in LLM]]
- [[computer_sci/llm/appendix/embed_vs_transform|Embed vs. Transform]]
