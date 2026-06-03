---
title: Bernoulli Principle
date: 2026-06-03
tags:
  - physics
  - fluid-dynamics
  - basic
---

## Statement

Bernoulli principle 描述的是一个理想流体在稳定流动时，pressure, velocity, height 之间的关系。

最常见的形式：

$$
p + \frac{1}{2}\rho v^2 + \rho g h = constant
$$

也可以写成两点之间的关系：

$$
p_1 + \frac{1}{2}\rho v_1^2 + \rho g h_1
=
p_2 + \frac{1}{2}\rho v_2^2 + \rho g h_2
$$

我最直觉的理解是：沿着同一条 streamline，流体的 mechanical energy 在三种形式之间转换：

* pressure energy
* kinetic energy
* gravitational potential energy

如果高度差不大，$\rho g h$ 变化可以忽略，就会得到更常见的短句：

> speed up -> static pressure down

但这个短句只是简化，不是完整定律。

## Each Term

### Static pressure

$$p$$

这是流体本身的静压。可以理解为流体对周围边界的 ordinary pressure。

单位是 Pa：

$$
1 Pa = 1 N/m^2
$$

### Dynamic pressure

$$
\frac{1}{2}\rho v^2
$$

这一项和速度有关，叫 dynamic pressure [2]。

速度越大，这项越大，而且是 $v^2$，所以速度翻倍，dynamic pressure 会变成四倍。

### Hydrostatic term

$$
\rho g h
$$

这一项和高度有关。$h$ 越高，gravitational potential energy 越大。

在水塔、水管、河流这种问题里，这一项很重要。对于同一房间里近似水平的空气流动，它常常可以先被忽略。

## Energy per Volume

一个容易记住的点：Bernoulli equation 里三项单位都是 pressure，也就是 energy density。

$$
Pa = N/m^2 = \frac{N \cdot m}{m^3} = J/m^3
$$

所以这个公式也可以看作：

```text
pressure energy per volume
+ kinetic energy per volume
+ potential energy per volume
= constant
```

这比单纯背“流速越大压力越小”更可靠。

## Head Form

工程里也常把 Bernoulli equation 除以 $\rho g$，写成 head 的形式：

$$
\frac{p}{\rho g} + \frac{v^2}{2g} + h = constant
$$

这三项的单位都是长度：

* $\frac{p}{\rho g}$：pressure head
* $\frac{v^2}{2g}$：velocity head
* $h$：elevation head

这在管道、水泵、水力系统里很常见。

## Why Velocity and Pressure Trade

想象一小段流体沿着管道前进。

如果前后压力不同，压力力会对这段流体做功。流体得到的功可以变成 kinetic energy，于是速度变大。

反过来，如果流体进入一个需要减速的区域，kinetic energy 可以转回 pressure。

所以 Bernoulli equation 不是神秘吸力公式，而是 work-energy principle 在流体里的一个版本。

## Continuity Equation

Bernoulli principle 经常和 continuity equation 一起出现。

对 incompressible flow：

$$
A_1 v_1 = A_2 v_2
$$

如果管道变窄，面积 $A$ 变小，为了保持体积流量，速度 $v$ 会变大。

再结合 Bernoulli：

```text
area smaller -> velocity larger -> static pressure lower
```

这就是 Venturi tube 这类装置的基本直觉。

## Assumptions

最干净的 Bernoulli equation 需要几个条件：

* steady flow：流动不随时间剧烈变化；
* incompressible flow：密度近似不变；
* inviscid flow：忽略黏性损失；
* along a streamline：通常沿同一条流线使用；
* no pump or turbine between points：中间没有机器额外加能或取能。

这些条件很重要。现实流体有摩擦、有湍流、有边界层、有局部损失，所以真实工程计算常常要在 Bernoulli equation 里加 loss term。

## With Loss

更实际一点的形式会写成：

$$
\frac{p_1}{\rho g} + \frac{v_1^2}{2g} + h_1
=
\frac{p_2}{\rho g} + \frac{v_2^2}{2g} + h_2 + h_L
$$

$h_L$ 是 head loss，代表摩擦、弯头、阀门、入口出口等造成的能量损失。

如果中间有 pump，也可以加 pump head：

$$
\frac{p_1}{\rho g} + \frac{v_1^2}{2g} + h_1 + h_P
=
\frac{p_2}{\rho g} + \frac{v_2^2}{2g} + h_2 + h_L
$$

这时候就更接近真实管路计算。

## Common Mistakes

### Mistake 1: faster air always means lower pressure everywhere

不是 everywhere。Bernoulli 是沿 streamline 的关系，而且要满足前提。

不同流线之间不能随便比较，除非有额外条件支持。

### Mistake 2: Bernoulli explains all lift by itself

机翼升力可以用 Bernoulli 解释一部分，但完整图像还需要 circulation, pressure distribution, angle of attack, momentum change 等。

### Mistake 3: ignoring viscosity

现实流体的黏性会吃掉机械能。速度越高、路径越复杂，损失可能越明显。

### Mistake 4: treating pump or turbine flow as passive Bernoulli flow

pump, turbine 这类机器会主动给流体加能量或取走能量。机器前后不能只用最简单的 Bernoulli constant 来处理。

## Small Examples

### Horizontal pipe

如果管道高度不变：

$$
p + \frac{1}{2}\rho v^2 = constant
$$

某段速度变大，static pressure 会下降。

### Tank outlet

从一个大水箱底部小孔流出，如果水箱上方和出口都接大气压，可以得到 Torricelli's law：

$$
v = \sqrt{2gh}
$$

这里水面高度的 potential energy 转成出口速度。

### Pitot tube

Pitot tube 用 stagnation pressure 和 static pressure 的差来估计速度：

$$
\Delta p = \frac{1}{2}\rho v^2
$$

所以：

$$
v = \sqrt{\frac{2\Delta p}{\rho}}
$$

这也是 dynamic pressure 的一个实际用途。

## What I should remember

不要只背“流速快，压强低”。

更好的版本是：

> 在理想、稳定、不可压、近似无黏的流动里，沿同一条流线，静压、动压、高度势能三者的总和保持不变。

短句可以帮助直觉，完整公式用来防止直觉乱跑。

## Reference

* [1] [NASA Glenn Research Center: Bernoulli's Equation](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/bernoullis-equation/)
* [2] [NASA Glenn Research Center: Dynamic Pressure](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/dynamic-pressure-2/)
