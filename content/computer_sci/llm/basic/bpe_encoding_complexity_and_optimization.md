---
title: BPE Encoding Complexity and Optimization
date: 2026-04-13
tags:
  - LLM
  - tokenizer
  - BPE
  - algorithm
  - engineering
  - basic
---
## Overview

这篇专门记一个更工程的问题：

> BPE 在 encoding 阶段，为什么朴素实现会接近 $O(n^2)$，而工程上又是怎么把它做快的？

如果只从概念层理解 [[computer_sci/llm/basic/tokenizer_in_modern_llms|Tokenizer in Modern LLMs]]，会知道 BPE encoding 不是简单按“最长 token 优先”在切。
但如果继续往下问到实现，问题就会变成：

- 当前候选 pair 是怎么维护的
- merge 后哪些地方需要重新计算
- 为什么不需要每轮把整个字符串从头扫到尾
- fastBPE、tiktoken 这类实现到底快在什么地方

这篇就只记这个层面。

## 先把问题说清楚

BPE encoding 的抽象过程可以先写成：

1. 把输入拆成初始符号序列
2. 找出当前序列里所有相邻 pair
3. 选择 merge rank 最高的那个 pair
4. 做一次 merge
5. 更新序列
6. 重复，直到没有可 merge 的 pair

如果只看定义，这个过程并不复杂。
真正一到实现里，成本就出来了：

- 序列会不断变化
- pair 集合也会不断变化
- 每次 merge 后，哪些 pair 失效、哪些 pair 新出现，都要维护

这也是复杂度问题的来源。

## 朴素实现为什么容易接近 $O(n^2)$

假设输入长度是 $n$。

最笨的实现思路大概是这样：

### step 1. 扫描当前整个序列

把当前所有相邻 pair 都找出来。

例如：

```text
a b c d e
```

当前 pair 就是：

- `(a, b)`
- `(b, c)`
- `(c, d)`
- `(d, e)`

### step 2. 查每个 pair 的 merge rank

如果某个 pair 不在 merge table 里，就说明现在不能 merge。
如果在，就记下它的 rank。

### step 3. 选当前 rank 最高的 pair

比如选中了：

```text
(c, d)
```

### step 4. 做 merge

序列变成：

```text
a b cd e
```

### step 5. 重新扫描整个序列

因为序列已经变了，所以很多 pair 关系都要重算。

新的 pair 变成：

- `(a, b)`
- `(b, cd)`
- `(cd, e)`

### step 6. 再重复一轮

如果每做一次 merge 都重新扫整条序列，而总 merge 次数本身又可能和 $n$ 同阶，那么整体最坏情况就容易接近：

$$
O(n^2)
$$

这就是朴素实现慢的根源。

## 真正浪费在哪里

朴素实现最浪费的地方，不是“merge 这个动作本身”，而是：

1. 每次都全量重扫整条序列
2. 明明只有局部变了，却把全局 pair 都重新算一遍
3. 序列如果用普通数组表示，merge 后还可能带来额外元素移动

也就是说，真正的优化方向不是改 BPE 定义，而是改数据结构和更新方式。

## 一个关键观察：一次 merge 只影响局部邻域

这几乎是所有高性能 BPE 实现的出发点。

假设当前序列是：

```text
x a b y
```

如果现在 merge：

```text
(a, b) -> ab
```

那么序列变成：

```text
x ab y
```

这时真正受影响的 pair 其实只有局部：

### merge 前

- `(x, a)`
- `(a, b)`
- `(b, y)`

### merge 后

- `(x, ab)`
- `(ab, y)`

序列其他更远处的 pair 根本没变。

所以如果还每轮重扫整条序列，其实是在做大量没必要的重复工作。

## 工程优化的核心思路

如果只压缩成一句话，可以记成：

> 不要每轮重扫全局，而是动态维护当前可 merge 的局部 pair，并在 merge 后只更新受影响的邻域。

这句话展开后，大概就是下面几件事。

### 1. 序列本身不要用“频繁搬移”的表示

如果每次 merge 都让数组大规模移动元素，成本会很差。

所以工程上常见思路是：

- 用链表式结构
- 或者用带前驱 / 后继索引的数组
- 或者用能高效跳过“失效位置”的结构

目标是：

- merge 一个 pair 后
- 只改少数几个节点的连接关系
- 不做大规模内存搬移

### 2. 当前候选 pair 要单独维护

不需要每轮重新把所有 pair 扫出来。
可以在初始扫描时先建立“当前相邻 pair 集合”，后面增量更新。

也就是：

- 一开始扫一遍，得到所有相邻 pair
- merge 一次后，只删掉失效的局部 pair
- 再插入新产生的局部 pair

### 3. 需要快速知道“当前最该 merge 谁”

这是另一个关键点。

如果每轮都在线性扫描全部候选 pair 里找最优 merge，也还是慢。

所以常见做法是用：

- priority queue / heap
- ordered set
- 或别的按 rank 排序的数据结构

