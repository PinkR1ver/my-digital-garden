import assert from "node:assert/strict"
import test from "node:test"

import {
  DEFAULT_INPUT,
  MODEL,
  STEPS,
  runTinyTransformer,
} from "../content/computer_sci/llm/architecture/attachments/tiny-transformer-lab.js"

const almostEqual = (actual, expected, epsilon = 1e-6) => {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`)
}

test("tiny transformer lab exposes a deterministic full forward pass", () => {
  const trace = runTinyTransformer(DEFAULT_INPUT)

  assert.deepEqual(trace.tokens, ["time", "machine", "runs"])
  assert.equal(trace.tokenIds.length, 3)
  assert.equal(trace.embeddings.length, 3)
  assert.equal(trace.embeddings[0].length, MODEL.dModel)
  assert.deepEqual(
    trace.steps.map((step) => step.id),
    STEPS.map((step) => step.id),
  )
  const stepsById = Object.fromEntries(trace.steps.map((step) => [step.id, step]))
  assert.equal(stepsById.mlp.visual.type, "shape-pipeline")
  assert.equal(stepsById.residual1.visual.type, "shape-pipeline")
  assert.equal(stepsById.scores.visual.type, "matrix-equation")
  assert.equal(stepsById.attention.visual.type, "matrix-equation")
  assert.equal(stepsById.tokens.visual.type, "mermaid")

  trace.attentionWeights.forEach((row, rowIndex) => {
    almostEqual(
      row.reduce((sum, value) => sum + value, 0),
      1,
      1e-5,
    )

    row.forEach((value, colIndex) => {
      if (colIndex > rowIndex) {
        almostEqual(value, 0)
      }
    })
  })

  assert.equal(trace.logits.length, MODEL.vocab.length)
  almostEqual(
    trace.probabilities.reduce((sum, value) => sum + value, 0),
    1,
    1e-5,
  )
  assert.equal(trace.nextTokenPrediction.token, "bright")
})
