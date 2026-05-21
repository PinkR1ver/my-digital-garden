export const DEFAULT_INPUT = "Time Machine runs"

export const MODEL = {
  dModel: 4,
  dKey: 4,
  vocab: ["time", "machine", "runs", "fast", "bright"],
  embeddings: {
    time: [0.9, 0.1, 0.7, 0.0],
    machine: [0.1, 0.8, 0.2, 0.6],
    runs: [0.4, 0.3, 0.8, 0.5],
    fast: [0.3, 0.2, 0.9, 0.7],
    bright: [0.7, 0.6, 0.1, 0.2],
  },
  wq: [
    [0.8, 0.1, 0.0, 0.2],
    [0.1, 0.7, 0.2, 0.0],
    [0.2, 0.0, 0.9, 0.1],
    [0.0, 0.3, 0.1, 0.8],
  ],
  wk: [
    [0.7, 0.0, 0.2, 0.1],
    [0.0, 0.8, 0.1, 0.2],
    [0.3, 0.1, 0.7, 0.0],
    [0.1, 0.2, 0.0, 0.9],
  ],
  wv: [
    [1.0, 0.0, 0.1, 0.0],
    [0.0, 0.9, 0.0, 0.2],
    [0.2, 0.0, 0.8, 0.1],
    [0.0, 0.1, 0.2, 0.9],
  ],
  wo: [
    [0.8, 0.1, 0.1, 0.0],
    [0.1, 0.7, 0.0, 0.2],
    [0.2, 0.0, 0.8, 0.1],
    [0.0, 0.2, 0.1, 0.8],
  ],
  mlp1: [
    [0.5, -0.1, 0.3, 0.2, 0.1, -0.2],
    [0.2, 0.4, -0.2, 0.1, 0.3, 0.0],
    [-0.1, 0.2, 0.5, -0.3, 0.2, 0.4],
    [0.3, 0.1, 0.0, 0.4, -0.1, 0.2],
  ],
  mlp2: [
    [0.4, 0.1, -0.2, 0.3],
    [0.0, 0.5, 0.1, -0.1],
    [0.3, -0.2, 0.4, 0.2],
    [0.1, 0.2, -0.1, 0.5],
    [-0.2, 0.3, 0.2, 0.0],
    [0.2, 0.0, 0.3, 0.1],
  ],
  lmHead: [
    [0.5, 0.1, 0.3, 0.0, 0.8],
    [0.1, 0.6, 0.2, 0.3, -0.4],
    [0.2, 0.0, 0.7, 0.4, 0.8],
    [0.0, 0.4, 0.3, 0.6, 0.0],
  ],
}

export const STEPS = [
  { id: "tokens", label: "1. Tokens" },
  { id: "embeddings", label: "2. Embedding lookup" },
  { id: "qkv", label: "3. Q / K / V projections" },
  { id: "scores", label: "4. Attention scores" },
  { id: "mask", label: "5. Causal mask" },
  { id: "weights", label: "6. Softmax weights" },
  { id: "attention", label: "7. Attention output" },
  { id: "residual1", label: "8. Residual + LayerNorm" },
  { id: "mlp", label: "9. MLP" },
  { id: "residual2", label: "10. Block output" },
  { id: "logits", label: "11. LM head logits" },
  { id: "probs", label: "12. Next-token probabilities" },
]

const EPSILON = 1e-6

const round = (value) => Math.round(value * 1000) / 1000

const tokenize = (input) =>
  input
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)

const matMul = (a, b) =>
  a.map((row) =>
    b[0].map((_, colIndex) => row.reduce((sum, value, i) => sum + value * b[i][colIndex], 0)),
  )

const transpose = (matrix) => matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]))

const add = (a, b) => a.map((row, i) => row.map((value, j) => value + b[i][j]))

const relu = (matrix) => matrix.map((row) => row.map((value) => Math.max(0, value)))

const softmax = (row) => {
  const max = Math.max(...row)
  const exps = row.map((value) => Math.exp(value - max))
  const sum = exps.reduce((total, value) => total + value, 0)
  return exps.map((value) => value / sum)
}

