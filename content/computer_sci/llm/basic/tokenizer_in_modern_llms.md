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

tokenizer 这一层不负责生成向量，也不直接“理解语义”。
它做的事情更朴素：把原始文本稳定地变成模型内部可处理的离散 token 序列。

它真正要解决的问题可以记成：

> 给定任意文本，怎么把它映射到一个有限 vocabulary 里的 token ids。

这一步通常发生在 embedding lookup 之前：

```text
text -> tokenizer -> tokens -> token ids -> embedding lookup -> vectors
```

如果说 [[computer_sci/llm/basic/input_embedding_in_modern_transformers|Input Embedding in Modern Transformers]] 那篇更像输入总图，这篇就只盯 tokenizer 本身：

- token 怎么切出来
- vocab 怎么长出来
- 不同 tokenizer family 差在哪
- 实际编码时算法到底怎么一步步跑

## tokenizer 在输入链条里的位置

把链条拆开以后，几层职责其实很不一样：

1. tokenizer
   - 把文本映射成 token 序列

2. vocabulary
   - 定义哪些 token 合法
   - 定义 token 和 id 的对应关系

3. embedding layer
   - 把 token ids 映射成向量

所以 tokenizer 的直接产物不是向量，而是：

- token sequence
- token ids

从这个角度看，tokenizer 更接近离散化、编码和压缩折中问题，而不是表示学习本身。

## tokenizer 到底在做什么

从工程上看，它至少做了下面几件事。

### 1. normalization

很多 tokenizer 真正切 token 之前，会先做一层文本规范化，例如：

- Unicode normalization
- 大小写统一
- 空白字符处理
- 某些字符替换或清洗

这一步怎么做，会直接影响后面的切分结果。

### 2. pre-tokenization

有些 tokenizer 会先做一层粗切，例如：

- 按空格
- 按标点
- 按字节边界
- 按某些脚本边界

这一步强不强，也会影响后面 subword 规则怎么工作。

### 3. tokenization

狭义上平时说的 tokenizer，多半就是这一步：

- 把文本分解成 vocabulary 允许的 token 单元
- 选择一种合法分解路径

### 4. id mapping

最后再把 token 序列映射成整数 id，交给 embedding layer。

## vocab 是怎么来的

vocabulary 一般不是运行时从句子里临时长出来的，而是在训练前根据语料统计和 tokenizer 方案先建好的。

可以粗略记成：

1. 收集预训练语料
2. 选择 tokenizer family
3. 设定目标 vocab size
4. 在语料上学习 token inventory
5. 固定 token <-> id 映射
6. 模型据此建立 embedding table

### 1. vocab size 是设计超参数

常见规模像：

- 8k
- 16k
- 32k
- 50k
- 100k+

vocab 太小，token 会切得更碎，序列更长，attention 成本会上去。

vocab 太大，embedding table 会更大，稀有 token 统计也不稳定，长尾利用率可能很差。

所以 vocab size 本质上是在折中：

- 表示粒度
- 参数规模
- 训练效率
- 开放词汇能力

### 2. vocabulary 不是“单词词典”

现代 tokenizer 的 vocab 往往是混合单位，不只是完整单词，还可能包括：

- 高频整词
- 常见词缀
- 标点
- 空格相关 token
- 特殊控制符
- 字节级单位

所以它更像一套离散编码系统，不只是直觉里的“单词表”。

## 为什么现代 LLM 很少用纯 word-level tokenization

word-level 最直观，但问题也最多。

### 1. OOV 很重

只要碰到词表外单词，表示能力就会明显下降。

### 2. 长尾太强

自然语言词频分布高度长尾。
如果把整词都收入 vocab，很多词几乎不用，但还是要占词表和参数空间。

### 3. 对开放词汇不友好

比如：

- 派生词
- 拼写变体
- 专有名词
- 新造词
- 代码标识符
- URL

这些都会让纯 word-level 方案变得很笨重。

### 4. 多语言成本太高

一旦要覆盖多语言、代码、数学符号、emoji，整词词表会迅速失控。

所以现代 LLM 更常走的是：

- subword
- SentencePiece / Unigram
- byte-level

共同目标其实很简单：

> 在有限词表和开放输入之间找一个更稳的折中。

## subword 为什么关键

subword 的核心不是“切得更像语言学分词”，而是：

