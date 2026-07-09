---
title: Never See Me Again - intro chord frame
date: 2026-07-07
tags:
  - music
  - strudel
  - live-coding
---

## Intro

`F# | F#7 | B | Bm | A#m7 | D#m7 | G#m7 | C#7`

![Intro chord reduction](/hobbies/music/attachments/never-see-me-again-intro-chords.svg)

这份资料只给出了 Intro 的和弦与歌词对位，没有旋律的具体音高和节奏；上面是可核对的和声框架，不把猜测的音符伪装成原曲主旋律。后面的 "And it'll be a long time / before you see me again" 落在 `G#m7 | C#7`。Quartz 没有启用乐谱渲染插件，所以这里直接放静态五线谱。

## Strudel

<iframe
  src="https://strudel.cc/#c2V0Y3BtKDIyLjI1KQoKbm90ZSgiPFtmIzIsYSMyLGMjMyxmIzNdIFtmIzIsYSMyLGMjMyxlNF0gW2IyLGQjMyxmIzMsYjNdIFtiMixkMyxmIzMsYjNdIFthIzIsYyMzLGYzLGcjM10gW2QjMyxmIzMsYSMzLGMjNF0gW2cjMixiMixkIzMsZiMzXSBbYyMzLGYzLGcjMyxiM10+IikKICAuc291bmQoInRyaWFuZ2xlIikKICAuYXR0YWNrKDAuMDEpCiAgLnJlbGVhc2UoMC40KQogIC5nYWluKDAuMzUpCiAgLnJvb20oMC4yKQo="
  width="100%"
  height="520"
></iframe>

```js
setcpm(22.25)

note("<[f#2,a#2,c#3,f#3] [f#2,a#2,c#3,e4] [b2,d#3,f#3,b3] [b2,d3,f#3,b3] [a#2,c#3,f3,g#3] [d#3,f#3,a#3,c#4] [g#2,b2,d#3,f#3] [c#3,f3,g#3,b3]>")
  .sound("triangle")
  .attack(0.01)
  .release(0.4)
  .gain(0.35)
  .room(0.2)
```

嵌入的 REPL 已预填这段进行；每个和弦是一小节，`B → Bm` 和 `F# → F#7` 是这里的关键变化。

## 链接

[1] [Strudel REPL](https://strudel.cc/)
[2] [Hooktheory: Never See Me Again Chords and Melody](https://www.hooktheory.com/theorytab/view/kanye-west/never-see-me-again)
[3] [MuseScore: Never See Me Again - Kanye West](https://musescore.com/user/5534411/scores/9000836)
