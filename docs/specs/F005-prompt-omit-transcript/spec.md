---
id: F005
slug: prompt-omit-transcript
title: Prompt ingest and omit transcript path
kind: functional
category: ingest
tags: [hooks, ingest, cursor]
status: in-progress
created: 2026-09-01
released-version: 0.13.1
---
# F005 — Prompt ingest and omit transcript path

## Problem definition

F001–F004 and F010 persist Cursor hook events as a verbatim daily JSONL Event log, a Session index, a per-session Session JSONL log (F010; mapped by F003), and a session-end Markdown report. Cursor is registered for four events only. User-prompt payloads can already be mapped when ingest is invoked with `beforeSubmitPrompt`, but the project does not register that event, so prompts do not enter the observe-only pipeline from Cursor the way session and subagent events do.

Normalized session records also copy `transcript_path` for subagent start, subagent stop, and agent stop. That is a host filesystem path, not a field later reporting needs in the session file. It belongs in the raw Event log, not in the JSON object body.

This spec does not replace F001–F004 or F010. Event log verbatim rules, Session index rules, Session JSONL log format and append-only rules (F010), compact header and mapping (F003), session-end report generation, and observe-only exit/stdout stay as they are. The four existing Cursor registrations stay. F003 body mapping and F004 Details follow [`docs/normalized-fields.md`](../../normalized-fields.md); that table drops `transcript_path` so those criteria stay true without reopening F003, F004, or F010.

This amend (C001 / F010) is wording only: Session YAML log → Session JSONL log; YAML document → JSON object / JSONL record. Prompt ingest, `beforeSubmitPrompt` registration, and omit `transcript_path` from the session file stay. Header keys follow the current F003 compact header (`harness` / `event`; `session_id` only on the initial session-start). Prompt body mapping is unchanged. This spec does not re-specify F003/F010 format.

### User Stories

- As a developer, I want **Cursor to invoke ingest on user-prompt submit** so that prompts enter the same observe-only pipeline as session and subagent events.
- As a developer, I want **each prompt JSON object to carry `prompt` after the F003 header** so that later reporting can read the submitted text without scanning the Event log.
- As a developer, I want **the Session JSONL log to omit transcript filesystem paths** so that the session file stays harness-neutral and does not duplicate host paths already in the Event log.
- As a developer, I want **the Event log to stay verbatim** so that `transcript_path` and every other payload field remain available in the raw archive.

### Business Rules

- A project must **register ingest so Cursor can invoke it** on `beforeSubmitPrompt` with `command` `node .agents/hooks/index.mjs ingest cursor beforeSubmitPrompt`.
- A project must **keep registering** `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop` in that same command shape (`node .agents/hooks/index.mjs ingest cursor {event}`).
- An ingest invoked as `ingest cursor beforeSubmitPrompt` must **still persist as F001 and F010/F003** (verbatim Event log, Session index rules, Session JSONL log append when a session identifier exists, daily folder, observe-only exit 0 and no blocking stdout).
- A JSON object for a user-prompt event (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`) always **starts with the F003 compact header** (`harness`, `event`, `timestamp`, `turn`; `session_id` only on the initial session-start) and may **include `prompt` after the header** when the mapped source key is present. When that key is absent, the body field must **be omitted**.
- A JSON object must **not duplicate** `session_id` in the body.
- A Session JSONL record for subagent start (`subagentStart` / `SubagentStart`), subagent stop (`subagentStop` / `SubagentStop`), or agent stop (`stop` / `agentStop` / `Stop`) must **not include** `transcript_path`.
- An Event log line may **still contain** `transcript_path` (and any other payload fields) as F001 verbatim JSON. An ingest must **not strip** `transcript_path` from the Event log.
- The normalized mapping in [`docs/normalized-fields.md`](../../normalized-fields.md) must **omit** `transcript_path` for subagent start, subagent stop, and agent stop, and must **keep** `prompt` for user prompt. F003 JSON-object body fields and F004 report Details follow that table.
- An ingest must **not use** the fifth registration or the omitted session-log field to skip, filter, or transform the Event log line.
- An ingest must **not block**, deny, or rewrite the agent (including `beforeSubmitPrompt` continue/block).
- An ingest must **run as Node.js ≥ 24 ESM with no external dependencies**, as the same script Cursor already invokes.

### Out of scope

- Registering GitHub Copilot or Claude Code hooks.
- Cursor events other than the five (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`) — including `stop`, tool-use, Tab, `workspaceOpen`, and the rest of [`docs/harness-hooks.md`](../../harness-hooks.md).
- Changing F001 Event log verbatim rules, Session index rules, daily-folder naming, or observe-only exit/stdout.
- Overlaying, redacting, or removing `transcript_path` from the Event log.
- New Session report fields (Details lose `transcript_path` only because they follow the mapping table).
- Changing F003 compact header, mapping, or append-only rules; changing F010 format, filename, or serialization; or making F002 positionals required.
- Duplicating F010 format ACs, F003 mapping ACs, or F004 report ACs.
- Blocking, denying, or rewriting the agent.
- Deleting or rotating older daily folders.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session JSONL log** is the per-session append-only file of normalized JSON objects (F010; mapped by F003); a **Session report** is the Markdown file derived from that JSONL (F004).