- 不要求每个输入词都作为完整词条存在
- 允许一个词拆成可复用的小单位

直接好处包括：

1. 降低 OOV 风险
   - 整词不在 vocab，也往往还能拆开表示

2. 提高组合复用
   - 常见前后缀、词根、重复片段可以复用

3. 减缓词表膨胀
   - 不用把大量稀有整词都单独收进去

4. 更适合代码、拼写变体和混合语言

所以现代 tokenizer 更看重的往往不是“像不像传统分词”，而是：

- 压缩性够不够好
- 开放词汇覆盖够不够稳
- 计算成本能不能接受

## 算法视角：训练阶段和编码阶段要分开看

看 tokenizer 最容易混的一点，是把“训练 vocabulary”和“拿 vocabulary 去编码新文本”揉在一起。

其实最好拆成两段：

### 1. training phase

这一步要回答的是：

- 词表里到底有哪些 token
- 每个 token 对应哪个 id
- 这些 token 是怎么从语料里长出来的

这一步做完之后，vocab 基本固定。

### 2. encoding phase

这一步要回答的是：

- 给定一段新文本
- 如何用已经固定的 vocab
- 把它切成 token 序列并映射成 ids

不同 tokenizer family 的差异，很多都体现在：

- 训练时怎么得到 vocab
- 编码时怎么选择切分路径

下面分开记。

## BPE：怎么训练，怎么编码

BPE 可以分成两个问题看：

- 训练时，merge rules 怎么长出来
- 编码时，字符串怎么按这些 merge rules 被合并

### BPE training：step by step

先用一个很小的玩具语料，不追求真实，只求过程直观。

假设语料里只有三种词，并且都先拆到字符级：

```text
low
lowest
newer
```

先把每个词写成字符序列，并带上词尾标记（很多教材会加 `</w>` 一类标记，表示词边界）：

```text
l o w </w>
l o w e s t </w>
n e w e r </w>
```

然后反复做下面这几步。

#### step 1. 统计所有相邻 pair 的频次

比如一开始能看到一些 pair：

- `(l, o)`
- `(o, w)`
- `(w, </w>)`
- `(w, e)`
- `(e, s)`
- `(s, t)`
- `(n, e)`
- `(e, w)`
- `(e, r)`

统计谁出现得最多。

#### step 2. 选出最高频 pair

假设这时最高频的是：

```text
(o, w)
```

那么就把它 merge 成一个新 token：

```text
ow
```

#### step 3. 用新 token 重写整个语料

原来的：

```text
l o w </w>
l o w e s t </w>
```

会变成：

```text
l ow </w>
l ow e s t </w>
```

注意，这一步不是只改某一个地方，而是把语料中所有符合这条 merge rule 的地方都改掉。

#### step 4. 重新统计 pair

现在 pair 集合已经变了，可能会出现：

- `(l, ow)`
- `(ow, </w>)`
- `(ow, e)`
- `(e, s)`
- `(s, t)`

然后再次找最高频 pair。

#### step 5. 再 merge

假设下一次选中的是：

```text
(l, ow) -> low
```

那么语料继续被重写。

#### step 6. 重复，直到达到停止条件

停止条件通常是：

- 达到目标 vocab size
- 达到预设 merge 次数
- 或继续 merge 的收益已经不大

最后得到的产物一般包括两部分：

1. base symbols
   - 初始字符集 / 字节集 / 基础单位

2. merge rules
   - 例如第 1 次 merge 什么，第 2 次 merge 什么……

BPE 的 vocab，本质上就是这样从 merge 历史里长出来的。

### BPE encoding：step by step

训练完以后，真正拿一段新词去编码时，要用的是已经学好的 merge rules。

比如现在要编码：

```text
lowest
```

粗略过程可以记成：

#### step 1. 先拆到底层单位

比如字符级：

```text
l o w e s t
```

#### step 2. 查 merge rules，找允许合并的 pair

假设训练阶段已经学到：

- `(o, w) -> ow`
- `(l, ow) -> low`
- `(e, s) -> es`
- `(es, t) -> est`

#### step 3. 按 merge rank 逐步合并

这里关键不是“当前哪对最长”，而是“哪条 merge rule 在训练历史里 rank 更高”。

例如：

```text
l o w e s t
-> l ow e s t
-> low e s t
-> low es t
-> low est
```

最后可能得到：

```text
[low, est]
```

