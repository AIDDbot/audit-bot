---
id: F005
slug: prompt-omit-transcript
title: Prompt ingest and omit transcript path
kind: functional
category: ingest
tags: [hooks, ingest, cursor]
status: qualified
created: 2026-09-01
released-version:
---
# F005 — Prompt ingest and omit transcript path

## Problem definition

F001–F004 persist Cursor hook events as a verbatim daily JSONL Event log, a Session index, a per-session normalized YAML log, and a session-end Markdown report. Cursor is registered for four events only. User-prompt payloads can already be mapped to YAML when ingest is invoked with `beforeSubmitPrompt`, but the project does not register that event, so prompts do not enter the observe-only pipeline from Cursor the way session and subagent events do.

Normalized YAML also copies `transcript_path` for subagent start, subagent stop, and agent stop. That is a host filesystem path, not a field later reporting needs in the session file. It belongs in the raw Event log, not in the YAML body.

This spec does not replace F001–F004. Event log verbatim rules, Session index rules, YAML append-only and header rules, session-end report generation, and observe-only exit/stdout stay as they are. The four existing Cursor registrations stay. F003 body mapping and F004 Details follow [`docs/normalized-fields.md`](../../normalized-fields.md); that table drops `transcript_path` so those criteria stay true without reopening F003 or F004.

### User Stories

- As a developer, I want **Cursor to invoke ingest on user-prompt submit** so that prompts enter the same observe-only pipeline as session and subagent events.
- As a developer, I want **each prompt YAML document to carry `session_id` and `prompt`** so that later reporting can read the submitted text without scanning JSONL.
- As a developer, I want **YAML to omit transcript filesystem paths** so that the session file stays harness-neutral and does not duplicate host paths already in the Event log.
- As a developer, I want **JSONL to stay verbatim** so that `transcript_path` and every other payload field remain available in the raw archive.

### Business Rules

- A project must **register ingest so Cursor can invoke it** on `beforeSubmitPrompt` with `command` `node .agents/hooks/index.mjs ingest cursor beforeSubmitPrompt`.
- A project must **keep registering** `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop` in that same command shape (`node .agents/hooks/index.mjs ingest cursor {event}`).
- An ingest invoked as `ingest cursor beforeSubmitPrompt` must **still persist as F001 and F003** (verbatim Event log, Session index rules, Session YAML log append when a session identifier exists, daily folder, observe-only exit 0 and no blocking stdout).
- A YAML document for a user-prompt event (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`) always **starts with the four F003 header fields** (`session_id`, `source_harness`, `source_event`, `timestamp`) and may **include `prompt` after the header** when the mapped source key is present. When that key is absent, the body field must **be omitted**.
- A YAML document must **not duplicate** `session_id` in the body (it is already in the header).
- A Session YAML log document for subagent start (`subagentStart` / `SubagentStart`), subagent stop (`subagentStop` / `SubagentStop`), or agent stop (`stop` / `agentStop` / `Stop`) must **not include** `transcript_path`.
- An Event log line may **still contain** `transcript_path` (and any other payload fields) as F001 verbatim JSON. An ingest must **not strip** `transcript_path` from the Event log.
- The normalized mapping in [`docs/normalized-fields.md`](../../normalized-fields.md) must **omit** `transcript_path` for subagent start, subagent stop, and agent stop, and must **keep** `prompt` for user prompt. F003 YAML body fields and F004 report Details follow that table (Details body fields are then `agent_type`, `response_text`, `prompt`, and `reason` only).
- An ingest must **not use** the fifth registration or the omitted YAML field to skip, filter, or transform the Event log line.
- An ingest must **not block**, deny, or rewrite the agent (including `beforeSubmitPrompt` continue/block).
- An ingest must **run as Node.js ≥ 24 ESM with no external dependencies**, as the same script Cursor already invokes.

### Out of scope

- Registering GitHub Copilot or Claude Code hooks.
- Cursor events other than the five (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`) — including `stop`, tool-use, Tab, `workspaceOpen`, and the rest of [`docs/harness-hooks.md`](../../harness-hooks.md).
- Changing F001 Event log verbatim rules, Session index rules, daily-folder naming, or observe-only exit/stdout.
- Overlaying, redacting, or removing `transcript_path` from the Event log.
- New Session report fields (Details lose `transcript_path` only because they follow the mapping table).
- Changing F003 YAML header shape, append-only rules, or making F002 positionals required.
- Blocking, denying, or rewriting the agent.
- Deleting or rotating older daily folders.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003); a **Session report** is the Markdown file derived from that YAML (F004).

This spec does not add persisted entities. It adds a fifth Cursor invocation that writes the same three ingest artifacts, and it narrows the YAML body (and thus F004 Details) by dropping `transcript_path`:

- **Event log** — JSONL; each line is one Event, verbatim (F001), including `transcript_path` when the payload has it.
- **Session index** — JSON array of distinct session identifiers for that day (F001).
- **Session YAML log** — one `{session_id}.yaml` per distinct F001 session identifier (F003); user-prompt documents include `prompt` when present; subagent start, subagent stop, and agent stop documents omit `transcript_path`.
- **Session report** — F004 downstream consumer of YAML; Details no longer list `transcript_path`.

All four artifacts live in the same folder named for the current date.

### CLI

Per [`system.arch.md`](../../arch/system.arch.md):

- Register a fifth Cursor hook: `beforeSubmitPrompt` with `command` `node .agents/hooks/index.mjs ingest cursor beforeSubmitPrompt`, same shape as the four F001 events.
- On that invocation, append the Event log line and update the Session index as F001; when the payload has a session identifier, also append one F003 YAML document whose body after the four-field header is `prompt` when present (omit if absent).
- Omit `transcript_path` from YAML documents for subagent start, subagent stop, and agent stop; leave the Event log line verbatim.
- Remain observe-only (exit 0, no blocking stdout). Do not add Copilot/Claude registrations or other Cursor events.

## Verification Criteria

- [x] **AC-F005.1** — THE SYSTEM SHALL register Cursor `beforeSubmitPrompt` in `.cursor/hooks.json` with `command` `node .agents/hooks/index.mjs ingest cursor beforeSubmitPrompt`, in the same shape as `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop`.
- [x] **AC-F005.2** — WHEN ingest is invoked as `ingest cursor beforeSubmitPrompt` and receives a JSON object, THE SYSTEM SHALL persist that object as F001 (verbatim Event log line, Session index rules) and SHALL append a Session YAML log document as F003 when the payload has a session identifier.
- [x] **AC-F005.3** — WHEN that invocation’s payload has a session identifier, THE SYSTEM SHALL write a YAML document that starts with `session_id`, `source_harness`, `source_event`, and `timestamp` and then `prompt` when the mapped source key is present; WHEN `prompt` is absent, THE SYSTEM SHALL omit it; THE SYSTEM SHALL NOT duplicate `session_id` in the body.
- [x] **AC-F005.4** — WHEN ingest writes a YAML document for subagent start, subagent stop, or agent stop, THE SYSTEM SHALL NOT include `transcript_path` in that document, even when the payload contains a transcript path; THE SYSTEM SHALL still write the Event log line as F001 (the JSONL line may still contain `transcript_path`).
- [x] **AC-F005.5** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) for `beforeSubmitPrompt` ingest and when YAML omits `transcript_path`.

---

> last updated: 2026-09-01T11:46:00Z
