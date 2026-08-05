---
title: 给 AI 生成的文档「去 AI 味」——工具与方法
date: 2026-08-05
tags:
  - ai-writing
  - tooling
  - documentation
  - vibe-coding
---

## 问题在哪

用 LLM 写文档有一个反复出现的抱怨：读起来不像人写的。

这种「AI 味」来自两个源头。一个是**统计层面**的——某些词、句式、标点在 LLM 输出中出现的频率远高于人类写作（delve、tapestry、em dash、curly quotes、段落开头的 "However," 等等）。RLHF 训练加剧了这个问题：模型被训练成「有帮助的助手」，于是学会了固定的开场白（"Certainly!"、"Great question!"）、固定的结尾（"I hope this helps!"）、固定的过渡（"It is worth noting that..."）。

另一个是**结构层面**的。LLM 生成的文本有可预测的组织模式：段落长度均匀、句式节奏单一、bullet list 密度高、先给结论再展开、开头结尾对称呼应。人类写作的节奏是不规则的——短句突然打断长句，有些段落只有一个句子，有些话题说着说着就跑偏了又被拉回来。

这两个层面的特征已经被检测文献大量量化了。从 Wikipedia 社区维护的 "[Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:WikiProject_AI_Cleanup/AI_artificial_intelligence_in_Wikipedia)" 指南，到 arXiv 上 50+ 篇关于 AI text detection 的论文（perplexity、burstiness、stylometry、RLHF artifact detection），再到 GPTZero、Grammarly、Pangram 等商业检测器的工程实践——我们其实已经知道「什么东西让文本读起来像 AI」。

Github 上出现了一批工具，试图把这些知识变成可操作的 agent skill——安装一个 skill，让 Claude Code / Cursor / Codex 在生成文档时自动避开这些痕迹。这些工具在方法论上有本质分歧，值得梳理。

## 两种哲学

### Prompt 驱动：让 LLM 自己对照清单改写

这一派的逻辑是：LLM 本身知道什么是 AI 味（它见过足够多的例子），只需要给它一份详细的「AI 写作特征清单」，它就能对照自查、自行改写。

- 不需要任何运行时依赖，只有一个 Markdown 文件
- 改写的质量完全取决于宿主 LLM 的指令跟随能力
- 无法量化「改得怎么样」——没有评分，没有 gate

**代表**：