让“找到当前 rank 最高的可用 pair”这件事更快。

### 4. merge table / rank lookup 要足够快

给定一个 pair，例如：

```text
(us, t)
```

系统需要很快知道：

- 它是否可 merge
- 它的 rank 是多少

所以 merge rules 一般不会用低效方式存，而会预编译成：

- 哈希表
- 索引数组
- trie 风格结构
- 或其他更适合 runtime lookup 的表示

这里的目标不是改变算法，而是把“pair -> rank”的查询成本压低。

## 再往前一步：为什么 heap + 局部更新很自然

如果把当前序列看成一个动态变化的链，那么每个相邻 pair 都像一个候选事件。

例如当前有：

- `(a, b)`，rank = 3
- `(b, c)`，rank = 8
- `(c, d)`，rank = 5

如果 rank 数字越小代表优先级越高，那么系统只要优先拿出当前最优 pair 即可。

这就很适合用 heap 维护。

抽象过程可以写成：

1. 初始化所有相邻 pair，并把可 merge 的 pair 丢进 heap
2. 每次从 heap 取出 rank 最优的候选
3. 检查这个候选是否仍然有效
4. 如果有效，就执行 merge
5. merge 后只更新左右邻域产生的新 pair
6. 把这些新 pair 再放回 heap

这里一个很关键的工程细节是：

- heap 里可能会残留一些过期候选

因为某个 pair 入堆之后，它相邻的节点后来可能已经被别的 merge 改掉了。

所以高性能实现里常见一个模式：

- **lazy invalidation**

也就是：

- 先把候选放进 heap
- 真正弹出来时再检查它还是不是当前有效 pair
- 无效就丢掉，不强求每次都把 heap 维护得绝对干净

这个思路在工程上通常比“每次严格删除所有失效候选”更省事，也往往更快。

## 为什么很多实现喜欢“链表 + heap”这个组合

因为这两个结构刚好分别解决两类问题：

### 1. 链表 / 邻接索引

它解决的是：

- merge 一个位置后，如何便宜地改前驱 / 后继关系
- 如何快速定位左右邻居
- 如何避免数组整段搬移

### 2. heap / ordered candidate set

它解决的是：

- 如何快速拿到当前最优 merge
- 不必每轮重新扫描所有 pair

所以如果把这套结构压缩成一句话：

> 链表负责局部结构更新，heap 负责全局优先级选择。

这也是为什么很多 BPE encoding 的高性能实现，气质上都像“事件驱动的局部合并系统”。

## 为什么复杂度会从接近 $O(n^2)$ 改善

如果用上面这些思路，整个过程就不再是“每轮全量重扫”。

一个更贴近工程的理解是：

1. 初始阶段扫描一次序列，成本大约是 $O(n)$
2. 之后每次 merge：
   - 取出当前最优 pair
   - 做一次局部更新
   - 更新少数几个邻近 pair
3. 如果“取当前最优 pair”主要依赖 heap 这类结构，那么每次操作常常会带上一个 $\log n$ 因子

于是整体常会被近似理解成：

$$
O(n \log n)
$$

至少会比朴素的反复全量扫描好很多。

当然，这里不要把它当成一个严格统一的教科书结论。
更准确地说是：

- 朴素实现：容易接近 $O(n^2)$
- 工程优化后：常见实现能做到接近 $O(n \log n)$
- 在很多真实输入分布和优秀实现下，体感又会接近线性

## 为什么“接近线性”不等于理论就是 $O(n)$

这点也值得单独记一下。

很多时候会看到工程描述说某些 tokenizer 实现“非常接近线性”。
这通常是在说：

- 真实文本上的 merge 次数分布没那么坏
- 局部更新很便宜
- rank lookup 很快
- 常数项做得很好
- cache locality 也不错

也就是说，**体感近线性** 和 **严格复杂度上界是线性** 不是一回事。

在 tokenizer 这种系统里，常数项经常比形式上的大 $O$ 更重要。

## fastBPE、tiktoken 这类实现快在哪里

这里不强行逐行对应某个具体项目的源码，而先记共同思路。

### 1. fastBPE 这一类实现

这类名字通常代表一种思路：

- 不再用教学版那种每轮全量重扫
- 把 merge 的影响限制在局部更新
- 尽量让 pair 查询和候选维护更便宜
- 用更底层、更高效的语言实现运行时逻辑

所以它的“快”通常来自：

- 更好的数据结构
- 更少的重复扫描
- 更低的常数项

### 2. tiktoken 这一类实现

tiktoken 这类实现通常又进一步强调：

- byte-level BPE 的工程适配
- 非常快的 rank lookup
- 高效的预处理 / pretokenization 路径
- 面向真实 API 服务吞吐的实现细节

它不只是“BPE 理论上的一种写法”，而更像是：

- 一个面向高吞吐生产环境的 tokenizer runtime

