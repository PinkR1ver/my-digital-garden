---
title: Random Walk Recurrence
tags:
  - math
  - statistics
  - stochastic-process
  - probability
date: 2026-06-05
---

## Question

最近学到一个很有意思的结论：

一个点从原点出发，每一步都等概率向某个坐标轴的正方向或负方向走 1 格：

- 1D：向左 / 向右，各 $1/2$
- 2D：上 / 下 / 左 / 右，各 $1/4$
- 3D：$x,y,z$ 三个轴的正负方向，各 $1/6$

如果给它无限长的时间，它最终回到原点的概率是多少？

答案反直觉：

| Dimension | eventually return to origin? | probability |
| --- | --- | --- |
| 1D | yes, almost surely | $1$ |
| 2D | yes, almost surely | $1$ |
| 3D | not guaranteed | $\approx 0.340537$ |

也就是说，1 维和 2 维虽然也会越走越远，但它们最终还是会以概率 1 回到原点；3 维开始就有正概率永远不回来。这就是 Pólya's random walk theorem 的核心结论。[1]

## The key intuition

我觉得最重要的直觉是：

> 随机游走不是每一步都在“均匀探索整个空间”，而是在大约 $\sqrt{n}$ 的尺度上扩散。

这里的 $\sqrt{n}$ 不是说“最多只能走到 $\sqrt{n}$”。最多当然可以走到 $n$，比如每一步都向右。但这种路径概率极小。

它说的是：走了 $n$ 步之后，大多数路径的典型偏移量大约是 $\sqrt{n}$。

先看 1D。每一步记作：

$$
X_i =
\begin{cases}
+1, & \text{move right} \\
-1, & \text{move left}
\end{cases}
$$

走 $n$ 步后的位置是：

$$
S_n = X_1 + X_2 + \cdots + X_n
$$

因为每一步向左、向右概率一样，所以：

$$
E[X_i] = 0
$$

也就是没有 drift，平均方向不偏左也不偏右。

但“平均为 0”不等于“位置总在 0 附近”。真正衡量散开程度的是 variance：

$$
\mathrm{Var}(X_i) = E[X_i^2] - E[X_i]^2 = 1
$$

独立随机变量相加时，variance 会相加：

$$
\mathrm{Var}(S_n) = \mathrm{Var}(X_1) + \cdots + \mathrm{Var}(X_n) = n
$$

所以标准差是：

$$
\sigma(S_n) = \sqrt{\mathrm{Var}(S_n)} = \sqrt{n}
$$

这就是 $\sqrt{n}$ 的来源：不是位移线性累积，而是 fluctuation 的尺度按标准差增长。

也可以用 coin toss 的语言理解。设 $R$ 是向右次数，$L$ 是向左次数：

$$
R + L = n
$$

位置是：

$$
S_n = R - L
$$

如果 $n=10000$，最可能的情况不是 $R=10000,L=0$，而是两者都接近 $5000$。但它们不会刚好一样，典型差值大约是 $\sqrt{10000}=100$ 这个量级。所以走一万步后，常见位置不是离原点一万格，而是离原点几百格以内的量级。

推广到 2D/3D 也是类似的。每个坐标轴上的正负移动都会互相抵消；走了 $n$ 步后，每个坐标方向的典型偏移都是 $\sqrt{n}$ 量级。因此整个 walker 主要散在一个半径约为 $\sqrt{n}$ 的区域里。

这里说“主要”也很重要：不是所有路径都在里面，而是概率质量集中在这个尺度附近。离得更远当然可能，但越远概率越小。

不同维度下，这个区域的“容量”大概是：

| Dimension | radius | reachable volume scale |
| --- | --- | --- |
| 1D | $\sqrt{n}$ | $\sqrt{n}$ |
| 2D | $\sqrt{n}$ | $n$ |
| 3D | $\sqrt{n}$ | $n^{3/2}$ |

于是“第 $n$ 步正好在原点”的概率大概像这个容量的倒数：

$$
P(S_n = 0) \approx \frac{1}{n^{d/2}}
$$

只看偶数步，因为奇数步不可能回到原点。

## Visual simulation

下面这个小动画不是在证明定理，只是帮助看直觉：步数变大时，三个维度的 walker 都会散开，但主要散开的半径大概跟 $\sqrt{n}$ 同阶，而不是跟 $n$ 同阶。

<iframe src="/math/statistic/stochastic_process/attachments/random_walk_diffusion.html" width="100%" height="720" style="border: 1px solid var(--lightgray); border-radius: 8px;"></iframe>

## Why 1D and 2D return, but 3D may escape

判断会不会最终回到原点，可以看所有时间点“在原点”的概率加起来：

$$
\sum_n P(S_n = 0)
$$

