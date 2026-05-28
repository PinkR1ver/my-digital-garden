---
title: "从 GPT 到 ChatGPT：让模型学会「听话」的对齐之路"
date: 2026-05-27
tags:
  - LLM
  - training
  - alignment
  - RLHF
  - SFT
  - DPO
  - pre-training
---

## 故事从这里开始：你有一个 GPT，但它不听话

在 [Next-Token Prediction](computer_sci/llm/training/next_token_prediction.md) 里，我们训练出了一个能续写文本的语言模型。在 [Scaling Laws](computer_sci/llm/training/scaling_laws.md) 里，我们知道了它该做多大。

现在问题来了：**这个模型能续写，但它不会「聊天」**。

你问它"怎么做一个蛋糕？"，它可能给你续写出 10 个类似的问题，而不是回答你。你跟它说"给我写一首诗"，它给你续了一段新闻稿。更糟的是，你问"怎么制作炸弹"，它可能真的认真给你列出步骤。

```
User: 请帮我写一封求职邮件。

Base Model (GPT-3): ...请帮我写一封求职邮件。另外，我还需要一封辞职信、
一份简历、以及如何准备面试的建议。此外，请告诉我...

🔥 它在续写你的「提问」，而不是回！答！你！
```

这就是 **base model 和 assistant 之间的鸿沟**。Base model 学会的是 $P(\text{next\_token} \mid \text{context})$——给定上文，预测下一个 token。它很擅长续写，但它不知道自己在"被提问"，更不理解什么叫"有帮助的回答"。

把 base model 变成 ChatGPT 的过程，就是**对齐（Alignment）**。

> [!abstract] 对齐要解决三个问题
> 1. **Helpful（有用）**：模型应该回答问题，而不是续写问题
> 2. **Honest（诚实）**：模型应该知道自己不知道什么
> 3. **Harmless（无害）**：模型应该拒绝有害请求

## 对齐全景图：三步走

InstructGPT（OpenAI, 2022）[1] 确立了对齐的标准配方，至今仍是主流框架的核心：

```
Base Model ──→ SFT Model ──→ Reward Model ──→ RLHF Policy
 (GPT-3)     (监督微调)     (偏好排序)      (强化学习)
```

| 步骤 | 做什么 | 需要什么数据 | 产出 |
| :--- | :--- | :--- | :--- |
| **SFT**（Supervised Fine-Tuning） | 用高质量对话示范教模型"对话格式" | 人类写的 (prompt, answer) 对 | 会对话但不太分好坏的模型 |
| **RM**（Reward Modeling） | 训练一个能打分"哪个回答更好"的模型 | 人类对多个回答的偏好排序 | 奖励模型（人类偏好的代理） |
| **RLHF**（RL from Human Feedback） | 用奖励模型作为"裁判"，训练 policy 生成高分回答 | 任意 prompt（不需要标注答案） | ChatGPT 级别的 assistant |

下面一步步拆开看。

## Step 1 — SFT：教模型「对话」这件小事

### 为什么续写模型不会对话？

Base model 在互联网语料上训练，见过的文本格式是文章、代码、论坛帖子……它不懂什么是"用户提问 → 助手回答"的交互范式。你需要让它**见过**这种格式。

### SFT 做什么

收集一批人类标注员写的对话数据：

````text
User: 上海的天气怎么样？
Assistant: 上海今天多云，气温 22-28°C，适合出行。建议带薄外套。

User: 帮我写一个 Python 冒泡排序
Assistant: 好的，这是冒泡排序的 Python 实现：
```python
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr
```
````

然后把这些问题和人类回答拼接成训练样本，对 base model 做标准的 next-token prediction fine-tune（同样的 loss，同样的优化器）。**训练方式没变，变的是数据格式。**

> [!tip] SFT 的本质
> SFT 不教模型"什么是好的回答"——它只教模型**对话的格式和节奏**。好坏判断是后面的 RM + RLHF 干的活。

### SFT 的局限性

SFT 有一个根本问题：**它模仿人类写的所有回答，包括那些平庸的、敷衍的、甚至不太好的回答。** 因为它就是被训练去「复现人类写的答案」，而人类的标注员水平参差不齐，有些回答确实一般。