#### step 4. 映射成 ids

有了最终 token 序列，再查表得到 token ids。

### BPE 里最容易误解的一点

很多人会把 BPE 理解成“每次都选最长匹配”。
这个说法不稳。

更准确一点是：

- BPE training 学的是 merge 历史
- BPE encoding 用的是 merge 历史对应的优先级
- 输出有时看起来像偏好长 token
- 但底层并不是一个抽象的“最长优先原则”就能概括完

### BPE encoding 不是把整个词表 rank 全扫一遍

这是另一个很容易想错的地方。

encoding 时，不是拿着整个 merge 表从头到尾过一遍，然后看看哪些规则能用。
更贴近实现的理解应该是：

1. 先把输入拆成初始符号序列
2. 只看当前序列里真实出现的相邻 pair
3. 在这些“当前可用 pair”里，选择 merge rank 最高的那个先合并
4. 合并后，序列局部变化，于是候选 pair 也跟着变化
5. 继续在新的候选 pair 里选 rank 最高的 merge
6. 一直做到没有可用 merge 为止

所以它更像：

- 动态维护当前候选 pair
- 反复选择当前最优 merge
- 每次 merge 后只局部更新

而不是：

- 对整个词表做一遍机械扫描

这也是为什么在理解 BPE encoding 时，比较重要的不是“token 谁更长”，而是：

- 当前序列里有哪些合法相邻 pair
- 它们的 merge priority 谁更高

### BPE encoding 的时间复杂度直觉

如果按最朴素的方式实现，BPE encoding 可以很慢。

一种很笨的做法是：

1. 每轮先扫描当前整条序列
2. 找出所有相邻 pair
3. 挑一个优先级最高的 merge
4. merge 完后再把整条序列重新扫一遍
5. 一直重复到结束

如果长度为 $n$ 的序列在最坏情况下发生很多轮 merge，这种实现的复杂度可以接近 $O(n^2)$。

不过实际工程里一般不会这样写。

更常见的优化思路是：

1. 初始时先扫描一遍序列，建立当前相邻 pair 的集合
2. 用优先队列、rank 索引、链表或类似结构，维护“当前哪些 pair 可以 merge”
3. 每次只处理受本次 merge 影响的局部邻域
4. 不重新全量扫描整条序列

这样做以后，实际表现通常会比朴素实现好很多。

如果只记一个工程直觉，可以先记成：

- 朴素实现：最坏可接近 $O(n^2)$
- 工程实现：通常接近 $O(n \log n)$，很多场景下体感接近线性

这里不必把这个复杂度当成绝对定理，因为实际还会受很多因素影响：

- 初始单位是字符级还是 byte-level
- merge table 怎么存
- rank 查询是否高效
- normalization / pre-tokenization 是否额外引入成本
- 实现语言和内存分配策略如何

所以在 tokenizer 这种问题上，大 $O$ 只是上层轮廓，真正很重要的是常数项和数据结构。

### 在真实 LLM 系统里，这部分大概占多少资源

如果只看一次完整的大模型推理，tokenization 通常不是主成本。
真正更重的部分一般还是：

- embedding 后的大量矩阵计算
- attention
- KV cache 读写
- 解码与采样

所以在长上下文、较大模型、生成步数多的场景里，tokenizer 往往只占比较小的一部分。

但这不等于它可以忽略。

在真实系统里，tokenization 常常是一个明确存在的 CPU 热点，尤其在下面几类场景中更明显：

1. 高频短请求
   - 单次模型前向不长，但请求数很多

2. embedding / retrieval / rerank pipeline
   - 文本很多，模型本身不一定特别重，前处理占比会上升

3. agent 系统反复重组 prompt
   - 同一批上下文被多次重新 tokenize

4. 在线服务里 GPU 跑模型、CPU 跑 tokenizer
   - GPU 和 CPU 的瓶颈不在同一个地方，tokenizer 会成为入口侧的真实成本

所以更实用的记法是：

- 对单次大模型推理，tokenizer 通常不是主要算力瓶颈
- 对高吞吐在线服务，tokenizer 往往是一个真实存在的 CPU 热点
- 对短文本、小模型或批量文本处理任务，tokenization 的占比会明显变大

这也是为什么工程上很在意 tokenizer 的实现方式：