这个和可以理解成 expected number of visits to origin。它发散，说明原点会被访问很多很多次，最终回到原点的概率是 1；它收敛，说明总访问次数的期望有限，存在永远不回来的可能。

代入上面的尺度：

### 1D

$$
P(S_{2n}=0) \sim C n^{-1/2}
$$

所以：

$$
\sum_n n^{-1/2} = \infty
$$

1 维会不断穿过原点。它可以跑很远，但线只有左右两个方向，想从一边跑到另一边就必须穿过原点附近。

### 2D

$$
P(S_{2n}=0) \sim C n^{-1}
$$

所以：

$$
\sum_n \frac{1}{n} = \infty
$$

2 维是最微妙的边界情况。每个具体时刻回到原点的概率越来越小，但衰减得刚好不够快。harmonic series 仍然发散，所以无限时间里还是几乎必然回来。

### 3D

$$
P(S_{2n}=0) \sim C n^{-3/2}
$$

所以：

$$
\sum_n n^{-3/2} < \infty
$$

3 维多出来的一个方向，让可扩散空间从 $n$ 级别变成 $n^{3/2}$ 级别。概率衰减得太快，所有未来“碰巧回到原点”的机会加起来也只有有限总量。

这就是为什么 3D random walk 有可能真的逃走。

## Another way to say it

在 2D，walker 会走远，但路径会在平面上反复绕回来。平面虽然无限大，但随机游走的扩散速度还不够快，逃逸空间没有大到让它彻底避开起点。

在 3D，它不只是可以绕开原点，还可以从“上面/下面”绕开已经走过的轨迹。空间容量增长太快，路径变得稀疏，原点被再次击中的机会被摊薄了。

所以这个结论不是说 3D random walk 更有“方向感”。它仍然没有 drift，平均位置还是原点。关键是：

> no drift does not mean guaranteed return.

平均位置为 0，只说明很多路径在统计上互相抵消；但单条路径仍然可能越扩越远，并且再也没碰到原点。

## Recurrence vs transience

这里有两个术语：

- **recurrent**：最终回到起点的概率是 1，而且会回来无限多次。
- **transient**：最终回到起点的概率小于 1；如果回来了，也不保证无限次回来。

simple symmetric random walk on $\mathbb{Z}^d$ 的结论是：

$$
d = 1,2 \Rightarrow \text{recurrent}
$$

$$
d \geq 3 \Rightarrow \text{transient}
$$

3 维 simple cubic lattice 上，eventual return probability 大约是：

$$
0.340537
$$

所以 never return probability 大约是：

$$
1 - 0.340537 = 0.659463
$$

## How to compute the 3D number

0.340537 不是 simulation number，而是可以从 random walk 的 return probabilities 算出来。

设：

- $p_n = P(S_n = 0)$：第 $n$ 步正好在原点的概率。
- $f_n = P(\text{first return to origin at step } n)$：第一次回到原点刚好发生在第 $n$ 步的概率。
- $F = \sum_{n \geq 1} f_n$：最终至少回到一次原点的概率，也就是我们要的 return probability。
- $G = \sum_{n \geq 0} p_n$：访问原点次数的期望，也叫 Green's function at origin。这里 $p_0=1$，因为第 0 步就在原点。

关键关系是：

$$
G = 1 + F + F^2 + F^3 + \cdots
$$

这个式子可以这样理解：从原点开始，已经有第 0 次访问，所以有 $1$；之后如果第一次回来了，概率是 $F$；回来后 Markov property 让过程重新开始，所以再次回来概率又乘一个 $F$；访问 $k$ 次的贡献就像 $F^k$。

因此如果 $F < 1$：

$$
G = \frac{1}{1-F}
$$

整理得到：

$$
F = 1 - \frac{1}{G}
$$

所以问题变成：如何算 $G$？

对 $d$ 维 simple symmetric random walk，每一步从 $2d$ 个方向里等概率选一个方向。一步的 characteristic function 是：

$$
\phi(\theta) = E[e^{i \theta \cdot X_1}]
= \frac{1}{d} \sum_{j=1}^{d} \cos \theta_j
$$

而 $n$ 步后回到原点的概率可以用 Fourier inversion 写成：

$$
p_n
= \frac{1}{(2\pi)^d}
\int_{[-\pi,\pi]^d} \phi(\theta)^n \, d\theta
$$

把所有 $n$ 加起来：

$$
G
= \sum_{n=0}^{\infty} p_n
= \frac{1}{(2\pi)^d}
\int_{[-\pi,\pi]^d}
\sum_{n=0}^{\infty} \phi(\theta)^n
\, d\theta
$$

几何级数给出：

$$
G
= \frac{1}{(2\pi)^d}
\int_{[-\pi,\pi]^d}
\frac{1}{1-\phi(\theta)}
\, d\theta
$$

对 3D，$d=3$，所以：