当你让 SFT 模型生成回答时，它平均化地模仿所有见过的回答质量——好的、坏的、一般的。这就是为什么纯 SFT 模型经常让你觉得"还行，但不够好"。

更何况，很多问题并没有唯一正确答案：
- "给我推荐一部电影"——怎么算对？怎么算错？
- "这个方案怎么样？"——好坏是一个光谱，不是 0/1

这时候我们需要更精细的工具来区分"好答案"和"更好的答案"——这就是 Reward Model。

## Step 2 — Reward Model：制造一个「裁判」

### 核心思想

人很难给每个回答打一个精确的分数（这个回答是 7.3 分还是 7.8 分？），但人**非常擅长比较**："回答 A 比回答 B 好"。

所以 Reward Model 的训练数据不是 (prompt, response, score)，而是 (prompt, winning_response, losing_response)。

### 训练过程

对一个 prompt $x$，人类标注员给两个回答排序：$y_w$（winner）和 $y_l$（loser）。

Reward Model $r_\theta(x, y)$ 是一个函数，输入 (prompt, response)，输出一个标量分数。

训练目标是：让 winner 的分数高于 loser：

$$
\mathcal{L}(\theta) = -\mathbb{E}_{(x, y_w, y_l) \sim D}\left[\log \sigma(r_\theta(x, y_w) - r_\theta(x, y_l))\right]
$$

这个损失函数的意思：
- 如果 $r_\theta(x, y_w) - r_\theta(x, y_l)$ 很大（winner 分数远超 loser）→ $\sigma(\text{large}) \approx 1$ → $\log(1) = 0$ → loss 接近 0 ✓
- 如果两者分数差不多（模型分不清好坏）→ loss 变大 → 梯度惩罚模型

这本质上是**Bradley-Terry 偏好模型**：把偏好概率建模为

$$
P(y_w \succ y_l \mid x) = \frac{\exp(r(x, y_w))}{\exp(r(x, y_w)) + \exp(r(x, y_l))} = \sigma(r(x, y_w) - r(x, y_l))
$$

### Reward Model 的架构

Reward Model 通常就用 SFT 模型初始化，把最后的 lm_head（输出 token 概率的层）换成一个标量输出头——输入一个 (prompt, response) 对，输出一个数字。

> [!important] 为什么用 SFT 初始化 RM？
> 如果用 base model 初始化，RM 连对话格式都不理解，无法给回答打分。SFT 起了一个"语言理解"的初始化作用。

## Step 3 — RLHF：把偏好信号变成梯度

现在有了会打分的 Reward Model，我们就可以用强化学习来优化语言模型了。这里是 RLHF 最核心、也是最复杂的部分。

### 3.1 先看清全局：四个模型的协作关系

在 RL 训练阶段，系统中同时存在四个模型：

| 模型 | 角色 | 是否训练 | 初始化自 |
| :--- | :--- | :--- | :--- |
| **Policy Model** $\pi_\phi$ | 正在被优化的对话模型 | ✅ 训练 | SFT Model |
| **Reference Model** $\pi_{\text{ref}}$ | KL 惩罚的"锚点"，记录"你最初长什么样" | ❌ 冻结 | SFT Model（同源） |
| **Reward Model** $r_\theta$ | 人类偏好的代理裁判 | ❌ 冻结 | Step 2 训练出的 RM |
| **Value Model** $V_\psi$ | 估计每个 token 的"预期未来奖励" | ✅ 训练 | Reward Model（或 SFT + 线性头） |

Policy 和 Reference 必须从**同一个 SFT checkpoint** 初始化，否则 KL 散度没有意义。Value Model 是 PPO 算法需要的 critic——它和 Reward Model 不同：
- **Reward Model**：只看**完整回答**，给出一个标量分
- **Value Model**：看**每个 token 位置**，估计从该位置开始、继续生成的"预期未来收益"

### 3.2 一个完整的 PPO 训练步

以下是 RLHF 中一轮 PPO 更新的完整流程：

**Phase 1 — Rollout（采样）**