const layerNorm = (matrix) =>
  matrix.map((row) => {
    const mean = row.reduce((sum, value) => sum + value, 0) / row.length
    const variance = row.reduce((sum, value) => sum + (value - mean) ** 2, 0) / row.length
    return row.map((value) => (value - mean) / Math.sqrt(variance + EPSILON))
  })

const formatMatrix = (matrix) => matrix.map((row) => row.map(round))

const buildCausalMask = (size) =>
  Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => (col > row ? Number.NEGATIVE_INFINITY : 0)),
  )

const applyMask = (scores, mask) =>
  scores.map((row, i) => row.map((value, j) => value + mask[i][j]))

const explainUnknownTokens = (tokens) =>
  tokens
    .filter((token) => !MODEL.vocab.includes(token))
    .map((token) => `"${token}"`)
    .join(", ")

const DIAGRAMS = {
  tokens: `flowchart LR
    A["raw text"] --> B["lowercase + split"]
    B --> C["tiny vocab lookup"]
    C --> D["token ids"]`,
  embeddings: `flowchart LR
    A["token ids"] --> B["embedding table"]
    B --> C["X: one vector per token"]`,
  qkv: `flowchart LR
    X["X hidden states"] --> Q["Q = X times Wq"]
    X --> K["K = X times Wk"]
    X --> V["V = X times Wv"]`,
  scores: `flowchart LR
    Q["Q"] --> D["dot product"]
    K["K transpose"] --> D
    D --> S["scores scaled by sqrt dk"]`,
  mask: `flowchart LR
    S["attention scores"] --> M["apply causal mask"]
    M --> F["future positions become -Infinity"]`,
  weights: `flowchart LR
    M["masked scores"] --> SM["row-wise softmax"]
    SM --> W["attention weights sum to 1"]`,
  attention: `flowchart LR
    W["attention weights"] --> MIX["weighted sum"]
    V["V vectors"] --> MIX
    MIX --> O["output projection Wo"]`,
  residual1: `flowchart LR
    X["original X"] --> ADD["residual add"]
    O["attention output"] --> ADD
    ADD --> LN["LayerNorm"]`,
  mlp: `flowchart LR
    H["normalized hidden states"] --> UP["linear up projection"]
    UP --> ACT["ReLU activation"]
    ACT --> DOWN["linear down projection"]`,
  residual2: `flowchart LR
    H["attention branch output"] --> ADD["residual add"]
    MLP["MLP output"] --> ADD
    ADD --> LN["block output after LayerNorm"]`,
  logits: `flowchart LR
    H["last token hidden state"] --> LM["LM head"]
    LM --> L["one logit per vocab token"]`,
  probs: `flowchart LR
    L["logits"] --> SM["softmax"]
    SM --> P["next-token probabilities"]
    P --> N["pick highest probability"]`,
}

const mermaidVisual = (id) => ({ type: "mermaid", source: DIAGRAMS[id] })

const shapePipelineVisual = (nodes) => ({ type: "shape-pipeline", nodes })

const matrixEquationVisual = (parts) => ({ type: "matrix-equation", parts })

const maskGridVisual = () => ({ type: "mask-grid" })

