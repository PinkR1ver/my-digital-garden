---
title: Where to Put a Window Fan for Ventilation
date: 2026-06-03
tags:
  - physics
  - life
  - fluid-dynamics
---

## Question

空气循环扇要让家里通风更强，应该放在窗户的哪个位置？

我现在的结论是：

> 如果是普通 air circulator，不是密封装在窗框里的 exhaust fan，通常把风扇放在窗户内侧一小段距离，朝窗外吹，比随便放在屋中间更有效。但这件事成立有一个前提：必须有一个能补风的 **inlet**。没有 inlet，风扇很容易只是在局部搅动空气，而不是把室内空气持续换出去。

更具体一点：

* **风扇方向**：朝窗外吹，把它当作排风机。
* **水平位置**：对准窗户开口的中线，不要贴着墙边斜吹。
* **距离**：离窗户大约 0.5-1.5 m 是一个实用起点；太远会让 jet 在到达窗户前散掉，太近又可能只排走窗边一小团空气。
* **进风口**：在房间另一侧开门缝或窗缝，效果通常比同一扇窗旁边进风更好。进风口不是可有可无的“辅助条件”，而是能不能持续排出室内空气的必要条件。
* **如果是 box fan 且能塞进窗框**：另一种策略是尽量密封窗框，让它直接做机械排风。这个情形和普通循环扇隔一段距离吹窗户不是同一个优化问题。

## Why Bernoulli principle helps here

风扇把空气加速以后，窗户方向出现一股高速射流。根据 [[physics/fluid_dynamics/bernoulli_principle|Bernoulli principle]]，高速流动区域会对应更大的 dynamic pressure 和较低的 static pressure。

这个低压不是整个房间一下子“真空”了，而是窗户附近、射流周围形成了一个局部吸引区。周围较慢的室内空气会被高速射流卷进去，一起被带出窗外。这个过程叫 entrainment。

所以它的逻辑链是：

```text
风扇加速空气
-> 窗口方向产生高速射流
-> 射流附近静压偏低
-> 周围空气被卷入射流
-> 室内空气排出
-> 另一侧开口补进新空气
```

这里 Bernoulli principle 解释的是“高速流和低压的关系”；真正的换气量还取决于窗口大小、风扇风量、进风口面积、房间阻力和室外风。

但有一点可以先定下来：只要想把空气真正排出去，就不能只有 exhaust。排出去的空气必须由别处补进来，否则房间会很快进入“缺补风”的状态，排风趋势被压住，循环扇就更像在室内搅拌空气。

## Interactive low-order simulation

下面这个仿真不是 CFD，也不再尝试模拟真实户型。它只是一个 low-order 原理图：一个房间、一个进风口、一个排风窗、一个朝窗外吹的风扇，再允许加几条墙和一个局部可通风空间。

它只想说明一个原理：

```text
风扇制造高速排风 jet
-> 窗边局部 static pressure 偏低
-> 周围空气被卷入 jet
-> 室内空气排出
-> 另一侧进风口补进新空气
```

<iframe src="/physics/life_physics/attachments/window_fan_bernoulli_simulation.html" width="100%" height="860" scrolling="no" style="border: 1px solid var(--lightgray); border-radius: 8px; display: block;"></iframe>

## How to read the simulation

仿真里只有几个变量：

* **Fan jet speed**：风扇形成的射流速度。速度越大，dynamic pressure 越大。
* **Room width / Room length**：房间的简化长宽，用来改变原理图的比例。
* **Exhaust opening area**：排风窗有效开口面积，单位是 $m^2$。太小会限制排风。
* **Exhaust vertical position**：排风窗在右侧墙上的高度位置。默认放在右上方。
* **Inlet opening area**：补风口有效开口面积，单位是 $m^2$。没有补风口，排风会被房间阻力限制。
* **Inlet vertical position**：进风口在左侧墙上的高度位置。默认放在左下方。
* **Fan center X / Fan center Y**：风扇在房间里的位置。默认靠近右上方排风窗；离排风窗太远、或和排风窗高度错开太多，jet 的排风耦合会变弱。

图里的蓝色区域表示窗边低静压趋势，绿色网格表示简化模型下的有效换气空间，绿色粒子表示空气被带向排风窗。`Flow trend` 和 `Effective area` 只用于比较趋势，不是实测换气量。

默认状态用一个更接近 loft 的简化平面：左下方进风、右上方排风，入口上方有一段 L 型墙切出狭窄入口；从入口进来仍然能看到客厅方形空间。房间中心默认有一个小的 **vent pocket**，表示风可以在那里继续走的中间空间，可以粗略理解成楼梯井、挑空处或上下层之间的开口。下面几个复杂因素可以继续手动调整，但它们只是帮助理解趋势：

* **add extra fan**：增加一个辅助风扇，把房间深处空气推入主流路。
* **add wall 1 / 2 / 3**：增加一条独立墙段。每条墙只是一条连续、不透气的线段，可以调方向、中心 X、中心 Y 和长度。默认墙 1 从左侧房间边界向右伸出，墙 2 从上侧房间边界向下伸出，两条墙相接，组成入口上方的 L 型切割墙。
* **add vent pocket**：增加一个可通风的小空间。它不是一整条通道，而是一个可以调 X、Y 和大小的小方块；默认在房间中心，用来模拟风可以继续走的楼梯井、挑空处或局部开口。

复杂户型里，墙壁、楼梯、玻璃扶手、小窗开角、室外风、温差、家具都会改变结果。这个仿真可以加一点复杂度帮助理解，但仍然不是户型预测器。它真正想说明的是一个更朴素的判断：绿色有效换气区域不是靠风扇“凭空制造”的，而是靠 inlet 补风和 exhaust 排风之间形成路径。

## Practical placement rule

我的操作规则可以写成：

1. 先找一扇可以作为 **exhaust window** 的窗。
2. 把循环扇放在窗户内侧约 0.5-1.5 m，正对窗口向外吹。
3. 在房间另一侧开一个小进风口，尽量让空气穿过人的活动区域。没有这个 inlet，就不要期待稳定换气。
4. 如果闻到做饭味、潮气或闷热感明显下降，说明流路是对的；如果只是窗边风很大，房间深处没变化，说明进风口或风扇方向要调。

## Final takeaway

循环扇能不能“把空气循环出去”，关键不是风扇本身有多会吹，而是有没有完整的空气路径：

```text
inlet 补进新空气
-> 新空气穿过房间
-> 风扇把室内空气卷入排风 jet
-> exhaust 把空气送出室外
```

所以最后的判断可以很直接：

> **只有 exhaust window 不够。要让空气持续换出去，必须有 inlet。**

如果没有 inlet，风扇当然仍然会让屋里有风感，也可能让温度更均匀，但这更接近 air mixing，不是有效 ventilation。真正的换气需要“进得来”也“出得去”。

## Limitations

这个模型有几个故意的简化：

* 它是 2D 原理图，不是 3D CFD。
* 不求解 Navier-Stokes，只用 pressure drop、fan jet entrainment 和 source-sink field 表示趋势。
* 墙体只按 2D 不透气线段处理，没有真实绕流、门缝漏风、楼梯竖向交换、玻璃扶手高度、窗户开角、温差浮力、风扇 P-Q 曲线。
* Bernoulli equation 在这里是 intuition，不是完整设计工具。

真实世界里，最可靠的验证方式还是烟雾笔、香薰烟、薄纸条，或者 CO2 传感器下降曲线。