- 用 Rust / C++ 而不是慢速脚本层实现
- 预编译词表或 merge 结构
- batch tokenize
- prefix cache / prompt cache
- 尽量避免重复 tokenize

## WordPiece：更像词表约束下的匹配

WordPiece 的表面结果常常和 BPE 有点像，但它更适合理解成：

- 先学出一个词表
- 编码时尽量用词表里已有的子词去覆盖输入
- 选择一个合法、尽量好的分解

### WordPiece training：直觉上在做什么

不同资料会用不同表述，但粗略可记成：

1. 从底层单位和语料统计出发
2. 逐步选择值得加入词表的子词
3. 让词表既能压缩高频模式，又不至于无限膨胀

和 BPE 相比，WordPiece 更容易被理解为“在维护一个可用子词表”。

### WordPiece encoding：step by step

WordPiece 在编码阶段的讲法通常比训练阶段更重要，因为实际使用时更直观。

假设词表里有：

```text
[un, ##break, ##able]
```

现在要编码：

```text
unbreakable
```

可以把过程记成：

#### step 1. 从当前位置开始，尝试找到词表里能匹配的最长片段

一开始从开头看：

- `u`?
- `un`?  可以
- `unb`? 不可以

于是先取：

```text
un
```

#### step 2. 往后移动，并按 continuation 规则继续匹配

剩余部分是：

```text
breakable
```

这时因为它不是词开头位置，所以通常要用 continuation 形式去查，比如 `##xxx`。

尝试：

- `##b`?
- `##br`?
- `##break`? 可以
- `##breaka`? 不可以

于是取：

```text
##break
```

#### step 3. 继续处理剩余串

剩余：

```text
able
```

查到：

```text
##able
```

最后结果就是：

```text
[un, ##break, ##able]
```

#### step 4. 如果某一段完全匹配不上怎么办

传统 WordPiece 风格里，如果一个词的某个后续片段完全找不到合法分解，整个词可能直接退成 `[UNK]`。

这也是为什么它和很多现代 byte-level 路线相比，对开放输入更脆弱一些。

### WordPiece 的实现直觉

所以 WordPiece 编码阶段，最像的是：

- 从左到右扫描
- 每次尽量吃下当前位置能匹配的最长合法子词
- 继续到字符串结束

它确实很像 longest-match-first，但这里的“合法”是强烈依赖词表和 continuation 规则的。

## Unigram：不是一路 merge，而是在多种切法里选概率更好的

Unigram 和 BPE / WordPiece 最不一样的地方，是它天然允许“同一个字符串有多种可能切法”。

### Unigram training：step by step

可以把它粗记成下面这个过程。

#### step 1. 准备一个偏大的候选 token 集合

这个集合通常会比最后目标 vocab 大很多，里面包含很多可能的子串。

#### step 2. 给每个候选 token 一个概率或分值

这些分值反映它在解释语料时有多大用处。

#### step 3. 用当前词表去解释训练语料

也就是问：

- 每个词可以有哪些切法
- 在当前 token 概率下，哪种切法概率更高

#### step 4. 删掉贡献小的 token

如果删掉某个 token 后，整体语料解释能力几乎没变，那它就可以被移除。

#### step 5. 重复

不断做“评估 -> 删除 -> 重估”，最后收敛到目标词表规模。

所以 Unigram 的词表不是 merge 长出来的，而更像是从一大堆候选里筛出来的。

### Unigram encoding：step by step

假设某个字符串有两种切法：

```text
A: [abc, def]
B: [ab, cd, ef]
```

而词表给每个 token 一个概率。

那么 Unigram 编码时更像是在做：

#### step 1. 枚举或动态规划所有合法切分路径

不是只看眼前最长那段，而是看整条路径。

#### step 2. 计算每条路径的总分

通常可以理解为：

- 路径上各 token 概率的乘积
- 或等价地看 log 概率之和

#### step 3. 选总分最高的切法

如果：

```text
score([abc, def]) > score([ab, cd, ef])
```

那就取第一种。

### 一个很重要的实现感觉

BPE / WordPiece 比较像“按规则合并”或“按词表做局部匹配”。

Unigram 更像：

- 建图
- 跑动态规划
- 选全局最优路径

所以它对多种可能切法更自然。

## byte-level：把保底能力下沉到字节

byte-level 最大的特点不是“切得漂亮”，而是几乎任何输入都能编码。

如果把字符、子词这些层都看成更高层单位，那么 byte-level 的意思就是：