$$
G_3
= \frac{1}{(2\pi)^3}
\int_{[-\pi,\pi]^3}
\frac{1}{
1-\frac{1}{3}(\cos x+\cos y+\cos z)
}
\, dx\,dy\,dz
$$

这个积分叫 Watson integral。数值结果是：

$$
G_3 \approx 1.516386059
$$

所以 3D 最终回到原点的概率是：

$$
F_3
= 1 - \frac{1}{G_3}
= 1 - \frac{1}{1.516386059}
\approx 0.3405373296
$$

这也解释了为什么前面看 $\sum_n P(S_n=0)$ 很关键：$G$ 就是这个总和。1D 和 2D 里 $G=\infty$，代入 $F=1-\frac{1}{G}$ 可以理解成 $F=1$；3D 里 $G$ 是有限的，所以 $F<1$。

## Returning to a finite neighborhood

这里还有一个容易混淆的点：

> $0.340537$ 是“最终再次回到精确原点”的概率，不是“最终回到原点附近”的概率。

如果把“附近”定义成一个固定有限区域，比如：

$$
B_R = \{x \in \mathbb{Z}^3 : \|x\| \leq R\}
$$

也就是以原点为中心、半径为 $R$ 的 lattice ball，那么问题变成：

> 从原点出发，离开以后，未来是否还会再次进入 $B_R$？

这个概率当然比回到单个原点更大。因为 $B_R$ 里面有很多格点，只要回到其中任何一个都算“回到附近”。

但是在 3D 里，只要 $R$ 是固定有限的，这个概率仍然小于 $1$。

直觉是：有限区域再大，也只是无限三维空间里的一小块。walker 一旦走到很远，想再次命中这块有限区域，概率会随着距离变大而下降。

可以用一个连续近似来理解。3D Brownian motion 或 3D random walk 在远处命中半径 $R$ 球体的概率，大概像：

$$
P(\text{hit } B_R \mid \|S_0\| = r) \approx \frac{R}{r}, \quad r > R
$$

也就是说，如果已经离原点很远，比如 $r=1000$，要再撞回半径 $R=10$ 的球，概率大概只有 $10/1000=1\%$ 量级。这个式子不是这里的严格 lattice 公式，但它抓住了 3D 的核心：距离越远，固定目标区域在空间里看起来越小。

更正式地说，3D random walk 是 transient，所以对任何固定点 $x$：

$$
\sum_{n=0}^{\infty} P(S_n = x) < \infty
$$

如果 $B_R$ 是有限集合，那么：

$$
\sum_{n=0}^{\infty} P(S_n \in B_R)
= \sum_{n=0}^{\infty} \sum_{x \in B_R} P(S_n = x)
= \sum_{x \in B_R} \sum_{n=0}^{\infty} P(S_n = x)
< \infty
$$

这个和就是访问 $B_R$ 的 expected number of visits。它是有限的，说明 walker 不会无限次回到这个固定区域。

于是可以得到一个很重要的结论：

> 在 3D 中，对任何固定有限区域 $B_R$，random walk 只会访问它有限多次。

这就是“逃逸到无限远”的意思。

不是说每一步都单调远离原点。random walk 仍然会上下左右前后乱走，也会反复接近原点很多次。但从长期看，对于任意固定半径 $R$：

$$
P(\exists N,\ \forall n \geq N,\ S_n \notin B_R) = 1
$$

翻译成人话就是：

> 给定任意一个有限大小的原点附近区域，最终会有一个时间点，之后 walker 永远不会再进入这个区域。

所以这里其实比“有概率逃逸”还要强一点：对每一个固定有限区域，最终离开它并不再回来是 probability 1。只是在早期阶段，比如刚离开原点以后，“从此再也不回到原点”这个具体事件的概率是 $0.659463$。

所以“逃逸”不是 deterministic drift，而是空间维度太高导致路径变得稀疏。它没有固定方向，但它还是会逐渐离开每一个固定大小的局部区域。

这点很有诗意：在 3D 里，这个点没有任何意志，也没有选定任何远方。每一步都只是局部的、对称的、无偏的随机选择。但空间本身足够宽阔，宽阔到它不需要“想要离开”，也终将离开。

它可能回头，可能绕圈，可能很多次靠近出发点；但每一个固定的附近，最后都会变成过去。3D random walk 的逃逸不是奔向某个方向，而是从所有有限的局部记忆中逐渐淡出。

## Reference

1. [Pólya's random walk theorem, UC San Diego Department of Mathematics](https://mathematics.ucsd.edu/seminar/polyas-random-walk-theorem)
2. [Pólya's theorem lecture notes, MIT 18.095](https://math.mit.edu/classes/18.095/lect2/notes.pdf)
3. [Pólya's Random Walk Constants, Wolfram MathWorld](https://mathworld.wolfram.com/PolyasRandomWalkConstants.html)