export function runTinyTransformer(input = DEFAULT_INPUT) {
  const rawTokens = tokenize(input)
  const tokens = rawTokens.length > 0 ? rawTokens : tokenize(DEFAULT_INPUT)
  const unknownTokens = explainUnknownTokens(tokens)
  const safeTokens = tokens.map((token) => (MODEL.vocab.includes(token) ? token : "time"))
  const tokenIds = safeTokens.map((token) => MODEL.vocab.indexOf(token))
  const embeddings = safeTokens.map((token) => MODEL.embeddings[token])
  const queries = matMul(embeddings, MODEL.wq)
  const keys = matMul(embeddings, MODEL.wk)
  const values = matMul(embeddings, MODEL.wv)
  const rawScores = matMul(queries, transpose(keys)).map((row) =>
    row.map((value) => value / Math.sqrt(MODEL.dKey)),
  )
  const causalMask = buildCausalMask(safeTokens.length)
  const maskedScores = applyMask(rawScores, causalMask)
  const attentionWeights = maskedScores.map(softmax)
  const attentionMix = matMul(attentionWeights, values)
  const attentionOutput = matMul(attentionMix, MODEL.wo)
  const residualAttention = add(embeddings, attentionOutput)
  const normalizedAttention = layerNorm(residualAttention)
  const mlpHidden = relu(matMul(normalizedAttention, MODEL.mlp1))
  const mlpOutput = matMul(mlpHidden, MODEL.mlp2)
  const blockOutput = layerNorm(add(normalizedAttention, mlpOutput))
  const lastHidden = blockOutput.at(-1)
  const logits = matMul([lastHidden], MODEL.lmHead)[0]
  const probabilities = softmax(logits)
  const nextTokenIndex = probabilities.reduce(
    (best, value, index) => (value > probabilities[best] ? index : best),
    0,
  )

  const trace = {
    input,
    tokens: safeTokens,
    rawTokens,
    unknownTokens,
    tokenIds,
    embeddings,
    queries,
    keys,
    values,
    rawScores,
    causalMask,
    maskedScores,
    attentionWeights,
    attentionOutput,
    residualAttention,
    normalizedAttention,
    mlpHidden,
    mlpOutput,
    blockOutput,
    lastHidden,
    logits,
    probabilities,
    nextTokenPrediction: {
      token: MODEL.vocab[nextTokenIndex],
      probability: probabilities[nextTokenIndex],
    },
  }

  trace.steps = STEPS.map((step) => ({ ...step, ...stepPayload(step.id, trace) }))
  return trace
}