This spec does not add persisted entities. It adds a fifth Cursor invocation that writes the same ingest artifacts, and it narrows the JSON object body (and thus F004 Details) by dropping `transcript_path`:

- **Event log** — JSONL; each line is one Event, verbatim (F001), including `transcript_path` when the payload has it.
- **Session index** — JSON array of distinct session identifiers for that day (F001).
- **Session JSONL log** — one `{session_id}.jsonl` per distinct F001 session identifier (F010); user-prompt objects include `prompt` when present; subagent start, subagent stop, and agent stop objects omit `transcript_path`.
- **Session report** — F004 downstream consumer of the Session JSONL log; Details no longer list `transcript_path`.

All four artifacts live in the same folder named for the current date.

### CLI

Per [`system.arch.md`](../../arch/system.arch.md):

- Register a fifth Cursor hook: `beforeSubmitPrompt` with `command` `node .agents/hooks/index.mjs ingest cursor beforeSubmitPrompt`, same shape as the four F001 events.
- On that invocation, append the Event log line and update the Session index as F001; when the payload has a session identifier, also append one Session JSONL record (F010) whose body after the F003 header is `prompt` when present (omit if absent).
- Omit `transcript_path` from JSON objects for subagent start, subagent stop, and agent stop; leave the Event log line verbatim.
- Remain observe-only (exit 0, no blocking stdout). Do not add Copilot/Claude registrations or other Cursor events.

## Verification Criteria

- [x] **AC-F005.1** — THE SYSTEM SHALL register Cursor `beforeSubmitPrompt` in `.cursor/hooks.json` with `command` `node .agents/hooks/index.mjs ingest cursor beforeSubmitPrompt`, in the same shape as `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop`.
- [ ] **AC-F005.2** — WHEN ingest is invoked as `ingest cursor beforeSubmitPrompt` and receives a JSON object, THE SYSTEM SHALL persist that object as F001 (verbatim Event log line, Session index rules) and SHALL append a Session JSONL log record as F003/F010 when the payload has a session identifier.
- [ ] **AC-F005.6** — WHEN that invocation’s payload has a session identifier, THE SYSTEM SHALL write a JSON object that starts with the F003 compact header (`harness`, `event`, `timestamp`, `turn`; `session_id` only on the initial session-start) and then `prompt` when the mapped source key is present; WHEN `prompt` is absent, THE SYSTEM SHALL omit it; THE SYSTEM SHALL NOT duplicate `session_id` in the body.
- [ ] **AC-F005.4** — WHEN ingest writes a JSON object / Session JSONL record for subagent start, subagent stop, or agent stop, THE SYSTEM SHALL NOT include `transcript_path` in that object, even when the payload contains a transcript path; THE SYSTEM SHALL still write the Event log line as F001 (the Event log JSONL line may still contain `transcript_path`).
- [ ] **AC-F005.5** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) for `beforeSubmitPrompt` ingest and when the session log omits `transcript_path`.

### Deprecated criteria

- **AC-F005.3** — ~~WHEN that invocation’s payload has a session identifier, THE SYSTEM SHALL write a YAML document that starts with `session_id`, `source_harness`, `source_event`, and `timestamp` and then `prompt` when the mapped source key is present; WHEN `prompt` is absent, THE SYSTEM SHALL omit it; THE SYSTEM SHALL NOT duplicate `session_id` in the body.~~ · retired 2026-09-01 (v0.10.0): header is five fields including `turn` (F008; AC-F005.6).

---

> last updated: 2026-09-02T16:10:00Z
