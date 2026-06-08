---
title: AI Roles Interview Map
date: 2026-06-08
tags:
  - ai
  - career
  - interview
---

## 大模型应用开发工程师

**Q: 大模型应用开发主要做什么？**

A: 把大模型 API 接进真实产品，围绕业务场景做 Prompt、RAG、工具调用、后端服务和部署。

需要准备：

- Python / FastAPI
- Prompt Engineering
- RAG
- API integration
- Docker deployment
- basic frontend/backend
- logging and evaluation

项目表达：

> 我做的是模型能力到产品能力的落地，包括用户输入处理、知识检索、模型生成、结果校验和服务部署。

## 智能体应用开发工程师

**Q: Agent 开发和普通大模型应用有什么区别？**

A: 普通应用多是一次输入一次输出；Agent 应用更关注任务执行，会涉及规划、工具调用、状态管理和多步决策。

需要准备：

- LangChain / LlamaIndex / workflow
- Function Calling / Tool Calling
- MCP
- RAG as Tool
- Memory
- trace and debugging
- cost control

高频面试主题：

- Agent 为什么会失效？
- 工具调用怎么设计？
- Memory 怎么召回？
- 怎么防止无限循环？

## 机器学习工程师

**Q: 机器学习工程师面试主要问什么？**

A: 更偏传统 ML 建模和数据处理，比如预测、推荐、风控、广告。

需要准备：

- SQL
- feature engineering
- train / validation / test split
- overfitting
- model evaluation
- XGBoost / Random Forest / Logistic Regression
- A/B testing

项目表达：

> 我会强调数据清洗、特征构造、模型选择、评估指标和上线后的效果监控。

## NLP 算法工程师

**Q: NLP 岗位和大模型应用岗位有什么区别？**

A: NLP 算法更关注模型和算法本身，例如文本分类、信息抽取、问答、语义匹配；大模型应用更关注调用模型解决业务问题。

需要准备：

- Transformer
- BERT
- tokenization
- text classification
- named entity recognition
- information extraction
- fine-tuning

## 大模型训练工程师

**Q: 大模型训练工程师主要准备什么？**

A: 更偏底层训练和性能优化。

需要准备：

- PyTorch
- distributed training
- DeepSpeed
- Megatron
- SFT
- RLHF / DPO
- mixed precision
- checkpoint
- GPU memory optimization

面试提醒：

> 如果没有真实训练大模型经验，不要假装做过千亿模型训练。可以诚实强调自己更偏应用开发和微调理解。

## CV / 图像 / 语音 / 模型压缩

**Q: 如果不是主攻这些方向，要不要准备？**

A: 如果目标是 AI 应用开发，不需要深挖，但要知道它们和大模型应用的区别。

快速区分：

- CV 开发：目标检测、图像分类、视频理解。
- 图像处理：滤波、增强、边缘检测、OpenCV。
- 语音识别：ASR、MFCC、CTC、降噪。
- 模型压缩：量化、剪枝、蒸馏、ONNX、TensorRT。

## 面试定位

**Q: 我准备 AI 应用/Agent 面试，优先级怎么排？**

A:

1. Agent basic：Agent 是什么，为什么会失效。
2. RAG：知识库问答完整链路。
3. Tool Calling / MCP：工具怎么接、权限怎么控。
4. Memory：上下文和长期记忆怎么管理。
5. System Design：成本、缓存、评估、trace。
6. Prompt：稳定输出和 bad case 迭代。

一句话定位：

> 我的方向不是训练大模型，而是把大模型、RAG、工具调用和工程后端结合起来，做可上线的大模型应用。
