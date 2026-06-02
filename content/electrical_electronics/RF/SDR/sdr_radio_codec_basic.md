---
title: SDR and Radio Codec Basic
date: 2026-06-02
tags:
  - sdr
  - radio
  - rf
  - signal-processing
---

## Why SDR feels so fun

SDR, Software Defined Radio, 最迷人的地方在于：以前很多固定在硬件里的 radio blocks，例如 tuner、filter、demodulator、decoder，现在可以被搬到 software / DSP 里做。硬件负责把空气里的电磁波变成可采样的数字信号，剩下的频谱观察、滤波、同步、解调、协议解码，都可以在软件里试错、改参数、重跑。PlutoSDR 这类 learning module 也正是把 SDR、RF、wireless communication 放在一起作为动手实验入口。[2](#ref-2)

一个很直觉的理解是：

> radio 不是把文字、声音、图像“塞进电磁波里”，而是用约定好的规则改变 carrier wave；接收端再观察这些变化，把信息还原出来。

![](electrical_electronics/RF/SDR/attachments/wireless-wave-info-flow.png)

## The whole chain

最简单的通信链路可以写成：

```text
source information
  -> source coding / channel coding
  -> modulation
  -> RF transmit and propagation
  -> RF receive
  -> sampling as I/Q
  -> demodulation
  -> decoding
  -> recovered information
```

这张图里的 6 个 block 正好对应这个 chain：

- **信息源**：声音、文字、图片、传感器数据、位置数据，都是待传输的 information。
- **编码**：把 information 变成 bits 或 symbols，例如 `Hello -> 01001000 ...`。实际系统还会加入 packet header、CRC、FEC 等。
- **调制**：把 bits/symbols 映射成 carrier 的变化。可以改 amplitude、frequency、phase，也可以同时改变 phase 和 amplitude。
- **发射与传播**：天线把电信号转换成电磁波，经过空间传播。传播过程中会遇到 path loss、noise、multipath、Doppler、干扰。
- **接收**：天线收到微弱信号，经过选频、放大、混频、滤波、ADC，得到数字样本。
- **解调与解码**：先读出波形变化，再把 symbols/bits 还原成语音、文字、图像或位置。

## Encoding is not modulation

这两个词很容易混在一起，但层次不同。

**Encoding** 关心的是 information representation：如何把原始信息变成 bitstream / symbol stream。比如 ASCII、UTF-8、PCM audio、JPEG image、packet format、CRC、error correction code 都属于这个层面。

**Modulation** 关心的是 physical waveform：如何让一串 bit/symbol 影响无线电载波，使它能通过天线发出去。

所以 SDR 里常见的工作流是：先把接收到的 RF signal 变成 baseband I/Q samples，再做 demodulation 得到 symbols/bits，最后按协议格式 decoding。

## Carrier wave and modulation

无线电传输需要一个 carrier wave：

$$
s(t) = A\cos(2\pi f_ct + \phi)
$$

这里的 $A$ 是 amplitude，$f_c$ 是 carrier frequency，$\phi$ 是 phase。调制就是让 information 控制这些参数。

### AM: change amplitude

AM, Amplitude Modulation, 改变的是振幅。carrier frequency 大体不变，但包络 envelope 随信息变化。收音机里的 AM broadcast 是最经典的例子。

从 SDR 角度看，AM demod 可以很直觉：如果已经拿到了 complex I/Q signal，取 magnitude 大致就能看到 envelope：

$$
|x(t)| = \sqrt{I(t)^2 + Q(t)^2}
$$

### FM: change frequency

FM, Frequency Modulation, 改变的是瞬时频率。broadcast FM、对讲机、很多窄带 voice system 都会用 FM/NFM。

FM demod 的核心是估计 phase 随时间的变化，因为 instantaneous frequency 与 phase derivative 有关：

$$
f_i(t) = \frac{1}{2\pi}\frac{d\phi(t)}{dt}
$$

这和 [[signal/signal_processing/basic_knowledge/instantaneous_frequency|Instantaneous Frequency]]、[[signal/signal_processing/basic_knowledge/concept/chirp|Chirp]] 这些概念是连着的。

### Digital modulation: FSK / PSK / QAM

数字通信里，bits 通常先被分组为 symbols，再把 symbol 映射到某种波形状态：

- **FSK**：Frequency Shift Keying，用不同频率表示不同 symbol。最简单的 BFSK 可以用两个频率表示 `0` 和 `1`。
- **PSK**：Phase Shift Keying，用不同相位表示 symbol。BPSK 用 0 度 / 180 度，QPSK 用四个相位点。
- **QAM**：Quadrature Amplitude Modulation，同时改变 amplitude 和 phase。它常被画成 constellation diagram，每个点代表一个 symbol。

数字调制的一个关键视角是 constellation：接收端不是只看“波形长什么样”，而是在 I/Q plane 上判断这个采样点更接近哪个合法 symbol。

## Why I/Q is central in SDR

SDR 软件里最常见的数据格式是 I/Q samples：

$$
x[n] = I[n] + jQ[n]
$$

I 是 in-phase component，Q 是 quadrature component，相差 90 度。用 complex samples 表示信号有几个好处：

- 可以同时表达 amplitude 和 phase。
- 可以区分正频率和负频率，baseband 处理更自然。
- mixing、filtering、frequency shift、FM demod、PSK/QAM demod 都可以变成复数 DSP 运算。

很多 SDR 接收机的第一步就是把天线收到的 RF signal 通过 mixer / LO 搬移到 baseband 或 low-IF，再由 ADC 采样，最后输出 I/Q data。GNU Radio 这类工具的“block diagram”式玩法，本质上就是把这些 DSP blocks 串起来。[1](#ref-1)

## SDR receiver chain

一个典型 SDR receiver 可以拆成 hardware front-end 和 software DSP：

```text
antenna
  -> RF filter
  -> LNA / gain
  -> mixer + local oscillator
  -> ADC
  -> digital down conversion
  -> channel filter
  -> demodulator
  -> decoder
```

### Hardware side

- **Antenna**：把电磁波转换成电压/电流。频段、极化、增益、位置都会影响接收效果。
- **RF filter**：尽量只放目标频段进来，减少强干扰把前端打爆。
- **LNA / gain**：放大弱信号，但 gain 不是越大越好，过大可能 clipping 或 intermodulation。
- **Mixer + LO**：把目标频段搬到更容易采样和处理的频率。
- **ADC**：把模拟信号变成数字样本。sample rate 决定可观察带宽，bit depth 影响动态范围。

### Software side

- **Frequency correction**：修正 dongle oscillator ppm error 或载波偏移。
- **Filtering**：用 low-pass / band-pass filter 留下 channel bandwidth。
- **Decimation**：降采样，减少后续计算量。
- **AGC / squelch**：自动增益或静噪，尤其在 voice channel 里常见。
- **Synchronization**：数字协议通常要做 symbol timing、carrier recovery、frame sync。
- **Demodulation**：AM/FM/FSK/PSK/QAM 等。
- **Decoding**：packet parse、CRC check、FEC decode、payload rendering。

## Sample rate, center frequency, bandwidth

玩 SDR 时最常调的三个参数：

- **Center frequency**：你把 receiver tune 到哪个频点，比如 FM broadcast 的 100.7 MHz，ADS-B 的 1090 MHz。
- **Sample rate**：每秒采多少 I/Q samples。粗略说，complex sample rate 约等于你一次能看到的带宽。
- **Channel bandwidth**：目标 signal 自己占多宽。比如宽带 FM 比窄带 voice 大很多，ADS-B 也有自己的 pulse timing 和带宽需求。

常见错误是 sample rate 开太小，signal 被截掉；或者开太大，CPU 吃不消，而且 waterfall 里一堆无关信号会影响判断。

如果是 RTL-SDR 这类低成本 USB dongle，实际 setup 还要留意驱动、gain mode、device variant、天线和操作系统支持；官方 quick start guide 通常比随便找一段旧教程更可靠。[3](#ref-3)

## Demodulation vs decoding

图里最后一栏写得很好：**解调 = 读出波形变化；解码 = 还原原始信息**。

以 ADS-B 为例：

```text
1090 MHz RF pulse signal
  -> receive and sample
  -> detect pulse timing
  -> recover bits
  -> parse Mode S / ADS-B message
  -> aircraft ID, altitude, position, speed
```

前半段是 demodulation / bit recovery，后半段才是 protocol decoding。很多 SDR project 的乐趣就在这里：waterfall 里看到一个 signal 只是第一步，把它变成有意义的数据才是完整 chain。

## A practical mental model

当我打开 SDR 软件时，可以按这个顺序 debug：

1. **Is there energy?** waterfall 上有没有目标频段的亮线、burst、channel。
2. **Is the RF setup sane?** antenna 是否适合频段，gain 是否过高/过低，前端有没有被强信号压制。
3. **Is the signal centered?** center frequency / ppm correction 有没有偏。
4. **Is bandwidth enough?** filter 和 sample rate 有没有截断 signal。
5. **Which modulation?** AM/FM/FSK/PSK/QAM，还是 pulse-based protocol。
6. **Can I recover symbols/bits?** timing、carrier、threshold 是否合理。
7. **Does the protocol parse?** preamble、frame length、CRC、endianness、FEC 是否对。

## Common things worth decoding

- **FM broadcast**：最适合练习 wideband FM、stereo pilot、RDS。
- **NFM voice**：对讲机、业余无线电中常见，适合理解 narrowband FM、squelch。
- **ADS-B 1090 MHz**：飞机位置数据，协议结构清晰，反馈非常直观。
- **NOAA weather satellite**：可以练习 FM demod、audio recording、image decode。
- **Pager / APRS / AIS**：更偏 digital decoding，适合练习 FSK、packet、CRC。

只接收公开、未加密且当地法律允许接收的信号。SDR 很适合学习 RF 和 DSP，但不要把“能收到”理解成“可以随意解码、记录或传播”。

## Related notes

- [[signal/signal_processing/basic_knowledge/concept/FM_vs_AM|FM signal vs. AM signal]]
- [[signal/signal_processing/basic_knowledge/instantaneous_frequency|Instantaneous Frequency]]
- [[signal/signal_processing/algorithm/envelope/hilbert_transform|Hilbert Transform - Envelope]]
- [[signal/hardware/frequency_mixer/frequency_mixer|Frequency Mixer]]
- [[electrical_electronics/RF/antenna/antenna|Antenna]]

## References

<a id="ref-1"></a>[1] [GNU Radio: About GNU Radio](https://www.gnuradio.org/about/)

<a id="ref-2"></a>[2] [Analog Devices: ADALM-PLUTO Software-Defined Radio Active Learning Module](https://www.analog.com/en/resources/evaluation-hardware-and-software/evaluation-boards-kits/adalm-pluto.html)

<a id="ref-3"></a>[3] [RTL-SDR Blog: Quick Start Guide](https://www.rtl-sdr.com/rtl-sdr-quick-start-guide/comment-page-176/)