- 最坏情况下，直接退到底层字节序列

### byte-level encoding：step by step

假设输入里出现一个非常怪的字符串：

```text
xÆA-12🙂
```

在高层词表里它可能压根没有完整对应项。

这时可以这样理解：

#### step 1. 先把文本转成字节序列

例如 UTF-8 下，每个字符最终都能表示成若干 bytes。

#### step 2. 每个 byte 都有可表示的基本单位

因为 byte 的取值范围有限，所以系统总能兜住。

#### step 3. 如果高层 merge / subword 规则能合并，就往上合并

能形成更紧凑 token 就合并。

#### step 4. 合并不了也没关系

最坏情况就保留成一串 byte-level token。

这就是 byte-level 路线对开放词汇、错拼、代码、特殊符号更稳的原因。

## “是不是从最大的开始” 这个说法为什么不够稳

很多 tokenizer 的输出结果看起来确实像：

- 优先用较长 token
- 能整体匹配就不再细拆

所以很容易被概括成：

> 从左到右，优先取最大的合法 token。

这个总结的问题在于，它把表面现象当成统一机制。

更稳一点的说法应该是：

1. 很多 tokenizer 的结果确实表现出“偏好较长 token”的外观
2. 但原因不一样
   - BPE：更多来自 merge 结构和 merge rank
   - WordPiece：来自词表约束下的最长合法匹配
   - Unigram：来自整体分解概率
   - byte-level：保底层级更低，未必追求最长 token

所以比较安全的说法是：

> 很多 tokenizer 的结果看起来像在优先使用较大的合法 token，但底层是不是简单 longest-match-first，要看具体算法。

## unknown input 怎么处理

这部分最容易被旧教材带偏。

### 1. 旧式做法：`<unk>`

过去常见处理是：

- 词表外输入直接映射成 `<unk>`

简单，但问题也明显：

- 所有未知词共享同一表示
- 信息损失很大
- 不同未知词之间的结构差异直接丢了

### 2. 现代 LLM 更常见的做法：继续拆

现代 tokenizer 通常不会在“整词不在词表”这一步就停住。
更常见的是：

- 整词不是单个 token
- 但还能拆成多个合法片段
- 如果 subword 还不够，就继续退到底层 byte-level 单元

所以更准确的现代说法是：

> 不是“这个词查不到，于是变成 `<unk>`”，而是“它会继续被拆到系统可表示为止”。

这也是为什么现代 LLM 里 `<unk>` 的存在感通常弱很多。

## tokenizer 会影响什么

这不是纯前处理细节，它会直接改模型的一些实际性质。

### 1. 序列长度

切得越细，token 越多，直接影响：

- context 占用
- attention 复杂度
- 推理延迟和成本

### 2. embedding table 规模

vocab 越大，embedding table 越大，参数和训练成本也会上去。

### 3. 开放词汇能力

tokenizer 会决定模型面对新词、错拼、跨语言文本、代码时，是容易卡住，还是更容易拆开兜住。

### 4. 学习粒度

模型更常看到的是：

- 完整常见词块
- 子词片段
- 字节级单元

这会改变它学习模式的粒度。

## 和 input embedding 那篇的分工

这篇和 [[computer_sci/llm/basic/input_embedding_in_modern_transformers|Input Embedding in Modern Transformers]] 最好分开看。

这篇主要回答：

- token 怎么来
- vocab 怎么形成
- tokenizer family 差在哪
- 实际算法编码时怎么一步步跑

另一篇主要回答：

- Transformer 真正吃进去的是什么
- token ids 怎么查表变成向量
- embedding、position handling、transformer layers 的边界怎么分

一句话压缩：

- 这篇讲“离散化和编码系统，以及切分算法本身”
- 那篇讲“离散 id 怎么进入向量空间”

---

## Related

- [[computer_sci/llm/basic/llm_basic_MOC|LLM Basic MOC]]
- [[computer_sci/llm/basic/input_embedding_in_modern_transformers|Input Embedding in Modern Transformers]]
- [[computer_sci/llm/basic/bpe_encoding_complexity_and_optimization|BPE Encoding Complexity and Optimization]]
- [[computer_sci/llm/architecture/transformer_in_llm|Transformer in LLM]]
- [[computer_sci/llm/appendix/embed_vs_transform|Embed vs. Transform]]