function stepPayload(id, trace) {
  switch (id) {
    case "tokens":
      return {
        note: "A tiny hand-written vocabulary maps words to stable token ids.",
        visual: mermaidVisual("tokens"),
        data: { tokens: trace.tokens, tokenIds: trace.tokenIds },
      }
    case "embeddings":
      return {
        note: "Each token id selects one learned vector. Here the embedding table is fixed by hand.",
        visual: mermaidVisual("embeddings"),
        matrices: [{ label: "X: token embeddings", value: trace.embeddings }],
      }
    case "qkv":
      return {
        note: "The same hidden vectors are projected into query, key, and value spaces.",
        visual: {
          type: "qkv-split",
          source: "X",
          branches: [
            { label: "Q", op: "times Wq", shape: "[3 x 4]" },
            { label: "K", op: "times Wk", shape: "[3 x 4]" },
            { label: "V", op: "times Wv", shape: "[3 x 4]" },
          ],
        },
        matrices: [
          { label: "Q", value: trace.queries },
          { label: "K", value: trace.keys },
          { label: "V", value: trace.values },
        ],
      }
    case "scores":
      return {
        note: "Scores = QK^T / sqrt(dk). Larger values mean the row token matches that column token more strongly.",
        visual: matrixEquationVisual([
          { label: "Q", shape: "[3 x 4]" },
          { op: "x" },
          { label: "K^T", shape: "[4 x 3]" },
          { op: "=" },
          { label: "Scores", shape: "[3 x 3]" },
          { op: "/ sqrt(dk)" },
        ]),
        matrices: [{ label: "scaled attention scores", value: trace.rawScores }],
      }
    case "mask":
      return {
        note: "The causal mask replaces future-token scores with -Infinity before softmax.",
        visual: maskGridVisual(),
        matrices: [{ label: "masked scores", value: trace.maskedScores }],
      }
    case "weights":
      return {
        note: "Softmax converts each row into a probability distribution. Future-token weights become 0.",
        visual: matrixEquationVisual([
          { label: "Masked scores", shape: "[3 x 3]" },
          { op: "row softmax" },
          { label: "Weights", shape: "[3 x 3]" },
          { note: "each row sums to 1" },
        ]),
        matrices: [{ label: "attention weights", value: trace.attentionWeights }],
      }
    case "attention":
      return {
        note: "Weights mix the value vectors, then W_o folds the mixed signal back into hidden space.",
        visual: matrixEquationVisual([
          { label: "Weights", shape: "[3 x 3]" },
          { op: "x" },
          { label: "V", shape: "[3 x 4]" },
          { op: "=" },
          { label: "Mixed values", shape: "[3 x 4]" },
          { op: "x Wo" },
          { label: "Attention output", shape: "[3 x 4]" },
        ]),
        matrices: [{ label: "attention output", value: trace.attentionOutput }],
      }
    case "residual1":
      return {
        note: "The attention result is added back to the original embedding, then normalized.",
        visual: shapePipelineVisual([
          { title: "X", subtitle: "original hidden states", shape: "[3 x 4]" },
          { op: "+ attention output" },
          { title: "Residual sum", subtitle: "skip connection keeps old signal", shape: "[3 x 4]" },
          { op: "LayerNorm" },
          { title: "Normalized states", subtitle: "stable scale per token", shape: "[3 x 4]" },
        ]),
        matrices: [
          { label: "X + attention", value: trace.residualAttention },
          { label: "LayerNorm(X + attention)", value: trace.normalizedAttention },
        ],
      }
    case "mlp":
      return {
        note: "The MLP transforms each token independently after attention has mixed context.",
        visual: shapePipelineVisual([
          { title: "Hidden states", subtitle: "after attention + norm", shape: "[3 x 4]" },
          { op: "Linear W1" },
          { title: "Expanded features", subtitle: "more feature channels", shape: "[3 x 6]" },
          { op: "ReLU" },
          { title: "Activated features", subtitle: "negative values clipped", shape: "[3 x 6]" },
          { op: "Linear W2" },
          { title: "MLP output", subtitle: "back to model width", shape: "[3 x 4]" },
        ]),
        matrices: [
          { label: "ReLU(hidden)", value: trace.mlpHidden },
          { label: "MLP output", value: trace.mlpOutput },
        ],
      }
    case "residual2":
      return {
        note: "A second residual path and LayerNorm produce this block's output hidden states.",
        visual: shapePipelineVisual([
          { title: "Attention branch", subtitle: "normalized states", shape: "[3 x 4]" },
          { op: "+ MLP output" },
          { title: "Residual sum", subtitle: "attention signal plus MLP signal", shape: "[3 x 4]" },
          { op: "LayerNorm" },
          { title: "Block output", subtitle: "sent to next layer", shape: "[3 x 4]" },
        ]),
        matrices: [{ label: "Transformer block output", value: trace.blockOutput }],
      }
    case "logits":
      return {
        note: "The final token's hidden state is projected through the LM head to one score per vocabulary token.",
        visual: shapePipelineVisual([
          { title: "Last token hidden state", subtitle: "only the final position predicts next", shape: "[1 x 4]" },
          { op: "LM head" },
          { title: "Vocabulary logits", subtitle: "one score per token", shape: "[1 x 5]" },
        ]),
        data: Object.fromEntries(MODEL.vocab.map((token, index) => [token, round(trace.logits[index])])),
      }
    case "probs":
      return {
        note: "Softmax turns logits into next-token probabilities.",
        visual: mermaidVisual("probs"),
        data: {
          probabilities: Object.fromEntries(
            MODEL.vocab.map((token, index) => [token, round(trace.probabilities[index])]),
          ),
          prediction: trace.nextTokenPrediction.token,
        },
      }
    default:
      return {}
  }
}

function matrixToTable(matrix) {
  const rows = formatMatrix(matrix)
  return `<table>${rows
    .map(
      (row) =>
        `<tr>${row
          .map((value) => `<td>${Object.is(value, -Infinity) ? "-∞" : value.toFixed(3)}</td>`)
          .join("")}</tr>`,
    )
    .join("")}</table>`
}

function renderData(data) {
  return `<pre>${JSON.stringify(data, null, 2)}</pre>`
}