```
1. 从 prompt 数据集随机采样一批 prompts {x₁, x₂, ..., xₙ}
2. 对每个 prompt xᵢ，用当前 Policy π_φ 生成一个回答 yᵢ
3. 每个回答都完整生成到 EOS 或 max_length
```

这一步不需要 Reward Model 参与——Policy 自己"自由发挥"生成回答。

**Phase 2 — Scoring（打分）**

```
4. 把每个 (xᵢ, yᵢ) 对喂给 Reward Model r_θ → 得到标量奖励 rᵢ
5. 用 Reference Model π_ref 计算每个 token 的对数概率 log π_ref(yₜ | x, y_<ₜ)
6. 用 Policy Model π_φ 计算每个 token 的对数概率 log π_φ(yₜ | x, y_<ₜ)
```

奖励只在**序列结束时**才出现（Reward Model 只给完整回答打分）。这意味着中间 token 没有直接的奖励信号——这正是需要 Value Model 的原因。

**Phase 3 — Per-Token Reward（逐 token 分配奖励）**

```
7. 计算 token-level 的 KL 惩罚：
     KLₜ = log π_φ(yₜ | x, y_<ₜ) - log π_ref(yₜ | x, y_<ₜ)

8. 构造 token-level reward：
     rₜ = { -β × KLₜ,      如果 t < T（非终止 token）
          { r_θ(x, y) - β × KLₜ,  如果 t = T（终止 token）
```

注意：Reward Model 的标量分 $r_\theta(x, y)$ 只在最后一个 token 加上去。前面所有 token 的"奖励"只有负的 KL 惩罚——它们被鼓励"不要说太奇怪的话"。

**Phase 4 — Advantage Estimation（估计优势）**

```
9. 用 Value Model V_ψ 估计每个 token 位置的 state value Vₜ
10. 用 GAE (Generalized Advantage Estimation) 计算每个 token 的 advantage Aₜ
```

Advantage $A_t$ 回答的问题是："在位置 t 选择 token yₜ，比平均水平好多少？"它是 PPO 更新方向的核心信号。

**Phase 5 — PPO Update（更新策略）**

```
11. 用 PPO clipped objective 更新 Policy π_φ
12. 用 MSE loss 更新 Value Model V_ψ（让它更准确地预测未来收益）
13. 重复 Phase 1-5 若干轮
```

### 3.3 PPO 的核心：Clipped Objective

PPO 的精髓在于**防止策略一次更新太远**。核心公式：

$$
\mathcal{L}^{\text{CLIP}}(\phi) = \mathbb{E}_t\left[\min\left(
\rho_t(\phi) \cdot A_t,\quad
\text{clip}(\rho_t(\phi), 1 - \epsilon, 1 + \epsilon) \cdot A_t
\right)\right]
$$

其中 $\rho_t(\phi) = \frac{\pi_\phi(y_t \mid x, y_{<t})}{\pi_{\text{old}}(y_t \mid x, y_{<t})}$ 是**概率比率**（新 policy 比旧 policy 更倾向这个 token 多少倍）。

这个公式的直觉：

- **当 advantage $A_t > 0$（这个 token 不错，该多做）**：
  - 梯度要增加 $\pi_\phi(y_t)$ → 让模型更倾向生成这个 token
  - 但如果 $\rho_t > 1 + \epsilon$（已经增加太多了），clip 到 $1 + \epsilon$，停止增加
  - 防止：因一次采样运气好而"过拟合"到某个 token

- **当 advantage $A_t < 0$（这个 token 不好，该少做）**：
  - 梯度要降低 $\pi_\phi(y_t)$ → 让模型减少生成这个 token
  - 但如果 $\rho_t < 1 - \epsilon$（已经减少太多了），clip 到 $1 - \epsilon$，停止降低
  - 防止：因一次采样运气差而"过度惩罚"到某个 token

> [!tip] PPO 的 clip 参数 $\epsilon$
> 通常取 $\epsilon = 0.2$。这意味着：每次更新最多把某个 token 的概率改变 20%。这是一种"保守的乐观"——做对的方向，但步子不要太大。

### 3.4 GAE：让每个 token 都有"远见"

Reward Model 只在最后一个 token 给分。但文本生成是序列决策——第 5 个 token 的选择会影响第 100 个 token 的奖励。

