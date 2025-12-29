---
title: python 3.13 using GIL-free and JIT now；What is GIL-free and JIT？
tags:
  - GIL
  - JIT
  - python
  - advanced
date: 2025-12-29
---
## What is GIL and JIT

### GIL: Global Interpreter Lock

> **GIL = “同一时间，只允许一个线程在跑 Python 代码”**

即使你有：

- 16 核 CPU
- 100 个 Python 线程

👉 **同一时刻也只有 1 个线程在真正执行 Python 字节码**

GIL的存在是有历史原因的，因为CPython在设计之初有一个核心设计，使用计数式垃圾回收(Reference Counting): **每个对象记录“有多少地方在用它”，当这个数变成 0，就立刻释放内存**；因此在CPython里，每一个对象的概念结构如图：

```python
typedef struct {     
	Py_ssize_t ob_refcnt;  // 引用计数     
	PyTypeObject *ob_type; // 类型信息    
	...                    // 实际数据 
} PyObject;
```

 **核心字段就是 `ob_refcnt`**;
  
#### Reference Counting 是怎么工作的？

1️⃣ 引用增加（INCREF）

`a = [] b = a`

发生了什么？

`[]  ← a  ↑  b`

`ob_refcnt = 2`

底层相当于：

`Py_INCREF(obj);`

---

2️⃣ 引用减少（DECREF）

`del a`

`[] ← b`

`ob_refcnt = 1`

---

3️⃣ 计数归零 → 立刻释放

`del b`

`ob_refcnt = 0 → free(obj)`

👉 **没有延迟，没有暂停，立即回收**

---

4️⃣ 一个完整生命周期示例

```
def f():     
	x = [1, 2, 3]     
	return x  

y = f()
```

内部过程（简化）：

1. 创建 `[1,2,3]`
    
    `refcnt = 1  (x)`
    
2. return 给 y
    
    `refcnt = 2  (x + y)`
    
3. 函数结束，x 出作用域
    
    `refcnt = 1  (y)`
    
4. `del y`
    
    `refcnt = 0 → 释放`

5️⃣ 引用计数 ≠ 完整垃圾回收（重要）

⚠️ 致命问题：**循环引用**

```
a = [] 
b = [] 
a.append(b) 
b.append(a)
```


`a ↔ b`

即使：

`del a; del b`

`a.refcnt = 1; b.refcnt = 1`

👉 **永远不为 0 → 内存泄漏**

因此多线程操作对象时，

```
Thread A: refcnt++
Thread B: refcnt--
```
如果没有GIL锁的话，则可能会导致refcnt被写坏，同时可能会有double free的崩溃风险

因此1990s时的设计为了“要简单、要快（单线程）、要稳定”，选择使用GIL给python解释器加一把全局大锁，其本质就是：频繁的小成本操作”，换“回收时刻的确定性；

因此python在处理多线程任务时是灾难级表现；python3.13中在尝试改变这个现状。

## JIT：Just-In-Time Compilation

JIT = “把你经常跑的 Python 代码，临时编译成机器码”

而不是：

`Python → 字节码 → 解释器 → CPU`

而是：

`Python → 热点代码 → 机器码 → CPU`

Cpython的默认流程是：

```
.py
 ↓
字节码 (.pyc)
 ↓
while True:
    opcode = next()
    switch(opcode):
        do_something()
```

➡️ 每一行代码都有：

- opcode dispatch
- 分支预测失败
- cache miss

而JIT加速的如：

```python
for i in range(10_000_000):
    s += i
```

JIT 会发现：

- 这个 loop 跑了很多次
- i / s 类型固定
- 分支结构稳定
👉 **直接生成等价的机器码**，进行加速

python是3.13时引入里JIT

## CIL vs JIT

| 维度      | GIL    | JIT     |     |
| ------- | ------ | ------- | --- |
| 解决什么    | 多线程并行  | 单线程执行效率 |     |
| 影响范围    | 多核 CPU | 单核性能    |     |
| 是否互斥    | ❌      | ❌       |     |
| 3.13 状态 | 实验性移除  | 实验性引入   |     |
