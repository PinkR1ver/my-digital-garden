# Minimal Agent Socket Note Handoff

Created: 2026-06-04
Last updated: 2026-06-04
Status: active

## Goal

Write a practical digital-garden note based on the `feishu-agent-socket` project:
a minimal Feishu long-connection service that receives trusted text messages,
normalizes and gates them, queues a one-shot `codex exec` task, then replies back
to Feishu.

## Current Draft

- Note file:
  `content/computer_sci/llm/agent/minimal_agent_socket.md`
- Linked from:
  `content/computer_sci/llm/llm_MOC.md`
- Local preview path:
  `/computer_sci/llm/agent/minimal_agent_socket`

## Source Context Used

From `/Volumes/macOSexternal/Documents/proj/feishu-agent-socket`:

- `README.md`
- `src/index.ts`
- `src/config.ts`
- `src/message.ts`
- `src/codex.ts`
- `src/reply.ts`
- `.agents/AGENTS.md`
- `.agents/docs/env-parameters.md`
- `.env.example`

Do not read or quote `.env`; it contains real Feishu credentials and private
IDs.

## Conversation Summary

The initial theme was a concept note around "Agent Socket": a connection layer
between external messages and an agent runtime. The first draft was too broad
and read like an AI-generated architecture explainer.

The user asked for a more practical version based on actual code and experience.
The note was rewritten as a project handoff / implementation log:

- start from the Feishu-to-Codex goal
- show the first running chain
- focus on actual code boundaries
- keep MCP, skill, persistent session, and rules as future directions only
- avoid long abstract sections

The user then questioned whether the project really performs checks and
conversions before calling Codex. Source review confirmed that it does:

- `normalizeMessage()` parses Feishu event shape into `NormalizedMessage`
- unsupported, duplicate, unauthorized, and unmentioned group messages are
ignored before queueing
- only normalized `message.text` is passed to `runCodexExec()`
- sandbox config rejects values outside `read-only` and `workspace-write`

However, this is a thin normalization and gatekeeping layer. It does not do
semantic task parsing, prompt rewriting, memory, or session routing.

## Open Question

The naming is unresolved.

`Agent Socket` is not known to be a standard industry term. It is currently a
local working name for the note. The user prefers either a more standard term or
a simpler framing.

Candidate directions for the next session:

- keep `Minimal Agent Socket`, but explicitly say it is a local name
- rename to `Feishu-to-Codex Connector`
- rename to `Minimal ChatOps Agent Connector`
- rename to `IM-triggered Codex Runner`
- avoid naming a pattern at all and write it as a concrete project note

## Current Opinion

If the goal is a public note with less invented terminology, the safest next
revision is probably:

```text
title: Feishu-to-Codex Connector
```

and the note can mention:

> I originally thought of this as a small "agent socket", but that is my own
> shorthand rather than a standard term. More plainly, this is a Feishu-to-Codex
> connector.

## Verification Already Run

- `npx quartz build` passed on 2026-06-04.
- The note preview returned HTTP `200 OK` at:
  `http://localhost:8081/computer_sci/llm/agent/minimal_agent_socket`
- A scan of the note did not find real `.env` secrets, `open_id` values, or the
  local transcript path/id.

The build emitted existing LaTeX warnings from other notes.