GAE（Generalized Advantage Estimation）[5] 解决了这个问题。它把最终的奖励"向后传播"：

$$
A_t = \delta_t + (\gamma\lambda) \cdot \delta_{t+1} + (\gamma\lambda)^2 \cdot \delta_{t+2} + \dots
$$

其中 $\delta_t = r_t + \gamma \cdot V_\psi(s_{t+1}) - V_\psi(s_t)$ 是 TD error（"当前估计和下一步估计的差距"）。

直觉：
- $\lambda$ 控制"向后看多远"：$\lambda = 0$ 只看一步，$\lambda = 1$ 看无限远（蒙特卡洛）
- $\gamma$ 是折扣因子（通常 0.95-1.0）：因为文本生成通常不折扣（"结尾好"意味着整个回答好）
- Value Model $V_\psi$ 提供的 bootstrap 让估计更稳定

### 3.5 RLHF 的完整损失函数

把 PPO clip、KL 惩罚、Value loss 组合起来：

$$
\mathcal{L}_{\text{total}}(\phi, \psi) = \underbrace{\mathcal{L}^{\text{CLIP}}(\phi)}_{\text{PPO 策略损失}} + \alpha \cdot \underbrace{\mathbb{E}_t\left[(V_\psi(s_t) - R_t)^2\right]}_{\text{Value Model MSE}} + \gamma \cdot \underbrace{\mathbb{E}_{x}\left[\text{KL}(\pi_\phi \| \pi_{\text{ref}})\right]}_{\text{额外 KL 正则}}
$$

在 InstructGPT 的实践中，KL 惩罚有两个层面的作用：
1. **Per-token KL** 在 token reward 里（见 Phase 3），作为"过程性"约束
2. **额外 KL 项**在最终 loss 里，作为"全局性"约束

$\beta$ 是最敏感的 hyperparameter。太小 → reward hacking；太大 → 模型不敢优化，跟 SFT 差不多。

### 3.6 直觉理解

想象教一个小孩：

- **SFT** = 给他看 1000 个礼貌对话的范例 → 他会说话了
- **Reward Model** = 教会一个评分员判断回答好坏
- **RLHF = PPO 循环** =
  - 小孩回答各种问题（Rollout）
  - 评分员打分（Scoring）
  - 不等于评分员说"好"就乱夸——还要检查小孩的语气是不是变得很奇怪（KL 惩罚）
  - 告诉小孩每个词"比平均水平好多少"（Advantage）
  - 小孩小步调整策略（PPO Clip），然后继续下一轮

这就是为什么 ChatGPT 感觉不像 GPT-3——它不是突然变聪明的，而是在成百上千轮"生成→打分→调整"的循环中，逐渐学会了**人类的对话品味**。

## RLHF 之后：DPO 的简化革命

RLHF 效果好，但工程实现是一场噩梦：
- 需要训练 4 个模型（base、SFT、RM、policy）
- PPO 需要同时维护 policy 和 value function
- 训练不稳定，超参极其敏感

2023 年，Stanford 提出了 **Direct Preference Optimization (DPO)** [3]，直接跳过了显式的 Reward Model 和 RL。

### 核心洞察

RLHF 的目标是最大化奖励的同时保持接近参考模型：

$$
\max_\phi \ \mathbb{E}_{x, y \sim \pi_\phi}[r(x, y)] - \beta \cdot \text{KL}(\pi_\phi \| \pi_{\text{ref}})
$$

这个优化问题有一个**闭式解**：

$$
\pi^*(y \mid x) \propto \pi_{\text{ref}}(y \mid x) \cdot \exp\left(\frac{r(x, y)}{\beta}\right)
$$

反解出 reward：

