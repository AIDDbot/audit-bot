---
id: F006
slug: agent-stop-task
title: Agent-stop ingest and subagent task
kind: functional
category: ingest
tags: [hooks, ingest, cursor]
status: qualified
created: 2026-09-01
released-version: 0.10.0
---
# F006 — Agent-stop ingest and subagent task

## Problem definition

F001–F005 persist Cursor hook events as a verbatim daily JSONL Event log, a Session index, a per-session normalized YAML log, and a Session report. Cursor is registered for five events. Agent-stop payloads can already be mapped to YAML when ingest is invoked with `stop` (F003 header; no body fields after F005 dropped `transcript_path`), but the project does not register that event, so agent-turn-end does not enter the observe-only pipeline from Cursor the way session, subagent, and prompt events do. `stop` fires every time the agent finishes responding, not only at session close, so those invocations are the denser activity markers a session log is missing.

Subagent-start YAML and report Details also omit the instruction given to the subagent. Cursor sends that as `task`. Copilot and Claude Code have no equivalent on subagent start. Developers need that Cursor field in the session file and in the report’s chronological table, without inventing a mapping for the other harnesses.

This spec does not replace F001–F005. Event log verbatim rules, Session index rules, YAML append-only and header rules, observe-only exit/stdout, and F005 (`beforeSubmitPrompt` registration and YAML omit `transcript_path`) stay in force. This spec does not duplicate F005 acceptance criteria. The five existing Cursor registrations stay. F003 YAML body and F004 Details follow [`docs/normalized-fields.md`](../../normalized-fields.md); that table gains `task` on subagent start so those criteria stay true without reopening F003. F004’s explicit Details list is amended in F004 (not here) so subagent start is `agent_type`, then `task`. When a Session report is written is F004’s amend, not this spec.

This amend aligns the YAML header with F003 / F008: documents start with the five header fields including `turn`. Agent-stop body mapping and `task` are unchanged.

Normalized body fields per event kind are those in [`docs/normalized-fields.md`](../../normalized-fields.md). Event-kind names across harnesses are those in [`docs/events-args.md`](../../events-args.md).

### User Stories

- As a developer, I want **Cursor to invoke ingest on agent stop** so that each agent-turn-end enters the same observe-only pipeline as session, subagent, and prompt events.
- As a developer, I want **each agent-stop YAML document to carry the standard header** so that later reporting can treat turn-end as an ordinary chronological marker without scanning JSONL.
- As a developer, I want **subagent-start YAML and report Details to include Cursor `task`** so that I can read the instruction given to the subagent next to `agent_type`.
- As a developer, I want **Copilot and Claude Code subagent-start documents to omit `task`** so that ingest does not invent a field those harnesses do not send.
- As a developer, I want **JSONL to stay verbatim** so that every payload field remains available in the raw archive.

### Business Rules

