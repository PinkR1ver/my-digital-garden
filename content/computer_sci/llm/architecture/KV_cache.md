---
title: KV Cache
tags:
  - advanced
  - LLM
date: 2026-02-02
---
# KV Cache (键值缓存)

## 1. 核心问题：自回归生成的重复计算

在自回归模型中（如 GPT），生成是一个**顺序过程**：
1.  给定输入序列（例如“你好”），模型输出下一个词的概率分布，我们选择其中一个词（例如“，”）。
2.  然后将“你好，”作为新的输入，再次运行模型，得到下一个词（例如“世界”）。
3.  重复此过程，直到生成结束。

**关键问题**：在每一步生成时，我们都会将**整个历史序列**（从第一个词到当前最新词）输入模型。这导致了大量**重复计算**，因为对于历史序列中相同的前缀部分，每次都要重新计算它们的 Key 和 Value。

## 2. KV Cache 是什么？

**KV Cache** 是一种**缓存机制**，用于存储每个 Transformer 层中先前时间步计算出的 **Key 和 Value** 张量。

**核心思想**：既然历史序列的键值对在每次生成时都不会改变（因为是相同的输入），我们就把它们**缓存起来**。这样，在生成下一个词时，只需要为**新输入的词**计算其 Query，同时复用之前所有步缓存的 Key 和 Value。

## 3. KV Cache 的工作原理
我们以生成序列“你好，世界”为例，假设模型已生成“你好”，现在要生成“，”：

**没有 KV Cache 时**：
- 输入：“你好”
- 模型计算整个序列的 Q, K, V，并输出下一个词分布，选择“，”。
- 输入：“你好，”
- 模型**重新计算**整个序列（两个词）的 Q, K, V。
- 重复...

**使用 KV Cache 后**：
1.  **第一步**：输入“你好”。
    - 计算“你”和“好”对应的所有层的 **K₀, V₀**。
    - 生成下一个词“，”后，**将这些 K₀, V₀ 缓存起来**。
2.  **第二步**：输入新词“，”。
    - 我们**只计算“，”对应的 Q₁**。
    - **Key 和 Value 的来源**：
        - 历史部分：“你”和“好”的 K₀, V₀ 从缓存中读取。
        - 当前部分：“，”的 K₁, V₁ 实时计算。
    - 将缓存的 K₀, V₀ 与新计算的 K₁, V₁ **拼接（concat）**，得到完整的 K 和 V 序列。
    - 用 Q₁ 与完整的 K, V 进行注意力计算（此时因果掩码确保 Q₁ 只看到它自己和之前的词）。
    - 生成下一个词“世界”。
    - **更新缓存**：将“，”的 K₁, V₁ 也存入缓存。
3.  **后续步骤**：重复第二步，缓存会随着生成不断增长。

## 4. 伪代码/实现思路

```python
class DecoderWithKVCache:
    def __init__(self, model):
        self.model = model
        self.cache_k = None  # 初始缓存为空
        self.cache_v = None

    def generate_next_token(self, new_input_token):
        # new_input_token: 当前步新输入的 token (形状: [batch_size, 1])
        # 1. 计算当前步新 token 的 Query, Key, Value
        q, k, v = self.model.compute_qkv(new_input_token) # 只计算新token的

        # 2. 如果缓存不为空，则从缓存中读取历史 K, V 并拼接
        if self.cache_k is not None:
            k = torch.cat([self.cache_k, k], dim=-2)  # 在序列长度维度拼接
            v = torch.cat([self.cache_v, v], dim=-2)

        # 3. 使用拼接后的 K, V 和当前 Q 进行注意力计算
        output = self.model.attention(q, k, v)  # 内部会应用因果掩码

        # 4. 更新缓存：将当前步新计算的 k, v 存入缓存
        self.cache_k = k  # 缓存现在包含所有历史token的K
        self.cache_v = v

        # 5. 输出下一个token的logits
        return self.model.output_projection(output)
```

## 5. KV Cache 的好处与代价

| 方面 | 说明 |
| :--- | :--- |
| **加速生成** | **主要好处**。避免了历史 token 的重复计算，使每步生成的计算量几乎恒定（只计算新 token 的 Q,K,V 和注意力），大幅提升生成速度。 |
| **内存占用** | **主要代价**。缓存会随着生成序列长度线性增长，占用大量 GPU 内存。这是限制模型生成**最大长度**的关键因素之一。 |
| **实现复杂度** | 需要在模型推理代码中显式管理缓存的生命周期（创建、更新、清除）。 |

## 6. 高级话题与关联

*   **多轮对话**：在聊天应用中，为了实现跨轮次的上下文记忆，通常会将整个对话历史的 KV Cache 缓存起来，直到达到长度限制。
*   **窗口注意力**：为了控制内存增长，一些模型（如 Transformer-XL）采用滑动窗口缓存，只保留最近 N 个 token 的 KV Cache。
*   **与 Causal Self-Attention 的关系**：KV Cache 是**实现**高效 Causal Self-Attention 自回归生成的关键工程优化。它依赖于 Causal Self-Attention 的“只能看到过去”这一特性，使得缓存的历史 K, V 可以被安全地复用。

## 7. 学习建议

*   **动手思考**：尝试在脑海中模拟一个 3 层 Transformer，序列长度为 5 的生成过程，一步步画出 KV Cache 是如何在每层累积的。
*   **实践关注**：在使用 Hugging Face `transformers` 库进行生成时，注意 `use_cache=True` 这个参数，它就是用来控制是否启用 KV Cache 的。
*   **下一步**：理解了 KV Cache，你就掌握了现代 LLM 推理的核心优化。接下来可以关注**采样策略**（如 top-p、temperature）和**生成长度控制**等话题。

这份笔记应该能帮助你理解 KV Cache 的核心机制及其重要性。如果你对其具体实现或内存占用计算有进一步兴趣，我们可以继续深入。