$$
r(x, y) = \beta \cdot \log\frac{\pi^*(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \cdot \log Z(x)
$$

把这个 reward 表达式代入 Bradley-Terry 偏好模型，奇迹发生了——reward 消掉了，只剩下 policy 本身：

$$
\mathcal{L}_{\text{DPO}}(\phi) = -\mathbb{E}_{(x, y_w, y_l)}\left[\log\sigma\left(\beta \cdot \log\frac{\pi_\phi(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \cdot \log\frac{\pi_\phi(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)}\right)\right]
$$

> [!tip] DPO 的直觉
> DPO 直接说：**让模型自己学会"好回答比坏回答更可能"**。它不需要一个额外的 Reward Model——偏好信号直接作用在模型参数上。
>
> $\log\frac{\pi_\phi(y \mid x)}{\pi_{\text{ref}}(y \mid x)}$ 就是"相对于参考模型，当前模型有多喜欢这个回答"。DPO 让 winner 的喜欢程度超过 loser。

### RLHF vs DPO

| | RLHF (PPO) | DPO |
| :--- | :--- | :--- |
| 需要 Reward Model？ | 需要，单独训练 | 不需要 |
| 需要在线采样？ | 需要（policy 生成 answers） | 不需要（离线偏好数据） |
| 训练稳定性 | 差，4 个模型交互 | 好，像普通 fine-tune |
| 代表性模型 | InstructGPT, Llama 2 Chat | Llama 3, Zephyr |
| 理论优雅度 | 笨重但直觉好 | 干净漂亮 |

## 现实中的对齐：谁用了什么

| 模型 | 对齐方法 | 年份 |
| :--- | :--- | :--- |
| InstructGPT | SFT → RM → PPO | 2022 |
| ChatGPT | InstructGPT 基础上持续迭代 | 2022-2024 |
| Llama 2 Chat | SFT → RM (two-stage) → PPO (rejection sampling) | 2023 |
| Zephyr-7B | SFT → DPO | 2023 |
| Llama 3 Instruct | SFT → RM → PPO + DPO (混合) | 2024 |

趋势很明显：**DPO 正在成为新的默认**——它更简单、更稳定，而且在小模型上表现很好。但当你有海量在线偏好数据和足够算力时，RLHF (PPO) 的上限仍然更高——这也是为什么顶级商业模型仍然混合使用两者。

## 对齐的代价与争议

对齐不是免费的：

1. **Alignment Tax（对齐税）**：使模型"更安全"的过程可能会损害它在某些学术 benchmark 上的表现。RLHF 后的模型在 MMLU 等测试上有时反而比 base model 略差。

2. **谄媚问题（Sycophancy）**：模型过度迎合用户，对错误观点说"你说得对"而不是纠正。

3. **谁来定义"好"？**：标注员的偏好带有特定的文化、政治和价值观背景。OpenAI 的标注标准未必适用于全球 80 亿人。

4. **RLHF 不是终点**：Constitutional AI（Anthropic）、RRHF、KTO、SPIN……新方法层出不穷，对齐是 AI 领域目前最活跃的研究方向之一。

## 小结

从 GPT 到 ChatGPT 的路，就是让续写引擎学会看人眼色：

1. **SFT 教格式**：用高质量的 (prompt, answer) 示范，把续写模型变成对话模型
2. **RM 学品味**：用人类偏好比较训练一个"裁判"，让它知道什么是好回答
3. **RLHF/DPO 调整策略**：在裁判的指导下优化模型，同时用 KL 惩罚防止"作弊"
4. **DPO 简化一切**：把 reward model 和 RL 两个步骤合并成一步，用偏好数据直接优化

## Reference

[1] Ouyang, L., Wu, J., Jiang, X., et al. (2022). [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155). NeurIPS 2022. (The InstructGPT paper)

[2] Schulman, J., Wolski, F., Dhariwal, P., et al. (2017). [Proximal Policy Optimization Algorithms](https://arxiv.org/abs/1707.06347). arXiv.

[3] Rafailov, R., Sharma, A., Mitchell, E., et al. (2023). [Direct Preference Optimization: Your Language Model is Secretly a Reward Model](https://arxiv.org/abs/2305.18290). NeurIPS 2023.

[4] Touvron, H., Martin, L., Stone, K., et al. (2023). [Llama 2: Open Foundation and Fine-Tuned Chat Models](https://arxiv.org/abs/2307.09288). arXiv.

[5] Schulman, J., Moritz, P., Levine, S., et al. (2016). [High-Dimensional Continuous Control Using Generalized Advantage Estimation](https://arxiv.org/abs/1506.02438). ICLR 2016.