所以如果只问“它是不是把 $O(n^2)$ 降到了 $O(n \log n)$”，这个说法方向对，但还不完整。
因为真正让它好用的往往是：

- 算法层面的局部更新
- 工程层面的内存布局
- 查询结构设计
- 实现语言和常数项优化

### 3. 这两类实现不要简单当成“同一个算法”

fastBPE 和 tiktoken 都是在解决同一个 runtime 问题：

- 如何让 tokenize 足够快
- 如何避免朴素 BPE encoding 的重复工作

但它们不必在每个实现细节上完全一样。

更稳的理解方式是：

- 它们共享的是工程方向
- 不是必须共享逐行一致的数据结构细节

也就是：

- 局部更新
- 高效 rank lookup
- 减少全量重扫
- 降低常数项
- 面向真实吞吐优化

这些是共同点。

## 一个更贴近实现的心智模型

如果只想记住 BPE 加速版 encoding 在干什么，可以先记下面这个版本：

1. 输入先变成一串基础 token
2. 当前所有相邻 pair 被登记起来
3. 系统维护一个“当前最值得 merge 的 pair 候选集”
4. 每次取出最优候选
5. merge 后，只修补这个位置前后的邻居关系
6. 把失效候选删掉，把新出现候选补进去
7. 重复直到没有合法 merge

这个版本和“每轮全量重扫”最大的区别就在于：

- 它把全局问题变成了局部维护问题

## 一个很粗的伪代码视角

如果只想记逻辑骨架，可以先这样想：

```text
build initial symbol list
build initial adjacent pairs
push valid pairs into priority queue

while queue not empty:
    pair = pop best candidate
    if pair is stale:
        continue
    merge pair
    update local neighbors
    push newly formed valid pairs
```

这个伪代码故意写得很抽象，因为重点不是某个项目的具体 API，而是下面这三个动作：

1. 初始化候选
2. 不断弹出当前最优 merge
3. 每次只做局部更新

只要脑子里有这个骨架，再去看 fastBPE / tiktoken 一类实现，就不太容易被源码细节淹没。

## 复杂度之外，真正影响性能的还有什么

在真实系统里，复杂度只是第一层。
很多时候更要命的是下面这些东西：

### 1. normalization 和 pretokenization

如果前面用了复杂 regex 或大量 Unicode 处理，前处理本身就会吃掉很多 CPU。

### 2. 内存分配和数据搬移

哪怕理论复杂度不错，只要实现里频繁分配对象、复制字符串、搬移数组，也会慢。

### 3. cache locality

数据结构如果过于分散，CPU cache 命中差，实测速度也会很受影响。

### 4. 批处理能力

真实服务往往不是一次 tokenize 一条，而是一批文本一起进来。
能不能 batch tokenize，会直接影响吞吐。

### 5. 避免重复 tokenize

很多 agent / serving 系统里，同样的 prefix 会被重复处理。
如果能做：

- prefix cache
- prompt cache
- 复用已有 tokenize 结果

那省下来的可能比微调单次 BPE merge 复杂度还多。

## 这在 LLM 系统里为什么重要

对单次大模型推理来说，tokenizer 往往不是主算力瓶颈。
真正最重的通常仍然是：

- Transformer 前向
- attention
- KV cache 读写
- 解码采样

但对真实线上系统来说，tokenizer 依然很重要，因为它常常是 CPU 热点。

尤其是在这些场景里：

1. 高频短请求
2. embedding / retrieval / rerank
3. agent 系统反复重组 prompt
4. GPU 跑模型、CPU 跑 tokenizer 的在线服务

所以从系统视角看，优化 tokenizer 并不是“学术上把复杂度写漂亮”，而是为了：

- 降低入口 CPU 压力
- 提高吞吐
- 降低延迟
- 避免 tokenizer 成为 GPU 前面的瓶颈

## 和其他笔记的关系

这篇最好和下面几篇一起看：

- [[computer_sci/llm/basic/llm_basic_MOC|LLM Basic MOC]]
  - 作为这一组 basic 笔记的入口

- [[computer_sci/llm/basic/tokenizer_in_modern_llms|Tokenizer in Modern LLMs]]
  - 讲 tokenizer 的整体角色、BPE / WordPiece / Unigram / byte-level 的机制区别

- [[computer_sci/llm/basic/input_embedding_in_modern_transformers|Input Embedding in Modern Transformers]]
  - 讲 token ids 后面怎么进入向量空间

也就是说：

- `Tokenizer in Modern LLMs` 更像机制总览
- 这篇更像 BPE encoding runtime 的工程补充

---

## Related

- [[computer_sci/llm/basic/llm_basic_MOC|LLM Basic MOC]]
- [[computer_sci/llm/basic/tokenizer_in_modern_llms|Tokenizer in Modern LLMs]]
- [[computer_sci/llm/basic/input_embedding_in_modern_transformers|Input Embedding in Modern Transformers]]
- [[computer_sci/llm/architecture/transformer_in_llm|Transformer in LLM]]
