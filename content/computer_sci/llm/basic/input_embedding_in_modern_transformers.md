---
title: Input Embedding in LLMs
date: 2026-04-13
tags:
  - LLM
  - transformer
  - embedding
  - basic
---
## Definition

input embedding 这一层，说白了就是把离散输入变成模型能接的向量。

Transformer 真正接收的不是原始字符串，而是形如

$$
X \in \mathbb{R}^{T \times d}
$$

的一串向量表示。

其中：

- $T$ 是序列长度
- $d$ 是表示维度

所以从架构上看，Transformer 关心的不是“文本原本长什么样”，而是进入 block 之前有没有被整理成向量序列。

## Input path

文本输入最常见的一条链路可以先记成：

```text
text -> tokenizer -> token ids -> embedding lookup -> vectors -> transformer layers
```

如果往细里拆，大致有这几层：

1. tokenizer granularity
   - 按 word、subword、byte、char 或别的粒度切

2. vocab / token-id mapping
   - 哪些 token 合法、每个 token 对应哪个 id

3. token embedding lookup
   - 把 token id 映射成向量

4. position information integration
   - 把顺序信息带进去

5. transformer layers
   - 后面的 attention、MLP、残差、归一化等计算

这几层经常一起被说，但其实不是同一个东西。

## Standard form

最常见的文本做法，还是先得到 token ids，再查 embedding table。

设 embedding table 为：

$$
E \in \mathbb{R}^{V \times d}
$$

其中：

- $V$ 是 vocabulary size
- $d$ 是 embedding dimension

输入 token ids 如果是：

$$
[i_1, i_2, \dots, i_T]
$$

那么 lookup 之后会得到：

$$
[x_1, x_2, \dots, x_T], \quad x_t \in \mathbb{R}^d
$$

堆起来以后就是：

$$
X \in \mathbb{R}^{T \times d}
$$

这才是 Transformer block 真正接到的输入。

## 边界先分清

### 1. 它不是 tokenizer

- tokenizer 负责把文本切成 token，并映射成 ids
- embedding layer 负责把 ids 变成向量

这两步经常被一起说成“embedding”，但其实不是一回事。

tokenizer 机制细节见：[[computer_sci/llm/basic/tokenizer_in_modern_llms|Tokenizer in Modern LLMs]]。

### 2. 它不等于 position handling

- token embedding 负责“这是什么 token”
- position handling 负责“它在序列里的位置”

经典 Transformer 里常见 positional embedding / encoding；现代 LLM 里也可能通过 [[computer_sci/llm/architecture/RoPE_detail|RoPE]] 这类方式把位置信息带进 attention。

### 3. 它也不等于整个输入前处理

有些口头说法会把 tokenizer、embedding、position handling 都统称成 embedding。
交流时这么说有时省事，但学习时很容易混层。

## 几个容易混的点

### 1. “Transformer 直接吃文本”

不是。Transformer 吃的是向量序列，不是原始字符串。

### 2. “有了 embedding 就有顺序信息了”

不是。token embedding 解决的是离散 token 如何进入连续向量空间；顺序通常还要单独处理。

### 3. “embedding 方法是固定唯一的”

也不是。最常见的是 token embedding lookup，但 Transformer 本身并不绑定唯一输入来源。只要最后是向量序列，就可以送进后续层。

### 4. “不认识的输入一定会变成 `<unk>`”

这更像旧式 NLP 课上的简化说法。现代 LLM 更常见的是继续拆，通过 subword 或 byte-level 路线把它变成可表示的 token 序列。

## 为什么单独记这个

### 1. 它其实是在划 Transformer 的输入边界

如果 tokenizer、embedding、position handling 这几层一开始没分开，后面读 attention、RoPE、context length 时很容易全混在一起。

### 2. 它也连着 vocab size 和 sequence length

不同 tokenizer 和 vocab 设计会改变 token 数量；token 数量又会直接影响 attention 成本和上下文占用。

### 3. 它也是多模态输入的共同抽象

从更高层看，Transformer 不是只服务文本。图像 patch、音频片段或者别的模态单元，只要最后能表示成向量序列，也能进入同类架构。

## Minimal mental model

先记住这一句就够了：

```text
Transformer does not consume raw text; it consumes vector sequences.
```

对文本任务，把它展开就是：

```text
text -> tokenizer -> token ids -> embedding lookup -> vectors -> transformer layers
```

其中：

- tokenizer 负责离散化
- embedding lookup 负责向量化
- position handling 负责顺序信息
- transformer layers 负责后续建模

---

## Related

- [[computer_sci/llm/basic/llm_basic_MOC|LLM Basic MOC]]
- [[computer_sci/llm/basic/tokenizer_in_modern_llms|Tokenizer in Modern LLMs]]
- [[computer_sci/llm/architecture/transformer_in_llm|Transformer in LLM]]
- [[computer_sci/llm/architecture/self_attention_example|self_attention_example]]
- [[computer_sci/llm/architecture/RoPE_detail|Rotary Positional Embedding - Detail Explanation]]
- [[computer_sci/llm/appendix/embed_vs_transform|Embed vs. Transform]]