| 项目 | Stars | 模式数 | 特点 |
|---|---|---|---|
| [blader/humanizer](https://github.com/blader/humanizer) | 33.7k | 33 | Wikipedia 直接翻译，最流行，有 voice calibration |
| [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop) | 15.2k | ~100 | 8 条硬规则，最激进（杀光所有副词） |
| [harshaneel/humanize](https://github.com/harshaneel/humanize) | 332 | 9 levers | 50+ 篇论文驱动，有 forensic scorer (ai-check) |

### 检测器驱动：用独立引擎先量化，再改写

这一派的逻辑是：不能让 LLM 自己评自己——需要一个独立的、确定性的检测引擎，先算出「AI 味」的数值评分，再让 LLM 有针对性地改写。改写后重新跑检测，不通过就继续改。

- 检测引擎可以用代码实现（正则、stylometry、统计指标），结果可复现
- 可以集成到 CI/CD，作为文档质量门控
- 误报是个现实问题——非母语写作者尤其容易触发

**代表**：

| 项目 | Stars | 检测引擎 | 特点 |
|---|---|---|---|
| [conorbronsdon/avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) | 2.8k | Node.js (47 类规则, 0-100 评分) | 最全面的规则目录（61 prose + 47 engine），覆盖 70+ 平台 |
| [theclaymethod/unslop](https://github.com/theclaymethod/unslop) | 48 | Python (3 层扫描器: 短语→结构→轮廓, 313+77+6) | 工程最精良，440 用例 eval suite，有 voice teaching pipeline |
| [brandonwise/humanizer](https://github.com/brandonwise/humanizer) | 108 | Node.js CLI (500+ 词汇, burstiness/TTR/Flesch-Kincaid) | 统计引擎最完善，同时输出 pattern score + uniformity score |

## 核心工具深度对比

### blader/humanizer —— 社区共识的基线

33.7k stars 让它成为事实标准。核心是一份 ~8K token 的 SKILL.md，直接翻译 Wikipedia 的 "Signs of AI writing" 指南。33 个模式分四类：Content（虚高意义、模糊归因）、Language（AI 高频词汇、copula 回避）、Style（em dash 硬禁止、加粗滥用、curly quotes）、Communication（chatbot 痕迹、讨好语气）。

两轮改写流程：初稿 → 「这段文字哪里最像 AI 写的？」→ 终稿。有一个关键约束：**改写不得添加原文没有的事实、人名、日期、引用**——意见是 voice，事实不是。

它还有一个 「What NOT to flag」章节，列出了 13 种容易被误判为 AI 但其实不是的特征——比如非母语写作者常用的某些句式。这个误报意识在其他工具里很少见。

### hardikpandya/stop-slop —— 最激进、最 opinionated

只有 8 条规则，每条都是硬命令。最极端的一条：**杀光所有副词**——不只是 "really" "just" "literally"，而是所有 -ly 结尾的词全部干掉。另外几条也很有辨识度：禁止 Wh- 句子开头（"What makes this hard is..." → 直接说出那个具体的东西），禁止虚主语（"The data tells us..." → 谁说的？数据不会说话），禁止旁观的叙述者视角（"Nobody designed this" → "You don't sit down one day and decide to..."）。

它的 false agency 检测是这一批工具里最好的——专门抓「无生命物体执行人类动作」的句式。但没有任何定制空间，只有一种声音（作者自己的），「杀光副词」这个规则在医学、法律、学术文本上会毁掉内容。

### conorbronsdon/avoid-ai-writing —— 目录最全，引擎可运行

61 个 prose 模式 + 47 个 engine 类型 + 112 词条三层替换表——规则数量是 humanizer 的两倍多。独有特性是区分了 Tier 1A（AI 频率标记，如 delve、tapestry）和 Tier 1B（简洁性编辑，如 utilize → use）。1A 是作者证据，1B 只是写得啰嗦——这个区分在哲学上很精细：不能因为改掉了冗余词就让文档看起来更像 AI。

附带一个零依赖的 Node.js 检测引擎，可以单独跑，输出 0-100 的数值评分、HUMAN_ONLY/MIXED/AI_ONLY 分类、以及逐句高亮。引擎本身的文档用这个引擎自评，CI 会检查评分不漂移。

主要代价是 SKILL.md 太大（~40K tokens），是所有工具里上下文开销最大的。

### harshaneel/humanize —— 学术驱动，从检测文献反推改写规则

The most intellectually grounded of the bunch。50+ 篇同行评审论文（arXiv 到 2026 年 4 月），把 9 个改写「杠杆」映射到 9 个检测信号：

1. **Perplexity injection**（单词层面）——GPT-4 的 perplexity 大约在 20-30，人类写作在 80-100
2. **Burstiness enforcement**（句子层面）——AI 的 burstiness 在 0.2-0.4，人类在 0.6-1.2。有一条可计数的硬规则：输出超过 80 词的文本中，最长句与最短句的长度差必须超过 20 词，且落在 10-20 词区间的句子不能超过一半
3. **Hedge surgery**——砍掉 "it is worth noting"、"generally speaking" 等
4. **Structural flattening**——拆除 templated rhetorical scaffolding
5. **Specificity insertion**——"experts believe" → 具体人名、数据、日期
6. **Voice and register**——包括 Slack/async register collapse 检测（AI 写的 Slack 消息读起来像 polished status report）
7. **AI-transition removal**——However, Furthermore, Moreover, In addition...
8. **Punctuation normalization**——em dash, semicolon, mid-sentence colon, curly quotes
9. **RLHF voice strip**——最关键的杠杆（per arXiv 2605.19516），消除 instruction-tuning 带来的「助手语气」

附带一个独立的 `ai-check` skill，做 9 维法医评分（0-27），输出五级判定 + AI 编辑比例估计。但这本质上是 LLM 模拟的检测——是语言模型假装自己是检测器，不是真检测。所以它也做了 Binoculars 的独立交叉验证。

### theclaymethod/unslop —— 工程化最深，检测即宪法

48 颗星但工程复杂度远超其他。核心设计：「检测承载信任」——检测必须是确定性的、可 benchmark 的、CI 可集成的。

三层 Python 扫描器（stdlib only）：

- **Phrase 层**：313 个 banned phrase，每个都带 contextual gating——"navigate" 对水手是合法的，"leverage" 当 3:1 比率用时也合法，但 "navigate challenges" 或 "leverage synergies" 会被抓
- **Structure 层**：77 个结构模式 + 文档级 metrics（sentence_burstiness、paragraph_cv、triad_density、bold_colon_listicle_count、connective_paragraph_openers 等）
- **Silhouette 层**：6 个 idea-arrangement tells——这是 unslop 最独特的贡献。检测的不是词或句式，而是**思想排列方式**：`callback_content`（开头出现的词在中段消失、结尾又回来——最强的单个信号）、`preview_fulfillment`（开头内容词原样出现在正文段首）、`role_entropy_bits`（cue-opener 角色像模板一样轮转）

440 个 eval case，24 个 machine-readable gate，mutation-proof——删掉一个 scanner pattern，coverage gate 就会挂。

Voice 系统也最完善：从聊天记录 harvest → stylometric fingerprint（character 3-gram, function-word delta, MTLD, impostor z-score）→ voice card → mimic under gates → refine loop。任何 mimic 如果重新引入了 slop，不管 voice 匹配多好都会被拒。

代价是学习成本最高：需要 Python 环境，需要理解扫描器架构，voice 系统需要先收集聊天记录。

## 中文生态

中文社区的工具集中在通用散文领域：

| 项目 | Stars | 定位 |
|---|---|---|
| [op7418/Humanizer-zh](https://github.com/op7418/Humanizer-zh) | 14.7k | blader/humanizer 的官方中文翻译，24 个模式 |
| [Zeng-xiangkai/humanizer-document-zh](https://github.com/Zeng-xiangkai/humanizer-document-zh) | 3 | 中文学术论文/报告专用，28 模式 + 4 层自检（L1 硬规则 → L4 "活人感"），借鉴了软件测试的分层思路 |
| [yiancode/noai-flavor](https://github.com/yiancode/noai-flavor) | 17 | 反 AI 模式库 + text/前端双轨提示词 |
| [WhispeRre/zhoushuren-writing-studio](https://github.com/WhispeRre/zhoushuren-writing-studio) | 1 | 完整编辑工作流（公众号/笔记/观点），带 human-voice.md 和发布前 QA 门控 |

一个明显的空白：**中文技术文档 / API 文档 / README 的专用去 AI 味工具不存在**。现有的 `--voice technical` 预设都是为英文文档设计的。

## 文档写作的特殊约束

技术文档的「去 AI 味」和通用散文有本质区别。散文可以砍掉所有 "However,"，但技术文档里 "Note that..." 是一个有实际功能的信号——它告诉读者接下来是一条边界条件或注意事项。散文可以要求长短句交替，但 API 参考文档的句式节奏受到信息密度的刚性约束。

另一个隐藏问题是**代码注释和 commit message**——LLM 生成的注释容易写成 mini-essay（"This function is designed to..." → 删掉 "is designed to"，直接说做什么）。`HugoLopes45/llmstrip` 是目前唯一明确处理这个场景的工具：区分了 prose mode 和 code mode，可以集成 git hook 和 CI gate。

## 几条未解决的张力

**检测到底该多严？** 误报是一个没有好答案的问题。Stanford 的研究显示，商业检测器对非母语英语写作者的误报率超过 60%。avoid-ai-writing 的 README 明确说「这些信号有用，但不应该成为决策的唯一依据」——然后它还是提供了 0-100 的数值评分。评分的存在本身就会诱使人们把它当成判决。

**声音定制 vs 规则刚性。** stop-slop 的「杀光副词」来自作者的写作偏好。humanizer 的 voice calibration 允许样本覆盖规则（包括 em dash 禁令）。unslop 的 voice system 更进一步——从聊天记录学你的声音，但任何引入 slop 的 mimic 都会被 gate 拦住。问题是：如果你的自然写作本身就包含一些「AI 味」特征呢？比如你确实喜欢用 em dash 和 "However," 开头——到底是你的 voice，还是你的 writing tic？

**学术严谨 vs 可操作性。** harshaneel/humanize 是理论上最扎实的——每个改写规则都绑定到一个具体的 detection signal，有论文支撑。但它也是最难用的——你需要理解 perplexity、burstiness、RLHF artifact 这些概念才能用到位。相反，blader/humanizer 的理论基础就是 Wikipedia 的一个社区页面，但它是安装量最大的。

**有没有可能，去 AI 味这件事本身就制造了一种新的 AI 味？** 如果足够多的人用相同的一组规则改写相同的文本，这些「反 AI 模式」本身会不会变成一种新的 detectable pattern？unslop 的 contribute pipeline 暗示了这种担忧——它设计了一个「wild specimen → eval row → structured PR」的流水线，因为 AI 写作的模式本身在持续演化。

## 附：安装与使用

所有工具的核心交付物都是一个 SKILL.md 文件，遵循 Agent Skills 规范，可以在 Claude Code、Cursor、Codex、OpenCode、Copilot、Windsurf 等 70+ 个 agent 里使用。

```bash
# 最流行的基线
npx skills add blader/humanizer --global

# 中文用户
npx skills add op7418/Humanizer-zh --global

# 如果需要检测引擎（Node.js）
# avoid-ai-writing 和 brandonwise/humanizer 提供 CLI 评分

# 如果需要 CI 门控（Python）
# unslop 提供三层确定性扫描器
```

所有工具的作者都承认：这些方法**不能保证绕过 GPTZero、Grammarly 等商业检测器**。adversarial paraphrase 可以降低 88% 的检测率，但 learned classifier 的天花板仍然存在。这些工具的实际价值在于让**人类读者**感觉更自然，不是骗过机器。