- A project must **register ingest so Cursor can invoke it** on `stop` with `command` `node .agents/hooks/index.mjs ingest cursor stop`.
- A project must **keep registering** `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, and `beforeSubmitPrompt` in that same command shape (`node .agents/hooks/index.mjs ingest cursor {event}`).
- An ingest invoked as `ingest cursor stop` must **still persist as F001 and F003** (verbatim Event log, Session index rules, Session YAML log append when a session identifier exists, daily folder, observe-only exit 0 and no blocking stdout).
- A YAML document for an agent-stop event (`stop` / `agentStop` / `Stop`) always **starts with the five F003 header fields** (`session_id`, `source_harness`, `source_event`, `timestamp`, `turn`) and may **include only** the agent-stop body fields in [`docs/normalized-fields.md`](../../normalized-fields.md) after the header. That row has no body fields today (`transcript_path` remains omitted per F005). When a mapped source key is absent, the body field must **be omitted**.
- A YAML document must **not duplicate** `session_id` in the body (it is already in the header).
- The normalized mapping in [`docs/normalized-fields.md`](../../normalized-fields.md) must **include** `task` for subagent start (`subagentStart` / `SubagentStart`), with Cursor source key `task` and no Copilot or Claude Code source key. This field is always **an explicit exception** to that document’s intro that only fields present in all three harnesses appear. An ingest must **not** map `task` from any other payload field on Copilot or Claude Code.
- A YAML document for Cursor subagent start may **include `task` after `agent_type`** (table order) when the mapped source key is present. When that key is absent, the body field must **be omitted**. A YAML document for Copilot or Claude Code subagent start must **not include** `task` (no source key; F003 omits absent keys).
- F003 YAML body fields and F004 report Details follow that table (F005 pattern). Subagent-start Details on F004 become `agent_type`, then `task` when present. Agent-stop Details stay empty. YAML documents and the report chronological table already apply to every event kind: a `stop` document and a `task` field appear without a new document shape or a new report section.
- An ingest must **not use** the sixth registration or the `task` field to skip, filter, or transform the Event log line.
- An ingest must **not block**, deny, or rewrite the agent (including `stop` continue/block).
- An ingest must **run as Node.js ≥ 24 ESM with no external dependencies**, as the same script Cursor already invokes.

### Out of scope

- Registering GitHub Copilot or Claude Code hooks.
- Cursor events other than the six (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, `stop`) — including tool-use, Tab, `workspaceOpen`, and the rest of [`docs/harness-hooks.md`](../../harness-hooks.md).
- Changing F001 Event log verbatim rules, Session index rules, daily-folder naming, or observe-only exit/stdout.
- Overlaying, redacting, or removing fields from the Event log.
- When a Session report is written, overview `source_harness`, or duration (F004 amend).
- Reopening F003 or duplicating F005 acceptance criteria.
- Reconstructing parent→subagent hierarchy or nesting subagents under a parent.
- Blocking, denying, or rewriting the agent.
- PII redaction.
- Deleting or rotating older daily folders.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003); a **Session report** is the Markdown file derived from that YAML (F004).

This spec does not add persisted entities. It adds a sixth Cursor invocation that writes the same ingest artifacts, and it extends the subagent-start YAML body (and thus F004 Details) with `task`:

- **Event log** — JSONL; each line is one Event, verbatim (F001), including `task` and any other payload fields when present.
- **Session index** — JSON array of distinct session identifiers for that day (F001).
- **Session YAML log** — one `{session_id}.yaml` per distinct F001 session identifier (F003); agent-stop documents are the five-field header (no body fields today); Cursor subagent-start documents include `task` when present; Copilot and Claude Code subagent-start documents omit `task`.
- **Session report** — F004 downstream consumer of YAML; chronological rows include agent-stop documents; subagent-start Details may list `task` after `agent_type`.

All four artifacts live in the same folder named for the current date.

### CLI

Per [`system.arch.md`](../../arch/system.arch.md):

- Register a sixth Cursor hook: `stop` with `command` `node .agents/hooks/index.mjs ingest cursor stop`, same shape as the five existing events. Keep those five registrations.
- On that invocation, append the Event log line and update the Session index as F001; when the payload has a session identifier, also append one F003 YAML document whose body after the five-field header is only the agent-stop mapping (none today).
- On subagent start, include `task` after `agent_type` when Cursor sends it; omit `task` for Copilot and Claude Code and when the Cursor key is absent.
- YAML documents and Session report Details already follow the mapping table and already list every YAML document: `stop` and `task` appear without a new header shape or a new report structure.
- Remain observe-only (exit 0, no blocking stdout). Do not add Copilot/Claude registrations or other Cursor events.

## Verification Criteria

- [x] **AC-F006.1** — THE SYSTEM SHALL register Cursor `stop` in `.cursor/hooks.json` with `command` `node .agents/hooks/index.mjs ingest cursor stop`, in the same shape as `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, and `beforeSubmitPrompt`, and SHALL keep those five registrations.
- [x] **AC-F006.2** — WHEN ingest is invoked as `ingest cursor stop` and receives a JSON object, THE SYSTEM SHALL persist that object as F001 (verbatim Event log line, Session index rules) and SHALL append a Session YAML log document as F003 when the payload has a session identifier.
- [x] **AC-F006.8** — WHEN that invocation’s payload has a session identifier, THE SYSTEM SHALL write a YAML document that starts with `session_id`, `source_harness`, `source_event`, `timestamp`, and `turn` and then only the agent-stop body fields in [`docs/normalized-fields.md`](../../normalized-fields.md) (none today); THE SYSTEM SHALL NOT duplicate `session_id` in the body; THE SYSTEM SHALL NOT include `transcript_path` (F005 remains in force).
- [x] **AC-F006.4** — THE SYSTEM SHALL include `task` in [`docs/normalized-fields.md`](../../normalized-fields.md) for subagent start, with Cursor source key `task` and no Copilot or Claude Code source key, as an explicit exception to that document’s rule that only fields present in all three harnesses appear.
- [x] **AC-F006.5** — WHEN ingest writes a YAML document for Cursor subagent start and the payload has `task`, THE SYSTEM SHALL include `task` after `agent_type`; WHEN `task` is absent, THE SYSTEM SHALL omit it.
- [x] **AC-F006.6** — WHEN ingest writes a YAML document for Copilot or Claude Code subagent start, THE SYSTEM SHALL NOT include `task` and SHALL NOT map `task` from any other payload field.
- [x] **AC-F006.7** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) for `stop` ingest and when YAML includes or omits `task`.

### Deprecated criteria

- **AC-F006.3** — ~~WHEN that invocation’s payload has a session identifier, THE SYSTEM SHALL write a YAML document that starts with `session_id`, `source_harness`, `source_event`, and `timestamp` and then only the agent-stop body fields in [`docs/normalized-fields.md`](../../normalized-fields.md) (none today); THE SYSTEM SHALL NOT duplicate `session_id` in the body; THE SYSTEM SHALL NOT include `transcript_path` (F005 remains in force).~~ · retired 2026-09-01 (v0.10.0): header is five fields including `turn` (F008; AC-F006.8).

---

> last updated: 2026-09-01T21:50:00Z