function renderVisual(visual) {
  switch (visual.type) {
    case "mermaid":
      return `<div class="lab-diagram lab-diagram-mermaid"><pre class="mermaid">${escapeHtml(
        visual.source,
      )}</pre></div>`
    case "shape-pipeline":
      return `<div class="lab-diagram">${renderShapePipeline(visual.nodes)}</div>`
    case "matrix-equation":
      return `<div class="lab-diagram">${renderMatrixEquation(visual.parts)}</div>`
    case "qkv-split":
      return `<div class="lab-diagram">${renderQkvSplit(visual)}</div>`
    case "mask-grid":
      return `<div class="lab-diagram">${renderMaskGrid()}</div>`
    default:
      return ""
  }
}

function renderShapePipeline(nodes) {
  const width = 760
  const height = 170
  const blocks = nodes.filter((node) => node.title)
  const xStep = blocks.length > 1 ? 600 / (blocks.length - 1) : 0
  let blockIndex = 0

  const body = nodes
    .map((node, index) => {
      if (node.title) {
        const x = 40 + blockIndex * xStep
        blockIndex += 1
        return `
          <g class="shape-block">
            <rect x="${x}" y="42" width="120" height="76" rx="8"></rect>
            <text x="${x + 60}" y="66" class="shape-title">${node.title}</text>
            <text x="${x + 60}" y="88" class="shape-shape">${node.shape}</text>
            <text x="${x + 60}" y="108" class="shape-subtitle">${node.subtitle}</text>
          </g>
        `
      }

      const prevBlocks = nodes.slice(0, index).filter((item) => item.title).length
      const x = 40 + (prevBlocks - 1) * xStep + 126
      return `
        <g class="shape-op">
          <line x1="${x}" y1="80" x2="${x + xStep - 132}" y2="80"></line>
          <path d="M ${x + xStep - 138} 74 L ${x + xStep - 126} 80 L ${x + xStep - 138} 86"></path>
          <text x="${x + (xStep - 132) / 2}" y="68">${node.op}</text>
        </g>
      `
    })
    .join("")

  return `<svg class="lab-svg shape-pipeline" viewBox="0 0 ${width} ${height}" role="img" aria-label="shape pipeline">${body}</svg>`
}

function renderMatrixEquation(parts) {
  let x = 28
  const chunks = parts
    .map((part) => {
      if (part.label) {
        const current = x
        x += 128
        return `
          <g class="matrix-term">
            <rect x="${current}" y="46" width="104" height="76" rx="8"></rect>
            <text x="${current + 52}" y="76" class="matrix-label">${part.label}</text>
            <text x="${current + 52}" y="101" class="matrix-shape">${part.shape}</text>
          </g>
        `
      }
      if (part.op) {
        const current = x
        x += part.op.length > 5 ? 104 : 46
        return `<text x="${current}" y="88" class="matrix-op">${part.op}</text>`
      }
      const current = x
      x += 140
      return `<text x="${current}" y="134" class="matrix-note">${part.note}</text>`
    })
    .join("")

  return `<svg class="lab-svg matrix-equation" viewBox="0 0 ${Math.max(x + 20, 760)} 160" role="img" aria-label="matrix equation">${chunks}</svg>`
}

function renderQkvSplit(visual) {
  const branches = visual.branches
    .map((branch, index) => {
      const y = 28 + index * 70
      return `
        <g class="qkv-branch">
          <path d="M 170 100 C 235 ${y + 35}, 250 ${y + 35}, 310 ${y + 35}"></path>
          <rect x="320" y="${y}" width="150" height="54" rx="8"></rect>
          <text x="395" y="${y + 21}" class="shape-title">${branch.label}</text>
          <text x="395" y="${y + 40}" class="shape-shape">${branch.shape} · ${branch.op}</text>
        </g>
      `
    })
    .join("")

  return `<svg class="lab-svg qkv-split" viewBox="0 0 560 240" role="img" aria-label="qkv split">
    <g class="shape-block">
      <rect x="44" y="62" width="126" height="76" rx="8"></rect>
      <text x="107" y="91" class="shape-title">${visual.source}</text>
      <text x="107" y="113" class="shape-shape">[3 x 4]</text>
    </g>
    ${branches}
  </svg>`
}

