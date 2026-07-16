---
title: Never See Me Again — 从和弦进行到多配器作品
date: 2026-07-07
tags:
  - music
  - strudel
  - live-coding
---

*Never See Me Again* 的吸引力，很大一部分来自一组不断回返的和声：F# major 的明亮底色里，`F#7` 把音乐推向 B，紧接着的 `B → Bm` 又突然蒙上一层阴影。旋律并不急于离开这组和声，而是在反复中逐渐积累重量。

同一段材料可以拆成低音、和声、旋律和织体四层，一组 chord progression 也正是在这些层次的叠加中逐渐长成作品。旋律、节奏与和声以 [Hooktheory](https://www.hooktheory.com/theorytab/view/kanye-west/never-see-me-again) [1] 的记录为依据：F# major、89 BPM、4/4，旋律横跨 32 拍，音域为 `C#4–C#5`。最终编配从一段 [B 站钢琴演奏](https://www.bilibili.com/video/BV1ieNE68En4/) [2] 借来由留白走向丰满的动态曲线，再扩展成钢琴、尼龙弦吉他、小号与次中音萨克斯的四十小节版本。

## 1. Chord roots — 从和弦进行的重力开始

完整和弦尚未出现时，根音已经勾出了和声的重力方向。一小节四拍、每两拍移动一次，四小节走完后回到 F#；重复一轮便构成八小节框架：

`F# → F# | B → B | A# → D# | G# → C#`

<iframe src="/hobbies/music/attachments/never-see-me-again-layers/01-bass.html" width="100%" height="330" title="Bass skeleton score"></iframe>

```js
setcpm(22.25) // 89 BPM / 4 beats

note("<[f#2 f#2] [b1 b1] [a#1 d#2] [g#1 c#2] [f#2 f#2] [b1 b1] [a#1 d#2] [g#1 c#2]>")
  .sound("piano")
  .release(0.45)
  .gain(0.38)
```

<iframe src="https://strudel.cc/#c2V0Y3BtKDIyLjI1KSAvLyA4OSBCUE0gLyA0IGJlYXRzCgpub3RlKCI8W2YjMiBmIzJdIFtiMSBiMV0gW2EjMSBkIzJdIFtnIzEgYyMyXSBbZiMyIGYjMl0gW2IxIGIxXSBbYSMxIGQjMl0gW2cjMSBjIzJdPiIpCiAgLnNvdW5kKCJwaWFubyIpCiAgLnJlbGVhc2UoMC40NSkKICAuZ2FpbigwLjM4KQo=" width="100%" height="420" title="Bass skeleton in Strudel"></iframe>

暂时拿掉三音、七音和旋律以后，能够听见的只剩拍号与低音运动；这也是后面所有色彩赖以成立的骨架。

## 2. Harmonic color — 七和弦、借用和弦与声部连接

在根音之上叠入三音、五音和七音，和声框架变成：

| 小节 | 拍 1–2 | 拍 3–4 |
| --- | --- | --- |
| 1 | F# | F#7 |
| 2 | B | Bm |
| 3 | A#m7 | D#m7 |
| 4 | G#m7 | C#7 |

`F#7` 承担次属功能，把耳朵推向 B；`B → Bm` 则借用了同主音小调的颜色。七音的加入不仅扩大了明暗变化，也让相邻和弦之间出现更多共同音，声部连接因此比单纯的三和弦更平滑。

<iframe src="/hobbies/music/attachments/never-see-me-again-layers/02-harmony.html" width="100%" height="530" title="Harmony score"></iframe>

```js
setcpm(22.25)

note("<[[f#2,a#2,c#3,f#3] [f#2,a#2,c#3,e4]] [[b2,d#3,f#3,b3] [b2,d3,f#3,b3]] [[a#2,c#3,f3,g#3] [d#3,f#3,a#3,c#4]] [[g#2,b2,d#3,f#3] [c#3,f3,g#3,b3]] [[f#2,a#2,c#3,f#3] [f#2,a#2,c#3,e4]] [[b2,d#3,f#3,b3] [b2,d3,f#3,b3]] [[a#2,c#3,f3,g#3] [d#3,f#3,a#3,c#4]] [[g#2,b2,d#3,f#3] [c#3,f3,g#3,b3]]>")
  .sound("piano")
  .release(0.55)
  .gain(0.28)
  .room(0.18)
```

<iframe src="https://strudel.cc/#c2V0Y3BtKDIyLjI1KQoKbm90ZSgiPFtbZiMyLGEjMixjIzMsZiMzXSBbZiMyLGEjMixjIzMsZTRdXSBbW2IyLGQjMyxmIzMsYjNdIFtiMixkMyxmIzMsYjNdXSBbW2EjMixjIzMsZjMsZyMzXSBbZCMzLGYjMyxhIzMsYyM0XV0gW1tnIzIsYjIsZCMzLGYjM10gW2MjMyxmMyxnIzMsYjNdXSBbW2YjMixhIzIsYyMzLGYjM10gW2YjMixhIzIsYyMzLGU0XV0gW1tiMixkIzMsZiMzLGIzXSBbYjIsZDMsZiMzLGIzXV0gW1thIzIsYyMzLGYzLGcjM10gW2QjMyxmIzMsYSMzLGMjNF1dIFtbZyMyLGIyLGQjMyxmIzNdIFtjIzMsZjMsZyMzLGIzXV0+IikKICAuc291bmQoInBpYW5vIikKICAucmVsZWFzZSgwLjU1KQogIC5nYWluKDAuMjgpCiAgLnJvb20oMC4xOCkK" width="100%" height="420" title="Harmony in Strudel"></iframe>

## 3. Melody — 加入完整的 32 拍调子

旋律层保留 Hooktheory 记录的 74 个音与原始时值。它的辨识度不只来自 `C# → A# → G# → F#` 的音高轮廓，更来自长短音、重复音和休止共同形成的呼吸。Strudel 中，`@4` 表示一个音占四份时值，`~` 表示休止，每组方括号对应一小节。

<iframe src="/hobbies/music/attachments/never-see-me-again-layers/03-melody.html" width="100%" height="480" title="Hooktheory melody score"></iframe>

```js
setcpm(22.25)

note("<[c#4@4 a#4 g#4 f#4@2 c#4@4 a#4 g#4 f#4@2] [c#4@4 a#4 g#4 f#4@2 c#4@4 a#4 g#4 f#4@2] [c#4@4 c#5 b4 a#4 g#4 g#4 ~ a#4@2 g#4@2 f#4 f#4] [g#4 g#4 g#4@2 g#4@2 f#4 c#4@3 a#4@2 a#4 g#4 f#4@2] [c#4@4 a#4 g#4 f#4@2 c#4@4 a#4 g#4 f#4@2] [d#4@2 d#4 a#4@2 g#4 f#4@2 d4@4 c#5@2 c#5 c#5] [c#5 a#4@3 c#5 c#5 c#5 c#5 g#4@2 a#4@2 g#4 f#4 f#4 f#4] [g#4 g#4 g#4@2 g#4@2 f#4 c#4@3 ~@2 f#4@2 f#4 f#4]>")
  .sound("piano")
  .release(0.22)
  .gain(0.34)
  .room(0.14)
```

<iframe src="https://strudel.cc/#c2V0Y3BtKDIyLjI1KQoKbm90ZSgiPFtjIzRANCBhIzQgZyM0IGYjNEAyIGMjNEA0IGEjNCBnIzQgZiM0QDJdIFtjIzRANCBhIzQgZyM0IGYjNEAyIGMjNEA0IGEjNCBnIzQgZiM0QDJdIFtjIzRANCBjIzUgYjQgYSM0IGcjNCBnIzQgfiBhIzRAMiBnIzRAMiBmIzQgZiM0XSBbZyM0IGcjNCBnIzRAMiBnIzRAMiBmIzQgYyM0QDMgYSM0QDIgYSM0IGcjNCBmIzRAMl0gW2MjNEA0IGEjNCBnIzQgZiM0QDIgYyM0QDQgYSM0IGcjNCBmIzRAMl0gW2QjNEAyIGQjNCBhIzRAMiBnIzQgZiM0QDIgZDRANCBjIzVAMiBjIzUgYyM1XSBbYyM1IGEjNEAzIGMjNSBjIzUgYyM1IGMjNSBnIzRAMiBhIzRAMiBnIzQgZiM0IGYjNCBmIzRdIFtnIzQgZyM0IGcjNEAyIGcjNEAyIGYjNCBjIzRAMyB+QDIgZiM0QDIgZiM0IGYjNF0+IikKICAuc291bmQoInBpYW5vIikKICAucmVsZWFzZSgwLjIyKQogIC5nYWluKDAuMzQpCiAgLnJvb20oMC4xNCkK" width="100%" height="420" title="Exact melody in Strudel"></iframe>

## 4. Texture & ornamentation — 从“正确”走向“像作品”

旋律与块状和弦叠在一起，得到的仍是一份 reduction。把和弦拆成连续的八分音符后，低音与内声部开始流动，旋律则继续留在最上方；和声内容没有改变，改变的是时间中的触键方式。

分解音型遵守三个原则：每两拍跟随一次和声变化，尽量保留共同音，并在后四小节逐渐抬高音区。谱面与 Strudel 都保留 melody、harmony 和 `arpeggio` 三层；三者的纵向对照显示，织体递进并不需要改动原来的和声框架。

<iframe src="/hobbies/music/attachments/never-see-me-again-layers/04-full-loop.html" width="100%" height="1150" title="Decorated arrangement score"></iframe>

```js
setcpm(22.25)

const harmony = note("<[[f#2,a#2,c#3,f#3] [f#2,a#2,c#3,e4]] [[b2,d#3,f#3,b3] [b2,d3,f#3,b3]] [[a#2,c#3,f3,g#3] [d#3,f#3,a#3,c#4]] [[g#2,b2,d#3,f#3] [c#3,f3,g#3,b3]] [[f#2,a#2,c#3,f#3] [f#2,a#2,c#3,e4]] [[b2,d#3,f#3,b3] [b2,d3,f#3,b3]] [[a#2,c#3,f3,g#3] [d#3,f#3,a#3,c#4]] [[g#2,b2,d#3,f#3] [c#3,f3,g#3,b3]]>")
  .sound("piano").release(0.55).gain(0.2)

const melody = note("<[c#4@4 a#4 g#4 f#4@2 c#4@4 a#4 g#4 f#4@2] [c#4@4 a#4 g#4 f#4@2 c#4@4 a#4 g#4 f#4@2] [c#4@4 c#5 b4 a#4 g#4 g#4 ~ a#4@2 g#4@2 f#4 f#4] [g#4 g#4 g#4@2 g#4@2 f#4 c#4@3 a#4@2 a#4 g#4 f#4@2] [c#4@4 a#4 g#4 f#4@2 c#4@4 a#4 g#4 f#4@2] [d#4@2 d#4 a#4@2 g#4 f#4@2 d4@4 c#5@2 c#5 c#5] [c#5 a#4@3 c#5 c#5 c#5 c#5 g#4@2 a#4@2 g#4 f#4 f#4 f#4] [g#4 g#4 g#4@2 g#4@2 f#4 c#4@3 ~@2 f#4@2 f#4 f#4]>")
  .sound("piano").release(0.22).gain(0.3)

const arpeggio = note("<[f#3 c#4 a#3 c#4 f#3 c#4 a#3 e4] [b3 f#4 d#4 f#4 b3 f#4 d4 f#4] [a#3 f4 c#4 g#4 d#4 a#4 f#4 c#5] [g#3 d#4 b3 f#4 c#4 g#4 f4 b4] [f#4 c#5 a#4 c#5 f#4 e5 c#5 a#4] [b4 f#5 d#5 f#5 b4 f#5 d5 f#5] [a#4 f5 c#5 g#5 d#5 a#5 f#5 c#6] [g#4 d#5 b4 f#5 c#5 g#5 f5 b5]>")
  .sound("piano").release(0.28).gain(0.14)

stack(harmony, melody, arpeggio).room(0.18)
```

<iframe src="https://strudel.cc/#c2V0Y3BtKDIyLjI1KQoKY29uc3QgaGFybW9ueSA9IG5vdGUoIjxbW2YjMixhIzIsYyMzLGYjM10gW2YjMixhIzIsYyMzLGU0XV0gW1tiMixkIzMsZiMzLGIzXSBbYjIsZDMsZiMzLGIzXV0gW1thIzIsYyMzLGYzLGcjM10gW2QjMyxmIzMsYSMzLGMjNF1dIFtbZyMyLGIyLGQjMyxmIzNdIFtjIzMsZjMsZyMzLGIzXV0gW1tmIzIsYSMyLGMjMyxmIzNdIFtmIzIsYSMyLGMjMyxlNF1dIFtbYjIsZCMzLGYjMyxiM10gW2IyLGQzLGYjMyxiM11dIFtbYSMyLGMjMyxmMyxnIzNdIFtkIzMsZiMzLGEjMyxjIzRdXSBbW2cjMixiMixkIzMsZiMzXSBbYyMzLGYzLGcjMyxiM11dPiIpCiAgLnNvdW5kKCJwaWFubyIpLnJlbGVhc2UoMC41NSkuZ2FpbigwLjIpCgpjb25zdCBtZWxvZHkgPSBub3RlKCI8W2MjNEA0IGEjNCBnIzQgZiM0QDIgYyM0QDQgYSM0IGcjNCBmIzRAMl0gW2MjNEA0IGEjNCBnIzQgZiM0QDIgYyM0QDQgYSM0IGcjNCBmIzRAMl0gW2MjNEA0IGMjNSBiNCBhIzQgZyM0IGcjNCB+IGEjNEAyIGcjNEAyIGYjNCBmIzRdIFtnIzQgZyM0IGcjNEAyIGcjNEAyIGYjNCBjIzRAMyBhIzRAMiBhIzQgZyM0IGYjNEAyXSBbYyM0QDQgYSM0IGcjNCBmIzRAMiBjIzRANCBhIzQgZyM0IGYjNEAyXSBbZCM0QDIgZCM0IGEjNEAyIGcjNCBmIzRAMiBkNEA0IGMjNUAyIGMjNSBjIzVdIFtjIzUgYSM0QDMgYyM1IGMjNSBjIzUgYyM1IGcjNEAyIGEjNEAyIGcjNCBmIzQgZiM0IGYjNF0gW2cjNCBnIzQgZyM0QDIgZyM0QDIgZiM0IGMjNEAzIH5AMiBmIzRAMiBmIzQgZiM0XT4iKQogIC5zb3VuZCgicGlhbm8iKS5yZWxlYXNlKDAuMjIpLmdhaW4oMC4zKQoKY29uc3QgYXJwZWdnaW8gPSBub3RlKCI8W2YjMyBjIzQgYSMzIGMjNCBmIzMgYyM0IGEjMyBlNF0gW2IzIGYjNCBkIzQgZiM0IGIzIGYjNCBkNCBmIzRdIFthIzMgZjQgYyM0IGcjNCBkIzQgYSM0IGYjNCBjIzVdIFtnIzMgZCM0IGIzIGYjNCBjIzQgZyM0IGY0IGI0XSBbZiM0IGMjNSBhIzQgYyM1IGYjNCBlNSBjIzUgYSM0XSBbYjQgZiM1IGQjNSBmIzUgYjQgZiM1IGQ1IGYjNV0gW2EjNCBmNSBjIzUgZyM1IGQjNSBhIzUgZiM1IGMjNl0gW2cjNCBkIzUgYjQgZiM1IGMjNSBnIzUgZjUgYjVdPiIpCiAgLnNvdW5kKCJwaWFubyIpLnJlbGVhc2UoMC4yOCkuZ2FpbigwLjE0KQoKc3RhY2soaGFybW9ueSwgbWVsb2R5LCBhcnBlZ2dpbykucm9vbSgwLjE4KQo=" width="100%" height="430" title="Decorated arrangement in Strudel"></iframe>

## 5. Final arrangement — 从钢琴独白到管乐合奏

最终编配把前面的八小节练习拉长为四个章节、一个管乐尾声和一个钢琴 epilogue。全曲始终保持 89 BPM，张力不依赖加速，而由配器、音区和声部密度逐章累积。开场只留下钢琴与长音；主题出现后，吉他、小号和萨克斯依次获得自己的位置。

| 段落 | 长度 | 新材料 | 写作作用 |
| --- | ---: | --- | --- |
| Chapter I — Piano prelude | 8 小节 | 钢琴和声、稀疏长音 | 先建立空间，第一拍不急着交出完整旋律。 |
| Chapter II — Guitar & theme | 8 小节 | 完整主题、尼龙弦吉他 | 吉他接过分解织体，让钢琴旋律浮在上方。 |
| Chapter III — Trumpet solo | 8 小节 | 小号独奏 | 主旋律暂时退场，只留轻薄的钢琴与吉他；小号获得完整的呼吸和发展空间。 |
| Chapter IV — Theme returns | 8 小节 | 主题回归、次中音萨克斯回应 | 萨克斯用较低、较暖的线条回答钢琴主题，形成全曲峰值。 |
| Coda | 4 小节 | 管乐尾声 | 经 Bmaj7 → Bm6 → C#7sus4 / C#7，第一次落在 F#maj9。 |
| Piano epilogue | 4 小节 | 钢琴和声余韵 | 管乐离场后，钢琴独自经过 Bmaj9/F# 与 Bm6(add9)/F#，最后长久停在 F#maj9(add6)。 |

Chapter III 暂时撤去钢琴主题，让小号拥有完整的八小节独奏。句子从休止和短促的 pickup 开始，逐渐拉长到高音区，再在最后两小节回落；这种宽阔、留有呼吸的爵士抒情感，来自《海上钢琴师》式的管乐叙事。Chapter IV 中主题重新出现，小号离场，音色更暖、更接近人声的次中音萨克斯接过回答。两件管乐从不长期重叠主旋律，因此增加的是对话，而不只是音量。

有声部分共 40 小节，在 89 BPM 下约 108 秒。下方总谱按章节列出每次新进入的声部；Strudel 代码中的 `stack` 则保留了完整的纵向关系。由于 pattern 会持续循环，`arrange` 末尾附加了 256 小节静默，使这份成品在实际聆听时只播放一遍。

<iframe src="/hobbies/music/attachments/never-see-me-again-layers/05-final-form.html" width="100%" height="3900" title="Original multi-instrument final work score"></iframe>

```js
setcpm(22.25) // 89 BPM；一 cycle = 一小节

const pianoHarmony = note("<[[f#2,a#2,c#3,f#3] [f#2,a#2,c#3,e4]] [[b2,d#3,f#3,b3] [b2,d3,f#3,b3]] [[a#2,c#3,f3,g#3] [d#3,f#3,a#3,c#4]] [[g#2,b2,d#3,f#3] [c#3,f3,g#3,b3]] [[f#2,a#2,c#3,f#3] [f#2,a#2,c#3,e4]] [[b2,d#3,f#3,b3] [b2,d3,f#3,b3]] [[a#2,c#3,f3,g#3] [d#3,f#3,a#3,c#4]] [[g#2,b2,d#3,f#3] [c#3,f3,g#3,b3]]>")
  .sound("piano").release(0.72).gain(0.19)

const prelude = note("<[f#4@8 c#4@8] [c#5@10 e4@3 c#5@3] [a#4@8 a#4@4 b4@2 c#5@2] [f#4@8 g#4@4 b4@4] [f#4@4 f#4@4 f#4@4 c#5@4] [f#4@8 g#4@4 a#4@4] [b3@6 c#4@4 d#4@3 c#4@3] [c#4@16]>")
  .sound("piano").attack(0.04).release(1.15).gain(0.22)

const theme = note("<[c#4@4 a#4 g#4 f#4@2 c#4@4 a#4 g#4 f#4@2] [c#4@4 a#4 g#4 f#4@2 c#4@4 a#4 g#4 f#4@2] [c#4@4 c#5 b4 a#4 g#4 g#4 ~ a#4@2 g#4@2 f#4 f#4] [g#4 g#4 g#4@2 g#4@2 f#4 c#4@3 a#4@2 a#4 g#4 f#4@2] [c#4@4 a#4 g#4 f#4@2 c#4@4 a#4 g#4 f#4@2] [d#4@2 d#4 a#4@2 g#4 f#4@2 d4@4 c#5@2 c#5 c#5] [c#5 a#4@3 c#5 c#5 c#5 c#5 g#4@2 a#4@2 g#4 f#4 f#4 f#4] [g#4 g#4 g#4@2 g#4@2 f#4 c#4@3 ~@2 f#4@2 f#4 f#4]>")
  .sound("piano").release(0.25).gain(0.27)

const guitar = note("<[f#3 c#4 a#3 c#4 f#3 c#4 a#3 e4] [b3 f#4 d#4 f#4 b3 f#4 d4 f#4] [a#3 f4 c#4 g#4 d#4 a#4 f#4 c#5] [g#3 d#4 b3 f#4 c#4 g#4 f4 b4] [f#4 c#5 a#4 c#5 f#4 e5 c#5 a#4] [b4 f#5 d#5 f#5 b4 f#5 d5 f#5] [a#4 f5 c#5 g#5 d#5 a#5 f#5 c#6] [g#4 d#5 b4 f#5 c#5 g#5 f5 b5]>")
  .sound("gm_acoustic_guitar_nylon").release(0.32).gain(0.22)

const trumpetSolo = note("<[~@4 c#5@3 d#5 f#5@4 g#5@4] [a#5@6 g#5@2 f#5@4 d#5@2 c#5@2] [~@2 c#5@2 d#5@2 f#5@2 g#5@4 f#5@2 d#5@2] [f5@6 d#5@2 c#5@4 ~@4] [a#4@3 c#5 d#5@4 f#5@4 a#5@4] [g#5@6 f#5@2 d#5@4 c#5@4] [b4@2 c#5@2 d#5@4 f#5@3 g#5 a#5@4] [f5@4 d#5@3 c#5 b4@4 a#4@2 g#4@2]>")
  .sound("gm_trumpet")
  .attack(0.07).release(0.62)
  .gain("<0.17 0.2 0.22 0.17 0.19 0.21 0.23 0.16>")

const sax = note("<[~@16] [c#4@4 f#4@4 g#4@4 a#4@4] [b4@6 a#4@2 g#4@4 f#4@4] [c#4@8 ~@8] [f#4@4 g#4@4 a#4@4 c#5@4] [b4@6 a#4@2 g#4@4 f#4@4] [d#4@4 f#4@4 g#4@4 b4@4] [a#4@4 g#4@4 f#4@8]>")
  .sound("gm_tenor_sax").attack(0.08).release(0.48).gain(0.18)

const codaHarmony = note("<[b2,d#3,f#3,a#3] [b2,d3,f#3,g#3] [[c#3,f#3,g#3,b3] [c#3,f3,g#3,b3]] [f#2,a#2,c#3,f3,g#3]>")
  .sound("piano").release(1.4).gain(0.23)

const codaTrumpet = note("<[d#5@8 c#5@8] [b4@8 a#4@8] [g#4@8 f4@8] [f#4@16]>")
  .sound("gm_trumpet").attack(0.08).release(1.6).gain(0.17)

const codaSax = note("<[b3@16] [d4@8 f#4@8] [c#4@8 b3@8] [c#4@16]>")
  .sound("gm_tenor_sax").attack(0.1).release(1.8).gain(0.16)

const epilogueChords = note("<[f#2,c#3,a#3,f4,g#4] [f#2,b2,d#3,a#3,c#4] [f#2,b2,d3,g#3,c#4] ~>")
  .sound("piano").attack(0.05).release(2.8).gain(0.19)

const finalPiano = note("<~ ~ ~ [f#2,c#3,f3,a#3,d#4,g#4]>")
  .sound("piano").attack(0.08).release(5.5).gain(0.23)

const chapterI = stack(pianoHarmony.gain(0.16), prelude)
const chapterII = stack(pianoHarmony, theme, guitar)
const chapterIII = stack(pianoHarmony.gain(0.11), guitar.gain(0.13), trumpetSolo)
const chapterIV = stack(pianoHarmony, theme.gain(0.24), guitar.gain(0.18), sax)
const coda = stack(codaHarmony, codaTrumpet, codaSax)
const pianoEpilogue = stack(epilogueChords, finalPiano)

arrange(
  [8, chapterI],
  [8, chapterII],
  [8, chapterIII],
  [8, chapterIV],
  [4, coda],
  [4, pianoEpilogue],
  [256, silence], // Strudel 是循环系统；长静默让作品实际只听到一遍
).room(0.28)
```

<iframe src="https://strudel.cc/#c2V0Y3BtKDIyLjI1KSAvLyA4OSBCUE3vvJvkuIAgY3ljbGUgPSDkuIDlsI/oioIKCmNvbnN0IHBpYW5vSGFybW9ueSA9IG5vdGUoIjxbW2YjMixhIzIsYyMzLGYjM10gW2YjMixhIzIsYyMzLGU0XV0gW1tiMixkIzMsZiMzLGIzXSBbYjIsZDMsZiMzLGIzXV0gW1thIzIsYyMzLGYzLGcjM10gW2QjMyxmIzMsYSMzLGMjNF1dIFtbZyMyLGIyLGQjMyxmIzNdIFtjIzMsZjMsZyMzLGIzXV0gW1tmIzIsYSMyLGMjMyxmIzNdIFtmIzIsYSMyLGMjMyxlNF1dIFtbYjIsZCMzLGYjMyxiM10gW2IyLGQzLGYjMyxiM11dIFtbYSMyLGMjMyxmMyxnIzNdIFtkIzMsZiMzLGEjMyxjIzRdXSBbW2cjMixiMixkIzMsZiMzXSBbYyMzLGYzLGcjMyxiM11dPiIpCiAgLnNvdW5kKCJwaWFubyIpLnJlbGVhc2UoMC43MikuZ2FpbigwLjE5KQoKY29uc3QgcHJlbHVkZSA9IG5vdGUoIjxbZiM0QDggYyM0QDhdIFtjIzVAMTAgZTRAMyBjIzVAM10gW2EjNEA4IGEjNEA0IGI0QDIgYyM1QDJdIFtmIzRAOCBnIzRANCBiNEA0XSBbZiM0QDQgZiM0QDQgZiM0QDQgYyM1QDRdIFtmIzRAOCBnIzRANCBhIzRANF0gW2IzQDYgYyM0QDQgZCM0QDMgYyM0QDNdIFtjIzRAMTZdPiIpCiAgLnNvdW5kKCJwaWFubyIpLmF0dGFjaygwLjA0KS5yZWxlYXNlKDEuMTUpLmdhaW4oMC4yMikKCmNvbnN0IHRoZW1lID0gbm90ZSgiPFtjIzRANCBhIzQgZyM0IGYjNEAyIGMjNEA0IGEjNCBnIzQgZiM0QDJdIFtjIzRANCBhIzQgZyM0IGYjNEAyIGMjNEA0IGEjNCBnIzQgZiM0QDJdIFtjIzRANCBjIzUgYjQgYSM0IGcjNCBnIzQgfiBhIzRAMiBnIzRAMiBmIzQgZiM0XSBbZyM0IGcjNCBnIzRAMiBnIzRAMiBmIzQgYyM0QDMgYSM0QDIgYSM0IGcjNCBmIzRAMl0gW2MjNEA0IGEjNCBnIzQgZiM0QDIgYyM0QDQgYSM0IGcjNCBmIzRAMl0gW2QjNEAyIGQjNCBhIzRAMiBnIzQgZiM0QDIgZDRANCBjIzVAMiBjIzUgYyM1XSBbYyM1IGEjNEAzIGMjNSBjIzUgYyM1IGMjNSBnIzRAMiBhIzRAMiBnIzQgZiM0IGYjNCBmIzRdIFtnIzQgZyM0IGcjNEAyIGcjNEAyIGYjNCBjIzRAMyB+QDIgZiM0QDIgZiM0IGYjNF0+IikKICAuc291bmQoInBpYW5vIikucmVsZWFzZSgwLjI1KS5nYWluKDAuMjcpCgpjb25zdCBndWl0YXIgPSBub3RlKCI8W2YjMyBjIzQgYSMzIGMjNCBmIzMgYyM0IGEjMyBlNF0gW2IzIGYjNCBkIzQgZiM0IGIzIGYjNCBkNCBmIzRdIFthIzMgZjQgYyM0IGcjNCBkIzQgYSM0IGYjNCBjIzVdIFtnIzMgZCM0IGIzIGYjNCBjIzQgZyM0IGY0IGI0XSBbZiM0IGMjNSBhIzQgYyM1IGYjNCBlNSBjIzUgYSM0XSBbYjQgZiM1IGQjNSBmIzUgYjQgZiM1IGQ1IGYjNV0gW2EjNCBmNSBjIzUgZyM1IGQjNSBhIzUgZiM1IGMjNl0gW2cjNCBkIzUgYjQgZiM1IGMjNSBnIzUgZjUgYjVdPiIpCiAgLnNvdW5kKCJnbV9hY291c3RpY19ndWl0YXJfbnlsb24iKS5yZWxlYXNlKDAuMzIpLmdhaW4oMC4yMikKCmNvbnN0IHRydW1wZXRTb2xvID0gbm90ZSgiPFt+QDQgYyM1QDMgZCM1IGYjNUA0IGcjNUA0XSBbYSM1QDYgZyM1QDIgZiM1QDQgZCM1QDIgYyM1QDJdIFt+QDIgYyM1QDIgZCM1QDIgZiM1QDIgZyM1QDQgZiM1QDIgZCM1QDJdIFtmNUA2IGQjNUAyIGMjNUA0IH5ANF0gW2EjNEAzIGMjNSBkIzVANCBmIzVANCBhIzVANF0gW2cjNUA2IGYjNUAyIGQjNUA0IGMjNUA0XSBbYjRAMiBjIzVAMiBkIzVANCBmIzVAMyBnIzUgYSM1QDRdIFtmNUA0IGQjNUAzIGMjNSBiNEA0IGEjNEAyIGcjNEAyXT4iKQogIC5zb3VuZCgiZ21fdHJ1bXBldCIpCiAgLmF0dGFjaygwLjA3KS5yZWxlYXNlKDAuNjIpCiAgLmdhaW4oIjwwLjE3IDAuMiAwLjIyIDAuMTcgMC4xOSAwLjIxIDAuMjMgMC4xNj4iKQoKY29uc3Qgc2F4ID0gbm90ZSgiPFt+QDE2XSBbYyM0QDQgZiM0QDQgZyM0QDQgYSM0QDRdIFtiNEA2IGEjNEAyIGcjNEA0IGYjNEA0XSBbYyM0QDggfkA4XSBbZiM0QDQgZyM0QDQgYSM0QDQgYyM1QDRdIFtiNEA2IGEjNEAyIGcjNEA0IGYjNEA0XSBbZCM0QDQgZiM0QDQgZyM0QDQgYjRANF0gW2EjNEA0IGcjNEA0IGYjNEA4XT4iKQogIC5zb3VuZCgiZ21fdGVub3Jfc2F4IikuYXR0YWNrKDAuMDgpLnJlbGVhc2UoMC40OCkuZ2FpbigwLjE4KQoKY29uc3QgY29kYUhhcm1vbnkgPSBub3RlKCI8W2IyLGQjMyxmIzMsYSMzXSBbYjIsZDMsZiMzLGcjM10gW1tjIzMsZiMzLGcjMyxiM10gW2MjMyxmMyxnIzMsYjNdXSBbZiMyLGEjMixjIzMsZjMsZyMzXT4iKQogIC5zb3VuZCgicGlhbm8iKS5yZWxlYXNlKDEuNCkuZ2FpbigwLjIzKQoKY29uc3QgY29kYVRydW1wZXQgPSBub3RlKCI8W2QjNUA4IGMjNUA4XSBbYjRAOCBhIzRAOF0gW2cjNEA4IGY0QDhdIFtmIzRAMTZdPiIpCiAgLnNvdW5kKCJnbV90cnVtcGV0IikuYXR0YWNrKDAuMDgpLnJlbGVhc2UoMS42KS5nYWluKDAuMTcpCgpjb25zdCBjb2RhU2F4ID0gbm90ZSgiPFtiM0AxNl0gW2Q0QDggZiM0QDhdIFtjIzRAOCBiM0A4XSBbYyM0QDE2XT4iKQogIC5zb3VuZCgiZ21fdGVub3Jfc2F4IikuYXR0YWNrKDAuMSkucmVsZWFzZSgxLjgpLmdhaW4oMC4xNikKCmNvbnN0IGVwaWxvZ3VlQ2hvcmRzID0gbm90ZSgiPFtmIzIsYyMzLGEjMyxmNCxnIzRdIFtmIzIsYjIsZCMzLGEjMyxjIzRdIFtmIzIsYjIsZDMsZyMzLGMjNF0gfj4iKQogIC5zb3VuZCgicGlhbm8iKS5hdHRhY2soMC4wNSkucmVsZWFzZSgyLjgpLmdhaW4oMC4xOSkKCmNvbnN0IGZpbmFsUGlhbm8gPSBub3RlKCI8fiB+IH4gW2YjMixjIzMsZjMsYSMzLGQjNCxnIzRdPiIpCiAgLnNvdW5kKCJwaWFubyIpLmF0dGFjaygwLjA4KS5yZWxlYXNlKDUuNSkuZ2FpbigwLjIzKQoKY29uc3QgY2hhcHRlckkgPSBzdGFjayhwaWFub0hhcm1vbnkuZ2FpbigwLjE2KSwgcHJlbHVkZSkKY29uc3QgY2hhcHRlcklJID0gc3RhY2socGlhbm9IYXJtb255LCB0aGVtZSwgZ3VpdGFyKQpjb25zdCBjaGFwdGVySUlJID0gc3RhY2socGlhbm9IYXJtb255LmdhaW4oMC4xMSksIGd1aXRhci5nYWluKDAuMTMpLCB0cnVtcGV0U29sbykKY29uc3QgY2hhcHRlcklWID0gc3RhY2socGlhbm9IYXJtb255LCB0aGVtZS5nYWluKDAuMjQpLCBndWl0YXIuZ2FpbigwLjE4KSwgc2F4KQpjb25zdCBjb2RhID0gc3RhY2soY29kYUhhcm1vbnksIGNvZGFUcnVtcGV0LCBjb2RhU2F4KQpjb25zdCBwaWFub0VwaWxvZ3VlID0gc3RhY2soZXBpbG9ndWVDaG9yZHMsIGZpbmFsUGlhbm8pCgphcnJhbmdlKAogIFs4LCBjaGFwdGVySV0sCiAgWzgsIGNoYXB0ZXJJSV0sCiAgWzgsIGNoYXB0ZXJJSUldLAogIFs4LCBjaGFwdGVySVZdLAogIFs0LCBjb2RhXSwKICBbNCwgcGlhbm9FcGlsb2d1ZV0sCiAgWzI1Niwgc2lsZW5jZV0sIC8vIFN0cnVkZWwg5piv5b6q546v57O757uf77yb6ZW/6Z2Z6buY6K6p5L2c5ZOB5a6e6ZmF5Y+q5ZCs5Yiw5LiA6YGNCikucm9vbSgwLjI4KQ==" width="100%" height="500" title="Original multi-instrument final work in Strudel"></iframe>

管乐尾声先经由 `Bmaj7 → Bm6 → C#7` 回到 F#，形成第一次解决。真正的终点留给钢琴：四小节 epilogue 再次经过 B major 的明亮与 B minor 的阴影，最后停在宽音域的 `F#maj9(add6)`。和弦的长 release 让声音自然衰减，也把最初那组和声里的明暗变化留到了最后。

## References

[1] [Hooktheory: Never See Me Again Chords and Melody](https://www.hooktheory.com/theorytab/view/kanye-west/never-see-me-again)

[2] [Bilibili: 窗外是整片纽约繁华，琴键下是藏不住的遗憾](https://www.bilibili.com/video/BV1ieNE68En4/)

[3] [Strudel: Creating Patterns (`arrange`)](https://strudel.cc/learn/factories/)