function renderMaskGrid() {
  const cells = Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3)
    const col = index % 3
    const future = col > row
    return `
      <g class="${future ? "mask-future" : "mask-visible"}">
        <rect x="${80 + col * 72}" y="${34 + row * 52}" width="60" height="42" rx="6"></rect>
        <text x="${110 + col * 72}" y="${61 + row * 52}">${future ? "-∞" : "keep"}</text>
      </g>
    `
  }).join("")

  return `<svg class="lab-svg mask-grid" viewBox="0 0 420 220" role="img" aria-label="causal mask grid">
    <text x="210" y="24" class="matrix-note">Causal mask: future positions are blocked before softmax</text>
    ${cells}
  </svg>`
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

let mermaidImport

async function renderMermaid(root) {
  const diagram = root.querySelector(".mermaid")
  if (!diagram) return

  try {
    mermaidImport ||=
      await import("https://cdnjs.cloudflare.com/ajax/libs/mermaid/10.7.0/mermaid.esm.min.mjs")
    const mermaid = mermaidImport.default
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default",
    })
    await mermaid.run({ nodes: [diagram] })
  } catch (_error) {
    diagram.classList.add("mermaid-fallback")
  }
}

export function renderTinyTransformerLab(root) {
  let activeStepIndex = 0
  let trace = runTinyTransformer(DEFAULT_INPUT)

  root.innerHTML = `
    <section class="lab-shell">
      <aside class="lab-panel">
        <label class="lab-label" for="lab-input">Tiny input</label>
        <input id="lab-input" class="lab-input" value="${DEFAULT_INPUT}" />
        <p class="lab-vocab">vocab: ${MODEL.vocab.join(", ")}</p>
        <nav class="lab-steps"></nav>
      </aside>
      <main class="lab-output"></main>
    </section>
  `

  const input = root.querySelector("#lab-input")
  const steps = root.querySelector(".lab-steps")
  const output = root.querySelector(".lab-output")

  const draw = () => {
    const step = trace.steps[activeStepIndex]
    steps.innerHTML = trace.steps
      .map(
        (item, index) =>
          `<button class="${index === activeStepIndex ? "active" : ""}" data-step="${index}">${item.label}</button>`,
      )
      .join("")

    output.innerHTML = `
      <div class="lab-output-header">
        <p class="lab-kicker">tiny decoder-only transformer</p>
        <h2>${step.label}</h2>
        <p>${step.note}</p>
        ${
          trace.unknownTokens
            ? `<p class="lab-warning">Unknown tokens ${trace.unknownTokens} are mapped to "time" for this toy vocab.</p>`
            : ""
        }
      </div>
      ${renderVisual(step.visual)}
      <div class="lab-card">
        ${
          step.matrices
            ? step.matrices
                .map((matrix) => `<h3>${matrix.label}</h3>${matrixToTable(matrix.value)}`)
                .join("")
            : renderData(step.data)
        }
      </div>
      <p class="lab-caption">Current sequence: ${trace.tokens.join(" → ")}. Predicted next token: <strong>${trace.nextTokenPrediction.token}</strong> (${round(
        trace.nextTokenPrediction.probability,
      ).toFixed(3)}).</p>
    `
    void renderMermaid(output)
  }

  input.addEventListener("input", () => {
    trace = runTinyTransformer(input.value)
    activeStepIndex = 0
    draw()
  })

  steps.addEventListener("click", (event) => {
    const button = event.target.closest("button")
    if (!button) return
    activeStepIndex = Number(button.dataset.step)
    draw()
  })

  draw()
}

if (typeof document !== "undefined") {
  const root = document.querySelector("[data-tiny-transformer-lab]")
  if (root) renderTinyTransformerLab(root)
}
